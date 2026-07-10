from __future__ import annotations

from statistics import median

from pydantic import BaseModel, Field

from glassbox_sre.benchmark import BenchmarkScenario


class BenchmarkPrediction(BaseModel):
    scenario_id: str
    ranked_commit_shas: list[str] = Field(default_factory=list)
    runbook_ids: list[str] = Field(default_factory=list)
    runbook_sections: list[str] = Field(default_factory=list)
    impact_severity: str | None = None
    latency_ms: float = Field(ge=0.0)
    error: str | None = None
    input_tokens: int = Field(default=0, ge=0)
    output_tokens: int = Field(default=0, ge=0)
    total_tokens: int = Field(default=0, ge=0)


class ScenarioScore(BaseModel):
    scenario_id: str
    bad_commit_top1: bool
    bad_commit_top3: bool
    runbook_hit: bool
    runbook_section_hit: bool
    impact_severity_correct: bool
    latency_ms: float
    error: str | None = None
    input_tokens: int = Field(default=0, ge=0)
    output_tokens: int = Field(default=0, ge=0)
    total_tokens: int = Field(default=0, ge=0)


class BenchmarkSummary(BaseModel):
    scenario_count: int
    failed_runs: int
    bad_commit_top1_accuracy: float
    bad_commit_top3_accuracy: float
    runbook_hit_rate: float
    runbook_section_hit_rate: float
    impact_classification_accuracy: float
    latency_p50_ms: float
    latency_p95_ms: float
    input_tokens: int = Field(default=0, ge=0)
    output_tokens: int = Field(default=0, ge=0)
    total_tokens: int = Field(default=0, ge=0)


def score_prediction(
    scenario: BenchmarkScenario,
    prediction: BenchmarkPrediction,
) -> ScenarioScore:
    expected = scenario.expected
    ranked_commits = prediction.ranked_commit_shas
    return ScenarioScore(
        scenario_id=scenario.id,
        bad_commit_top1=bool(ranked_commits) and ranked_commits[0] == expected.bad_commit_sha,
        bad_commit_top3=expected.bad_commit_sha in ranked_commits[:3],
        runbook_hit=expected.runbook_id in prediction.runbook_ids[:3],
        runbook_section_hit=any(
            section in expected.runbook_sections_allowed
            for section in prediction.runbook_sections[:3]
        ),
        impact_severity_correct=prediction.impact_severity == expected.impact.severity,
        latency_ms=prediction.latency_ms,
        error=prediction.error,
        input_tokens=prediction.input_tokens,
        output_tokens=prediction.output_tokens,
        total_tokens=prediction.total_tokens,
    )


def summarize_scores(scores: list[ScenarioScore]) -> BenchmarkSummary:
    scenario_count = len(scores)
    if scenario_count == 0:
        return BenchmarkSummary(
            scenario_count=0,
            failed_runs=0,
            bad_commit_top1_accuracy=0.0,
            bad_commit_top3_accuracy=0.0,
            runbook_hit_rate=0.0,
            runbook_section_hit_rate=0.0,
            impact_classification_accuracy=0.0,
            latency_p50_ms=0.0,
            latency_p95_ms=0.0,
        )

    latencies = sorted(score.latency_ms for score in scores)
    return BenchmarkSummary(
        scenario_count=scenario_count,
        failed_runs=sum(score.error is not None for score in scores),
        bad_commit_top1_accuracy=sum(score.bad_commit_top1 for score in scores) / scenario_count,
        bad_commit_top3_accuracy=sum(score.bad_commit_top3 for score in scores) / scenario_count,
        runbook_hit_rate=sum(score.runbook_hit for score in scores) / scenario_count,
        runbook_section_hit_rate=sum(score.runbook_section_hit for score in scores)
        / scenario_count,
        impact_classification_accuracy=sum(score.impact_severity_correct for score in scores)
        / scenario_count,
        latency_p50_ms=float(median(latencies)),
        latency_p95_ms=_percentile(latencies, 0.95),
        input_tokens=sum(score.input_tokens for score in scores),
        output_tokens=sum(score.output_tokens for score in scores),
        total_tokens=sum(score.total_tokens for score in scores),
    )


def _percentile(sorted_values: list[float], percentile: float) -> float:
    if not sorted_values:
        return 0.0
    if len(sorted_values) == 1:
        return sorted_values[0]
    rank = percentile * (len(sorted_values) - 1)
    lower = int(rank)
    upper = min(lower + 1, len(sorted_values) - 1)
    weight = rank - lower
    return sorted_values[lower] * (1 - weight) + sorted_values[upper] * weight
