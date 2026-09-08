from __future__ import annotations

import argparse
import json
import tempfile
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Any

from glassbox_sre.benchmark import load_benchmark_scenario
from glassbox_sre.benchmark_adapters import FixtureDeployHistoryRepository
from glassbox_sre.benchmark_runner import (
    ModelClient,
    ModelEvalResult,
    OpenAIModelEvalClient,
    run_model_eval_benchmark,
    run_replay_fast_benchmark,
)
from glassbox_sre.benchmark_scoring import BenchmarkPrediction, ScenarioScore
from glassbox_sre.commit_correlation import rank_commit_candidates
from glassbox_sre.impact import classify_severity
from glassbox_sre.runbooks import load_runbook_chunks, retrieve_runbook_chunks
from glassbox_sre.schemas import AlertmanagerWebhook


class _CapturingModelClient:
    """Capture the one model result needed for a single-scenario demo report."""

    def __init__(self, delegate: ModelClient) -> None:
        self.delegate = delegate
        self.result: ModelEvalResult | None = None
        self.candidates: list[dict[str, object]] = []

    def evaluate_commit_candidates(
        self,
        scenario: Any,
        alert: AlertmanagerWebhook,
        candidates: list[dict[str, object]],
    ) -> tuple[ModelEvalResult, dict[str, int]]:
        self.candidates = candidates
        self.result, usage = self.delegate.evaluate_commit_candidates(scenario, alert, candidates)
        return self.result, usage


def select_scenario_path(scenarios_dir: Path, scenario_id: str) -> Path:
    """Resolve one scenario ID without changing the scenario corpus."""
    if Path(scenario_id).name != scenario_id or scenario_id in {"", ".", ".."}:
        raise ValueError(f"invalid scenario ID: {scenario_id!r}")
    scenario_path = scenarios_dir / scenario_id / "scenario.json"
    if not scenario_path.is_file():
        raise ValueError(f"unknown scenario ID: {scenario_id}")
    return scenario_path


@contextmanager
def _single_scenario_view(scenario_path: Path) -> Iterator[Path]:
    """Expose one scenario to the existing corpus runner through a temporary symlink."""
    with tempfile.TemporaryDirectory(prefix="glassbox-scenario-") as temp_dir:
        view_root = Path(temp_dir)
        (view_root / scenario_path.parent.name).symlink_to(
            scenario_path.parent.resolve(), target_is_directory=True
        )
        yield view_root


def _rewrite_single_scenario_manifest(output_dir: Path, scenario_path: Path) -> None:
    manifest_path = output_dir / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    manifest["scenario_count"] = 1
    manifest["scenarios"] = [str(scenario_path)]
    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")


def _load_snapshot(snapshot_path: Path) -> tuple[list[dict[str, object]], dict[str, int]]:
    snapshot = json.loads(snapshot_path.read_text())
    query_rows = snapshot.get("prometheus", {}).get("queries", [])
    values = {
        str(query["name"]): int(round(float(query["value"])))
        for query in query_rows
    }
    total_requests = next(
        (value for name, value in values.items() if name.endswith("_total_requests")),
        0,
    )
    error_requests = next(
        (value for name, value in values.items() if name.endswith("_500_requests")),
        0,
    )
    return query_rows, {
        "total_requests": total_requests,
        "error_requests": error_requests,
        "affected_requests": error_requests,
    }


def _evidence_summaries(raw_evidence: list[object]) -> list[str]:
    summaries: list[str] = []
    for item in raw_evidence:
        if isinstance(item, dict):
            summaries.append(str(item.get("summary", item)))
        else:
            summaries.append(str(item))
    return summaries


