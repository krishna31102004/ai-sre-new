from datetime import datetime

from glassbox_sre.event_log import IncidentEvent, IncidentEventLog
from glassbox_sre.postmortems import timeline_from_events


def test_timeline_is_sorted_by_event_timestamp() -> None:
    events = [
        IncidentEvent(
            incident_id="incident-1",
            event_type="brief_delivered",
            occurred_at=datetime.fromisoformat("2026-07-09T18:05:00+00:00"),
            source="worker",
            summary="brief delivered",
        ),
        IncidentEvent(
            incident_id="incident-1",
            event_type="alert_received",
            occurred_at=datetime.fromisoformat("2026-07-09T18:00:00+00:00"),
            source="api",
            summary="alert received",
        ),
    ]

    log = IncidentEventLog(incident_id="incident-1", events=events)
    timeline = timeline_from_events(log.events)

    assert [entry.event_type for entry in timeline] == ["alert_received", "brief_delivered"]
