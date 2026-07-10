from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from glassbox_sre.event_log import IncidentEvent


class PostmortemTimelineEntry(BaseModel):
    occurred_at: datetime
    event_type: str
    source: str
    summary: str
    reference: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class PostmortemActionItem(BaseModel):
    owner: str | None = None
    summary: str
    due_date: datetime | None = None
    status: str = "open"


class Postmortem(BaseModel):
    incident_id: str
    title: str
    summary: str
    impact: str
    root_cause: str
    contributing_factors: list[str] = Field(default_factory=list)
    detection: str
    resolution: str
    timeline: list[PostmortemTimelineEntry] = Field(default_factory=list)
    evidence: list[str] = Field(default_factory=list)
    action_items: list[PostmortemActionItem] = Field(default_factory=list)
    lessons_learned: list[str] = Field(default_factory=list)
    generated_at: datetime
    markdown: str


def timeline_from_events(events: list[IncidentEvent]) -> list[PostmortemTimelineEntry]:
    ordered = sorted(events, key=lambda event: event.occurred_at)
    return [
        PostmortemTimelineEntry(
            occurred_at=event.occurred_at,
            event_type=event.event_type,
            source=event.source,
            summary=event.summary,
            reference=event.reference,
            metadata=event.metadata,
        )
        for event in ordered
    ]