def _print_single_scenario_report(
    output_dir: Path,
    scenario_path: Path,
    repo_root: Path,
    runbook_root: Path,
    mode: str,
    verbose: bool,
    captured_model: _CapturingModelClient | None,
) -> None:
    scenario = load_benchmark_scenario(scenario_path)
    result_rows = [
        json.loads(line)
        for line in (output_dir / "results.jsonl").read_text().splitlines()
        if line.strip()
    ]
    if len(result_rows) != 1:
        raise RuntimeError("single-scenario benchmark did not produce exactly one result")

    row = result_rows[0]
    prediction = BenchmarkPrediction.model_validate(row["prediction"])
    score = ScenarioScore.model_validate(row["score"])
    alert = AlertmanagerWebhook.model_validate_json(
        (scenario_path.parent / scenario.alert_fixture).read_text()
    )
    deployments = FixtureDeployHistoryRepository(
        scenario_path.parent / scenario.deploy_history_fixture
    ).load()
    commit_findings = rank_commit_candidates(alert, deployments, repo_root)
    findings_by_sha = {finding.commit_sha: finding for finding in commit_findings}
    captured_candidates = {
        str(candidate["commit_sha"]): candidate
        for candidate in (captured_model.candidates if captured_model else [])
    }
    runbook_findings = retrieve_runbook_chunks(
        alert, load_runbook_chunks(runbook_root), limit=3
    )
    query_rows, impact_values = _load_snapshot(scenario_path.parent / scenario.world_snapshot)
    error_rate = (
        impact_values["error_requests"] / impact_values["total_requests"]
        if impact_values["total_requests"]
        else 0.0
    )
    computed_severity = classify_severity(error_rate, impact_values["affected_requests"])

    print("\nSingle-scenario benchmark")
    print("=========================")
    print(f"Mode: {mode}")
    print(f"Scenario: {scenario.id}")
    print(f"Title: {scenario.title}")
    print(f"Ground truth commit: {scenario.expected.bad_commit_sha}")
    print("\nRanked commit candidates:")
    if not prediction.ranked_commit_shas:
        print("  (none)")
    for rank, commit_sha in enumerate(prediction.ranked_commit_shas, start=1):
        finding = findings_by_sha.get(commit_sha)
        candidate = captured_candidates.get(commit_sha, {})
        title = finding.commit_title if finding else str(candidate.get("commit_title", ""))
        confidence = (
            f"{finding.confidence:.2f}"
            if finding
            else str(candidate.get("deterministic_confidence", "n/a"))
        )
        validation_state = (
            finding.validation_state.value
            if finding
            else str(candidate.get("validation_state", "inconclusive"))
        )
        evidence = (
            [item.summary for item in finding.evidence]
            if finding
            else _evidence_summaries(candidate.get("evidence", []))
        )
        print(
            f"  {rank}. {commit_sha} | {title} | confidence={confidence} "
            f"| validation={validation_state}"
        )
        for item in evidence:
            print(f"     evidence: {item}")

    print("\nMetric results:")
    print(f"  Commit top-1: {'PASS' if score.bad_commit_top1 else 'FAIL'}")
    print(f"  Commit top-3: {'PASS' if score.bad_commit_top3 else 'FAIL'}")
    print(f"  Runbook hit: {'PASS' if score.runbook_hit else 'FAIL'}")
    print(f"  Impact classification: {'PASS' if score.impact_severity_correct else 'FAIL'}")
    print(f"  Latency: {prediction.latency_ms:.2f} ms")
    print(
        f"  Tokens: input={prediction.input_tokens}, "
        f"output={prediction.output_tokens}, total={prediction.total_tokens}"
    )
    if prediction.error:
        print(f"  Error: {prediction.error}")

    print("\nRunbook retrieval:")
    if not runbook_findings:
        print("  (no matches)")
    for rank, finding in enumerate(runbook_findings, start=1):
        print(
            f"  {rank}. {finding.runbook_id} / {finding.section_heading} "
            f"| score={finding.score:.3f} | {finding.summary}"
        )

    print("\nImpact computation:")
    print(
        f"  error rate = {impact_values['error_requests']} / "
        f"{impact_values['total_requests']} = {error_rate:.6f}"
    )
    print(f"  affected requests = {impact_values['affected_requests']}")
    print(f"  severity = {computed_severity}")

    if verbose:
        print("\nVerbose reasoning")
        print("-----------------")
        if captured_model and captured_model.result:
            print("Commit correlation explanation (LLM output):")
            print(captured_model.result.reasoning)
        else:
            print("Commit correlation explanation:")
            if commit_findings:
                print(commit_findings[0].reasoning)
            else:
                print("No commit-correlation finding was produced.")

        print("\nRunbook retrieval scores:")
        for finding in runbook_findings:
            print(f"  {finding.chunk_id}: {finding.score:.6f}")

        print("\nImpact computation inputs:")
        for query in query_rows:
            print(
                f"  {query['name']}: value={query['value']} "
                f"query={query['query']}"
            )
        print(
            f"  classify_severity(error_rate={error_rate:.6f}, "
            f"affected_requests={impact_values['affected_requests']}) -> {computed_severity}"
        )

def main() -> None:
    parser = argparse.ArgumentParser(description="Run Glassbox SRE benchmark scenarios.")
    parser.add_argument("--mode", choices=["replay-fast", "model-eval"], default="replay-fast")
    parser.add_argument(
        "--scenario",
        help="Run one scenario ID from scenarios/benchmark instead of the full corpus.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Show detailed reasoning and intermediate evidence for --scenario.",
    )
    parser.add_argument("--repo-root", type=Path, default=Path.cwd())
    parser.add_argument(
        "--scenarios-dir",
        type=Path,
        default=Path("scenarios/benchmark"),
    )
    parser.add_argument("--runbook-root", type=Path, default=Path("runbooks"))
    parser.add_argument(
        "--artifact-root",
        type=Path,
        default=Path("artifacts/evaluations"),
    )
    args = parser.parse_args()

    if args.verbose and not args.scenario:
        parser.error("--verbose requires --scenario")

    if not args.scenario:
        if args.mode == "model-eval":
            output_dir = run_model_eval_benchmark(
                scenarios_dir=args.scenarios_dir,
                repo_root=args.repo_root,
                runbook_root=args.runbook_root,
                artifact_root=args.artifact_root,
            )
        else:
            output_dir = run_replay_fast_benchmark(
                scenarios_dir=args.scenarios_dir,
                repo_root=args.repo_root,
                runbook_root=args.runbook_root,
                artifact_root=args.artifact_root,
            )
        print(output_dir)
        return

    try:
        scenario_path = select_scenario_path(args.scenarios_dir, args.scenario)
    except ValueError as exc:
        parser.error(str(exc))

    captured_model: _CapturingModelClient | None = None
    with _single_scenario_view(scenario_path) as filtered_scenarios_dir:
        if args.mode == "model-eval":
            captured_model = _CapturingModelClient(OpenAIModelEvalClient())
            output_dir = run_model_eval_benchmark(
                scenarios_dir=filtered_scenarios_dir,
                repo_root=args.repo_root,
                runbook_root=args.runbook_root,
                artifact_root=args.artifact_root,
                model_client=captured_model,
            )
        else:
            output_dir = run_replay_fast_benchmark(
                scenarios_dir=filtered_scenarios_dir,
                repo_root=args.repo_root,
                runbook_root=args.runbook_root,
                artifact_root=args.artifact_root,
            )

    _rewrite_single_scenario_manifest(output_dir, scenario_path)
    _print_single_scenario_report(
        output_dir=output_dir,
        scenario_path=scenario_path,
        repo_root=args.repo_root,
        runbook_root=args.runbook_root,
        mode=args.mode,
        verbose=args.verbose,
        captured_model=captured_model,
    )
    print(output_dir)


if __name__ == "__main__":
    main()
