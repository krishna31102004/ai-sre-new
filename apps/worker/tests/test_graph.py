from glassbox_sre.config import Settings
from glassbox_sre.schemas import AlertmanagerWebhook
from glassbox_sre.schemas import (
    CommitCorrelationFinding,
    EvidenceItem,
    ImpactEstimate,
    HypothesisValidationState,
    RunbookRetrievalFinding,
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

    def fake_runbook_node(_state):
        return {"runbook_findings": []}

    def fake_impact_node(_state):
        return {"impact": None, "affected_services": [], "affected_endpoints": []}

    def fake_synthesis_node(_state):
        return {"brief": "[investigation brief]\nstatus: firing"}

    graph = build_investigation_graph(
        Settings(openai_api_key="test-key", langsmith_tracing="false"),
        commit_correlation_node=fake_commit_node,
        runbook_retrieval_node=fake_runbook_node,
        impact_node=fake_impact_node,
        synthesis_node=fake_synthesis_node,
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

    def fake_runbook_node(_state):
        return {
            "runbook_findings": [
                RunbookRetrievalFinding(
                    runbook_id="otel-demo.frontend-ad-failure",
                    chunk_id="otel-demo.frontend-ad-failure:signals",
                    title="Frontend ad failure causing HTTP 500s",
                    section_heading="Signals",
                    service="frontend",
                    alertname="OTelDemoAdServiceErrors",
                    score=0.98,
                    evidence=[
                        EvidenceItem(
                            kind="runbook",
                            summary="Runbook section matched the alert.",
                            reference="otel-demo.frontend-ad-failure:signals",
                        )
                    ],
                    summary="Use this runbook when frontend 500s are active.",
                )
            ]
        }

    def fake_impact_node(_state):
        return {
            "impact": ImpactEstimate(
                service_name="frontend",
                window="5m",
                total_requests=300,
                error_requests=9,
                error_rate=0.03,
                affected_requests=9,
                severity="page",
                latency_p95_ms=None,
                evidence=[
                    EvidenceItem(
                        kind="metric",
                        summary="Frontend 500s were computed from Prometheus counters.",
                        reference="prometheus",
                    )
                ],
            ),
            "affected_services": ["frontend", "ad"],
            "affected_endpoints": ["/", "/api/ad"],
        }

    def fake_synthesis_node(state):
        return {
            "brief": (
                "[investigation brief]\n"
                f"status: {state['alert_payload'].status}\n"
                "runbook: otel-demo.frontend-ad-failure / Signals\n"
                "impact: error_rate=0.0300, affected_requests=9, severity=page"
            )
        }

    graph = build_investigation_graph(
        Settings(openai_api_key="test-key", langsmith_tracing="false"),
        triage_node=fake_triage_node,
        commit_correlation_node=fake_commit_node,
        runbook_retrieval_node=fake_runbook_node,
        impact_node=fake_impact_node,
        synthesis_node=fake_synthesis_node,
    )

    result = graph.invoke({"alert_payload": _fixture_alert_payload()})

    assert result["triage"].incident_type == "frontend_http_500s"
    assert result["brief"].startswith("[investigation brief]")
    assert "runbook: otel-demo.frontend-ad-failure / Signals" in result["brief"]
    assert "impact: error_rate=0.0300, affected_requests=9, severity=page" in result["brief"]
