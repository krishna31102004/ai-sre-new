import json
import logging
import os
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from typing import NotRequired, TypedDict

from glassbox_sre.commit_correlation import git_show_diff, rank_commit_candidates
from glassbox_sre.config import Settings, get_settings
from glassbox_sre.event_log import IncidentEvent
from glassbox_sre.impact import (
    PrometheusClient,
    estimate_affected_endpoints,
    estimate_affected_services,
    estimate_frontend_http_impact_with_details,
)
from glassbox_sre.runbooks import (
    filter_runbook_chunks,
    generate_openai_embeddings,
)
from glassbox_sre.schemas import (
    AlertmanagerWebhook,
    CommitCorrelationFinding,
    CommitCorrelationResult,
    ImpactEstimate,
    RunbookRetrievalFinding,
)
from glassbox_sre.storage import (
    add_incident_event,
    create_investigation,
    init_db,
    load_deployments,
    load_runbook_chunks_from_db,
    make_session_factory,
    rank_runbook_chunks_by_pgvector,
    save_findings,
    update_investigation_brief,
)
from glassbox_sre.synthesis import synthesize_incident_brief
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
    commit_findings: NotRequired[list[CommitCorrelationFinding]]
    runbook_findings: NotRequired[list[RunbookRetrievalFinding]]
    impact: NotRequired[ImpactEstimate]
    affected_services: NotRequired[list[str]]
    affected_endpoints: NotRequired[list[str]]
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


def _build_commit_correlation_node(settings: Settings, repo_root: Path):
    if not settings.openai_api_key:
        raise RuntimeError(
            "OPENAI_API_KEY must be set in .env before running the Phase 1 LangGraph worker."
        )

    session_factory = make_session_factory(settings.postgres_url)
    init_db(session_factory)
    llm = ChatOpenAI(
        model=settings.openai_triage_model,
        api_key=settings.openai_api_key,
        temperature=0,
    ).with_structured_output(
        CommitCorrelationResult,
        include_raw=True,
        method="function_calling",
    )

    def commit_correlation_node(
        state: InvestigationState,
    ) -> dict[str, list[CommitCorrelationFinding]]:
        payload = state["alert_payload"]
        with session_factory() as session:
            deployments = load_deployments(session)
        deterministic_findings = rank_commit_candidates(payload, deployments, repo_root)
        candidate_context = [
            {
                "commit_sha": finding.commit_sha,
                "commit_title": finding.commit_title,
                "service_name": finding.service_name,
                "deterministic_confidence": finding.confidence,
                "validation_state": finding.validation_state.value,
                "evidence": [item.model_dump(mode="json") for item in finding.evidence],
                "diff": git_show_diff(finding.commit_sha, repo_root, max_chars=2500),
            }
            for finding in deterministic_findings[:3]
        ]

        result = llm.invoke(
            [
                SystemMessage(
                    content=(
                        "You are the commit-correlation investigator for a read-only AI SRE. "
                        "Rank candidate commits using only the provided alert, deploy, path, "
                        "and diff evidence. Every finding must include evidence and a validation "
                        "state of validated, invalidated, or inconclusive."
                    )
                ),
                HumanMessage(
                    content=json.dumps(
                        {
                            "alert": payload.model_dump(mode="json", by_alias=True),
                            "candidates": candidate_context,
                        },
                        sort_keys=True,
                    )
                ),
            ]
        )
        raw_message = result.get("raw") if isinstance(result, dict) else None
        token_usage = None
        if raw_message is not None:
            token_usage = getattr(raw_message, "usage_metadata", None) or getattr(
                raw_message, "response_metadata", {}
            ).get("token_usage")
        if token_usage:
            logger.info("commit correlation OpenAI token usage: %s", token_usage)

        parsed = result.get("parsed") if isinstance(result, dict) else result
        if not isinstance(parsed, CommitCorrelationResult):
            parsed = CommitCorrelationResult.model_validate(parsed)
        return {"commit_findings": parsed.findings}

    return commit_correlation_node


