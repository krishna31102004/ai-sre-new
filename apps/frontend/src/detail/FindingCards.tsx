import type { ReactNode } from "react";

import type { InvestigationSummary } from "../api";
import { cn, CommitSummary, Panel, ScoreBar, T } from "../components/primitives";
import { number } from "../lib";
import { deployCandidateCount, type Candidate } from "./helpers";

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Panel as="section" className="flex h-full flex-col gap-3 md:gap-4">
      <h3 className={T.h3}>{title}</h3>
      {children}
    </Panel>
  );
}

export function CommitCorrelationCard({ candidates }: { candidates: Candidate[] }) {
  const n = candidates.length;
  const deploys = deployCandidateCount(candidates[0]?.sha);
  return (
    <Card title="Commit correlation">
      {deploys !== null ? <p className={T.small}>{deploys} deploy candidates ranked</p> : null}
      {n === 0 ? (
        <p className={T.body}>Nothing to rank in the lookback window.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {candidates.slice(0, 3).map((candidate, index) => (
            <li
              key={`${candidate.sha}-${index}`}
              className="relative flex min-h-11 flex-col justify-center gap-1 rounded-lg bg-ink/[0.03] px-3 py-2"
            >
              {index === 0 ? <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-healthy" /> : null}
              <CommitSummary sha={candidate.sha} title={candidate.title} />
              <ScoreBar value={candidate.score} highlight={index === 0} />
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
          <p className={cn(T.data, "break-all")}>{investigation.runbook_id}</p>
          <p className={T.small}>Section: {investigation.runbook_section ?? "not recorded"}</p>
          <ScoreBar value={investigation.runbook_score} label="retrieval score" />
        </div>
      ) : (
        <p className={T.body}>No runbook matched.</p>
      )}
    </Card>
  );
}

function Stat({ label, children, footer, valueClass = T.dataLg }: { label: string; children: ReactNode; footer?: ReactNode; valueClass?: string }) {
  return (
    <div className="min-w-0">
      <p className={T.label}>{label}</p>
      <div className={cn(valueClass, "mt-1 break-words")}>{children}</div>
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
      <div className="grid grid-cols-3 items-start gap-2 md:gap-4">
        <Stat
          label="Error rate"
          footer={
            <div className="mt-2">
              <div className="h-0.5 w-full overflow-hidden rounded-full bg-ink/[0.07]" aria-hidden="true">
                <div className="h-full rounded-full bg-ink-3" style={{ width: `${barWidth}%` }} />
              </div>
              <p className={cn(T.label, "mt-1")}>scale 0 to 5%</p>
            </div>
          }
        >
          {rate === null ? "--" : `${(rate * 100).toFixed(2)}%`}
        </Stat>
        <Stat label="Affected requests">{number(investigation.affected_requests)}</Stat>
        <Stat label="Severity" valueClass={cn(T.lead, "font-medium text-ink")}>
          <span className={severity?.toLowerCase() === "page" ? "text-firing" : "text-ink-2"}>{severity ?? "--"}</span>
        </Stat>
      </div>
    </Card>
  );
}
