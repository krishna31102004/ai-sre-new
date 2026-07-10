from glassbox_sre.dependency_graph import default_service_dependency_graph
from glassbox_sre.impact import (
    build_frontend_impact_estimate,
    classify_severity,
    counter_delta_query,
    estimate_affected_endpoints,
    estimate_affected_services,
    observed_request_count,
    p95_latency_ms_from_histogram,
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


def test_observed_request_count_rounds_prometheus_counter_noise_to_integer() -> None:
    assert observed_request_count(4.60388) == 5
    assert observed_request_count(0.0) == 0


def test_counter_delta_query_uses_raw_counter_delta_not_increase() -> None:
    query = counter_delta_query(
        'http_server_duration_milliseconds_count{service_name="frontend"}',
        "5m",
    )

    assert "max_over_time" in query
    assert "min_over_time" in query
    assert "increase(" not in query


def test_severity_classification_boundaries() -> None:
    assert classify_severity(0.0, 0) == "info"
    assert classify_severity(0.001, 1) == "ticket"
    assert classify_severity(0.02, 1) == "page"
    assert classify_severity(0.01, 10) == "page"
    assert classify_severity(0.25, 1) == "critical"
    assert classify_severity(0.01, 1000) == "critical"


def test_affected_services_for_frontend_include_ad() -> None:
    assert estimate_affected_services(_alert(), default_service_dependency_graph()) == (
        "frontend",
        "ad",
    )


def test_affected_endpoints_for_frontend_use_static_map() -> None:
    assert estimate_affected_endpoints(_alert()) == ("/", "/api/products", "/api/ad")


def test_p95_latency_parser_returns_none_without_samples() -> None:
    assert p95_latency_ms_from_histogram({"data": {"result": []}}) is None
