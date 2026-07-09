import logging

from fastapi import FastAPI, status
from glassbox_sre.config import get_settings
from glassbox_sre.schemas import AlertmanagerWebhook
from redis import Redis

settings = get_settings()

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)

redis_client = Redis.from_url(settings.redis_url, decode_responses=True)

app = FastAPI(title="Glassbox SRE API")


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
