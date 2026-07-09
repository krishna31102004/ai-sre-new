import logging
import signal
import time

from glassbox_sre.config import get_settings
from glassbox_sre.schemas import AlertmanagerWebhook
from glassbox_sre_worker.graph import run_investigation
from redis import Redis

settings = get_settings()

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)

redis_client = Redis.from_url(settings.redis_url, decode_responses=True)
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
    brief = run_investigation(payload, settings)
    logger.info("processed alert webhook\n%s", brief)
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
