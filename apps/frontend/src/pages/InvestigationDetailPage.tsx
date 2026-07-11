import { ArrowLeft, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api, type InvestigationDetail } from "../api";
import { Collapsible, ConfidencePill, ErrorState, LoadingState, SeverityBadge, StatusBadge } from "../components";
import { number, percent } from "../lib";

function json(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

export function InvestigationDetailPage() {
  const { id = "" } = useParams();
  const [detail, setDetail] = useState<InvestigationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api.investigation(id).then(setDetail).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load investigation"));
  }, [id]);

  if (error) return <ErrorState message={error} />;
  if (!detail) return <LoadingState />;
  const { investigation, findings } = detail;
  const commitFinding = findings[0];
  const emptyDeployWindow = detail.brief?.includes("no deploys found in the correlation window");
  const slackUrl = investigation.slack_thread_ts && investigation.slack_channel
    ? `https://app.slack.com/client/${investigation.slack_channel}/thread/${investigation.slack_thread_ts.replace(".", "")}`
    : null;

  return (
    <section className="max-w-5xl">
      <Link to="/" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-cyan-300"><ArrowLeft size={16} /> All investigations</Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Investigation detail</p>
          <h1>{investigation.alert_name}</h1>
          <p className="mt-2 font-mono text-sm text-cyan-300">{investigation.service}</p>
        </div>
        <div className="flex gap-2"><StatusBadge status={investigation.status} /><SeverityBadge severity={investigation.severity} /></div>
      </div>
      <div className="mb-6 grid gap-3 rounded border border-line bg-panel p-4 text-sm sm:grid-cols-3">
        <div><span className="label">Started</span><span>{new Date(investigation.started_at).toLocaleString()}</span></div>
        <div><span className="label">Resolved</span><span>{investigation.resolved_at ? new Date(investigation.resolved_at).toLocaleString() : "Active"}</span></div>
        <div><span className="label">Validation</span><span>{investigation.validation_state ?? "--"}</span></div>
      </div>
      <div className="mb-6 rounded border border-line bg-slate-950/70 p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Rendered incident brief</p>
        <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap font-mono text-sm leading-6 text-slate-200">{detail.brief ?? "No final brief was persisted."}</pre>
      </div>
      <div className="rounded border border-line bg-panel px-5">
        <Collapsible title="Commit correlation" open>
          {commitFinding ? <dl className="detail-grid"><dt>Commit</dt><dd className="font-mono">{commitFinding.commit_sha ?? "--"}</dd><dt>Title</dt><dd>{commitFinding.commit_title ?? "--"}</dd><dt>Confidence</dt><dd><ConfidencePill confidence={commitFinding.confidence} /></dd><dt>Evidence</dt><dd><pre className="evidence">{json(commitFinding.evidence)}</pre></dd></dl> : <p className="rounded border border-amber-900/70 bg-amber-950/20 p-3 text-amber-100">{emptyDeployWindow ? "Suspect commit: none - no deploys found in the correlation window. The rendered brief contains the exact correlation-window evidence; available runbook and impact evidence is shown below." : "Investigation completed with partial findings. No commit-correlation candidate was returned; the available runbook and impact evidence is shown below."}</p>}
        </Collapsible>
        <Collapsible title="Runbook retrieval">
          <dl className="detail-grid"><dt>Runbook</dt><dd>{investigation.runbook_id ?? "Not available"}</dd><dt>Section</dt><dd>{investigation.runbook_section ?? "Not available"}</dd><dt>Score</dt><dd>{investigation.runbook_score?.toFixed(2) ?? "Not available"}</dd></dl>
        </Collapsible>
        <Collapsible title="Impact estimation">
          <dl className="detail-grid"><dt>Error rate</dt><dd>{percent(investigation.error_rate)}</dd><dt>Affected requests</dt><dd>{number(investigation.affected_requests)}</dd><dt>Severity</dt><dd><SeverityBadge severity={investigation.severity} /></dd><dt>Evidence</dt><dd>{`Computed from Prometheus counters for ${investigation.service}.`}</dd></dl>
        </Collapsible>
      </div>
      <div className="mt-5 flex flex-wrap gap-3 text-sm">
        {slackUrl && <a className="link-button" href={slackUrl} target="_blank" rel="noreferrer">Slack thread <ExternalLink size={15} /></a>}
        {investigation.langsmith_trace_url && <a className="link-button" href={investigation.langsmith_trace_url} target="_blank" rel="noreferrer">LangSmith trace <ExternalLink size={15} /></a>}
        {!slackUrl && !investigation.langsmith_trace_url && <span className="text-slate-500">No external links were recorded for this investigation.</span>}
      </div>
    </section>
  );
}
