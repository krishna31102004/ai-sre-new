from glassbox_sre.schemas import AlertmanagerWebhook


def test_alertmanager_webhook_accepts_simplified_payload() -> None:
    payload = AlertmanagerWebhook.model_validate(
        {
            "status": "firing",
            "alerts": [
                {
                    "labels": {"alertname": "HighErrorRate", "service": "checkout"},
                    "annotations": {"summary": "Checkout errors are elevated."},
                    "startsAt": "2026-07-09T12:00:00Z",
                }
            ],
        }
    )

    assert payload.status == "firing"
    assert payload.alerts[0].labels["service"] == "checkout"
    assert payload.model_dump(by_alias=True)["alerts"][0]["startsAt"].isoformat().startswith(
        "2026-07-09T12:00:00"
    )
