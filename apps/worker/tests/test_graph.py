from glassbox_sre.config import Settings
from glassbox_sre.schemas import AlertmanagerWebhook
from glassbox_sre.schemas import (
    CommitCorrelationFinding,
    EvidenceItem,
    HypothesisValidationState,
)
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
    def fake_commit_node(_state):
        return {"commit_findings": []}

    graph = build_investigation_graph(
        Settings(openai_api_key="test-key", langsmith_tracing="false"),
        commit_correlation_node=fake_commit_node,
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

    def fake_commit_node(_state):
        return {
            "commit_findings": [
                CommitCorrelationFinding(
                    commit_sha="41080eb518884c6aeede13111f8214a7c87db3fb",
                    commit_title="Seed frontend ad failure ground truth scenario",
                    service_name="frontend",
                    confidence=0.9,
                    validation_state=HypothesisValidationState.VALIDATED,
                    evidence=[
                        EvidenceItem(
                            kind="deploy",
                            summary="frontend deploy preceded the alert",
                            reference="deploy-frontend-001",
                        )
                    ],
                    reasoning="Service and path evidence match the alert.",
                )
            ]
        }

    graph = build_investigation_graph(
        Settings(openai_api_key="test-key", langsmith_tracing="false"),
        triage_node=fake_triage_node,
        commit_correlation_node=fake_commit_node,
    )

    result = graph.invoke({"alert_payload": _fixture_alert_payload()})

    assert result["triage"].incident_type == "frontend_http_500s"
    assert result["brief"].startswith("[investigation brief]")
    assert "alerts: OTelDemoAdServiceErrors" in result["brief"]
    assert "services: frontend" in result["brief"]
    assert "summary: Frontend 500s are active" in result["brief"]
    assert "suspect commit: 41080eb51888" in result["brief"]
    assert "confidence: 0.90" in result["brief"]
