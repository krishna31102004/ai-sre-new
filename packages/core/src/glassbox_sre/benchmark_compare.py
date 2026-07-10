from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field


class MetricDelta(BaseModel):
    metric: str
    before: float | int | None
    after: float | int | None
    delta: float | int | None


class ScenarioFlip(BaseModel):
    scenario_id: str
    field: str
    before: bool | str | None
    after: bool | str | None


class BenchmarkComparison(BaseModel):
    before: str
    after: str
    metric_deltas: list[MetricDelta] = Field(default_factory=list)
    scenario_flips: list[ScenarioFlip] = Field(default_factory=list)


COMPARABLE_SUMMARY_METRICS = (
    "scenario_count",
    "failed_runs",
    "bad_commit_top1_accuracy",
    "bad_commit_top3_accuracy",
    "runbook_hit_rate",
    "runbook_section_hit_rate",
    "impact_classification_accuracy",
    "latency_p50_ms",
    "latency_p95_ms",
    "input_tokens",
    "output_tokens",
    "total_tokens",
)

COMPARABLE_SCORE_FIELDS = (
    "bad_commit_top1",
    "bad_commit_top3",
    "runbook_hit",
    "runbook_section_hit",
    "impact_severity_correct",
    "error",
)


def compare_evaluation_runs(before_dir: Path, after_dir: Path) -> BenchmarkComparison:
    before_summary = _load_json(before_dir / "summary.json")
    after_summary = _load_json(after_dir / "summary.json")
    before_scores = _load_scores_by_scenario(before_dir / "results.jsonl")
    after_scores = _load_scores_by_scenario(after_dir / "results.jsonl")

    metric_deltas = [
        MetricDelta(
            metric=metric,
            before=before_summary.get(metric),
            after=after_summary.get(metric),
            delta=_delta(before_summary.get(metric), after_summary.get(metric)),
        )
        for metric in COMPARABLE_SUMMARY_METRICS
        if metric in before_summary or metric in after_summary
    ]

    scenario_flips: list[ScenarioFlip] = []
    for scenario_id in sorted(set(before_scores) & set(after_scores)):
        before_score = before_scores[scenario_id]
        after_score = after_scores[scenario_id]
        for field in COMPARABLE_SCORE_FIELDS:
            before_value = before_score.get(field)
            after_value = after_score.get(field)
            if before_value != after_value:
                scenario_flips.append(
                    ScenarioFlip(
                        scenario_id=scenario_id,
                        field=field,
                        before=before_value,
                        after=after_value,
                    )
                )

    return BenchmarkComparison(
        before=str(before_dir),
        after=str(after_dir),
        metric_deltas=metric_deltas,
        scenario_flips=scenario_flips,
    )


def write_comparison_artifacts(
    before_dir: Path,
    after_dir: Path,
    output_dir: Path,
) -> BenchmarkComparison:
    comparison = compare_evaluation_runs(before_dir, after_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "comparison.json").write_text(
        comparison.model_dump_json(indent=2) + "\n"
    )
    (output_dir / "comparison.md").write_text(comparison_to_markdown(comparison))
    return comparison


def comparison_to_markdown(comparison: BenchmarkComparison) -> str:
    lines = [
        "# Glassbox SRE Benchmark Comparison",
        "",
        f"- Before: `{comparison.before}`",
        f"- After: `{comparison.after}`",
        "",
        "## Metric Deltas",
        "",
        "| Metric | Before | After | Delta |",
        "| --- | ---: | ---: | ---: |",
    ]
    for delta in comparison.metric_deltas:
        lines.append(
            f"| {delta.metric} | {_format_value(delta.before)} | "
            f"{_format_value(delta.after)} | {_format_value(delta.delta)} |"
        )

    lines.extend(
        [
            "",
            "## Scenario Flips",
            "",
            "| Scenario | Field | Before | After |",
            "| --- | --- | --- | --- |",
        ]
    )
    if comparison.scenario_flips:
        for flip in comparison.scenario_flips:
            lines.append(
                f"| {flip.scenario_id} | {flip.field} | "
                f"{_format_value(flip.before)} | {_format_value(flip.after)} |"
            )
    else:
        lines.append("| none | none | none | none |")
    return "\n".join(lines) + "\n"


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text())


def _load_scores_by_scenario(path: Path) -> dict[str, dict[str, Any]]:
    scores: dict[str, dict[str, Any]] = {}
    for line in path.read_text().splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        score = row["score"]
        scores[score["scenario_id"]] = score
    return scores


def _delta(before: object, after: object) -> float | int | None:
    if isinstance(before, (int, float)) and isinstance(after, (int, float)):
        return after - before
    return None


def _format_value(value: object) -> str:
    if value is None:
        return "n/a"
    if isinstance(value, float):
        return f"{value:.3f}"
    return str(value)
