from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class IncidentEvent(BaseModel):
    incident_id: str
    event_type: Literal[
        "alert_received",
        "queued",
        "investigation_started",
        "triage_completed",
        "commit_correlation_completed",
        "runbook_retrieval_completed",
        "impact_estimation_completed",
        "brief_delivered",
        "resolved",
        "postmortem_generated",
    ]
    occurred_at: datetime
    source: str
    summary: str
    reference: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class IncidentEventLog(BaseModel):
    incident_id: str
    events: list[IncidentEvent] = Field(default_factory=list)
