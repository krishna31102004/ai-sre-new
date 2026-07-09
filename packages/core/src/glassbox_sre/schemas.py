from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class Alert(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    labels: dict[str, str] = Field(default_factory=dict)
    annotations: dict[str, str] = Field(default_factory=dict)
    starts_at: datetime = Field(alias="startsAt")


class AlertmanagerWebhook(BaseModel):
    status: Literal["firing", "resolved"]
    alerts: list[Alert]
