from __future__ import annotations

import ssl
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

import certifi
from slack_sdk import WebClient


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

    def send_resolution(
        self, notification: IncidentBriefNotification, thread_id: str | None
    ) -> NotificationReceipt:
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

    def send_resolution(
        self, notification: IncidentBriefNotification, thread_id: str | None
    ) -> NotificationReceipt:
        return self.send_incident_brief(notification)


class SlackNotifier:
    """Slack delivery implementation; the worker owns when it is selected."""

    def __init__(self, bot_token: str, channel_id: str) -> None:
        self.client = WebClient(
            token=bot_token,
            ssl=ssl.create_default_context(cafile=certifi.where()),
        )
        self.channel_id = channel_id

    def send_incident_brief(self, notification: IncidentBriefNotification) -> NotificationReceipt:
        response = self.client.chat_postMessage(
            channel=self.channel_id,
            text=notification.brief,
            blocks=[
                {
                    "type": "header",
                    "text": {"type": "plain_text", "text": "Glassbox SRE incident brief"},
                },
                {
                    "type": "section",
                    "text": {"type": "mrkdwn", "text": f"```{notification.brief}```"},
                },
            ],
        )
        return NotificationReceipt(
            channel="slack",
            rendered_message=notification.brief,
            external_id=response["ts"],
            destination=self.channel_id,
        )

    def send_resolution(
        self, notification: IncidentBriefNotification, thread_id: str | None
    ) -> NotificationReceipt:
        text = notification.brief
        response = self.client.chat_postMessage(
            channel=self.channel_id,
            text=text,
            thread_ts=thread_id,
        )
        return NotificationReceipt(
            channel="slack",
            rendered_message=text,
            external_id=response["ts"],
            destination=self.channel_id,
        )


def notifier_from_settings(bot_token: str | None, channel_id: str | None) -> Notifier:
    if bot_token and channel_id:
        return SlackNotifier(bot_token, channel_id)
    return ConsoleNotifier()
