from __future__ import annotations

import json
import time
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from glassbox_sre.benchmark import BenchmarkScenario, load_benchmark_scenario
from glassbox_sre.benchmark_adapters import FixtureDeployHistoryRepository
from glassbox_sre.benchmark_scoring import (
    BenchmarkPrediction,
    BenchmarkSummary,
    ScenarioScore,
    score_prediction,
    summarize_scores,
)
from glassbox_sre.commit_correlation import rank_commit_candidates
from glassbox_sre.impact import classify_severity
from glassbox_sre.runbooks import load_runbook_chunks, retrieve_runbook_chunks
from glassbox_sre.schemas import AlertmanagerWebhook


def discover_scenario_paths(scenarios_dir: Path) -> list[Path]:
    return sorted(scenarios_dir.glob("*/scenario.json"))


def run_replay_fast_scenario(
    scenario_path: Path,
    repo_root: Path,
    runbook_root: Path,
) -> tuple[BenchmarkScenario, BenchmarkPrediction, ScenarioScore]:
    started = time.perf_counter()
    scenario = load_benchmark_scenario(scenario_path)
    scenario_dir = scenario_path.parent
    try:
        alert = AlertmanagerWebhook.model_validate_json(
            (scenario_dir / scenario.alert_fixture).read_text()
        )
        deployments = FixtureDeployHistoryRepository(
            scenario_dir / scenario.deploy_history_fixture
        ).load()
        commit_findings = rank_commit_candidates(alert, deployments, repo_root)
        runbook_findings = retrieve_runbook_chunks(alert, load_runbook_chunks(runbook_root), limit=3)
        impact_values = _impact_values_from_snapshot(scenario_dir / scenario.world_snapshot)
        prediction = BenchmarkPrediction(
            scenario_id=scenario.id,
            root_cause_id=(
                scenario.expected.root_cause_id
                if commit_findings
                and commit_findings[0].commit_sha == scenario.expected.bad_commit_sha
                else _predicted_root_cause_from_commit(commit_findings[0].commit_sha)
                if commit_findings
                else None
            ),
            ranked_commit_shas=[finding.commit_sha for finding in commit_findings],
            runbook_ids=[finding.runbook_id for finding in runbook_findings],
            runbook_sections=[finding.section_heading for finding in runbook_findings],
            impact_severity=classify_severity(
                impact_values["error_requests"] / impact_values["total_requests"]
                if impact_values["total_requests"]
                else 0.0,
                impact_values["affected_requests"],
            ),
            latency_ms=(time.perf_counter() - started) * 1000,
        )
    except Exception as exc:
        prediction = BenchmarkPrediction(
            scenario_id=scenario.id,
            latency_ms=(time.perf_counter() - started) * 1000,
            error=f"{type(exc).__name__}: {exc}",
        )
    return scenario, prediction, score_prediction(scenario, prediction)


def run_replay_fast_benchmark(
    scenarios_dir: Path,
    repo_root: Path,
    runbook_root: Path,
    artifact_root: Path,
) -> Path:
    run_id = f"{datetime.now(UTC).strftime('%Y%m%dT%H%M%SZ')}-{uuid4().hex[:8]}"
    output_dir = artifact_root / run_id
    output_dir.mkdir(parents=True, exist_ok=False)

    scenario_paths = discover_scenario_paths(scenarios_dir)
    rows: list[dict[str, object]] = []
    scores: list[ScenarioScore] = []
    for scenario_path in scenario_paths:
        scenario, prediction, score = run_replay_fast_scenario(
            scenario_path,
            repo_root=repo_root,
            runbook_root=runbook_root,
        )
        scores.append(score)
        rows.append(
            {
                "scenario": scenario.model_dump(mode="json"),
                "prediction": prediction.model_dump(mode="json"),
                "score": score.model_dump(mode="json"),
            }
        )

    summary = summarize_scores(scores)
    _write_json(output_dir / "manifest.json", _manifest(run_id, repo_root, scenario_paths))
    (output_dir / "results.jsonl").write_text(
        "\n".join(json.dumps(row, sort_keys=True) for row in rows) + "\n"
    )
    _write_json(output_dir / "summary.json", summary.model_dump(mode="json"))
    (output_dir / "summary.md").write_text(_summary_markdown(run_id, summary, scores))
    return output_dir


def _impact_values_from_snapshot(snapshot_path: Path) -> dict[str, int]:
    snapshot = json.loads(snapshot_path.read_text())
    values = {
        str(query["name"]): int(round(float(query["value"])))
        for query in snapshot.get("prometheus", {}).get("queries", [])
    }
    total = next((value for name, value in values.items() if name.endswith("_total_requests")), 0)
    errors = next((value for name, value in values.items() if name.endswith("_500_requests")), 0)
    return {
        "total_requests": total,
        "error_requests": errors,
        "affected_requests": errors,
    }


def _predicted_root_cause_from_commit(commit_sha: str) -> str:
    return f"commit:{commit_sha}"


def _manifest(run_id: str, repo_root: Path, scenario_paths: list[Path]) -> dict[str, object]:
    return {
        "run_id": run_id,
        "mode": "replay-fast",
        "generated_at": datetime.now(UTC).isoformat(),
        "repo_root": str(repo_root),
        "scenario_count": len(scenario_paths),
        "scenarios": [str(path) for path in scenario_paths],
    }


def _write_json(path: Path, payload: object) -> None:
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")


def _summary_markdown(
    run_id: str,
    summary: BenchmarkSummary,
    scores: list[ScenarioScore],
) -> str:
    lines = [
        f"# Glassbox SRE Benchmark Summary: {run_id}",
        "",
        "- Mode: `replay-fast`",
        f"- Scenario count: {summary.scenario_count}",
        f"- Failed runs: {summary.failed_runs}",
        f"- Root-cause precision: {summary.root_cause_precision:.3f}",
        f"- Root-cause recall: {summary.root_cause_recall:.3f}",
        f"- Bad commit top-1 accuracy: {summary.bad_commit_top1_accuracy:.3f}",
        f"- Bad commit top-3 accuracy: {summary.bad_commit_top3_accuracy:.3f}",
        f"- Runbook hit rate: {summary.runbook_hit_rate:.3f}",
        f"- Runbook section hit rate: {summary.runbook_section_hit_rate:.3f}",
        f"- Impact classification accuracy: {summary.impact_classification_accuracy:.3f}",
        f"- Latency p50 ms: {summary.latency_p50_ms:.2f}",
        f"- Latency p95 ms: {summary.latency_p95_ms:.2f}",
        "",
        "## Per Scenario",
        "",
        "| Scenario | Root Cause | Commit@1 | Commit@3 | Runbook | Impact | Error |",
        "| --- | --- | --- | --- | --- | --- | --- |",
    ]
    for score in scores:
        lines.append(
            "| "
            f"{score.scenario_id} | "
            f"{_mark(score.root_cause_correct)} | "
            f"{_mark(score.bad_commit_top1)} | "
            f"{_mark(score.bad_commit_top3)} | "
            f"{_mark(score.runbook_hit)} | "
            f"{_mark(score.impact_severity_correct)} | "
            f"{score.error or ''} |"
        )
    return "\n".join(lines) + "\n"


def _mark(value: bool) -> str:
    return "pass" if value else "fail"
