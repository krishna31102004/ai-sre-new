from __future__ import annotations

import json
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Protocol
from uuid import uuid4

from openai import OpenAI
from pydantic import BaseModel, Field, field_validator

from glassbox_sre.benchmark import BenchmarkScenario, load_benchmark_scenario
from glassbox_sre.benchmark_adapters import FixtureDeployHistoryRepository
from glassbox_sre.benchmark_scoring import (
    BenchmarkPrediction,
    BenchmarkSummary,
    ScenarioScore,
    score_prediction,
    summarize_scores,
)
from glassbox_sre.commit_correlation import (
    alert_start_time,
    deployments_in_window,
    git_show_diff,
    rank_commit_candidates,
)
from glassbox_sre.config import Settings, get_settings
from glassbox_sre.impact import classify_severity
from glassbox_sre.runbooks import load_runbook_chunks, retrieve_runbook_chunks
from glassbox_sre.schemas import AlertmanagerWebhook


class ModelEvalResult(BaseModel):
    root_cause_id: str | None = None
    ranked_commit_shas: list[str] = Field(default_factory=list)
    reasoning: str

    @field_validator("reasoning", mode="before")
    @classmethod
    def normalize_reasoning(cls, value: object) -> str:
        if isinstance(value, list):
            return " ".join(str(item) for item in value)
        return str(value)


class ModelClient(Protocol):
    def evaluate_commit_candidates(
        self,
        scenario: BenchmarkScenario,
        alert: AlertmanagerWebhook,
        candidates: list[dict[str, object]],
    ) -> tuple[ModelEvalResult, dict[str, int]]:
        raise NotImplementedError


class OpenAIModelEvalClient:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        if not self.settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY must be set for model-eval mode.")
        self.client = OpenAI(api_key=self.settings.openai_api_key)
        self.model = self.settings.openai_triage_model

    def evaluate_commit_candidates(
        self,
        scenario: BenchmarkScenario,
        alert: AlertmanagerWebhook,
        candidates: list[dict[str, object]],
    ) -> tuple[ModelEvalResult, dict[str, int]]:
        response = self.client.chat.completions.create(
            model=self.model,
            temperature=0,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are evaluating a read-only SRE benchmark scenario. "
                        "Use only the alert and candidate deploy evidence. Rank commits by "
                        "which diff best explains the incident. Return strict JSON with "
                        "ranked_commit_shas and reasoning. Include root_cause_id only if "
                        "you can name a stable root-cause label from the provided evidence."
                    ),
                },
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "scenario_id": scenario.id,
                            "alert": alert.model_dump(mode="json", by_alias=True),
                            "candidates": candidates,
                        },
                        sort_keys=True,
                    ),
                },
            ],
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content or "{}"
        result = ModelEvalResult.model_validate_json(content)
        usage = response.usage
        return result, {
            "input_tokens": usage.prompt_tokens if usage else 0,
            "output_tokens": usage.completion_tokens if usage else 0,
            "total_tokens": usage.total_tokens if usage else 0,
        }


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
            root_cause_id=None,
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
            unavailable_metrics={
                "root_cause": "not wired in replay-fast mode",
            },
        )
    except Exception as exc:
        prediction = BenchmarkPrediction(
            scenario_id=scenario.id,
            latency_ms=(time.perf_counter() - started) * 1000,
            error=f"{type(exc).__name__}: {exc}",
        )
    return scenario, prediction, score_prediction(scenario, prediction)


