from pathlib import Path

from glassbox_sre.benchmark import load_benchmark_scenario
from glassbox_sre.benchmark_scoring import (
    BenchmarkPrediction,
    score_prediction,
    summarize_scores,
)


REPO_ROOT = Path(__file__).resolve().parents[3]
SCENARIO_PATH = (
    REPO_ROOT
    / "scenarios"
    / "benchmark"
    / "frontend-ad-failure-visible-500s"
    / "scenario.json"
)


def test_score_prediction_marks_all_expected_hits() -> None:
    scenario = load_benchmark_scenario(SCENARIO_PATH)
    prediction = BenchmarkPrediction(
        scenario_id=scenario.id,
        root_cause_id="frontend_ad_failure",
        ranked_commit_shas=[
            "41080eb518884c6aeede13111f8214a7c87db3fb",
            "bcc8aa3223072d6c66fcebeea7bc65bb04d5e6cd",
        ],
        runbook_ids=["otel-demo.frontend-ad-failure"],
        runbook_sections=["Summary"],
        impact_severity="ticket",
        latency_ms=42.5,
    )

    score = score_prediction(scenario, prediction)

    assert score.root_cause_correct
    assert score.bad_commit_top1
    assert score.bad_commit_top3
    assert score.runbook_hit
    assert score.runbook_section_hit
    assert score.impact_severity_correct


def test_score_prediction_counts_wrong_top1_but_correct_top3() -> None:
    scenario = load_benchmark_scenario(SCENARIO_PATH)
    prediction = BenchmarkPrediction(
        scenario_id=scenario.id,
        root_cause_id="frontend_ad_failure",
        ranked_commit_shas=[
            "bcc8aa3223072d6c66fcebeea7bc65bb04d5e6cd",
            "41080eb518884c6aeede13111f8214a7c87db3fb",
        ],
        runbook_ids=["otel-demo.checkout-payment-failure"],
        runbook_sections=["Signals"],
        impact_severity="page",
        latency_ms=84.0,
    )

    score = score_prediction(scenario, prediction)

    assert not score.bad_commit_top1
    assert score.bad_commit_top3
    assert not score.runbook_hit
    assert not score.impact_severity_correct


def test_summarize_scores_reports_honest_rates_and_latency() -> None:
    scenario = load_benchmark_scenario(SCENARIO_PATH)
    good = score_prediction(
        scenario,
        BenchmarkPrediction(
            scenario_id=scenario.id,
            root_cause_id="frontend_ad_failure",
            ranked_commit_shas=["41080eb518884c6aeede13111f8214a7c87db3fb"],
            runbook_ids=["otel-demo.frontend-ad-failure"],
            runbook_sections=["Summary"],
            impact_severity="ticket",
            latency_ms=10.0,
        ),
    )
    bad = score_prediction(
        scenario,
        BenchmarkPrediction(
            scenario_id=scenario.id,
            root_cause_id="wrong",
            ranked_commit_shas=[],
            runbook_ids=[],
            runbook_sections=[],
            impact_severity="critical",
            latency_ms=30.0,
            error="failed",
        ),
    )

    summary = summarize_scores([good, bad])

    assert summary.scenario_count == 2
    assert summary.failed_runs == 1
    assert summary.root_cause_precision == 0.5
    assert summary.bad_commit_top1_accuracy == 0.5
    assert summary.runbook_hit_rate == 0.5
    assert summary.impact_classification_accuracy == 0.5
    assert summary.latency_p50_ms == 20.0


def test_summarize_scores_reports_unavailable_root_cause_as_none() -> None:
    scenario = load_benchmark_scenario(SCENARIO_PATH)
    score = score_prediction(
        scenario,
        BenchmarkPrediction(
            scenario_id=scenario.id,
            root_cause_id=None,
            ranked_commit_shas=["41080eb518884c6aeede13111f8214a7c87db3fb"],
            runbook_ids=["otel-demo.frontend-ad-failure"],
            runbook_sections=["Summary"],
            impact_severity="ticket",
            latency_ms=12.0,
            unavailable_metrics={"root_cause": "not wired in replay-fast mode"},
        ),
    )

    summary = summarize_scores([score])

    assert score.root_cause_correct is None
    assert summary.root_cause_precision is None
    assert summary.root_cause_recall is None
    assert summary.unavailable_metrics == {
        "root_cause_precision": "evaluator output missing",
        "root_cause_recall": "evaluator output missing",
    }
