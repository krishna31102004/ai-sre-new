import json
from datetime import datetime, timezone
from pathlib import Path

from glassbox_sre.commit_correlation import (
    candidate_deployments_for_alert,
    deployments_in_window,
    git_log_candidate_shas,
    rank_commit_candidates,
)
from glassbox_sre.schemas import AlertmanagerWebhook, DeployRecord


REPO_ROOT = Path(__file__).resolve().parents[3]
GROUND_TRUTH_COMMIT = "41080eb518884c6aeede13111f8214a7c87db3fb"


def _deployments() -> list[DeployRecord]:
    data = json.loads((REPO_ROOT / "scenarios/otel-demo/deploy-history.json").read_text())
    return [DeployRecord.model_validate(item) for item in data]


def _alert_payload() -> AlertmanagerWebhook:
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
                    "startsAt": "2026-07-09T18:00:00Z",
                }
            ],
        }
    )


def test_deployments_in_window_filters_by_alert_time() -> None:
    deployments = _deployments()
    alert_time = datetime(2026, 7, 9, 18, 0, tzinfo=timezone.utc)

    matches = deployments_in_window(deployments, alert_time)

    assert [deployment.commit_sha for deployment in matches] == [
        "85d3251f45338bb89d0e4194baf2cdac472c14e3",
        GROUND_TRUTH_COMMIT,
        "8aaf682f6cc1c3ccc34efe766518a630cae926d8",
    ]


def test_candidate_deployments_prefers_alert_service_match() -> None:
    candidates = candidate_deployments_for_alert(_alert_payload(), _deployments())

    assert len(candidates) == 1
    assert candidates[0].service_name == "frontend"
    assert candidates[0].commit_sha == GROUND_TRUTH_COMMIT


def test_commit_correlation_ranks_ground_truth_commit_top_one() -> None:
    findings = rank_commit_candidates(_alert_payload(), _deployments(), REPO_ROOT)

    assert findings[0].commit_sha == GROUND_TRUTH_COMMIT
    assert findings[0].confidence >= 0.9
    assert findings[0].validation_state == "validated"
    assert findings[0].evidence


def test_git_log_candidate_retrieval_includes_seeded_commits() -> None:
    shas = git_log_candidate_shas(REPO_ROOT, max_count=20)

    assert GROUND_TRUTH_COMMIT in shas
