from pathlib import Path

from glassbox_sre.benchmark_adapters import (
    FakeNotifier,
    FixtureDeployHistoryRepository,
    SnapshotPrometheusClient,
    frontend_error_request_query,
    frontend_total_request_query,
)
from glassbox_sre.notification import IncidentBriefNotification

REPO_ROOT = Path(__file__).resolve().parents[3]
SCENARIO_DIR = REPO_ROOT / "scenarios" / "benchmark" / "frontend-ad-failure-visible-500s"


def test_snapshot_prometheus_client_returns_frozen_counter_values() -> None:
    client = SnapshotPrometheusClient(SCENARIO_DIR / "world_snapshot.json")

    assert client.query_scalar(frontend_total_request_query()) == 5797.0
    assert client.query_scalar(frontend_error_request_query()) == 8.0
    assert len(client.query_calls) == 2


def test_fixture_deploy_history_repository_loads_typed_records() -> None:
    repository = FixtureDeployHistoryRepository(SCENARIO_DIR / "deploy_history.json")

    deployments = repository.load()

    assert len(deployments) == 6
    assert any(deployment.service_name == "frontend" for deployment in deployments)
    assert any(
        deployment.commit_sha == "41080eb518884c6aeede13111f8214a7c87db3fb"
        for deployment in deployments
    )


def test_fake_notifier_captures_delivery_receipts() -> None:
    notifier = FakeNotifier()

    receipt = notifier.send_incident_brief(
        IncidentBriefNotification(
            incident_id="bench-1",
            alert_name="OTelDemoAdServiceErrors",
            status="firing",
            service_name="frontend",
            brief="benchmark brief",
        )
    )

    assert receipt.channel == "fake"
    assert receipt.rendered_message == "benchmark brief"
    assert notifier.receipts == [receipt]
