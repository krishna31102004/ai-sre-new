import time
from datetime import UTC, datetime

from glassbox_sre.event_log import IncidentEvent
from glassbox_sre.notification import NotificationReceipt
from glassbox_sre.schemas import AlertmanagerWebhook
from glassbox_sre.storage import (
    PostmortemRow,
    add_incident_event,
    create_investigation,
    init_db,
    make_session_factory,
    update_investigation_brief,
)
from glassbox_sre_worker import main
from sqlalchemy import select


def test_worker_writes_expiring_heartbeat(monkeypatch) -> None:
    recorded: dict[str, object] = {}

    class FakeRedis:
        def set(self, key: str, value: str, ex: int) -> None:
            recorded.update({"key": key, "value": value, "ex": ex})

    monkeypatch.setattr(main, "redis_client", FakeRedis())

    main.write_heartbeat()

    assert recorded["key"] == main.WORKER_HEARTBEAT_KEY
    assert float(str(recorded["value"])) <= time.time()
    assert recorded["ex"] == 30


def test_resolution_uses_stored_brief_before_session_closes(monkeypatch, tmp_path) -> None:
    """A resolved alert must not access a detached InvestigationRow after its transaction ends."""
    session_factory = make_session_factory(f"sqlite:///{tmp_path / 'glassbox.db'}")
    init_db(session_factory)
    firing_payload = AlertmanagerWebhook.model_validate(
        {
            "status": "firing",
            "alerts": [
                {
                    "labels": {"alertname": "OTelDemoAdServiceErrors", "service": "frontend"},
                    "startsAt": "2026-07-10T12:00:00Z",
                }
            ],
        }
    )
    stored_brief = "[incident brief]\ncommit: abc1234\nimpact: evidence-backed"
    with session_factory.begin() as session:
        investigation_id = create_investigation(session, firing_payload)
        update_investigation_brief(session, investigation_id, stored_brief)
        add_incident_event(
            session,
            IncidentEvent(
                incident_id=investigation_id,
                event_type="brief_delivered",
                occurred_at=datetime.now(UTC),
                source="console",
                summary="Incident brief delivered.",
            ),
        )

    class FakeNotifier:
        def send_resolution(self, notification, thread_id):  # type: ignore[no-untyped-def]
            assert notification.brief.startswith("[incident resolved]")
            assert thread_id is None
            return NotificationReceipt(
                channel="console",
                rendered_message=notification.brief,
                destination="stdout",
            )

    monkeypatch.setattr(main, "make_session_factory", lambda _url: session_factory)
    monkeypatch.setattr(main, "notifier", FakeNotifier())
    monkeypatch.setattr(
        main,
        "write_postmortem_markdown",
        lambda postmortem, _output_dir: tmp_path / f"{postmortem.incident_id}.md",
    )

    resolved_payload = firing_payload.model_copy(update={"status": "resolved"})

    assert main._process_resolution(resolved_payload) is True

    with session_factory() as session:
        postmortem = session.scalar(
            select(PostmortemRow).where(PostmortemRow.investigation_id == investigation_id)
        )
    assert postmortem is not None
    assert stored_brief in postmortem.content_json["evidence"]