def _build_runbook_retrieval_node(settings: Settings):
    if not settings.openai_api_key:
        raise RuntimeError(
            "OPENAI_API_KEY must be set in .env before running the Phase 2 LangGraph worker."
        )

    session_factory = make_session_factory(settings.postgres_url)
    init_db(session_factory)

    def runbook_retrieval_node(
        state: InvestigationState,
    ) -> dict[str, list[RunbookRetrievalFinding]]:
        payload = state["alert_payload"]
        with session_factory() as session:
            stored_chunks = load_runbook_chunks_from_db(session)
        if not stored_chunks:
            return {"runbook_findings": []}

        query_text = " ".join(
            [
                payload.alerts[0].labels.get("alertname", ""),
                payload.alerts[0].labels.get("service", ""),
                payload.alerts[0].annotations.get("summary", ""),
            ]
        ).strip()
        query_embedding = generate_openai_embeddings([query_text], settings)[0]
        candidate_chunks = filter_runbook_chunks(
            payload, [chunk for chunk, _embedding in stored_chunks]
        )
        with session_factory() as session:
            findings = rank_runbook_chunks_by_pgvector(
                session,
                [chunk.chunk_id for chunk in candidate_chunks],
                query_embedding,
                limit=len(candidate_chunks),
            )
        logger.info(
            "runbook pgvector scores: %s",
            [
                {
                    "chunk_id": finding.chunk_id,
                    "section": finding.section_heading,
                    "similarity": round(finding.score, 6),
                }
                for finding in findings
            ],
        )
        return {"runbook_findings": findings}

    return runbook_retrieval_node


def _build_impact_node(settings: Settings):
    client = PrometheusClient()

    def impact_node(state: InvestigationState) -> dict[str, ImpactEstimate | list[str]]:
        payload = state["alert_payload"]
        estimate, affected_services = estimate_frontend_http_impact_with_details(payload, client)
        topology_services = estimate_affected_services(payload)
        affected_endpoints = list(estimate_affected_endpoints(payload))
        return {
            "impact": estimate,
            "affected_services": list(dict.fromkeys((*affected_services, *topology_services))),
            "affected_endpoints": affected_endpoints,
        }

    return impact_node


def _build_synthesis_node():
    def synthesis_node(state: InvestigationState) -> dict[str, str]:
        payload = state["alert_payload"]
        triage = state["triage"]
        findings = state.get("commit_findings", [])
        runbook_findings = state.get("runbook_findings", [])
        impact = state.get("impact")
        affected_services = state.get("affected_services", [])
        affected_endpoints = state.get("affected_endpoints", [])
        brief = synthesize_incident_brief(
            payload.status,
            triage.alert_names[0]
            if triage.alert_names
            else payload.alerts[0].labels.get("alertname", "unknown-alert"),
            ", ".join(affected_services or triage.affected_services or []),
            findings[0] if findings else None,
            runbook_findings[0] if runbook_findings else None,
            impact,
            list(affected_services or triage.affected_services or []),
            affected_endpoints,
        ).brief
        return {"brief": brief}

    return synthesis_node


def brief_node(state: InvestigationState) -> dict[str, str]:
    payload = state["alert_payload"]
    triage = state["triage"]
    alert_names = triage.alert_names or _extract_alert_names(payload)
    service_names = triage.affected_services or _extract_service_names(payload)
    findings = state.get("commit_findings", [])
    top_finding = findings[0] if findings else None
    suspect_block = (
        "suspect commit: none\n"
        "confidence: 0.00\n"
        "evidence: no commit-correlation finding was produced"
    )
    if top_finding is not None:
        evidence_text = "; ".join(item.summary for item in top_finding.evidence)
        suspect_block = (
            f"suspect commit: {top_finding.commit_sha[:12]} - {top_finding.commit_title}\n"
            f"confidence: {top_finding.confidence:.2f}\n"
            f"validation: {top_finding.validation_state.value}\n"
            f"evidence: {evidence_text}\n"
            f"reasoning: {top_finding.reasoning}"
        )

    brief = (
        "[investigation brief]\n"
        f"status: {payload.status}\n"
        f"alerts: {', '.join(alert_names)}\n"
        f"services: {', '.join(service_names)}\n"
        f"severity: {triage.severity}\n"
        f"type: {triage.incident_type}\n"
        f"summary: {triage.summary}\n"
        f"{suspect_block}"
    )
    return {"brief": brief}


