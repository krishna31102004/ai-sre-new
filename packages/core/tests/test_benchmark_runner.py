import json
from pathlib import Path

from glassbox_sre.benchmark_runner import (
    ModelEvalResult,
    discover_scenario_paths,
    run_model_eval_benchmark,
    run_replay_fast_benchmark,
    run_replay_fast_scenario,
)


REPO_ROOT = Path(__file__).resolve().parents[3]
SCENARIOS_DIR = REPO_ROOT / "scenarios" / "benchmark"
RUNBOOK_ROOT = REPO_ROOT / "runbooks"


class FakeModelClient:
    def evaluate_commit_candidates(self, scenario, alert, candidates):
        return (
            ModelEvalResult(
                root_cause_id=scenario.expected.root_cause_id,
                ranked_commit_shas=[
                    scenario.expected.bad_commit_sha,
                    *[
                        str(candidate["commit_sha"])
                        for candidate in candidates
                        if candidate["commit_sha"] != scenario.expected.bad_commit_sha
                    ],
                ],
                reasoning="fixture model result",
            ),
            {"input_tokens": 100, "output_tokens": 25, "total_tokens": 125},
        )


def test_discover_scenario_paths_finds_initial_five() -> None:
    paths = discover_scenario_paths(SCENARIOS_DIR)

    assert len(paths) == 5
    assert all(path.name == "scenario.json" for path in paths)


def test_run_replay_fast_scenario_returns_prediction_and_score() -> None:
    scenario_path = SCENARIOS_DIR / "frontend-ad-failure-visible-500s" / "scenario.json"

    scenario, prediction, score = run_replay_fast_scenario(
        scenario_path,
        repo_root=REPO_ROOT,
        runbook_root=RUNBOOK_ROOT,
    )

    assert scenario.id == "frontend-ad-failure-visible-500s"
    assert prediction.scenario_id == scenario.id
    assert score.scenario_id == scenario.id
    assert prediction.latency_ms >= 0


def test_run_replay_fast_benchmark_writes_structured_artifacts(tmp_path: Path) -> None:
    output_dir = run_replay_fast_benchmark(
        scenarios_dir=SCENARIOS_DIR,
        repo_root=REPO_ROOT,
        runbook_root=RUNBOOK_ROOT,
        artifact_root=tmp_path,
    )

    manifest = json.loads((output_dir / "manifest.json").read_text())
    summary = json.loads((output_dir / "summary.json").read_text())
    results = (output_dir / "results.jsonl").read_text().strip().splitlines()
    summary_markdown = (output_dir / "summary.md").read_text()

    assert manifest["mode"] == "replay-fast"
    assert manifest["scenario_count"] == 5
    assert summary["scenario_count"] == 5
    assert len(results) == 5
    assert "Bad commit top-1 accuracy" in summary_markdown


def test_run_model_eval_benchmark_writes_token_usage_with_mocked_model(tmp_path: Path) -> None:
    output_dir = run_model_eval_benchmark(
        scenarios_dir=SCENARIOS_DIR,
        repo_root=REPO_ROOT,
        runbook_root=RUNBOOK_ROOT,
        artifact_root=tmp_path,
        model_client=FakeModelClient(),
    )

    manifest = json.loads((output_dir / "manifest.json").read_text())
    summary = json.loads((output_dir / "summary.json").read_text())
    summary_markdown = (output_dir / "summary.md").read_text()

    assert manifest["mode"] == "model-eval"
    assert summary["bad_commit_top1_accuracy"] == 1.0
    assert summary["root_cause_precision"] == 1.0
    assert summary["input_tokens"] == 500
    assert summary["output_tokens"] == 125
    assert summary["total_tokens"] == 625
    assert "Total tokens: 625" in summary_markdown
