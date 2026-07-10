from glassbox_sre.schemas import (
    CommitCorrelationFinding,
    EvidenceItem,
    HypothesisValidationState,
    ImpactEstimate,
    RunbookRetrievalFinding,
)
from glassbox_sre.synthesis import synthesize_incident_brief


def test_synthesis_brief_includes_commit_runbook_and_impact() -> None:
    commit = CommitCorrelationFinding(
        commit_sha="41080eb518884c6aeede13111f8214a7c87db3fb",
        commit_title="Seed frontend ad failure ground truth scenario",
        service_name="frontend",
        confidence=0.9,
        validation_state=HypothesisValidationState.VALIDATED,
        evidence=[EvidenceItem(kind="commit", summary="commit evidence", reference="sha")],
        reasoning="matched",
    )
    runbook = RunbookRetrievalFinding(
        runbook_id="otel-demo.frontend-ad-failure",
        chunk_id="otel-demo.frontend-ad-failure:signals",
        title="Frontend ad failure causing HTTP 500s",
        section_heading="Signals",
        service="frontend",
        alertname="OTelDemoAdServiceErrors",
        score=0.98,
        evidence=[EvidenceItem(kind="runbook", summary="runbook evidence", reference="chunk")],
        summary="Use this runbook when frontend 500s are active.",
    )
    impact = ImpactEstimate(
        service_name="frontend",
        window="5m",
        total_requests=300,
        error_requests=9,
        error_rate=0.03,
        affected_requests=9,
        severity="page",
        latency_p95_ms=None,
        evidence=[EvidenceItem(kind="metric", summary="metric evidence", reference="prometheus")],
    )

    brief = synthesize_incident_brief(
        "firing",
        "OTelDemoAdServiceErrors",
        "frontend",
        commit,
        runbook,
        impact,
        ["frontend", "ad"],
        ["/", "/api/ad"],
    )

    assert "suspect commit:" in brief.brief
    assert "runbook: otel-demo.frontend-ad-failure / Signals" in brief.brief
    assert "impact: error_rate=0.0300, affected_requests=9, severity=page" in brief.brief
    assert "affected services: frontend, ad" in brief.brief
    assert "affected endpoints: /, /api/ad" in brief.brief
