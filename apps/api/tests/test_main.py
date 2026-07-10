from __future__ import annotations

import json
import time
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from glassbox_sre.event_log import IncidentEvent
from glassbox_sre.schemas import (
    AlertmanagerWebhook,
    CommitCorrelationFinding,
    EvidenceItem,
    HypothesisValidationState,
)
from glassbox_sre.storage import (
    add_incident_event,
    create_investigation,
    init_db,
    make_session_factory,
    save_findings,
    save_notification_receipt,
    update_investigation_brief,
    update_investigation_trace_url,
)
from glassbox_sre_api import main


class FakeRedis:
    def __init__(self) -> None:
        self.values: dict[str, str] = {}
        self.queue: list[str] = []

    def get(self, key: str) -> str | None:
        return self.values.get(key)

    def ping(self) -> bool:
        return True

    def rpush(self, _key: str, value: str) -> int:
        self.queue.append(value)
        return len(self.queue)


class FakeResponse:
    def __init__(self, payload: dict[str, object]) -> None:
        self.payload = payload

    def json(self) -> dict[str, object]:
        return self.payload

    def raise_for_status(self) -> None:
        return None


@pytest.fixture
def api_client(tmp_path, monkeypatch) -> tuple[TestClient, FakeRedis, object]:
    session_factory = make_session_factory(f"sqlite:///{tmp_path / 'glassbox.db'}")
    init_db(session_factory)
    fake_redis = FakeRedis()
    monkeypatch.setattr(main, "get_session_factory", lambda: session_factory)
    monkeypatch.setattr(main, "redis_client", fake_redis)
    return TestClient(main.app), fake_redis, session_factory


def _payload() -> AlertmanagerWebhook:
    return AlertmanagerWebhook.model_validate(
        {
            "status": "firing",
            "alerts": [
                {
                    "labels": {
                        "alertname": "OTelDemoAdServiceErrors",
                        "service": "frontend",
                    },
                    "startsAt": "2026-07-10T12:00:00Z",
                }
            ],
        }
    )


def _seed_investigation(session_factory) -> str:
    with session_factory.begin() as session:
        investigation_id = create_investigation(session, _payload())
        save_findings(
            session,
            investigation_id,
            [
                CommitCorrelationFinding(
                    commit_sha="41080eb518884c6aeede13111f8214a7c87db3fb",
                    commit_title="Seed frontend ad failure ground truth scenario",
                    service_name="frontend",
                    confidence=0.9,
                    validation_state=HypothesisValidationState.VALIDATED,
                    evidence=[
                        EvidenceItem(
                            kind="deploy",
                            summary="frontend deployment preceded the alert",
                            reference="deploy-frontend-001",
                        )
                    ],
                    reasoning="The frontend diff and deployment window match the symptom.",
                )
            ],
        )
        update_investigation_brief(
            session,
            investigation_id,
            "\n".join(
                [
                    "[investigation brief]",
                    "runbook: otel-demo.frontend-ad-failure / Signals (evidence: matched)",
                    "runbook score: 0.98 (evidence: matched)",
                    "impact: error_rate=0.0300, affected_requests=9, severity=page "
                    "(evidence: counters)",
                ]
            ),
        )
        update_investigation_trace_url(
            session,
            investigation_id,
            "https://smith.langchain.com/o/test/projects/p/glassbox/r/trace",
        )
        save_notification_receipt(session, investigation_id, "slack", "123.456", "C123")
        add_incident_event(
            session,
            IncidentEvent(
                incident_id=investigation_id,
                event_type="resolved",
                occurred_at=datetime.now(UTC),
                source="alertmanager",
                summary="resolved",
            ),
        )
    return investigation_id


def test_webhook_queues_valid_alert(api_client) -> None:
    client, fake_redis, _session_factory = api_client

    response = client.post("/webhook/alert", json=_payload().model_dump(by_alias=True, mode="json"))

    assert response.status_code == 200
    assert response.json() == {"status": "queued", "alerts": 1}
    assert len(fake_redis.queue) == 1


