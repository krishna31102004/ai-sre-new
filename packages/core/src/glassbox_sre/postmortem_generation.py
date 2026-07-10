from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from glassbox_sre.config import Settings
from glassbox_sre.event_log import IncidentEvent
from glassbox_sre.postmortems import Postmortem, timeline_from_events


def render_postmortem_markdown(postmortem: Postmortem) -> str:
    lines = [
        f"# {postmortem.title}",
        "",
        "## Summary",
        postmortem.summary,
        "",
        "## Impact",
        postmortem.impact,
        "",
        "## Root Cause",
        postmortem.root_cause,
        "",
        "## Detection",
        postmortem.detection,
        "",
        "## Resolution",
        postmortem.resolution,
        "",
        "## Timeline",
    ]
    lines.extend(
        f"- {entry.occurred_at.isoformat()} | {entry.summary}" for entry in postmortem.timeline
    )
    lines.extend(["", "## Evidence"])
    lines.extend(f"- {item}" for item in postmortem.evidence)
    lines.extend(["", "## Action Items"])
    lines.extend(f"- {item.summary}" for item in postmortem.action_items)
    return "\n".join(lines) + "\n"


def generate_postmortem(
    incident_id: str, events: list[IncidentEvent], brief: str, settings: Settings
) -> Postmortem:
    """Build a postmortem from persisted facts; code owns every timeline and claim."""
    timeline = timeline_from_events(events)
    narrative = (
        "This postmortem is grounded in the stored incident brief and persisted event timeline. "
        "The evidence-cited brief below contains the computed impact, ranked suspect "
        "commit, and runbook match."
    )
    postmortem = Postmortem(
        incident_id=incident_id,
        title="Glassbox SRE incident postmortem",
        summary=narrative,
        impact="See the evidence-cited incident brief for computed impact.",
        root_cause=(
            "See the evidence-cited suspect commit and injected-fault evidence in the "
            "incident brief."
        ),
        detection="Prometheus Alertmanager delivered the alert webhook to Glassbox SRE.",
        resolution=(
            "Recovery was confirmed from the resolved Alertmanager signal and configured "
            "recovery checks."
        ),
        timeline=timeline,
        evidence=[brief],
        action_items=[],
        lessons_learned=["Timeline entries are sourced from persisted event timestamps."],
        generated_at=datetime.now(UTC),
        markdown="",
    )
    return postmortem.model_copy(update={"markdown": render_postmortem_markdown(postmortem)})


def write_postmortem_markdown(postmortem: Postmortem, output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / f"{postmortem.incident_id}.md"
    path.write_text(postmortem.markdown)
    return path
