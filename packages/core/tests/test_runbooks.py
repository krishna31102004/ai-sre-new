from pathlib import Path

from glassbox_sre.runbooks import (
    chunk_runbook,
    deterministic_embedding,
    embedding_text_for_chunk,
    filter_runbook_chunks,
    load_runbook_chunks,
    parse_runbook,
    rank_filtered_chunks_by_embedding,
    retrieve_runbook_chunks,
)
from glassbox_sre.schemas import AlertmanagerWebhook

REPO_ROOT = Path(__file__).resolve().parents[3]
RUNBOOK_ROOT = REPO_ROOT / "runbooks"


def _frontend_alert() -> AlertmanagerWebhook:
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
                        "summary": (
                            "Frontend is returning sustained 500s while adFailure is active."
                        ),
                    },
                    "startsAt": "2026-07-09T18:30:45Z",
                }
            ],
        }
    )


def _frontend_product_catalog_alert() -> AlertmanagerWebhook:
    return AlertmanagerWebhook.model_validate(
        {
            "status": "firing",
            "alerts": [
                {
                    "labels": {
                        "alertname": "ProductCatalogErrors",
                        "service": "frontend",
                        "severity": "page",
                    },
                    "annotations": {
                        "summary": (
                            "Frontend product pages are failing during product catalog lookup."
                        ),
                    },
                    "startsAt": "2026-07-10T10:33:54Z",
                }
            ],
        }
    )


def test_runbook_frontmatter_parses_metadata_tags() -> None:
    metadata, body = parse_runbook(RUNBOOK_ROOT / "otel-demo/frontend-ad-failure.md")

    assert metadata.runbook_id == "otel-demo.frontend-ad-failure"
    assert metadata.service == "frontend"
    assert metadata.alertname == "OTelDemoAdServiceErrors"
    assert "http_500" in metadata.symptoms
    assert "## Signals" in body


def test_runbook_chunking_uses_markdown_sections() -> None:
    chunks = chunk_runbook(RUNBOOK_ROOT / "otel-demo/frontend-ad-failure.md")

    headings = {chunk.section_heading for chunk in chunks}
    assert {"Summary", "Signals", "Diagnostic Queries", "Safe Next Steps"}.issubset(headings)
    assert all(chunk.runbook_id == "otel-demo.frontend-ad-failure" for chunk in chunks)


def test_runbook_tag_filtering_prefers_service_and_alertname() -> None:
    chunks = load_runbook_chunks(RUNBOOK_ROOT)

    filtered = filter_runbook_chunks(_frontend_alert(), chunks)

    assert filtered
    assert {chunk.runbook_id for chunk in filtered} == {"otel-demo.frontend-ad-failure"}


def test_runbook_retrieval_returns_frontend_ad_failure_for_known_alert() -> None:
    chunks = load_runbook_chunks(RUNBOOK_ROOT)

    findings = retrieve_runbook_chunks(_frontend_alert(), chunks)

    assert findings[0].runbook_id == "otel-demo.frontend-ad-failure"
    assert findings[0].evidence[0].reference.startswith("otel-demo.frontend-ad-failure:")


def test_runbook_retrieval_includes_product_catalog_for_frontend_originated_alert() -> None:
    chunks = load_runbook_chunks(RUNBOOK_ROOT)

    findings = retrieve_runbook_chunks(_frontend_product_catalog_alert(), chunks)

    assert findings[0].runbook_id == "otel-demo.product-catalog-errors"


def test_embedding_ranking_runs_within_tag_filtered_candidates() -> None:
    chunks = load_runbook_chunks(RUNBOOK_ROOT)
    chunk_embeddings = [
        (chunk, deterministic_embedding(embedding_text_for_chunk(chunk))) for chunk in chunks
    ]

    findings = rank_filtered_chunks_by_embedding(_frontend_alert(), chunk_embeddings)

    assert findings
    assert {finding.runbook_id for finding in findings} == {"otel-demo.frontend-ad-failure"}
    assert findings[0].score >= 0
