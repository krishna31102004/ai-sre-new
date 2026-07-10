from pathlib import Path

from glassbox_sre.benchmark_compare import (
    compare_evaluation_runs,
    comparison_to_markdown,
    write_comparison_artifacts,
)


REPO_ROOT = Path(__file__).resolve().parents[3]
ARTIFACTS = REPO_ROOT / "artifacts" / "evaluations"


def test_compare_evaluation_runs_detects_metric_deltas_and_flips() -> None:
    before = ARTIFACTS / "20260710T083636Z-1043cc24"
    after = ARTIFACTS / "20260710T084417Z-446bd038"

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
    before = ARTIFACTS / "20260710T084417Z-446bd038"
    after = ARTIFACTS / "20260710T090457Z-c31796fa"

    comparison = write_comparison_artifacts(before, after, tmp_path)

    assert (tmp_path / "comparison.json").is_file()
    assert (tmp_path / "comparison.md").is_file()
    assert comparison.before.endswith("20260710T084417Z-446bd038")
    markdown = comparison_to_markdown(comparison)
    assert "Metric Deltas" in markdown
    assert "Scenario Flips" in markdown