def run_model_eval_scenario(
    scenario_path: Path,
    repo_root: Path,
    runbook_root: Path,
    model_client: ModelClient,
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
        deterministic_findings = rank_commit_candidates(alert, deployments, repo_root)
        findings_by_sha = {finding.commit_sha: finding for finding in deterministic_findings}
        candidate_context = [
            {
                "commit_sha": deployment.commit_sha,
                "commit_title": deployment.commit_title,
                "service_name": deployment.service_name,
                "deployed_at": deployment.deployed_at.isoformat(),
                "deterministic_confidence": findings_by_sha.get(deployment.commit_sha).confidence
                if deployment.commit_sha in findings_by_sha
                else None,
                "validation_state": findings_by_sha.get(deployment.commit_sha).validation_state.value
                if deployment.commit_sha in findings_by_sha
                else "inconclusive",
                "evidence": [
                    item.model_dump(mode="json")
                    for item in findings_by_sha.get(deployment.commit_sha).evidence
                ]
                if deployment.commit_sha in findings_by_sha
                else [],
                "diff": git_show_diff(deployment.commit_sha, repo_root, max_chars=1800),
            }
            for deployment in deployments_in_window(deployments, alert_start_time(alert))
        ]
        model_result, token_usage = model_client.evaluate_commit_candidates(
            scenario,
            alert,
            candidate_context,
        )
        runbook_findings = retrieve_runbook_chunks(alert, load_runbook_chunks(runbook_root), limit=3)
        impact_values = _impact_values_from_snapshot(scenario_dir / scenario.world_snapshot)
        prediction = BenchmarkPrediction(
            scenario_id=scenario.id,
            root_cause_id=None,
            ranked_commit_shas=model_result.ranked_commit_shas,
            runbook_ids=[finding.runbook_id for finding in runbook_findings],
            runbook_sections=[finding.section_heading for finding in runbook_findings],
            impact_severity=classify_severity(
                impact_values["error_requests"] / impact_values["total_requests"]
                if impact_values["total_requests"]
                else 0.0,
                impact_values["affected_requests"],
            ),
            latency_ms=(time.perf_counter() - started) * 1000,
            input_tokens=token_usage["input_tokens"],
            output_tokens=token_usage["output_tokens"],
            total_tokens=token_usage["total_tokens"],
            unavailable_metrics={
                "root_cause": "evaluator output missing",
            },
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
    return _run_benchmark(
        mode="replay-fast",
        scenarios_dir=scenarios_dir,
        repo_root=repo_root,
        runbook_root=runbook_root,
        artifact_root=artifact_root,
    )


def run_model_eval_benchmark(
    scenarios_dir: Path,
    repo_root: Path,
    runbook_root: Path,
    artifact_root: Path,
    model_client: ModelClient | None = None,
) -> Path:
    return _run_benchmark(
        mode="model-eval",
        scenarios_dir=scenarios_dir,
        repo_root=repo_root,
        runbook_root=runbook_root,
        artifact_root=artifact_root,
        model_client=model_client or OpenAIModelEvalClient(),
    )


def _run_benchmark(
    mode: str,
    scenarios_dir: Path,
    repo_root: Path,
    runbook_root: Path,
    artifact_root: Path,
    model_client: ModelClient | None = None,
) -> Path:
    run_id = f"{datetime.now(UTC).strftime('%Y%m%dT%H%M%SZ')}-{uuid4().hex[:8]}"
    output_dir = artifact_root / run_id
    output_dir.mkdir(parents=True, exist_ok=False)

    scenario_paths = discover_scenario_paths(scenarios_dir)
    rows: list[dict[str, object]] = []
    scores: list[ScenarioScore] = []
    for scenario_path in scenario_paths:
        if mode == "model-eval":
            if model_client is None:
                raise RuntimeError("model_client is required for model-eval mode")
            scenario, prediction, score = run_model_eval_scenario(
                scenario_path,
                repo_root=repo_root,
                runbook_root=runbook_root,
                model_client=model_client,
            )
        else:
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
    _write_json(output_dir / "manifest.json", _manifest(run_id, mode, repo_root, scenario_paths))
    (output_dir / "results.jsonl").write_text(
        "\n".join(json.dumps(row, sort_keys=True) for row in rows) + "\n"
    )
    _write_json(output_dir / "summary.json", summary.model_dump(mode="json"))
    (output_dir / "summary.md").write_text(_summary_markdown(run_id, mode, summary, scores))
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


def _manifest(
    run_id: str,
    mode: str,
    repo_root: Path,
    scenario_paths: list[Path],
) -> dict[str, object]:
    return {
        "run_id": run_id,
        "mode": mode,
        "generated_at": datetime.now(UTC).isoformat(),
        "repo_root": str(repo_root),
        "scenario_count": len(scenario_paths),
        "scenarios": [str(path) for path in scenario_paths],
    }


def _write_json(path: Path, payload: object) -> None:
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")


def _summary_markdown(
    run_id: str,
    mode: str,
    summary: BenchmarkSummary,
    scores: list[ScenarioScore],
) -> str:
    lines = [
        f"# Glassbox SRE Benchmark Summary: {run_id}",
        "",
        f"- Mode: `{mode}`",
        f"- Scenario count: {summary.scenario_count}",
        f"- Failed runs: {summary.failed_runs}",
        f"- Root-cause precision: {_format_metric(summary.root_cause_precision, summary.unavailable_metrics.get('root_cause_precision'))}",
        f"- Root-cause recall: {_format_metric(summary.root_cause_recall, summary.unavailable_metrics.get('root_cause_recall'))}",
        f"- Bad commit top-1 accuracy: {summary.bad_commit_top1_accuracy:.3f}",
        f"- Bad commit top-3 accuracy: {summary.bad_commit_top3_accuracy:.3f}",
        f"- Runbook hit rate: {summary.runbook_hit_rate:.3f}",
        f"- Runbook section hit rate: {summary.runbook_section_hit_rate:.3f}",
        f"- Impact classification accuracy: {summary.impact_classification_accuracy:.3f}",
        f"- Latency p50 ms: {summary.latency_p50_ms:.2f}",
        f"- Latency p95 ms: {summary.latency_p95_ms:.2f}",
        f"- Input tokens: {summary.input_tokens}",
        f"- Output tokens: {summary.output_tokens}",
        f"- Total tokens: {summary.total_tokens}",
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


def _mark(value: bool | None) -> str:
    if value is None:
        return "n/a"
    return "pass" if value else "fail"


def _format_metric(value: float | None, reason: str | None = None) -> str:
    if value is None:
        return f"n/a ({reason or 'not available'})"
    return f"{value:.3f}"
