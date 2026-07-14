import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChartNoAxesCombined,
  Clock3,
  Copy,
  DatabaseZap,
  ExternalLink,
  GitCommit,
  MinusCircle,
  ShieldCheck,
  Slack,
  Workflow,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api, DEMO_MODE, type Finding, type InvestigationDetail } from "../api";
import { ConfidencePill, ErrorState, LoadingState, SeverityBadge, StatusBadge } from "../components";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";
import { Badge } from "../components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "../components/ui/tooltip";
import { number, percent } from "../lib";

type BriefRow = { label: string; value: string };
type ViewMode = "brief" | "timeline";

function evidenceItems(evidence: unknown): Array<{ kind?: string; summary: string; reference?: string }> {
  if (!Array.isArray(evidence)) return [];
  return evidence.filter((item): item is { kind?: string; summary: string; reference?: string } => (
    typeof item === "object" && item !== null && "summary" in item && typeof item.summary === "string"
  ));
}

function EvidenceList({ finding }: { finding: Finding }) {
  const items = evidenceItems(finding.evidence);
  if (!items.length) return <p className="text-slate-500">No structured evidence was recorded.</p>;
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={`${item.reference ?? item.summary}-${index}`} className="flex gap-3 rounded-md border border-line bg-black/20 px-3 py-2.5">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-healthy" />
          <span className="min-w-0 text-slate-300">
            {item.summary}
            {item.reference && <span className="ml-2 font-mono text-xs text-slate-500">{item.reference}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

function parseBriefRows(brief: string | null): BriefRow[] {
  if (!brief) return [];
  return brief
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && line !== "[investigation brief]")
    .map((line) => {
      const separator = line.indexOf(":");
      if (separator === -1) {
        return { label: "NOTE", value: line };
      }
      return {
        label: line.slice(0, separator).trim().toUpperCase(),
        value: line.slice(separator + 1).trim(),
      };
    });
}

function formatDelta(previous: string | null, current: string): string {
  if (!previous) return "+0.0s";
  const deltaMs = new Date(current).getTime() - new Date(previous).getTime();
  return `+${(deltaMs / 1000).toFixed(1)}s`;
}

function timelinePresentation(eventType: string) {
  switch (eventType) {
    case "alert_received":
      return { label: "Alert received", icon: ShieldCheck, tone: "border-firing" };
    case "queued_to_redis":
      return { label: "Queued to Redis", icon: DatabaseZap, tone: "border-accent" };
    case "triage_completed":
      return { label: "Triage completed", icon: Workflow, tone: "border-warning" };
    case "commit_correlation_completed":
      return { label: "Commit correlation completed", icon: GitCommit, tone: "border-accent" };
    case "runbook_retrieval_completed":
      return { label: "Runbook retrieval completed", icon: BookOpen, tone: "border-healthy" };
    case "impact_estimation_completed":
      return { label: "Impact estimation completed", icon: ChartNoAxesCombined, tone: "border-warning" };
    case "brief_posted":
      return { label: "Brief posted to Slack", icon: Slack, tone: "border-accent" };
    case "resolved":
      return { label: "Alert resolved", icon: CheckCircle2, tone: "border-healthy" };
    case "postmortem_generated":
      return { label: "Postmortem generated", icon: Clock3, tone: "border-slate-500" };
    default:
      return { label: eventType, icon: Clock3, tone: "border-slate-500" };
  }
}

function InvestigatorCard({
  value,
  title,
  summary,
  found,
  icon,
  children,
}: {
  value: string;
  title: string;
  summary: string;
  found: boolean;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <AccordionItem value={value} className="rounded-glass border border-line bg-panel/85 px-5 shadow-lift">
      <AccordionTrigger>
        <span className="flex min-w-0 items-center gap-3">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${found ? "border-healthy/25 bg-healthy/10 text-emerald-300" : "border-white/10 bg-white/5 text-slate-500"}`}>
            {found ? <CheckCircle2 size={16} /> : <MinusCircle size={16} />}
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="flex items-center gap-2 text-slate-100">{icon}{title}</span>
            <span className="truncate text-xs font-normal text-slate-500">{summary}</span>
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent>{children}</AccordionContent>
    </AccordionItem>
  );
}

export function InvestigationDetailPage() {
  const { id = "" } = useParams();
  const [detail, setDetail] = useState<InvestigationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("brief");

  useEffect(() => {
    void api.investigation(id).then(setDetail).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load investigation"));
  }, [id]);

  if (error) return <ErrorState message={error} />;
  if (!detail) return <LoadingState />;

  const { investigation, findings } = detail;
  const commitFinding = findings[0];
  const emptyDeployWindow = detail.brief?.includes("no deploys found in the correlation window");
  const briefRows = parseBriefRows(detail.brief);
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
    <section className="max-w-6xl pb-8">
      <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-blue-300">
        <ArrowLeft size={16} /> All investigations
      </Link>
      <div className="glass-card mb-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Investigation detail</p>
            <h1 className="mt-2">{investigation.alert_name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="accent" className="font-mono">{investigation.service}</Badge>
              <StatusBadge status={investigation.status} />
              <SeverityBadge severity={investigation.severity} />
            </div>
          </div>
          <ShieldCheck className="mt-1 text-blue-300" size={24} />
        </div>
        <div className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
          <div className="soft-card p-4"><span className="label">Started</span><span className="font-mono text-xs tabular-nums text-slate-300">{new Date(investigation.started_at).toLocaleString()}</span></div>
          <div className="soft-card p-4"><span className="label">Resolved</span><span className="font-mono text-xs tabular-nums text-slate-300">{investigation.resolved_at ? new Date(investigation.resolved_at).toLocaleString() : "Active"}</span></div>
          <div className="soft-card p-4"><span className="label">Validation</span><span className="capitalize text-slate-300">{investigation.validation_state ?? "--"}</span></div>
        </div>
      </div>
      <div className="mb-6 overflow-hidden rounded-glass border border-line bg-[#050915] shadow-lift">
        <div className="flex items-center justify-between border-b border-line bg-white/[0.03] px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-firing" /><span className="h-2.5 w-2.5 rounded-full bg-warning" /><span className="h-2.5 w-2.5 rounded-full bg-healthy" /></span>
            <span className="truncate font-mono text-xs text-slate-500">{investigation.investigation_id}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-md border border-line bg-white/[0.03] p-1">
              <button className={`rounded px-2.5 py-1 text-xs ${viewMode === "brief" ? "bg-accent/15 text-blue-100" : "text-slate-400 hover:text-slate-200"}`} onClick={() => setViewMode("brief")}>Brief</button>
              <button className={`rounded px-2.5 py-1 text-xs ${viewMode === "timeline" ? "bg-accent/15 text-blue-100" : "text-slate-400 hover:text-slate-200"}`} onClick={() => setViewMode("timeline")}>Timeline</button>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="icon-button h-8 w-auto gap-1.5 px-2.5 text-xs" onClick={() => void copyBrief()} aria-label="Copy incident brief">
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </TooltipTrigger>
              <TooltipContent>Copy incident brief</TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="p-5">
          {viewMode === "brief" ? (
            <>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Rendered incident brief</p>
              {briefRows.length ? (
                <div className="max-h-[520px] overflow-auto rounded-md border border-line/80 bg-white/[0.02] font-mono text-sm text-slate-200">
                  {briefRows.map((row, index) => (
                    <div
                      key={`${row.label}-${index}`}
                      className={`grid gap-2 px-4 py-3 sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-4 ${index === briefRows.length - 1 ? "" : "border-b border-line/70"}`}
                    >
                      <div className="text-[11px] font-semibold tracking-[0.12em] text-slate-500">{row.label}</div>
                      <div className="whitespace-pre-wrap break-words leading-6 text-slate-200">{row.value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap font-mono text-sm leading-6 text-slate-200">{detail.brief ?? "No final brief was persisted."}</pre>
              )}
            </>
          ) : (
            <>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Investigation timeline</p>
              <div className="space-y-3">
                {detail.events.map((event, index) => {
                  const presentation = timelinePresentation(event.event_type);
                  const Icon = presentation.icon;
                  const previousTimestamp = index > 0 ? detail.events[index - 1].occurred_at : null;
                  return (
                    <div key={`${event.event_type}-${event.occurred_at}`} className={`rounded-md border border-line bg-white/[0.02] border-l-4 ${presentation.tone} px-4 py-3`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md border border-line bg-black/20 text-blue-200">
                            <Icon size={15} />
                          </span>
                          <div>
                            <div className="font-medium text-slate-100">{presentation.label}</div>
                            <div className="mt-1 text-sm leading-6 text-slate-400">{event.summary}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-xs tabular-nums text-slate-300">{new Date(event.occurred_at).toLocaleTimeString()}</div>
                          <div className="mt-1 font-mono text-[11px] tabular-nums text-slate-500">{formatDelta(previousTimestamp, event.occurred_at)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
      <Accordion type="multiple" defaultValue={["commit"]} className="space-y-3">
        <InvestigatorCard value="commit" title="Commit correlation" icon={<GitCommit size={16} className="text-blue-300" />} found={Boolean(commitFinding)} summary={commitFinding?.commit_sha ? `${commitFinding.commit_sha.slice(0, 7)}, ${Math.round((commitFinding.confidence ?? 0) * 100)}% confidence` : "No persisted commit finding"}>
          {commitFinding ? <dl className="detail-grid"><dt>Commit</dt><dd className="font-mono text-blue-200">{commitFinding.commit_sha ?? "--"}</dd><dt>Title</dt><dd>{commitFinding.commit_title ?? "--"}</dd><dt>Confidence</dt><dd><ConfidencePill confidence={commitFinding.confidence} /></dd><dt>Evidence</dt><dd><EvidenceList finding={commitFinding} /></dd></dl> : <p className="rounded-md border border-warning/30 bg-amber-950/20 p-3 leading-6 text-amber-100">{emptyDeployWindow ? "Suspect commit: none - no deploys found in the correlation window. The rendered brief contains the exact correlation-window evidence; available runbook and impact evidence is shown below." : "Investigation completed with partial findings. No commit-correlation candidate was returned; the available runbook and impact evidence is shown below."}</p>}
        </InvestigatorCard>
        <InvestigatorCard value="runbook" title="Runbook retrieval" icon={<BookOpen size={16} className="text-blue-300" />} found={Boolean(investigation.runbook_id)} summary={investigation.runbook_id ? `${investigation.runbook_id}, score ${investigation.runbook_score?.toFixed(2) ?? "n/a"}` : "No runbook persisted"}>
          <dl className="detail-grid"><dt>Runbook</dt><dd>{investigation.runbook_id ?? "Not available"}</dd><dt>Section</dt><dd>{investigation.runbook_section ?? "Not available"}</dd><dt>Score</dt><dd className="font-mono tabular-nums">{investigation.runbook_score?.toFixed(2) ?? "Not available"}</dd></dl>
        </InvestigatorCard>
        <InvestigatorCard value="impact" title="Impact estimation" icon={<ChartNoAxesCombined size={16} className="text-blue-300" />} found={investigation.error_rate !== null || investigation.affected_requests !== null} summary={`${percent(investigation.error_rate)} errors, ${number(investigation.affected_requests)} affected requests`}>
          <dl className="detail-grid"><dt>Error rate</dt><dd className="font-mono tabular-nums">{percent(investigation.error_rate)}</dd><dt>Affected requests</dt><dd className="font-mono tabular-nums">{number(investigation.affected_requests)}</dd><dt>Severity</dt><dd><SeverityBadge severity={investigation.severity} /></dd><dt>Evidence</dt><dd>Computed from Prometheus counters for {investigation.service}.</dd></dl>
        </InvestigatorCard>
      </Accordion>
      <div className="mt-5 flex flex-wrap gap-3 text-sm">
        {slackUrl && (
          DEMO_MODE ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="link-button cursor-not-allowed opacity-60" disabled>
                  Slack thread <ExternalLink size={15} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Slack thread available in live deployment</TooltipContent>
            </Tooltip>
          ) : (
            <a className="link-button" href={slackUrl} target="_blank" rel="noreferrer">Slack thread <ExternalLink size={15} /></a>
          )
        )}
        {investigation.langsmith_trace_url && (
          DEMO_MODE ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="link-button cursor-not-allowed opacity-60" disabled>
                  LangSmith trace <ExternalLink size={15} />
                </button>
              </TooltipTrigger>
              <TooltipContent>LangSmith trace available in live deployment, see GitHub for setup.</TooltipContent>
            </Tooltip>
          ) : (
            <a className="link-button" href={investigation.langsmith_trace_url} target="_blank" rel="noreferrer">LangSmith trace <ExternalLink size={15} /></a>
          )
        )}
        {!slackUrl && !investigation.langsmith_trace_url && <span className="text-slate-500">No external links were recorded for this investigation.</span>}
      </div>
    </section>
  );
}
