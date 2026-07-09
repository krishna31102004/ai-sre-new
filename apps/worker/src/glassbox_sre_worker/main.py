import logging
import time
from typing import cast

from glassbox_sre.config import get_settings
from glassbox_sre.schemas import AlertmanagerWebhook
from redis import Redis

settings = get_settings()

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)


def format_fake_incident_brief(payload: AlertmanagerWebhook) -> str:
    first_alert = payload.alerts[0] if payload.alerts else None
    service = first_alert.labels.get("service", "unknown") if first_alert else "unknown"
    alert_name = first_alert.labels.get("alertname", "unknown") if first_alert else "unknown"
    summary = first_alert.annotations.get("summary", "No summary provided.") if first_alert else ""
    starts_at = first_alert.starts_at.isoformat() if first_alert else "unknown"

    return (
        "[stub incident brief]\n"
        f"status: {payload.status}\n"
        f"alert_count: {len(payload.alerts)}\n"
        f"primary_alert: {alert_name}\n"
        f"service: {service}\n"
        f"starts_at: {starts_at}\n"
        f"summary: {summary}"
    )


def run_worker() -> None:
    redis_client = Redis.from_url(settings.redis_url, decode_responses=True)
    logger.info("worker polling queue=%s", settings.alert_queue_name)

    while True:
        raw_payload = redis_client.lpop(settings.alert_queue_name)
        if raw_payload is None:
            time.sleep(1)
            continue

        payload_json = cast(str | bytes | bytearray, raw_payload)
        payload = AlertmanagerWebhook.model_validate_json(payload_json)
        brief = format_fake_incident_brief(payload)

        logger.info("processed alert webhook")
        print(brief, flush=True)


def main() -> None:
    while True:
        try:
            run_worker()
        except KeyboardInterrupt:
            logger.info("worker stopped")
            return
        except Exception:
            logger.exception("worker crashed; restarting after short delay")
            time.sleep(2)


if __name__ == "__main__":
    main()
