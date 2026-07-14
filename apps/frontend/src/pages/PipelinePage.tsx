import {
  Activity,
  BookOpen,
  BrainCircuit,
  Database,
  FileText,
  GitCommit,
  type LucideIcon,
  MessageSquareText,
  ShieldAlert,
  TimerReset,
  Workflow,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getAllMockInvestigationDetails, mockBenchmark } from "../mockData";
import { Badge } from "../components/ui/badge";

type PipelineNode = {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  input: string;
  output: string;
  description: [string, string];
  exampleTitle: string;
  exampleBody: string[];
  branch?: boolean;
};

type PipelinePosition = {
  x: number;
  y: number;
};

type PipelineEdge = {
  from: string;
  to: string;
  path: string;
};

const NODE_WIDTH = 184;
const NODE_HEIGHT = 132;
const SVG_WIDTH = 1320;
const SVG_HEIGHT = 620;

const detailData = getAllMockInvestigationDetails();
const adIncident = detailData[0];
const paymentIncident = detailData[1];
const catalogIncident = detailData[2];

const pipelineNodes: PipelineNode[] = [
  {
    id: "alert",
    title: "Alert fires",
    subtitle: "Prometheus + Alertmanager",
    icon: ShieldAlert,
    input: "Service telemetry crossing an alert threshold.",
    output: "A structured Alertmanager webhook payload with labels, annotations, and timestamps.",
    description: [
      "Prometheus evaluates a real alert rule against OpenTelemetry demo metrics and hands the firing state to Alertmanager. Alertmanager becomes the external trigger for every Glassbox SRE investigation.",
      "This keeps the system anchored to production-shaped alert flow instead of direct model polling or synthetic frontend events.",
    ],
    exampleTitle: adIncident.investigation.alert_name,
    exampleBody: [
      `status=${adIncident.investigation.status}, service=${adIncident.investigation.service}, started_at=${adIncident.investigation.started_at}`,
      "Labels included the frontend service and the OTel demo ad-failure alert name.",
    ],
  },
  {
    id: "queue",
    title: "Redis queue",
    subtitle: "Async ingestion buffer",
    icon: Database,
    input: "Validated webhook JSON from the FastAPI ingestion service.",
    output: "A queued investigation job that can be processed independently of alert acknowledgement latency.",
    description: [
      "The queue decouples alert receipt from investigation work, so the webhook returns quickly even when the investigation graph takes several seconds. It also gives the worker one clean unit of work per alert lifecycle event.",
      "This is the boundary that keeps the alert path reliable while the agent does slower reasoning work behind it.",
    ],
    exampleTitle: "Queued alert payload",
    exampleBody: [
      `investigation_id=${paymentIncident.investigation.investigation_id}`,
      `payload carried ${paymentIncident.investigation.alert_name} with service=${paymentIncident.investigation.service}`,
    ],
  },
  {
    id: "orchestrator",
    title: "LangGraph orchestrator",
    subtitle: "Typed state machine",
    icon: BrainCircuit,
    input: "Alert payload plus durable storage handles for findings, events, and traces.",
    output: "A shared investigation state that fans out into specialized evidence-gathering branches.",
    description: [
      "LangGraph owns the investigation state and coordinates the sequence from triage through evidence synthesis. Each node gets the same typed incident context and writes its own evidence back into the graph state.",
      "That makes the reasoning path inspectable and traceable instead of burying all work inside one monolithic prompt.",
    ],
    exampleTitle: "Graph run characteristics",
    exampleBody: [
      `model-eval benchmark: p50=${(mockBenchmark.latency_p50_ms / 1000).toFixed(2)}s, p95=${(mockBenchmark.latency_p95_ms / 1000).toFixed(2)}s`,
      `15-scenario benchmark consumed ${mockBenchmark.total_tokens.toLocaleString()} total tokens.`,
    ],
  },
  {
    id: "commit",
    title: "Commit correlation",
    subtitle: "Deploy window + diff ranking",
    icon: GitCommit,
    input: "Alert start time, affected service, and seeded deploy history for the correlation window.",
    output: "Ranked suspect commits with evidence, confidence, and validation state.",
    description: [
      "This branch narrows the search space deterministically by looking at deploys near the alert start time and then comparing same-service candidates. Only after that narrowing step does the model rank diffs and explain why the top candidate fits the symptom.",
      "The result is an evidence-backed suspect commit rather than an ungrounded guess from alert text alone.",
    ],
    exampleTitle: "Real candidate set from payment timeout",
    exampleBody: [
      "5b82dea 84% validated, f7927bc distractor, 6b19fe9 distractor, 8aaf682 distractor",
      "Winning evidence: payment deploy landed in the window and lowered authorization timeout below normal p95.",
    ],
    branch: true,
  },
  {
    id: "runbook",
    title: "Runbook RAG",
    subtitle: "Tags + pgvector ranking",
    icon: BookOpen,
    input: "Service tags, alert context, and the embedded runbook corpus stored in pgvector.",
    output: "The best-matching operational runbook section with a similarity score and evidence.",
    description: [
      "Runbook retrieval first filters by deterministic incident tags and then uses embedding similarity to rank the remaining sections. That makes retrieval safer than pure vector search while still handling wording variation across alerts.",
      "The branch returns both the chosen section and the score so the retrieval decision is visible to the operator.",
    ],
    exampleTitle: "Real runbook ranking example",
    exampleBody: [
      "otel-demo.frontend-ad-failure / Signals scored 0.980 in the verified adFailure incident.",
      "Other real comparisons from earlier runs clustered near 0.778, 0.753, and 0.749 before reranking selected the final section.",
    ],
    branch: true,
  },
  {
    id: "impact",
    title: "Impact estimation",
    subtitle: "Prometheus math",
    icon: Activity,
    input: "Prometheus counter values plus the service dependency graph.",
    output: "Error rate, affected request count, severity class, and affected services.",
    description: [
      "This branch computes blast radius deterministically from real telemetry rather than asking the model to invent numbers. Severity is then classified from the measured error rate and affected request count.",
      "The model can narrate those numbers later, but it does not get to fabricate them.",
    ],
    exampleTitle: "Verified adFailure impact",
    exampleBody: [
      "Query result: 8 frontend 500s out of 5,797 total requests, error_rate=0.00138.",
      "Classifier output: severity=ticket because the rate was non-zero but stayed below the page threshold.",
    ],
    branch: true,
  },
  {
    id: "synthesis",
    title: "Evidence synthesis",
    subtitle: "Single grounded brief",
    icon: Workflow,
    input: "Commit finding, runbook retrieval result, and impact estimate from the parallel branches.",
    output: "A unified incident brief with explicit evidence on every claim.",
    description: [
      "The synthesis step merges the parallel findings into one operator-facing brief and preserves uncertainty when evidence is weak. It is where commit, runbook, and impact outputs become one coherent explanation.",
      "Because each upstream branch contributes structured evidence, the final brief can be rendered as a transparent, inspectable record.",
    ],
    exampleTitle: catalogIncident.investigation.alert_name,
    exampleBody: [
      `Combined output included suspect commit ${catalogIncident.investigation.suspect_commit_sha?.slice(0, 7)}, runbook ${catalogIncident.investigation.runbook_id}, and ${catalogIncident.investigation.affected_requests} affected requests.`,
      "The final brief preserved the runbook score and the computed error rate in the same artifact.",
    ],
  },
  {
    id: "slack",
    title: "Slack brief",
    subtitle: "Incident thread post",
    icon: MessageSquareText,
    input: "The synthesized brief plus destination metadata for the configured notifier.",
    output: "A human-readable incident update delivered to Slack or the local notifier.",
    description: [
      "This step turns the structured brief into the operator-facing message that lands in the incident channel. It preserves the same evidence and confidence fields the graph produced instead of rewriting them into marketing text.",
      "For the portfolio demo, the frontend can show the same content without needing a live Slack workspace.",
    ],
    exampleTitle: "Slack-facing evidence",
    exampleBody: [
      `Thread ${adIncident.investigation.slack_thread_ts} carried suspect commit ${adIncident.investigation.suspect_commit_sha?.slice(0, 7)} at 90% confidence.`,
      "The posted brief also included the matched runbook and the measured impact line.",
    ],
  },
  {
    id: "postmortem",
    title: "Postmortem",
    subtitle: "Grounded timeline artifact",
    icon: TimerReset,
    input: "Stored investigation events, findings, and the resolved alert lifecycle.",
    output: "A JSON and Markdown postmortem generated from persisted evidence and timestamps.",
    description: [
      "Once resolution is observed, the system turns the stored event log and findings into a blameless postmortem. The timeline is grounded in persisted timestamps rather than model memory.",
      "That keeps the final artifact auditable even when the LLM helps shape the prose.",
    ],
    exampleTitle: "Postmortem artifact chain",
    exampleBody: [
      `Resolved run ${adIncident.investigation.investigation_id} produced a stored timeline from alert receipt through resolution.`,
      "The same evidence objects used in the brief become the postmortem inputs.",
    ],
  },
];

