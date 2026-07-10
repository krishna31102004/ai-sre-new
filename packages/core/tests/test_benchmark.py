from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from glassbox_sre.benchmark import (
    BenchmarkScenario,
    BenchmarkScenarioSet,
    ScenarioSourceKind,
    validate_world_snapshot_shape,
)


def valid_scenario_payload() -> dict[str, object]:
    return {
        "id": "frontend-ad-failure-visible-500s",
        "title": "Frontend ad failure visible 500s",
        "source_kind": "live_captured",
        "description": "Replay of the verified adFailure incident.",
        "fault_flag": "adFailure",
        "alert_fixture": "alertmanager_webhook.json",
        "world_snapshot": "world_snapshot.json",
        "deploy_history_fixture": "deploy_history.json",
        "expected": {
            "root_cause_id": "frontend_ad_failure",
            "bad_commit_sha": "41080eb518884c6aeede13111f8214a7c87db3fb",
            "service": "frontend",
            "affected_services": ["frontend", "ad"],
            "runbook_id": "otel-demo/frontend-ad-failure",
            "runbook_sections_allowed": ["Summary", "Diagnosis"],
            "impact": {
                "severity": "ticket",
                "total_requests": 5797,
                "error_requests": 8,
                "affected_requests": 8,
                "error_rate": 0.00138,
            },
        },
        "tags": ["otel-demo", "frontend", "ad"],
        "provenance": "Captured from the Phase 3 real Slack lifecycle run.",
    }


def test_benchmark_scenario_accepts_ground_truth_and_adds_top3_commit() -> None:
    scenario = BenchmarkScenario.model_validate(valid_scenario_payload())

    assert scenario.source_kind == ScenarioSourceKind.LIVE_CAPTURED
    assert scenario.expected.bad_commit_top3_allowed == [
        "41080eb518884c6aeede13111f8214a7c87db3fb"
    ]
    assert scenario.expected.impact.error_requests == 8


def test_benchmark_scenario_rejects_invalid_slug_and_commit() -> None:
    payload = valid_scenario_payload()
    payload["id"] = "Frontend Bad Slug"
    payload["expected"] = {
        **payload["expected"],  # type: ignore[arg-type]
        "bad_commit_sha": "not-a-sha",
    }

    with pytest.raises(ValidationError):
        BenchmarkScenario.model_validate(payload)


def test_benchmark_scenario_rejects_incoherent_impact_counts() -> None:
    payload = valid_scenario_payload()
    payload["expected"] = {
        **payload["expected"],  # type: ignore[arg-type]
        "impact": {
            "severity": "ticket",
            "total_requests": 12,
            "error_requests": 17,
            "affected_requests": 17,
            "error_rate": 0.3,
        },
    }

    with pytest.raises(ValidationError, match="error_requests cannot exceed total_requests"):
        BenchmarkScenario.model_validate(payload)


def test_live_captured_scenario_requires_fault_flag() -> None:
    payload = valid_scenario_payload()
    payload["fault_flag"] = None

    with pytest.raises(ValidationError, match="live_captured scenarios must name the fault_flag"):
        BenchmarkScenario.model_validate(payload)


def test_benchmark_scenario_set_rejects_duplicate_ids() -> None:
    scenario = BenchmarkScenario.model_validate(valid_scenario_payload())

    with pytest.raises(ValidationError, match="scenario ids must be unique"):
        BenchmarkScenarioSet(
            generated_at=datetime.now(UTC),
            scenarios=[scenario, scenario],
        )


def test_validate_world_snapshot_shape_requires_core_sections() -> None:
    validate_world_snapshot_shape(
        {
            "captured_at": "2026-07-10T06:59:00Z",
            "prometheus": {},
            "service_graph": {},
            "evidence": [],
        }
    )

    with pytest.raises(ValueError, match="world snapshot missing required keys"):
        validate_world_snapshot_shape({"captured_at": "2026-07-10T06:59:00Z"})
