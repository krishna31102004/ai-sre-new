from pathlib import Path

from glassbox_sre.notification import ConsoleNotifier, IncidentBriefNotification


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
