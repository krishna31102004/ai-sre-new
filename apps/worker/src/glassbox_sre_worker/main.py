import logging
import signal
import time
from datetime import UTC, datetime
from pathlib import Path

from glassbox_sre.config import get_settings
from glassbox_sre.event_log import IncidentEvent
from glassbox_sre.notification import IncidentBriefNotification, notifier_from_settings
from glassbox_sre.postmortem_generation import generate_postmortem, write_postmortem_markdown
from glassbox_sre.schemas import AlertmanagerWebhook
from glassbox_sre.storage import (
    add_incident_event,
    init_db,
    latest_notification_thread,
    latest_open_investigation,
    load_incident_events,
    make_session_factory,
    save_notification_receipt,
    save_postmortem,
)
from redis import Redis

from glassbox_sre_worker.graph import run_investigation_with_id

settings = get_settings()

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)

redis_client = Redis.from_url(settings.redis_url, decode_responses=True)
notifier = notifier_from_settings(settings.slack_bot_token, settings.slack_channel_id)
running = True


def _handle_shutdown(signum: int, _frame: object) -> None:
    global running
    logger.info("received shutdown signal=%s", signum)
    running = False


def process_next_message() -> bool:
    raw_message = redis_client.lpop(settings.alert_queue_name)
    if raw_message is None:
        return False

    payload = AlertmanagerWebhook.model_validate_json(raw_message)
    if payload.status == "resolved":
        return _process_resolution(payload)

    investigation_id, brief = run_investigation_with_id(payload, settings)
    receipt = notifier.send_incident_brief(
        IncidentBriefNotification(
            incident_id=investigation_id,
            alert_name=payload.alerts[0].labels.get("alertname", "unknown-alert"),
            status=payload.status,
            service_name=payload.alerts[0].labels.get("service", "unknown-service"),
            brief=brief,
        )
    )
    session_factory = make_session_factory(settings.postgres_url)
    init_db(session_factory)
    with session_factory.begin() as session:
        save_notification_receipt(
            session, investigation_id, receipt.channel, receipt.external_id, receipt.destination
        )
        add_incident_event(
            session,
            IncidentEvent(
                incident_id=investigation_id,
                event_type="brief_delivered",
                occurred_at=datetime.now(UTC),
                source=receipt.channel,
                summary="Incident brief delivered.",
                reference=receipt.external_id,
            ),
        )
    logger.info("processed alert webhook\n%s", receipt.rendered_message)
    return True


def _process_resolution(payload: AlertmanagerWebhook) -> bool:
    """Alertmanager's resolved transition is the authoritative recovery signal for this demo."""
    session_factory = make_session_factory(settings.postgres_url)
    init_db(session_factory)
    with session_factory.begin() as session:
        investigation = latest_open_investigation(session, payload)
        if investigation is None:
            logger.warning("received resolved alert with no matching firing investigation")
            return True
        investigation_id = investigation.investigation_id
        thread_id = latest_notification_thread(session, investigation_id)
        add_incident_event(
            session,
            IncidentEvent(
                incident_id=investigation_id,
                event_type="resolved",
                occurred_at=datetime.now(UTC),
                source="alertmanager",
                summary="Alertmanager reported the alert resolved.",
            ),
        )
        add_incident_event(
            session,
            IncidentEvent(
                incident_id=investigation_id,
                event_type="recovery_confirmed",
                occurred_at=datetime.now(UTC),
                source="worker",
                summary="Recovery confirmed by the resolved Alertmanager transition.",
            ),
        )

    resolution_brief = (
        "[incident resolved]\nstatus: resolved\n"
        "recovery: Alertmanager resolved the frontend error alert after the "
        "configured Prometheus lookback window."
    )
    receipt = notifier.send_resolution(
        IncidentBriefNotification(
            incident_id=investigation_id,
            alert_name=payload.alerts[0].labels.get("alertname", "unknown-alert"),
            status="resolved",
            service_name=payload.alerts[0].labels.get("service", "unknown-service"),
            brief=resolution_brief,
        ),
        thread_id,
    )
    with session_factory.begin() as session:
        save_notification_receipt(
            session, investigation_id, receipt.channel, receipt.external_id, receipt.destination
        )
        add_incident_event(
            session,
            IncidentEvent(
                incident_id=investigation_id,
                event_type="brief_delivered",
                occurred_at=datetime.now(UTC),
                source=receipt.channel,
                summary="Resolution update delivered.",
                reference=receipt.external_id,
            ),
        )
        events = load_incident_events(session, investigation_id)
        brief = investigation.final_brief or "[investigation brief]\nNo stored brief available."

    postmortem = generate_postmortem(investigation_id, events, brief, settings)
    output_path = write_postmortem_markdown(postmortem, Path("artifacts/postmortems"))
    with session_factory.begin() as session:
        save_postmortem(
            session, investigation_id, postmortem.model_dump(mode="json"), postmortem.markdown
        )
        add_incident_event(
            session,
            IncidentEvent(
                incident_id=investigation_id,
                event_type="postmortem_generated",
                occurred_at=datetime.now(UTC),
                source="worker",
                summary="Grounded postmortem generated.",
                reference=str(output_path),
            ),
        )
    logger.info(
        "processed resolved alert webhook\n%s\npostmortem: %s",
        receipt.rendered_message,
        output_path,
    )
    return True


def main() -> None:
    signal.signal(signal.SIGINT, _handle_shutdown)
    signal.signal(signal.SIGTERM, _handle_shutdown)

    logger.info(
        "starting worker queue=%s redis=%s",
        settings.alert_queue_name,
        settings.redis_url,
    )

    while running:
        processed = process_next_message()
        if not processed:
            time.sleep(settings.worker_poll_interval_seconds)


if __name__ == "__main__":
    main()
