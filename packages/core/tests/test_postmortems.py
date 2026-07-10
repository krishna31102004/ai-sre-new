from datetime import datetime

from glassbox_sre.postmortem_generation import render_postmortem_markdown
from glassbox_sre.postmortems import Postmortem, PostmortemActionItem, timeline_from_events
from glassbox_sre.event_log import IncidentEvent


def test_postmortem_schema_accepts_blame_free_grounded_output() -> None:
    events = [
        IncidentEvent(
            incident_id="incident-1",
            event_type="alert_received",
            occurred_at=datetime.fromisoformat("2026-07-09T18:00:00+00:00"),
            source="api",
            summary="alert received",
        )
    ]
    postmortem = Postmortem(
        incident_id="incident-1",
        title="Frontend ad failure",
        summary="Frontend returned 500s under adFailure.",
        impact="About 1 request failed in the demo window.",
        root_cause="Injected adFailure flag caused frontend 500s.",
        contributing_factors=["Sparse error cadence made alert timing noisy."],
        detection="Prometheus alert fired and Alertmanager delivered the webhook.",
        resolution="The fault flag was turned off and the alert resolved.",
        timeline=timeline_from_events(events),
        evidence=["Prometheus alert state", "Alertmanager webhook", "worker brief"],
        action_items=[PostmortemActionItem(summary="Tighten alert validation.", owner="platform")],
        lessons_learned=["Ground numbers in live telemetry."],
        generated_at=datetime.fromisoformat("2026-07-09T19:00:00+00:00"),
        markdown="# Frontend ad failure\n",
    )

    assert postmortem.timeline[0].event_type == "alert_received"
    assert "# Frontend ad failure" in render_postmortem_markdown(postmortem)
