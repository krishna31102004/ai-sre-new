from __future__ import annotations

from typing import Any

import httpx
from glassbox_sre.schemas import AlertmanagerWebhook, EvidenceItem, ImpactEstimate


def prometheus_query_url(base_url: str, query: str) -> str:
    return f"{base_url.rstrip('/')}/api/v1/query"


def parse_prometheus_scalar(response: dict[str, Any]) -> float:
    result = response.get("data", {}).get("result", [])
    if not result:
        return 0.0
    return float(result[0]["value"][1])


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
    total_requests: float,
    error_requests: float,
    window: str = "5m",
    latency_p95_ms: float | None = None,
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
                metadata={"window": window, "latency_p95_ms": latency_p95_ms},
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
    total_query = (
        'sum(increase(http_server_duration_milliseconds_count{service_name="frontend"}'
        f"[{window}]))"
    )
    error_query = (
        'sum(increase(http_server_duration_milliseconds_count{service_name="frontend",'
        f'http_status_code="500"}}[{window}]))'
    )
    total_requests = client.query_scalar(total_query)
    error_requests = client.query_scalar(error_query)
    return build_frontend_impact_estimate(payload, total_requests, error_requests, window=window)
