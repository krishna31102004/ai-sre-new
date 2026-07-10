from pathlib import Path

from glassbox_sre.notification import (
    ConsoleNotifier,
    IncidentBriefNotification,
    SlackNotifier,
    notifier_from_settings,
)


def test_console_notifier_returns_rendered_brief(tmp_path: Path) -> None:
    notifier = ConsoleNotifier(output_path=tmp_path / "brief.txt")
    notification = IncidentBriefNotification(
        incident_id="incident-1",
        alert_name="OTelDemoAdServiceErrors",
        status="firing",
        service_name="frontend",
        brief="[investigation brief]\nstatus: firing",
    )

    receipt = notifier.send_incident_brief(notification)

    assert receipt.channel == "console"
    assert receipt.rendered_message == notification.brief
    assert (tmp_path / "brief.txt").read_text() == notification.brief + "\n"


def test_notifier_factory_keeps_console_mode_without_slack_credentials() -> None:
    assert isinstance(notifier_from_settings(None, None), ConsoleNotifier)


def test_slack_notifier_posts_and_threads_with_mocked_client(monkeypatch) -> None:
    notifier = SlackNotifier("xoxb-test", "C123")
    calls = []

    def post(**kwargs):
        calls.append(kwargs)
        return {"ts": "123.456"}

    monkeypatch.setattr(notifier.client, "chat_postMessage", post)
    notification = IncidentBriefNotification("i1", "alert", "firing", "frontend", "brief")
    first = notifier.send_incident_brief(notification)
    second = notifier.send_resolution(notification, first.external_id)

    assert first.channel == "slack"
    assert second.external_id == "123.456"
    assert calls[1]["thread_ts"] == "123.456"


def test_slack_notifier_uses_a_certificate_verifying_ssl_context() -> None:
    notifier = SlackNotifier("xoxb-test", "C123")

    assert notifier.client.ssl.verify_mode != 0
