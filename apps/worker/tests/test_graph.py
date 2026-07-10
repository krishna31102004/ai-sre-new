from glassbox_sre.config import Settings
from glassbox_sre.schemas import (
    AlertmanagerWebhook,
    CommitCorrelationFinding,
    EvidenceItem,
    HypothesisValidationState,
    ImpactEstimate,
    RunbookRetrievalFinding,
)
from glassbox_sre.storage import InvestigationRow, init_db, make_session_factory
from glassbox_sre_worker import graph as worker_graph
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


def test_optional_langsmith_trace_returns_url_when_configured(monkeypatch) -> None:
    class FakeGraph:
        def invoke(self, _input, config):
            assert config["run_name"] == "glassbox-sre-investigation"
            return {"brief": "fixture brief"}

    class FakeClient:
        def __init__(self, api_key: str) -> None:
            assert api_key == "test-key"

        def get_run_url(self, *, run, project_name: str) -> str:
            assert run is not None
            assert project_name == "glassbox-test"
            return "https://smith.langchain.com/trace/test"

    def fake_traceable(**_kwargs):
        def decorator(function):
            def wrapped():
                return function(run_tree=object())

            return wrapped

        return decorator

    monkeypatch.setattr(worker_graph, "Client", FakeClient)
    monkeypatch.setattr(worker_graph, "traceable", fake_traceable)
    result, trace_url = worker_graph._invoke_graph_with_optional_trace(
        FakeGraph(),
        _fixture_alert_payload(),
        Settings(
            openai_api_key="test-key",
            langsmith_api_key="test-key",
            langsmith_project="glassbox-test",
            langsmith_tracing="true",
        ),
        "investigation-1",
    )

    assert result == {"brief": "fixture brief"}
    assert trace_url == "https://smith.langchain.com/trace/test"


def test_graph_run_persists_langsmith_trace_url_when_configured(monkeypatch, tmp_path) -> None:
    database_url = f"sqlite:///{tmp_path / 'glassbox.db'}"
    session_factory = make_session_factory(database_url)
    init_db(session_factory)

    class FakeGraph:
        def invoke(self, _input, config):
            assert config["run_name"] == "glassbox-sre-investigation"
            return {"brief": "fixture brief", "commit_findings": []}

    class FakeClient:
        def __init__(self, api_key: str) -> None:
            assert api_key == "test-key"

        def get_run_url(self, *, run, project_name: str) -> str:
            assert run is not None
            assert project_name == "glassbox-test"
            return "https://smith.langchain.com/trace/persisted"

    def fake_traceable(**_kwargs):
        def decorator(function):
            def wrapped():
                return function(run_tree=object())

            return wrapped

        return decorator

    settings = Settings(
        postgres_url=database_url,
        openai_api_key="test-key",
        langsmith_api_key="test-key",
        langsmith_project="glassbox-test",
        langsmith_tracing="true",
    )
    monkeypatch.setattr(worker_graph, "make_session_factory", lambda _url: session_factory)
    monkeypatch.setattr(worker_graph, "build_investigation_graph", lambda _settings: FakeGraph())
    monkeypatch.setattr(worker_graph, "Client", FakeClient)
    monkeypatch.setattr(worker_graph, "traceable", fake_traceable)

    investigation_id, _brief = worker_graph.run_investigation_with_id(
        _fixture_alert_payload(), settings
    )

    with session_factory() as session:
        row = session.get(InvestigationRow, investigation_id)
    assert row is not None
    assert row.langsmith_trace_url == "https://smith.langchain.com/trace/persisted"
