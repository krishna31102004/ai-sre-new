import type { ReactNode } from "react";

import type { InvestigationSummary } from "../api";
import { CommitSummary, Eyebrow, Panel, ScoreBar } from "../components/primitives";
import { cn } from "../lib/utils";
import { number } from "../lib";
import type { Candidate } from "./helpers";

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Panel as="section" className="flex h-full flex-col gap-4 p-4 md:p-5">
      <Eyebrow as="h3">{title}</Eyebrow>
      {children}
    </Panel>
  );
}

export function CommitCorrelationCard({ candidates }: { candidates: Candidate[] }) {
  const n = candidates.length;
  return (
    <Card title="Commit correlation">
      <p className="text-[14px] text-ink">{n} {n === 1 ? "candidate" : "candidates"} ranked</p>
      {n === 0 ? (
        <p className="text-[13px] text-ink-2">Nothing to rank in the lookback window.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {candidates.slice(0, 3).map((candidate, index) => (
            <li
              key={`${candidate.sha}-${index}`}
              className={cn(
                "relative flex min-h-11 flex-col justify-center gap-1 rounded-lg border border-white/[0.07] bg-elevated px-3 py-2",
              )}
            >
              {index === 0 ? <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-healthy" /> : null}
              <CommitSummary sha={candidate.sha} title={candidate.title} />
              <ScoreBar value={candidate.score} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function RunbookCard({ investigation }: { investigation: InvestigationSummary }) {
  return (
    <Card title="Runbook">
      {investigation.runbook_id ? (
        <div className="flex flex-col gap-3">
          <p className="break-all font-mono text-[14px] text-ink">{investigation.runbook_id}</p>
          <p className="text-[13px] text-ink-2">Section: {investigation.runbook_section ?? "not recorded"}</p>
          <ScoreBar value={investigation.runbook_score} label="retrieval score" />
        </div>
      ) : (
        <p className="text-[13px] text-ink-2">No runbook matched.</p>
      )}
    </Card>
  );
}

function Stat({ label, children, footer }: { label: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">{label}</p>
      <div className="mt-1 break-words font-mono text-[24px] leading-8 tabular-nums text-ink lg:text-[20px] min-[1200px]:text-[24px]">{children}</div>
      {footer}
    </div>
  );
}

export function ImpactCard({ investigation }: { investigation: InvestigationSummary }) {
  const rate = investigation.error_rate;
  const severity = investigation.severity;
  const barWidth = rate === null ? 0 : Math.min(1, Math.max(0, rate / 0.05)) * 100;
  return (
    <Card title="Impact">
      <div className="grid grid-cols-3 items-start gap-2">
        <Stat
          label="Error rate"
          footer={
            <div className="mt-2">
              <div className="h-0.5 w-full overflow-hidden rounded-full bg-white/[0.07]" aria-hidden="true">
                <div className="h-full rounded-full bg-accent" style={{ width: `${barWidth}%` }} />
              </div>
              <p className="mt-1.5 font-mono text-[11px] leading-4 text-ink-3">scale 0 to 5%</p>
            </div>
          }
        >
          {rate === null ? "--" : `${(rate * 100).toFixed(2)}%`}
        </Stat>
        <Stat label="Affected requests">{number(investigation.affected_requests)}</Stat>
        <Stat label="Severity">
          <span className={severity?.toLowerCase() === "page" ? "text-firing" : "text-ink-2"}>{severity ?? "--"}</span>
        </Stat>
      </div>
    </Card>
  );
}
