from __future__ import annotations

import json
import logging
import re
import time
from pathlib import Path
from typing import Annotated, Any, Literal

import httpx
from fastapi import FastAPI, HTTPException, status
from fastapi import Path as ApiPath
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from glassbox_sre.config import get_settings
from glassbox_sre.schemas import AlertmanagerWebhook
from glassbox_sre.storage import (
    FindingRow,
    IncidentEventRow,
    InvestigationRow,
    NotificationRow,
    init_db,
    make_session_factory,
)
from pydantic import BaseModel
from redis import Redis
from sqlalchemy import desc, select, text
from sqlalchemy.orm import Session, sessionmaker

settings = get_settings()

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)

redis_client = Redis.from_url(settings.redis_url, decode_responses=True)
WORKER_HEARTBEAT_KEY = "glassbox:worker:heartbeat"
SUPPORTED_FAULT_FLAGS = frozenset({"adFailure", "paymentFailure", "productCatalogFailure"})
ARTIFACTS_ROOT = Path("artifacts/evaluations")
REPOSITORY_ROOT = Path(__file__).resolve().parents[4]
FRONTEND_DIST = REPOSITORY_ROOT / "apps" / "frontend" / "dist"
FRONTEND_ASSETS = FRONTEND_DIST / "assets"

RUNBOOK_PATTERN = re.compile(
    r"^runbook:\s*(?P<runbook_id>.+?)\s*/\s*(?P<section>.+?)(?:\s+\(evidence:|$)",
    re.MULTILINE,
)
RUNBOOK_SCORE_PATTERN = re.compile(r"^runbook score:\s*(?P<score>[0-9.]+)", re.MULTILINE)
IMPACT_PATTERN = re.compile(
    r"^impact:\s*error_rate=(?P<error_rate>[0-9.]+),\s*"
    r"affected_requests=(?P<affected_requests>\d+),\s*severity=(?P<severity>\w+)",
    re.MULTILINE,
)

app = FastAPI(title="Glassbox SRE API")


class FaultVariantRequest(BaseModel):
    variant: Literal["on", "off"]


def get_session_factory() -> sessionmaker[Session]:
    session_factory = make_session_factory(settings.postgres_url)
    init_db(session_factory)
    return session_factory


def _brief_summary(brief: str | None) -> dict[str, Any]:
    if not brief:
        return {
            "runbook_id": None,
            "runbook_section": None,
            "runbook_score": None,
            "error_rate": None,
            "affected_requests": None,
            "severity": None,
        }

    runbook = RUNBOOK_PATTERN.search(brief)
    runbook_score = RUNBOOK_SCORE_PATTERN.search(brief)
    impact = IMPACT_PATTERN.search(brief)
    return {
        "runbook_id": runbook.group("runbook_id") if runbook else None,
        "runbook_section": runbook.group("section") if runbook else None,
        "runbook_score": float(runbook_score.group("score")) if runbook_score else None,
        "error_rate": float(impact.group("error_rate")) if impact else None,
        "affected_requests": int(impact.group("affected_requests")) if impact else None,
        "severity": impact.group("severity") if impact else None,
    }


def _investigation_summary(session: Session, row: InvestigationRow) -> dict[str, Any]:
    suspect = session.scalars(
        select(FindingRow)
        .where(FindingRow.investigation_id == row.investigation_id)
        .order_by(desc(FindingRow.confidence))
    ).first()
    resolved_at = session.scalars(
        select(IncidentEventRow.occurred_at)
        .where(
            IncidentEventRow.investigation_id == row.investigation_id,
            IncidentEventRow.event_type == "resolved",
        )
        .order_by(desc(IncidentEventRow.occurred_at))
    ).first()
    slack_notification = session.scalars(
        select(NotificationRow)
        .where(
            NotificationRow.investigation_id == row.investigation_id,
            NotificationRow.channel == "slack",
        )
        .order_by(NotificationRow.delivered_at)
    ).first()
    return {
        "investigation_id": row.investigation_id,
        "alert_name": row.alert_name,
        "service": row.service_name,
        "status": "resolved" if resolved_at is not None else row.alert_status,
        "started_at": row.started_at,
        "resolved_at": resolved_at,
        "suspect_commit_sha": suspect.commit_sha if suspect else None,
        "suspect_commit_title": suspect.commit_title if suspect else None,
        "confidence": suspect.confidence if suspect else None,
        "validation_state": suspect.validation_state if suspect else None,
        **_brief_summary(row.final_brief),
        "slack_thread_ts": slack_notification.external_id if slack_notification else None,
        "slack_channel": slack_notification.destination if slack_notification else None,
        "langsmith_trace_url": row.langsmith_trace_url,
    }


def _read_flag_configuration() -> dict[str, Any]:
    response = httpx.get(f"{settings.flagd_feature_api_url}/read", timeout=5.0)
    response.raise_for_status()
    return response.json()


def _flag_variant(configuration: dict[str, Any], flag_name: str) -> str:
    try:
        return str(configuration["flags"][flag_name]["defaultVariant"])
    except KeyError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY, detail="invalid flagd response"
        ) from error


def _require_supported_flag(flag_name: str) -> None:
    if flag_name not in SUPPORTED_FAULT_FLAGS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="unsupported fault flag")