const positions: Record<string, PipelinePosition> = {
  alert: { x: 40, y: 48 },
  queue: { x: 292, y: 48 },
  orchestrator: { x: 544, y: 48 },
  commit: { x: 332, y: 252 },
  runbook: { x: 568, y: 252 },
  impact: { x: 804, y: 252 },
  synthesis: { x: 544, y: 470 },
  slack: { x: 796, y: 470 },
  postmortem: { x: 1048, y: 470 },
};

function centerX(nodeId: string) {
  return positions[nodeId].x + NODE_WIDTH / 2;
}

function topY(nodeId: string) {
  return positions[nodeId].y;
}

function bottomY(nodeId: string) {
  return positions[nodeId].y + NODE_HEIGHT;
}

const edges: PipelineEdge[] = [
  {
    from: "alert",
    to: "queue",
    path: `M ${positions.alert.x + NODE_WIDTH} ${topY("alert") + NODE_HEIGHT / 2} L ${positions.queue.x} ${topY("queue") + NODE_HEIGHT / 2}`,
  },
  {
    from: "queue",
    to: "orchestrator",
    path: `M ${positions.queue.x + NODE_WIDTH} ${topY("queue") + NODE_HEIGHT / 2} L ${positions.orchestrator.x} ${topY("orchestrator") + NODE_HEIGHT / 2}`,
  },
  {
    from: "orchestrator",
    to: "commit",
    path: `M ${centerX("orchestrator")} ${bottomY("orchestrator")} C ${centerX("orchestrator")} ${bottomY("orchestrator") + 40}, ${centerX("commit")} ${topY("commit") - 40}, ${centerX("commit")} ${topY("commit")}`,
  },
  {
    from: "orchestrator",
    to: "runbook",
    path: `M ${centerX("orchestrator")} ${bottomY("orchestrator")} L ${centerX("runbook")} ${topY("runbook")}`,
  },
  {
    from: "orchestrator",
    to: "impact",
    path: `M ${centerX("orchestrator")} ${bottomY("orchestrator")} C ${centerX("orchestrator")} ${bottomY("orchestrator") + 40}, ${centerX("impact")} ${topY("impact") - 40}, ${centerX("impact")} ${topY("impact")}`,
  },
  {
    from: "commit",
    to: "synthesis",
    path: `M ${centerX("commit")} ${bottomY("commit")} C ${centerX("commit")} ${bottomY("commit") + 40}, ${centerX("synthesis")} ${topY("synthesis") - 40}, ${centerX("synthesis")} ${topY("synthesis")}`,
  },
  {
    from: "runbook",
    to: "synthesis",
    path: `M ${centerX("runbook")} ${bottomY("runbook")} L ${centerX("synthesis")} ${topY("synthesis")}`,
  },
  {
    from: "impact",
    to: "synthesis",
    path: `M ${centerX("impact")} ${bottomY("impact")} C ${centerX("impact")} ${bottomY("impact") + 40}, ${centerX("synthesis")} ${topY("synthesis") - 40}, ${centerX("synthesis")} ${topY("synthesis")}`,
  },
  {
    from: "synthesis",
    to: "slack",
    path: `M ${positions.synthesis.x + NODE_WIDTH} ${topY("synthesis") + NODE_HEIGHT / 2} L ${positions.slack.x} ${topY("slack") + NODE_HEIGHT / 2}`,
  },
  {
    from: "slack",
    to: "postmortem",
    path: `M ${positions.slack.x + NODE_WIDTH} ${topY("slack") + NODE_HEIGHT / 2} L ${positions.postmortem.x} ${topY("postmortem") + NODE_HEIGHT / 2}`,
  },
];

