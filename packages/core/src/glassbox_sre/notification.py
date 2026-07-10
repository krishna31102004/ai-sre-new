from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Protocol


@dataclass(frozen=True)
class IncidentBriefNotification:
    incident_id: str
    alert_name: str
    status: str
    service_name: str
    brief: str
    output_path: Path | None = None


@dataclass(frozen=True)
class NotificationReceipt:
    channel: str
    rendered_message: str
    external_id: str | None = None
    destination: str | None = None


class Notifier(Protocol):
    def send_incident_brief(self, notification: IncidentBriefNotification) -> NotificationReceipt:
        raise NotImplementedError


class ConsoleNotifier:
    def __init__(self, output_path: Path | None = None) -> None:
        self.output_path = output_path

    def send_incident_brief(self, notification: IncidentBriefNotification) -> NotificationReceipt:
        rendered = notification.brief
        if self.output_path is not None:
            self.output_path.write_text(rendered + "\n")
        return NotificationReceipt(
            channel="console",
            rendered_message=rendered,
            destination=str(self.output_path) if self.output_path is not None else "stdout",
        )
