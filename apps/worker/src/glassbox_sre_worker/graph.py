import json
import logging
import os
from collections.abc import Callable
from typing import NotRequired, TypedDict

from glassbox_sre.config import Settings, get_settings
from glassbox_sre.schemas import AlertmanagerWebhook
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class TriageResult(BaseModel):
    alert_status: str
    alert_names: list[str] = Field(default_factory=list)
    affected_services: list[str] = Field(default_factory=list)
    severity: str = "unknown"
    incident_type: str = "unknown"
    summary: str


class InvestigationState(TypedDict):
    alert_payload: AlertmanagerWebhook
    triage: NotRequired[TriageResult]
    brief: NotRequired[str]


def _configure_langsmith(settings: Settings) -> None:
    if settings.langsmith_tracing is not None:
        os.environ.setdefault("LANGSMITH_TRACING", settings.langsmith_tracing)
    if settings.langsmith_api_key:
        os.environ.setdefault("LANGSMITH_API_KEY", settings.langsmith_api_key)
    if settings.langsmith_project:
        os.environ.setdefault("LANGSMITH_PROJECT", settings.langsmith_project)


def _extract_alert_names(payload: AlertmanagerWebhook) -> list[str]:
    return [alert.labels.get("alertname", "unknown-alert") for alert in payload.alerts]


def _extract_service_names(payload: AlertmanagerWebhook) -> list[str]:
    return sorted(
        {
            alert.labels.get("service")
            or alert.labels.get("service_name")
            or alert.labels.get("job")
            or "unknown-service"
            for alert in payload.alerts
        }
    )


def _build_triage_node(settings: Settings):
    if not settings.openai_api_key:
        raise RuntimeError(
            "OPENAI_API_KEY must be set in .env before running the Phase 1 LangGraph worker."
        )

    llm = ChatOpenAI(
        model=settings.openai_triage_model,
        api_key=settings.openai_api_key,
        temperature=0,
    ).with_structured_output(TriageResult, include_raw=True)

    def triage_node(state: InvestigationState) -> dict[str, TriageResult]:
        payload = state["alert_payload"]
        prompt = {
            "status": payload.status,
            "alerts": [
                {
                    "labels": alert.labels,
                    "annotations": alert.annotations,
                    "startsAt": alert.starts_at.isoformat(),
                }
                for alert in payload.alerts
            ],
        }
        result = llm.invoke(
            [
                SystemMessage(
                    content=(
                        "You are the triage node for a read-only AI SRE. "
                        "Extract incident metadata from the Alertmanager webhook. "
                        "Do not infer root cause yet."
                    )
                ),
                HumanMessage(content=json.dumps(prompt, sort_keys=True)),
            ]
        )

        raw_message = result.get("raw") if isinstance(result, dict) else None
        token_usage = None
        if raw_message is not None:
            token_usage = getattr(raw_message, "usage_metadata", None) or getattr(
                raw_message, "response_metadata", {}
            ).get("token_usage")
        if token_usage:
            logger.info("triage OpenAI token usage: %s", token_usage)

        parsed = result.get("parsed") if isinstance(result, dict) else result
        if not isinstance(parsed, TriageResult):
            parsed = TriageResult.model_validate(parsed)
        return {"triage": parsed}

    return triage_node


def brief_node(state: InvestigationState) -> dict[str, str]:
    payload = state["alert_payload"]
    triage = state["triage"]
    alert_names = triage.alert_names or _extract_alert_names(payload)
    service_names = triage.affected_services or _extract_service_names(payload)

    brief = (
        "[investigation brief]\n"
        f"status: {payload.status}\n"
        f"alerts: {', '.join(alert_names)}\n"
        f"services: {', '.join(service_names)}\n"
        f"severity: {triage.severity}\n"
        f"type: {triage.incident_type}\n"
        f"summary: {triage.summary}\n"
        "next step: commit/deploy correlation will be added in this phase."
    )
    return {"brief": brief}


def build_investigation_graph(
    settings: Settings | None = None,
    triage_node: Callable[[InvestigationState], dict[str, TriageResult]] | None = None,
):
    resolved_settings = settings or get_settings()
    _configure_langsmith(resolved_settings)

    graph = StateGraph(InvestigationState)
    graph.add_node("triage", triage_node or _build_triage_node(resolved_settings))
    graph.add_node("brief", brief_node)
    graph.set_entry_point("triage")
    graph.add_edge("triage", "brief")
    graph.add_edge("brief", END)
    return graph.compile()


def run_investigation(payload: AlertmanagerWebhook, settings: Settings | None = None) -> str:
    graph = build_investigation_graph(settings)
    result = graph.invoke({"alert_payload": payload})
    return result["brief"]