function isEdgeHighlighted(edge: PipelineEdge, selectedId: string | null) {
  if (!selectedId) return true;
  return edge.from === selectedId || edge.to === selectedId;
}

function PipelineCard({
  node,
  active,
  dimmed,
  onClick,
}: {
  node: PipelineNode;
  active: boolean;
  dimmed: boolean;
  onClick: () => void;
}) {
  const Icon = node.icon;
  return (
    <button
      onClick={onClick}
      className={`glass-card pipeline-node relative w-[184px] px-4 py-4 text-left ${
        active ? "pipeline-node-active border-accent/40 bg-accent/10 shadow-glow" : "hover:border-accent/25 hover:bg-white/[0.04]"
      } ${dimmed ? "pipeline-node-dimmed" : "pipeline-node-clear"} ${node.branch ? "pipeline-branch" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md border border-line bg-white/[0.04] text-blue-200">
          <Icon size={18} />
        </span>
        <Badge variant={active ? "accent" : "muted"}>{node.subtitle}</Badge>
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-100">{node.title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{node.input}</p>
    </button>
  );
}

function PipelineOverlay({
  node,
  onClose,
}: {
  node: PipelineNode;
  onClose: () => void;
}) {
  const Icon = node.icon;

  return (
    <div className="pipeline-overlay fixed inset-0 z-50 flex items-center justify-center p-6">
      <button className="pipeline-overlay-backdrop absolute inset-0 h-full w-full cursor-default bg-black/85 backdrop-blur-sm" aria-label="Close pipeline overlay" onClick={onClose} />
      <div className="pipeline-overlay-content relative z-10 mx-auto max-w-3xl">
        <button className="icon-button absolute right-4 top-4 z-10" aria-label="Close pipeline overlay" onClick={onClose}>
          <X size={16} />
        </button>
        <div className="glass-card border-accent/35 bg-panel/95 px-8 py-8 shadow-[0_0_0_1px_rgba(59,130,246,0.28),0_0_36px_rgba(59,130,246,0.16)]">
          <div className="mx-auto max-w-[420px]">
            <div className="pipeline-node-active glass-card bg-accent/10 px-5 py-5">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-md border border-accent/30 bg-white/[0.06] text-blue-100">
                  <Icon size={22} />
                </span>
                <Badge variant="accent">{node.subtitle}</Badge>
              </div>
              <h2 className="mt-5 text-xl font-semibold text-slate-50">{node.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">{node.input}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-5">
              <div className="soft-card p-4">
                <p className="label">What this node does</p>
                <p className="text-sm leading-6 text-slate-300">{node.description[0]}</p>
                <p className="mt-3 text-sm leading-6 text-slate-400">{node.description[1]}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="soft-card p-4">
                  <p className="label">Input</p>
                  <p className="text-sm leading-6 text-slate-300">{node.input}</p>
                </div>
                <div className="soft-card p-4">
                  <p className="label">Output</p>
                  <p className="text-sm leading-6 text-slate-300">{node.output}</p>
                </div>
              </div>
            </div>
            <div className="soft-card p-4">
              <p className="label">Real example</p>
              <h3 className="text-sm font-semibold text-slate-100">{node.exampleTitle}</h3>
              <div className="mt-3 space-y-2 font-mono text-xs leading-6 text-slate-300">
                {node.exampleBody.map((line) => (
                  <div key={line} className="rounded-md border border-line bg-black/20 px-3 py-2">
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PipelinePage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hasExplored, setHasExplored] = useState(false);

  const selectedNode = useMemo(
    () => pipelineNodes.find((node) => node.id === selectedId) ?? null,
    [selectedId],
  );

  useEffect(() => {
    if (!selectedNode) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedId(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedNode]);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    if (selectedNode) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [selectedNode]);

  const handleSelect = (nodeId: string) => {
    setSelectedId((current) => {
      const next = current === nodeId ? null : nodeId;
      if (next) setHasExplored(true);
      return next;
    });
  };

  return (
    <section className="pb-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Investigation graph</p>
          <h1>Pipeline</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            This is the end-to-end Glassbox SRE flow from alert fire to postmortem generation. The three investigator branches pulse together to show the parallel evidence paths that feed one grounded incident brief.
          </p>
        </div>
        <Badge variant="accent">Interactive walkthrough</Badge>
      </div>

      <div className="glass-card overflow-x-auto p-6">
        <div className="relative min-h-[620px] min-w-[1320px]">
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            fill="none"
            aria-hidden="true"
          >
            {edges.map((edge) => {
              const highlighted = isEdgeHighlighted(edge, selectedId);
              return (
                <path
                  key={`${edge.from}-${edge.to}`}
                  d={edge.path}
                  className={`pipeline-edge ${highlighted ? "pipeline-edge-active" : "pipeline-edge-dimmed"}`}
                />
              );
            })}
          </svg>

          <div className="absolute left-[300px] top-[224px] h-[188px] w-[724px] rounded-glass border border-dashed border-accent/20 bg-accent/[0.03]">
            <div className="absolute left-4 top-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-200/70">
              Parallel execution
            </div>
          </div>

          {pipelineNodes.map((node) => {
            const position = positions[node.id];
            return (
              <div
                key={node.id}
                className="absolute"
                style={{ left: `${position.x}px`, top: `${position.y}px` }}
              >
                <PipelineCard
                  node={node}
                  active={selectedId === node.id}
                  dimmed={selectedId !== null && selectedId !== node.id}
                  onClick={() => handleSelect(node.id)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {!hasExplored && (
        <p className="mt-4 text-center text-sm text-slate-500">
          Click to explore each stage of the Glassbox SRE investigation pipeline.
        </p>
      )}

      {selectedNode && <PipelineOverlay node={selectedNode} onClose={() => setSelectedId(null)} />}
    </section>
  );
}
