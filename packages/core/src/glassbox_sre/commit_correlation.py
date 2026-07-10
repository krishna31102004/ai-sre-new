from __future__ import annotations

import subprocess
from datetime import datetime, timedelta
from pathlib import Path

from glassbox_sre.schemas import (
    AlertmanagerWebhook,
    CommitCorrelationFinding,
    DeployRecord,
    EvidenceItem,
    HypothesisValidationState,
)

SERVICE_PATH_HINTS = {
    "frontend": ("frontend", "ad", "recommendation"),
    "shipping": ("shipping",),
    "currency": ("currency",),
}


def alert_service_names(payload: AlertmanagerWebhook) -> list[str]:
    return sorted(
        {
            alert.labels.get("service")
            or alert.labels.get("service_name")
            or alert.labels.get("job")
            or "unknown-service"
            for alert in payload.alerts
        }
    )


def alert_start_time(payload: AlertmanagerWebhook) -> datetime:
    return min(alert.starts_at for alert in payload.alerts)


def deployments_in_window(
    deployments: list[DeployRecord],
    alert_started_at: datetime,
    lookback: timedelta = timedelta(hours=24),
    lookahead: timedelta = timedelta(minutes=5),
) -> list[DeployRecord]:
    window_start = alert_started_at - lookback
    window_end = alert_started_at + lookahead
    return sorted(
        [
            deployment
            for deployment in deployments
            if window_start <= deployment.deployed_at <= window_end
        ],
        key=lambda deployment: deployment.deployed_at,
        reverse=True,
    )


def candidate_deployments_for_alert(
    payload: AlertmanagerWebhook,
    deployments: list[DeployRecord],
    lookback: timedelta = timedelta(hours=24),
) -> list[DeployRecord]:
    services = set(alert_service_names(payload))
    candidates = deployments_in_window(deployments, alert_start_time(payload), lookback=lookback)
    service_matches = [
        deployment for deployment in candidates if deployment.service_name in services
    ]
    return service_matches or candidates


def git_show_name_only(commit_sha: str, repo_root: Path) -> list[str]:
    output = subprocess.check_output(
        ["git", "show", "--name-only", "--format=", commit_sha],
        cwd=repo_root,
        text=True,
    )
    return [line.strip() for line in output.splitlines() if line.strip()]


def git_log_candidate_shas(repo_root: Path, max_count: int = 25) -> list[str]:
    output = subprocess.check_output(
        ["git", "log", f"--max-count={max_count}", "--format=%H"],
        cwd=repo_root,
        text=True,
    )
    return [line.strip() for line in output.splitlines() if line.strip()]


def git_show_diff(commit_sha: str, repo_root: Path, max_chars: int = 4000) -> str:
    output = subprocess.check_output(
        ["git", "show", "--format=fuller", "--stat", "--patch", commit_sha],
        cwd=repo_root,
        text=True,
    )
    return output[:max_chars]


def rank_commit_candidates(
    payload: AlertmanagerWebhook,
    deployments: list[DeployRecord],
    repo_root: Path,
) -> list[CommitCorrelationFinding]:
    alert_services = set(alert_service_names(payload))
    candidates = candidate_deployments_for_alert(payload, deployments)
    findings: list[CommitCorrelationFinding] = []

    for deployment in candidates:
        changed_paths = git_show_name_only(deployment.commit_sha, repo_root)
        hints = SERVICE_PATH_HINTS.get(deployment.service_name, (deployment.service_name,))
        service_match = deployment.service_name in alert_services
        path_match = any(
            any(hint in changed_path for hint in hints) for changed_path in changed_paths
        )
        confidence = 0.35
        evidence: list[EvidenceItem] = [
            EvidenceItem(
                kind="deploy",
                summary=(
                    f"{deployment.service_name} deployed at "
                    f"{deployment.deployed_at.isoformat()} before the alert."
                ),
                reference=deployment.deployment_id,
                metadata={"deployed_at": deployment.deployed_at.isoformat()},
            ),
            EvidenceItem(
                kind="commit",
                summary=f"Commit touched {', '.join(changed_paths) or deployment.repo_path}.",
                reference=deployment.commit_sha,
                metadata={"changed_paths": changed_paths},
            ),
        ]

        if service_match:
            confidence += 0.35
            evidence.append(
                EvidenceItem(
                    kind="heuristic",
                    summary="Deployment service matches the alert service.",
                    reference=deployment.service_name,
                )
            )
        if path_match:
            confidence += 0.2
            evidence.append(
                EvidenceItem(
                    kind="heuristic",
                    summary="Changed path matches service or symptom keywords.",
                    reference=deployment.repo_path,
                    metadata={"hints": list(hints)},
                )
            )

        state = (
            HypothesisValidationState.VALIDATED
            if service_match and path_match
            else HypothesisValidationState.INCONCLUSIVE
        )
        findings.append(
            CommitCorrelationFinding(
                commit_sha=deployment.commit_sha,
                commit_title=deployment.commit_title,
                service_name=deployment.service_name,
                confidence=round(min(confidence, 0.95), 2),
                validation_state=state,
                evidence=evidence,
                reasoning=(
                    "Ranked by deploy timing, alert-service match, and changed-path "
                    "hints. Diff ranking will become LLM-assisted later in Phase 1."
                ),
            )
        )

    return sorted(findings, key=lambda finding: finding.confidence, reverse=True)
