from __future__ import annotations

from pydantic import BaseModel, Field

from glassbox_sre.schemas import CommitCorrelationFinding, ImpactEstimate, RunbookRetrievalFinding


class SynthesizedIncidentBrief(BaseModel):
    status: str
    alert_name: str
    service_name: str
    suspect_commit: CommitCorrelationFinding | None = None
    runbook: RunbookRetrievalFinding | None = None
    impact: ImpactEstimate | None = None
    affected_services: list[str] = Field(default_factory=list)
    affected_endpoints: list[str] = Field(default_factory=list)
    brief: str


def synthesize_incident_brief(
    status: str,
    alert_name: str,
    service_name: str,
    suspect_commit: CommitCorrelationFinding | None,
    runbook: RunbookRetrievalFinding | None,
    impact: ImpactEstimate | None,
    affected_services: list[str] | None = None,
    affected_endpoints: list[str] | None = None,
    empty_deploy_window_evidence: str | None = None,
) -> SynthesizedIncidentBrief:
    lines = [
        "[investigation brief]",
        f"status: {status}",
        f"alerts: {alert_name}",
        f"services: {service_name}",
    ]

    if affected_services:
        lines.append(f"affected services: {', '.join(affected_services)}")

    if affected_endpoints:
        lines.append(f"affected endpoints: {', '.join(affected_endpoints)}")

    if suspect_commit is not None:
        commit_evidence = "; ".join(item.summary for item in suspect_commit.evidence)
        lines.extend(
            [
                (
                    f"suspect commit: {suspect_commit.commit_sha[:12]} - "
                    f"{suspect_commit.commit_title} (evidence: {commit_evidence})"
                ),
                f"confidence: {suspect_commit.confidence:.2f} (evidence: {commit_evidence})",
                (
                    f"validation: {suspect_commit.validation_state.value} "
                    f"(evidence: {commit_evidence})"
                ),
            ]
        )
    elif empty_deploy_window_evidence is not None:
        lines.append(
            "suspect commit: none - no deploys found in the correlation window "
            f"(evidence: {empty_deploy_window_evidence})"
        )

    if runbook is not None:
        runbook_evidence = "; ".join(item.summary for item in runbook.evidence)
        lines.extend(
            [
                (
                    f"runbook: {runbook.runbook_id} / {runbook.section_heading} "
                    f"(evidence: {runbook_evidence})"
                ),
                f"runbook score: {runbook.score:.2f} (evidence: {runbook_evidence})",
            ]
        )

    if impact is not None:
        lines.extend(
            [
                (
                    f"impact: error_rate={impact.error_rate:.4f}, "
                    f"affected_requests={impact.affected_requests:g}, "
                    f"severity={impact.severity} "
                    f"(evidence: {', '.join(item.summary for item in impact.evidence)})"
                ),
            ]
        )
        if impact.latency_p95_ms is not None:
            lines.append(f"latency_p95_ms: {impact.latency_p95_ms:.1f}")
        else:
            lines.append("latency_p95_ms: not available")

    return SynthesizedIncidentBrief(
        status=status,
        alert_name=alert_name,
        service_name=service_name,
        suspect_commit=suspect_commit,
        runbook=runbook,
        impact=impact,
        affected_services=affected_services or [],
        affected_endpoints=affected_endpoints or [],
        brief="\n".join(lines),
    )