def build_investigation_graph(
    settings: Settings | None = None,
    triage_node: Callable[[InvestigationState], dict[str, TriageResult]] | None = None,
    commit_correlation_node: Callable[
        [InvestigationState], dict[str, list[CommitCorrelationFinding]]
    ]
    | None = None,
    runbook_retrieval_node: Callable[[InvestigationState], dict[str, list[RunbookRetrievalFinding]]]
    | None = None,
    impact_node: Callable[[InvestigationState], dict[str, ImpactEstimate | list[str]]]
    | None = None,
    synthesis_node: Callable[[InvestigationState], dict[str, str]] | None = None,
    repo_root: Path | None = None,
):
    resolved_settings = settings or get_settings()
    _configure_langsmith(resolved_settings)
    resolved_repo_root = repo_root or Path.cwd()

    graph = StateGraph(InvestigationState)
    graph.add_node("triage", triage_node or _build_triage_node(resolved_settings))
    graph.add_node(
        "commit_correlation",
        commit_correlation_node
        or _build_commit_correlation_node(resolved_settings, resolved_repo_root),
    )
    graph.add_node(
        "runbook_retrieval",
        runbook_retrieval_node or _build_runbook_retrieval_node(resolved_settings),
    )
    graph.add_node("impact_estimation", impact_node or _build_impact_node(resolved_settings))
    graph.add_node("synthesis", synthesis_node or _build_synthesis_node())
    graph.set_entry_point("triage")
    graph.add_edge("triage", "commit_correlation")
    graph.add_edge("triage", "runbook_retrieval")
    graph.add_edge("triage", "impact_estimation")
    graph.add_edge("commit_correlation", "synthesis")
    graph.add_edge("runbook_retrieval", "synthesis")
    graph.add_edge("impact_estimation", "synthesis")
    graph.add_edge("synthesis", END)
    return graph.compile()


def run_investigation_with_id(
    payload: AlertmanagerWebhook, settings: Settings | None = None
) -> tuple[str, str]:
    resolved_settings = settings or get_settings()
    session_factory = make_session_factory(resolved_settings.postgres_url)
    init_db(session_factory)
    with session_factory.begin() as session:
        investigation_id = create_investigation(session, payload)
        # The event table has a foreign key but no ORM relationship.
        # Make the parent durable first.
        session.flush()
        add_incident_event(
            session,
            IncidentEvent(
                incident_id=investigation_id,
                event_type="investigation_started",
                occurred_at=datetime.now(UTC),
                source="worker",
                summary="LangGraph investigation started.",
            ),
        )

    graph = build_investigation_graph(resolved_settings)
    result = graph.invoke({"alert_payload": payload})
    brief = result["brief"]
    with session_factory.begin() as session:
        save_findings(session, investigation_id, result.get("commit_findings", []))
        update_investigation_brief(session, investigation_id, brief)
        now = datetime.now(UTC)
        for event_type, summary in (
            ("triage_completed", "Triage node completed."),
            ("commit_correlation_completed", "Commit-correlation investigator completed."),
            ("runbook_retrieval_completed", "Runbook retrieval investigator completed."),
            ("impact_estimation_completed", "Impact estimation investigator completed."),
        ):
            add_incident_event(
                session,
                IncidentEvent(
                    incident_id=investigation_id,
                    event_type=event_type,
                    occurred_at=now,
                    source="worker",
                    summary=summary,
                ),
            )
    return investigation_id, brief


def run_investigation(payload: AlertmanagerWebhook, settings: Settings | None = None) -> str:
    return run_investigation_with_id(payload, settings)[1]
