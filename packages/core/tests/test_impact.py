from glassbox_sre.impact import (
    build_frontend_impact_estimate,
    classify_severity,
    parse_prometheus_scalar,
)
from glassbox_sre.schemas import AlertmanagerWebhook


def _alert() -> AlertmanagerWebhook:
    return AlertmanagerWebhook.model_validate(
        {
            "status": "firing",
            "alerts": [
                {
                    "labels": {"alertname": "OTelDemoAdServiceErrors", "service": "frontend"},
                    "annotations": {"summary": "Frontend 500s are active."},
                    "startsAt": "2026-07-09T18:30:45Z",
                }
            ],
        }
    )


def test_parse_prometheus_scalar_returns_zero_for_empty_result() -> None:
    assert parse_prometheus_scalar({"data": {"result": []}}) == 0.0


def test_parse_prometheus_scalar_reads_first_sample_value() -> None:
    response = {"data": {"result": [{"value": [1783621818.809, "3.5"]}]}}

    assert parse_prometheus_scalar(response) == 3.5


def test_impact_estimate_uses_computed_numbers_only() -> None:
    estimate = build_frontend_impact_estimate(_alert(), total_requests=300, error_requests=9)

    assert estimate.error_rate == 0.03
    assert estimate.affected_requests == 9
    assert estimate.severity == "page"
    assert estimate.evidence[0].kind == "metric"


def test_severity_classification_boundaries() -> None:
    assert classify_severity(0.0, 0) == "info"
    assert classify_severity(0.001, 1) == "ticket"
    assert classify_severity(0.02, 1) == "page"
    assert classify_severity(0.01, 10) == "page"
    assert classify_severity(0.25, 1) == "critical"
    assert classify_severity(0.01, 1000) == "critical"
