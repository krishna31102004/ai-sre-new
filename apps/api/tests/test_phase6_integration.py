from __future__ import annotations

from fastapi.testclient import TestClient
from glassbox_sre.config import Settings
from glassbox_sre.notification import ConsoleNotifier
from glassbox_sre.schemas import (
    CommitCorrelationFinding,
    EvidenceItem,
    HypothesisValidationState,
    ImpactEstimate,
    RunbookRetrievalFinding,
)
from glassbox_sre.storage import init_db, make_session_factory
from glassbox_sre_api import main as api_main
from glassbox_sre_worker import graph as worker_graph
from glassbox_sre_worker import main as worker_main
from glassbox_sre_worker.graph import TriageResult


class InMemoryRedis:
    """Minimal Redis list/key adapter for fast API-to-worker contract coverage."""

    def __init__(self) -> None:
        self.queue: list[str] = []
        self.values: dict[str, str] = {}

    def rpush(self, _key: str, value: str) -> int:
        self.queue.append(value)
        return len(self.queue)

    def lpop(self, _key: str) -> str | None:
        return self.queue.pop(0) if self.queue else None

    def get(self, key: str) -> str | None:
        return self.values.get(key)

    def set(self, key: str, value: str, ex: int) -> None:
        del ex
        self.values[key] = value

    def ping(self) -> bool:
        return True


def _fixture_graph(settings: Settings, original_build):
    def triage_node(_state):
        return {
            "triage": TriageResult(
                alert_status="firing",
                alert_names=["OTelDemoAdServiceErrors"],
                affected_services=["frontend"],
                severity="page",
                incident_type="frontend_http_500s",
                summary="Mocked OpenAI triage identified sustained frontend HTTP 500s.",
            )
        }

    def commit_node(_state):
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
                    reasoning="Mocked diff reasoning matched the frontend ad failure symptom.",
                )
            ]
        }

    def runbook_node(_state):
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
                    summary="Mocked runbook retrieval result.",
                )
            ]
        }

    def impact_node(_state):
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
                        summary="Mocked Prometheus counter delta.",
                        reference="prometheus",
                    )
                ],
            ),
            "affected_services": ["frontend", "ad"],
            "affected_endpoints": ["/", "/api/ad"],
        }

    def synthesis_node(_state):
        return {
            "brief": "\n".join(
                [
                    "[investigation brief]",
                    "status: firing",
                    "runbook: otel-demo.frontend-ad-failure / Signals (evidence: matched)",
                    "runbook score: 0.98 (evidence: matched)",
                    "impact: error_rate=0.0300, affected_requests=9, severity=page "
                    "(evidence: counters)",
                ]
            )
        }

    return original_build(
        settings,
        triage_node=triage_node,
        commit_correlation_node=commit_node,
        runbook_retrieval_node=runbook_node,
        impact_node=impact_node,
        synthesis_node=synthesis_node,
    )


def test_dashboard_api_reflects_webhook_queue_and_mocked_graph_result(
    monkeypatch, tmp_path
) -> None:
    """Fast integration path: FastAPI webhook -> JSON queue -> worker graph -> dashboard API."""
    database_url = f"sqlite:///{tmp_path / 'glassbox.db'}"
    session_factory = make_session_factory(database_url)
    init_db(session_factory)
    queue = InMemoryRedis()
    settings = Settings(
        postgres_url=database_url,
        openai_api_key="test-key",
        langsmith_api_key="test-key",
        langsmith_project="glassbox-test",
        langsmith_tracing="true",
    )
    original_build = worker_graph.build_investigation_graph

    class FakeLangSmithClient:
        def __init__(self, api_key: str) -> None:
            assert api_key == "test-key"

        def get_run_url(self, *, run: object, project_name: str) -> str:
            assert run is not None
            assert project_name == "glassbox-test"
            return "https://smith.langchain.com/trace/phase6-test"

    def fake_traceable(**_kwargs):
        def decorator(function):
            def wrapped():
                return function(run_tree=object())

            return wrapped

        return decorator

    monkeypatch.setattr(api_main, "get_session_factory", lambda: session_factory)
    monkeypatch.setattr(api_main, "redis_client", queue)
    monkeypatch.setattr(worker_main, "redis_client", queue)
    monkeypatch.setattr(worker_main, "make_session_factory", lambda _url: session_factory)
    monkeypatch.setattr(worker_main, "settings", settings)
    monkeypatch.setattr(worker_main, "notifier", ConsoleNotifier())
    monkeypatch.setattr(worker_graph, "make_session_factory", lambda _url: session_factory)
    monkeypatch.setattr(
        worker_graph,
        "build_investigation_graph",
        lambda resolved_settings: _fixture_graph(resolved_settings, original_build),
    )
    monkeypatch.setattr(worker_graph, "Client", FakeLangSmithClient)
    monkeypatch.setattr(worker_graph, "traceable", fake_traceable)
    monkeypatch.setenv("LANGSMITH_TRACING", "false")

    client = TestClient(api_main.app)
    webhook = {
        "status": "firing",
        "alerts": [
            {
                "labels": {"alertname": "OTelDemoAdServiceErrors", "service": "frontend"},
                "startsAt": "2026-07-10T12:00:00Z",
            }
        ],
    }

    assert client.post("/webhook/alert", json=webhook).json() == {"status": "queued", "alerts": 1}
    assert worker_main.process_next_message() is True

    response = client.get("/api/investigations")
    assert response.status_code == 200
    investigation = response.json()["investigations"][0]
    assert investigation == {
        "investigation_id": investigation["investigation_id"],
        "alert_name": "OTelDemoAdServiceErrors",
        "service": "frontend",
        "status": "firing",
        "started_at": "2026-07-10T12:00:00",
        "resolved_at": None,
        "suspect_commit_sha": "41080eb518884c6aeede13111f8214a7c87db3fb",
        "suspect_commit_title": "Seed frontend ad failure ground truth scenario",
        "confidence": 0.9,
        "validation_state": "validated",
        "runbook_id": "otel-demo.frontend-ad-failure",
        "runbook_section": "Signals",
        "runbook_score": 0.98,
        "error_rate": 0.03,
        "affected_requests": 9,
        "severity": "page",
        "slack_thread_ts": None,
        "slack_channel": None,
        "langsmith_trace_url": "https://smith.langchain.com/trace/phase6-test",
    }
