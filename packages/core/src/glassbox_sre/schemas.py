from datetime import datetime

from pydantic import BaseModel, Field


class AlertmanagerAlert(BaseModel):
    labels: dict[str, str] = Field(default_factory=dict)
    annotations: dict[str, str] = Field(default_factory=dict)
    starts_at: datetime = Field(alias="startsAt")


class AlertmanagerWebhook(BaseModel):
    status: str
    alerts: list[AlertmanagerAlert]
