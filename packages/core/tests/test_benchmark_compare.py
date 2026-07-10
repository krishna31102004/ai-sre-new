import json
from pathlib import Path

from glassbox_sre.benchmark_compare import (
    compare_evaluation_runs,
    comparison_to_markdown,
    write_comparison_artifacts,
)


def _write_evaluation_fixture(
    directory: Path,
    *,
    runbook_hit_rate: float,
    product_catalog_runbook_hit: bool,
) -> None:
    directory.mkdir()
    summary = {
        "scenario_count": 5,
        "failed_runs": 0,
        "bad_commit_top1_accuracy": 0.2,
        "bad_commit_top3_accuracy": 0.8,
        "runbook_hit_rate": runbook_hit_rate,
        "runbook_section_hit_rate": runbook_hit_rate,
        "impact_classification_accuracy": 1.0,
        "latency_p50_ms": 25.0,
        "latency_p95_ms": 50.0,
        "input_tokens": 0,
        "output_tokens": 0,
        "total_tokens": 0,
    }
    scores = [
        {
            "score": {
                "scenario_id": "frontend-product-catalog-latency",
                "bad_commit_top1": False,
                "bad_commit_top3": True,
                "runbook_hit": product_catalog_runbook_hit,
                "runbook_section_hit": product_catalog_runbook_hit,
                "impact_severity_correct": True,
                "latency_ms": 25.0,
                "error": None,
            }
        }
    ]
    (directory / "summary.json").write_text(json.dumps(summary))
    (directory / "results.jsonl").write_text(
        "\n".join(json.dumps(score) for score in scores) + "\n"
    )


def test_compare_evaluation_runs_detects_metric_deltas_and_flips(tmp_path: Path) -> None:
    before = tmp_path / "before"
    after = tmp_path / "after"
    _write_evaluation_fixture(before, runbook_hit_rate=0.6, product_catalog_runbook_hit=False)
    _write_evaluation_fixture(after, runbook_hit_rate=1.0, product_catalog_runbook_hit=True)

    comparison = compare_evaluation_runs(before, after)

    deltas = {delta.metric: delta for delta in comparison.metric_deltas}
    assert deltas["runbook_hit_rate"].before == 0.6
    assert deltas["runbook_hit_rate"].after == 1.0
    assert deltas["runbook_hit_rate"].delta == 0.4
    assert any(
        flip.scenario_id == "frontend-product-catalog-latency"
        and flip.field == "runbook_hit"
        and flip.before is False
        and flip.after is True
        for flip in comparison.scenario_flips
    )


def test_write_comparison_artifacts_outputs_json_and_markdown(tmp_path: Path) -> None:
    before = tmp_path / "before"
    after = tmp_path / "after"
    output = tmp_path / "comparison"
    _write_evaluation_fixture(before, runbook_hit_rate=0.6, product_catalog_runbook_hit=False)
    _write_evaluation_fixture(after, runbook_hit_rate=1.0, product_catalog_runbook_hit=True)

    comparison = write_comparison_artifacts(before, after, output)

    assert (output / "comparison.json").is_file()
    assert (output / "comparison.md").is_file()
    assert comparison.before.endswith("before")
    markdown = comparison_to_markdown(comparison)
    assert "Metric Deltas" in markdown
    assert "Scenario Flips" in markdown
