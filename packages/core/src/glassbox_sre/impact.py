from __future__ import annotations

from typing import Any

import httpx
from glassbox_sre.dependency_graph import (
    ServiceDependencyGraph,
    affected_services_from_alert,
    default_service_dependency_graph,
)
from glassbox_sre.schemas import AlertmanagerWebhook, EvidenceItem, ImpactEstimate


def prometheus_query_url(base_url: str, query: str) -> str:
    return f"{base_url.rstrip('/')}/api/v1/query"


def parse_prometheus_scalar(response: dict[str, Any]) -> float:
    result = response.get("data", {}).get("result", [])
    if not result:
        return 0.0
    return float(result[0]["value"][1])


def counter_delta_query(metric_selector: str, window: str) -> str:
    return (
        f"sum(max_over_time({metric_selector}[{window}]) "
        f"- min_over_time({metric_selector}[{window}]))"
    )


def observed_request_count(raw_delta: float) -> int:
    if raw_delta <= 0:
        return 0
    return int(round(raw_delta))


def classify_severity(error_rate: float, affected_requests: float) -> str:
    if error_rate >= 0.25 or affected_requests >= 1000:
        return "critical"
    if error_rate >= 0.02 or affected_requests >= 10:
        return "page"
    if error_rate > 0 or affected_requests > 0:
        return "ticket"
    return "info"


def build_frontend_impact_estimate(
    payload: AlertmanagerWebhook,
    total_requests: int,
    error_requests: int,
    window: str = "5m",
    latency_p95_ms: float | None = None,
    raw_total_delta: float | None = None,
    raw_error_delta: float | None = None,
    total_query: str | None = None,
    error_query: str | None = None,
) -> ImpactEstimate:
    first_alert = payload.alerts[0]
    service = first_alert.labels.get("service") or first_alert.labels.get("service_name") or "unknown"
    error_rate = error_requests / total_requests if total_requests else 0.0
    severity = classify_severity(error_rate, error_requests)
    return ImpactEstimate(
        service_name=service,
        window=window,
        total_requests=total_requests,
        error_requests=error_requests,
        error_rate=error_rate,
        affected_requests=error_requests,
        severity=severity,  # type: ignore[arg-type]
        latency_p95_ms=latency_p95_ms,
        evidence=[
            EvidenceItem(
                kind="metric",
                summary=f"Computed {error_requests:g} frontend 500s out of {total_requests:g} requests.",
                reference="prometheus:http_server_duration_milliseconds_count",
                metadata={
                    "window": window,
                    "latency_p95_ms": latency_p95_ms,
                    "raw_total_delta": raw_total_delta,
                    "raw_error_delta": raw_error_delta,
                    "total_query": total_query,
                    "error_query": error_query,
                },
            )
        ],
    )


class PrometheusClient:
    def __init__(self, base_url: str = "http://localhost:9090") -> None:
        self.base_url = base_url

    def query_scalar(self, query: str) -> float:
        response = httpx.get(
            prometheus_query_url(self.base_url, query),
            params={"query": query},
            timeout=10,
        )
        response.raise_for_status()
        return parse_prometheus_scalar(response.json())


def estimate_frontend_http_impact(
    payload: AlertmanagerWebhook,
    client: PrometheusClient,
    window: str = "5m",
) -> ImpactEstimate:
    total_query = counter_delta_query(
        'http_server_duration_milliseconds_count{service_name="frontend"}',
        window,
    )
    error_query = counter_delta_query(
        'http_server_duration_milliseconds_count{service_name="frontend",http_status_code="500"}',
        window,
    )
    raw_total_delta = client.query_scalar(total_query)
    raw_error_delta = client.query_scalar(error_query)
    total_requests = observed_request_count(raw_total_delta)
    error_requests = observed_request_count(raw_error_delta)
    return build_frontend_impact_estimate(
        payload,
        total_requests,
        error_requests,
        window=window,
        raw_total_delta=raw_total_delta,
        raw_error_delta=raw_error_delta,
        total_query=total_query,
        error_query=error_query,
    )


def estimate_affected_services(
    payload: AlertmanagerWebhook,
    graph: ServiceDependencyGraph | None = None,
) -> tuple[str, ...]:
    resolved_graph = graph or default_service_dependency_graph()
    first_alert = payload.alerts[0]
    service = first_alert.labels.get("service") or first_alert.labels.get("service_name") or "unknown"
    return affected_services_from_alert(service, resolved_graph)


def estimate_affected_endpoints(payload: AlertmanagerWebhook) -> tuple[str, ...]:
    first_alert = payload.alerts[0]
    labels = first_alert.labels
    annotations = first_alert.annotations
    service = labels.get("service") or labels.get("service_name") or "unknown"
    if service == "frontend":
        return (
            "/",
            "/api/products",
            "/api/ad",
        )
    endpoint = labels.get("endpoint") or labels.get("path") or annotations.get("path")
    return (endpoint,) if endpoint else ()


def p95_latency_ms_from_histogram(response: dict[str, Any]) -> float | None:
    result = response.get("data", {}).get("result", [])
    if not result:
        return None
    value = result[0].get("value", [None, None])[1]
    return float(value) if value is not None else None


def estimate_frontend_http_impact_with_details(
    payload: AlertmanagerWebhook,
    client: PrometheusClient,
    window: str = "5m",
) -> tuple[ImpactEstimate, tuple[str, ...]]:
    estimate = estimate_frontend_http_impact(payload, client, window=window)
    affected_services = estimate_affected_services(payload)
    return estimate, affected_services
