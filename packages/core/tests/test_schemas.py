import pytest
from pydantic import ValidationError

from glassbox_sre.schemas import (
    AlertmanagerWebhook,
    CommitCorrelationFinding,
    EvidenceItem,
    HypothesisValidationState,
)


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


def test_commit_correlation_finding_requires_valid_confidence_and_evidence() -> None:
    finding = CommitCorrelationFinding(
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
        reasoning="Service, deploy time, and path evidence match the alert.",
    )

    assert finding.validation_state == HypothesisValidationState.VALIDATED

    with pytest.raises(ValidationError):
        CommitCorrelationFinding(
            commit_sha="not-a-sha",
            commit_title="bad",
            service_name="frontend",
            confidence=1.2,
            validation_state="validated",
            evidence=[],
            reasoning="invalid",
        )