def test_investigation_list_and_detail_return_persisted_evidence(api_client) -> None:
    client, _fake_redis, session_factory = api_client
    investigation_id = _seed_investigation(session_factory)

    list_response = client.get("/api/investigations")
    detail_response = client.get(f"/api/investigations/{investigation_id}")

    assert list_response.status_code == 200
    investigation = list_response.json()["investigations"][0]
    assert investigation["investigation_id"] == investigation_id
    assert investigation["alert_name"] == "OTelDemoAdServiceErrors"
    assert investigation["service"] == "frontend"
    assert investigation["status"] == "resolved"
    assert investigation["started_at"].startswith("2026-07-10T12:00:00")
    assert investigation["resolved_at"] is not None
    assert investigation["suspect_commit_sha"] == "41080eb518884c6aeede13111f8214a7c87db3fb"
    assert investigation["suspect_commit_title"] == "Seed frontend ad failure ground truth scenario"
    assert investigation["confidence"] == 0.9
    assert investigation["validation_state"] == "validated"
    assert investigation["runbook_id"] == "otel-demo.frontend-ad-failure"
    assert investigation["runbook_section"] == "Signals"
    assert investigation["runbook_score"] == 0.98
    assert investigation["error_rate"] == 0.03
    assert investigation["affected_requests"] == 9
    assert investigation["severity"] == "page"
    assert investigation["slack_thread_ts"] == "123.456"
    assert investigation["slack_channel"] == "C123"
    assert investigation["langsmith_trace_url"] == (
        "https://smith.langchain.com/o/test/projects/p/glassbox/r/trace"
    )
    assert detail_response.status_code == 200
    detail = detail_response.json()
    assert detail["brief"].startswith("[investigation brief]")
    assert detail["findings"][0]["evidence"][0]["reference"] == "deploy-frontend-001"


def test_investigation_detail_returns_not_found_for_unknown_id(api_client) -> None:
    client, _fake_redis, _session_factory = api_client

    response = client.get("/api/investigations/missing")

    assert response.status_code == 404


def test_health_reports_worker_postgres_and_redis(api_client) -> None:
    client, fake_redis, _session_factory = api_client
    fake_redis.values[main.WORKER_HEARTBEAT_KEY] = str(time.time())

    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json()["api"]["ok"] is True
    assert response.json()["worker"]["ok"] is True
    assert response.json()["postgres"]["ok"] is True
    assert response.json()["redis"]["ok"] is True


def test_fault_endpoints_read_and_write_allowlisted_flags(api_client, monkeypatch) -> None:
    client, _fake_redis, _session_factory = api_client
    configuration = {
        "flags": {
            "adFailure": {"defaultVariant": "off"},
            "paymentFailure": {"defaultVariant": "off"},
            "productCatalogFailure": {"defaultVariant": "off"},
        }
    }
    writes: list[dict[str, object]] = []
    monkeypatch.setattr(main.httpx, "get", lambda *_args, **_kwargs: FakeResponse(configuration))
    monkeypatch.setattr(
        main.httpx,
        "post",
        lambda *_args, json, **_kwargs: writes.append(json) or FakeResponse({}),
    )

    get_response = client.get("/api/fault/adFailure")
    post_response = client.post("/api/fault/adFailure", json={"variant": "on"})
    unsupported_response = client.get("/api/fault/not-real")

    assert get_response.json() == {"flag": "adFailure", "variant": "off"}
    assert post_response.json() == {"flag": "adFailure", "variant": "on"}
    assert writes[0]["data"]["flags"]["adFailure"]["defaultVariant"] == "on"
    assert unsupported_response.status_code == 404


def test_latest_model_eval_endpoint_returns_newest_model_summary(
    api_client, monkeypatch, tmp_path
) -> None:
    client, _fake_redis, _session_factory = api_client
    older = tmp_path / "20260710T010000Z-old"
    newer = tmp_path / "20260710T020000Z-new"
    older.mkdir()
    newer.mkdir()
    (older / "manifest.json").write_text(json.dumps({"mode": "model-eval"}))
    (older / "summary.json").write_text(json.dumps({"scenario_count": 5}))
    (newer / "manifest.json").write_text(json.dumps({"mode": "model-eval"}))
    (newer / "summary.json").write_text(json.dumps({"scenario_count": 15, "mode": "model-eval"}))
    monkeypatch.setattr(main, "ARTIFACTS_ROOT", tmp_path)

    response = client.get("/api/benchmark/latest")

    assert response.status_code == 200
    assert response.json()["scenario_count"] == 15
