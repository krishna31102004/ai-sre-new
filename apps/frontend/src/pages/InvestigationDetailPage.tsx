import {
  ArrowLeft,
  BookOpen,
  Check,
  ChartNoAxesCombined,
  CircleAlert,
  Copy,
  ExternalLink,
  GitCommit,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api, type Finding, type InvestigationDetail } from "../api";
import { Collapsible, ConfidencePill, ErrorState, LoadingState, SeverityBadge, StatusBadge } from "../components";
import { number, percent } from "../lib";

function evidenceItems(evidence: unknown): Array<{ kind?: string; summary: string; reference?: string }> {
  if (!Array.isArray(evidence)) return [];
  return evidence.filter((item): item is { kind?: string; summary: string; reference?: string } => (
    typeof item === "object" && item !== null && "summary" in item && typeof item.summary === "string"
  ));
}

function EvidenceList({ finding }: { finding: Finding }) {
  const items = evidenceItems(finding.evidence);
  if (!items.length) return <p className="text-slate-500">No structured evidence was recorded.</p>;
  return <ul className="space-y-2">
    {items.map((item, index) => <li key={`${item.reference ?? item.summary}-${index}`} className="flex gap-2.5 rounded-md border border-line/70 bg-slate-950/35 px-3 py-2.5"><CircleAlert size={15} className="mt-0.5 shrink-0 text-cyan-300" /><span className="min-w-0 text-slate-300">{item.summary}{item.reference && <span className="ml-2 font-mono text-xs text-slate-500">{item.reference}</span>}</span></li>)}
  </ul>;
}

function InvestigatorCard({ title, icon, children, open = false }: { title: string; icon: React.ReactNode; children: React.ReactNode; open?: boolean }) {
  return <div className="rounded-lg border border-line bg-panel/80 px-5 shadow-lg shadow-slate-950/10"><Collapsible title={<span className="flex items-center gap-2.5">{icon}{title}</span>} open={open}>{children}</Collapsible></div>;
}

export function InvestigationDetailPage() {
  const { id = "" } = useParams();
  const [detail, setDetail] = useState<InvestigationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
  const copyBrief = async () => {
    if (!detail.brief) return;
    await navigator.clipboard.writeText(detail.brief);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section className="max-w-5xl pb-8">
      <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-cyan-300"><ArrowLeft size={16} /> All investigations</Link>
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Investigation detail</p>
          <h1>{investigation.alert_name}</h1>
          <p className="mt-2 font-mono text-sm text-cyan-300">{investigation.service}</p>
        </div>
        <div className="flex gap-2"><StatusBadge status={investigation.status} /><SeverityBadge severity={investigation.severity} /></div>
      </div>
      <div className="mb-6 grid gap-px overflow-hidden rounded-lg border border-line bg-line text-sm sm:grid-cols-3">
        <div className="bg-panel p-4"><span className="label">Started</span><span className="font-mono text-xs tabular-nums text-slate-300">{new Date(investigation.started_at).toLocaleString()}</span></div>
        <div className="bg-panel p-4"><span className="label">Resolved</span><span className="font-mono text-xs tabular-nums text-slate-300">{investigation.resolved_at ? new Date(investigation.resolved_at).toLocaleString() : "Active"}</span></div>
        <div className="bg-panel p-4"><span className="label">Validation</span><span className="capitalize text-slate-300">{investigation.validation_state ?? "--"}</span></div>
      </div>
      <div className="mb-6 overflow-hidden rounded-lg border border-line bg-[#090e1b] shadow-xl shadow-slate-950/20">
        <div className="flex items-center justify-between border-b border-line/80 bg-slate-900/75 px-4 py-2.5"><span className="font-mono text-xs text-slate-500">{investigation.investigation_id}</span><button className="icon-button h-7 w-auto gap-1.5 px-2.5 text-xs" onClick={() => void copyBrief()} title="Copy incident brief">{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copied" : "Copy"}</button></div>
        <div className="p-5"><p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Rendered incident brief</p><pre className="max-h-[480px] overflow-auto whitespace-pre-wrap font-mono text-sm leading-6 text-slate-200">{detail.brief ?? "No final brief was persisted."}</pre></div>
      </div>
      <div className="space-y-3">
        <InvestigatorCard title="Commit correlation" icon={<GitCommit size={17} className="text-cyan-300" />} open>
          {commitFinding ? <dl className="detail-grid"><dt>Commit</dt><dd className="font-mono text-cyan-200">{commitFinding.commit_sha ?? "--"}</dd><dt>Title</dt><dd>{commitFinding.commit_title ?? "--"}</dd><dt>Confidence</dt><dd><ConfidencePill confidence={commitFinding.confidence} /></dd><dt>Evidence</dt><dd><EvidenceList finding={commitFinding} /></dd></dl> : <p className="rounded-md border border-amber-900/70 bg-amber-950/20 p-3 leading-6 text-amber-100">{emptyDeployWindow ? "Suspect commit: none - no deploys found in the correlation window. The rendered brief contains the exact correlation-window evidence; available runbook and impact evidence is shown below." : "Investigation completed with partial findings. No commit-correlation candidate was returned; the available runbook and impact evidence is shown below."}</p>}
        </InvestigatorCard>
        <InvestigatorCard title="Runbook retrieval" icon={<BookOpen size={17} className="text-cyan-300" />}>
          <dl className="detail-grid"><dt>Runbook</dt><dd>{investigation.runbook_id ?? "Not available"}</dd><dt>Section</dt><dd>{investigation.runbook_section ?? "Not available"}</dd><dt>Score</dt><dd className="font-mono tabular-nums">{investigation.runbook_score?.toFixed(2) ?? "Not available"}</dd></dl>
        </InvestigatorCard>
        <InvestigatorCard title="Impact estimation" icon={<ChartNoAxesCombined size={17} className="text-cyan-300" />}>
          <dl className="detail-grid"><dt>Error rate</dt><dd className="font-mono tabular-nums">{percent(investigation.error_rate)}</dd><dt>Affected requests</dt><dd className="font-mono tabular-nums">{number(investigation.affected_requests)}</dd><dt>Severity</dt><dd><SeverityBadge severity={investigation.severity} /></dd><dt>Evidence</dt><dd>Computed from Prometheus counters for {investigation.service}.</dd></dl>
        </InvestigatorCard>
      </div>
      <div className="mt-5 flex flex-wrap gap-3 text-sm">
        {slackUrl && <a className="link-button" href={slackUrl} target="_blank" rel="noreferrer">Slack thread <ExternalLink size={15} /></a>}
        {investigation.langsmith_trace_url && <a className="link-button" href={investigation.langsmith_trace_url} target="_blank" rel="noreferrer">LangSmith trace <ExternalLink size={15} /></a>}
        {!slackUrl && !investigation.langsmith_trace_url && <span className="text-slate-500">No external links were recorded for this investigation.</span>}
      </div>
    </section>
  );
}