def _latest_model_eval_summary() -> dict[str, Any]:
    if not ARTIFACTS_ROOT.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="no model-eval artifacts found"
        )
    for directory in sorted(ARTIFACTS_ROOT.iterdir(), reverse=True):
        summary_path = directory / "summary.json"
        manifest_path = directory / "manifest.json"
        if not summary_path.is_file():
            continue
        summary = json.loads(summary_path.read_text())
        manifest = json.loads(manifest_path.read_text()) if manifest_path.is_file() else {}
        if summary.get("mode") == "model-eval" or manifest.get("mode") == "model-eval":
            return summary
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail="no model-eval artifacts found"
    )


@app.post("/webhook/alert", status_code=status.HTTP_200_OK)
def receive_alert(payload: AlertmanagerWebhook) -> dict[str, str | int]:
    message = payload.model_dump_json(by_alias=True)
    redis_client.rpush(settings.alert_queue_name, message)

    logger.info(
        "queued alert webhook status=%s alert_count=%s queue=%s",
        payload.status,
        len(payload.alerts),
        settings.alert_queue_name,
    )

    return {"status": "queued", "alerts": len(payload.alerts)}


@app.get("/api/investigations")
def list_investigations() -> dict[str, list[dict[str, Any]]]:
    session_factory = get_session_factory()
    with session_factory() as session:
        rows = session.scalars(
            select(InvestigationRow).order_by(desc(InvestigationRow.created_at)).limit(20)
        ).all()
        return {"investigations": [_investigation_summary(session, row) for row in rows]}


@app.get("/api/investigations/{investigation_id}")
def get_investigation(
    investigation_id: Annotated[str, ApiPath(min_length=1)],
) -> dict[str, Any]:
    session_factory = get_session_factory()
    with session_factory() as session:
        row = session.get(InvestigationRow, investigation_id)
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="investigation not found"
            )
        findings = session.scalars(
            select(FindingRow)
            .where(FindingRow.investigation_id == investigation_id)
            .order_by(desc(FindingRow.confidence))
        ).all()
        events = session.scalars(
            select(IncidentEventRow)
            .where(IncidentEventRow.investigation_id == investigation_id)
            .order_by(IncidentEventRow.occurred_at)
        ).all()
        return {
            "investigation": _investigation_summary(session, row),
            "brief": row.final_brief,
            "findings": [
                {
                    "finding_id": finding.finding_id,
                    "commit_sha": finding.commit_sha,
                    "commit_title": finding.commit_title,
                    "service": finding.service_name,
                    "confidence": finding.confidence,
                    "validation_state": finding.validation_state,
                    "evidence": finding.evidence_json,
                    "reasoning": finding.reasoning,
                }
                for finding in findings
            ],
            "events": [
                {
                    "event_type": event.event_type,
                    "occurred_at": event.occurred_at,
                    "source": event.source,
                    "summary": event.summary,
                    "reference": event.reference,
                }
                for event in events
            ],
        }


@app.get("/api/health")
def get_health() -> dict[str, Any]:
    postgres_ok = False
    redis_ok = False
    heartbeat_age_seconds: float | None = None
    try:
        session_factory = get_session_factory()
        with session_factory() as session:
            session.execute(text("SELECT 1"))
        postgres_ok = True
    except Exception as error:
        logger.warning("Postgres health check failed: %s", error)
    try:
        redis_client.ping()
        raw_heartbeat = redis_client.get(WORKER_HEARTBEAT_KEY)
        if raw_heartbeat is not None:
            heartbeat_age_seconds = max(0.0, time.time() - float(raw_heartbeat))
        redis_ok = True
    except Exception as error:
        logger.warning("Redis health check failed: %s", error)
    return {
        "api": {"ok": True},
        "worker": {
            "ok": heartbeat_age_seconds is not None and heartbeat_age_seconds < 30.0,
            "seconds_since_last_heartbeat": heartbeat_age_seconds,
        },
        "postgres": {"ok": postgres_ok},
        "redis": {"ok": redis_ok},
    }


@app.get("/api/fault/{flag_name}")
def get_fault(flag_name: str) -> dict[str, str]:
    _require_supported_flag(flag_name)
    configuration = _read_flag_configuration()
    return {"flag": flag_name, "variant": _flag_variant(configuration, flag_name)}


@app.post("/api/fault/{flag_name}")
def set_fault(flag_name: str, request: FaultVariantRequest) -> dict[str, str]:
    _require_supported_flag(flag_name)
    configuration = _read_flag_configuration()
    _flag_variant(configuration, flag_name)
    configuration["flags"][flag_name]["defaultVariant"] = request.variant
    response = httpx.post(
        f"{settings.flagd_feature_api_url}/write",
        json={"data": configuration},
        timeout=5.0,
    )
    response.raise_for_status()
    return {"flag": flag_name, "variant": request.variant}


@app.get("/api/benchmark/latest")
def get_latest_benchmark() -> dict[str, Any]:
    return _latest_model_eval_summary()


app.mount(
    "/assets",
    StaticFiles(directory=FRONTEND_ASSETS, check_dir=False),
    name="frontend-assets",
)


@app.get("/{frontend_path:path}", include_in_schema=False)
def serve_frontend(frontend_path: str) -> FileResponse:
    """Serve the built SPA only after every API route has had a chance to match."""
    del frontend_path
    if not (FRONTEND_DIST / "index.html").is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="frontend build not found; run npm run build in apps/frontend",
        )
    return FileResponse(FRONTEND_DIST / "index.html")
