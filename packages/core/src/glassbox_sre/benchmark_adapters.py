from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

from glassbox_sre.impact import counter_delta_query
from glassbox_sre.notification import IncidentBriefNotification, NotificationReceipt
from glassbox_sre.schemas import DeployRecord


class SnapshotPrometheusClient:
    def __init__(self, snapshot_path: Path) -> None:
        self.snapshot = json.loads(snapshot_path.read_text())
        self.query_calls: list[str] = []

    def query_scalar(self, query: str) -> float:
        self.query_calls.append(query)
        for query_record in self.snapshot.get("prometheus", {}).get("queries", []):
            if query_record.get("query") == query:
                return float(query_record["value"])

        fallback_value = self._match_known_counter_delta(query)
        if fallback_value is not None:
            return fallback_value

        raise KeyError(f"snapshot has no Prometheus result for query: {query}")

    def _match_known_counter_delta(self, query: str) -> float | None:
        for query_record in self.snapshot.get("prometheus", {}).get("queries", []):
            name = str(query_record.get("name", ""))
            if name.endswith("_total_requests") and "http_status_code" not in query:
                return float(query_record["value"])
            if name.endswith("_500_requests") and 'http_status_code="500"' in query:
                return float(query_record["value"])
        return None


class FixtureDeployHistoryRepository:
    def __init__(self, fixture_path: Path) -> None:
        self.fixture_path = fixture_path

    def load(self) -> list[DeployRecord]:
        return [
            DeployRecord.model_validate(record)
            for record in json.loads(self.fixture_path.read_text())
        ]


@dataclass
class FakeNotifier:
    receipts: list[NotificationReceipt] = field(default_factory=list)

    def send_incident_brief(self, notification: IncidentBriefNotification) -> NotificationReceipt:
        receipt = NotificationReceipt(
            channel="fake",
            rendered_message=notification.brief,
            external_id=f"fake-{len(self.receipts) + 1}",
            destination="benchmark",
        )
        self.receipts.append(receipt)
        return receipt

    def send_resolution(
        self,
        notification: IncidentBriefNotification,
        thread_id: str | None,
    ) -> NotificationReceipt:
        return self.send_incident_brief(notification)


def frontend_total_request_query(window: str = "5m") -> str:
    return counter_delta_query(
        'http_server_duration_milliseconds_count{service_name="frontend"}',
        window,
    )


def frontend_error_request_query(window: str = "5m") -> str:
    return counter_delta_query(
        'http_server_duration_milliseconds_count{service_name="frontend",http_status_code="500"}',
        window,
    )
