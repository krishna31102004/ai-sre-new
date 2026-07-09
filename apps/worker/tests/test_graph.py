from glassbox_sre.config import Settings
from glassbox_sre.schemas import AlertmanagerWebhook
from glassbox_sre_worker.graph import TriageResult, build_investigation_graph


def _fixture_alert_payload() -> AlertmanagerWebhook:
    return AlertmanagerWebhook.model_validate(
        {
            "status": "firing",
            "alerts": [
                {
                    "labels": {
                        "alertname": "OTelDemoAdServiceErrors",
                        "service": "frontend",
                        "severity": "page",
                    },
                    "annotations": {
                        "summary": "Frontend is returning sustained 500s.",
                    },
                    "startsAt": "2026-07-09T12:00:00Z",
                }
            ],
        }
    )


def test_graph_builds_with_openai_settings() -> None:
    graph = build_investigation_graph(
        Settings(openai_api_key="test-key", langsmith_tracing="false")
    )

    assert graph is not None


def test_graph_returns_brief_with_mocked_triage_node() -> None:
    def fake_triage_node(_state):
        return {
            "triage": TriageResult(
                alert_status="firing",
                alert_names=["OTelDemoAdServiceErrors"],
                affected_services=["frontend"],
                severity="page",
                incident_type="frontend_http_500s",
                summary="Frontend 500s are active in the OpenTelemetry demo.",
            )
        }

    graph = build_investigation_graph(
        Settings(openai_api_key="test-key", langsmith_tracing="false"),
        triage_node=fake_triage_node,
    )

    result = graph.invoke({"alert_payload": _fixture_alert_payload()})

    assert result["triage"].incident_type == "frontend_http_500s"
    assert result["brief"].startswith("[investigation brief]")
    assert "alerts: OTelDemoAdServiceErrors" in result["brief"]
    assert "services: frontend" in result["brief"]
    assert "summary: Frontend 500s are active" in result["brief"]
