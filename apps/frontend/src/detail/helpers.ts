import type { Finding, InvestigationDetail } from "../api";

export type Evidence = { kind?: string; summary: string; reference?: string };

export function evidenceItems(evidence: unknown): Evidence[] {
  if (!Array.isArray(evidence)) return [];
  return evidence.filter(
    (item): item is Evidence => typeof item === "object" && item !== null && "summary" in item && typeof item.summary === "string",
  );
}

export type Candidate = {
  sha: string;
  title: string | null;
  score: number | null;
  validation: string | null;
  evidence: Evidence[];
};

/** Ranked commit candidates. Falls back to the investigation's own suspect commit when no finding carries one. */
export function candidatesFrom(detail: InvestigationDetail): Candidate[] {
  const fromFinding = (finding: Finding): Candidate | null =>
    finding.commit_sha
      ? {
          sha: finding.commit_sha,
          title: finding.commit_title,
          score: finding.confidence,
          validation: finding.validation_state,
          evidence: evidenceItems(finding.evidence),
        }
      : null;
  const ranked = detail.findings
    .map(fromFinding)
    .filter((item): item is Candidate => item !== null)
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  if (ranked.length) return ranked;
  const inv = detail.investigation;
  return inv.suspect_commit_sha
    ? [{ sha: inv.suspect_commit_sha, title: inv.suspect_commit_title, score: inv.confidence, validation: inv.validation_state, evidence: [] }]
    : [];
}

function validTime(value: string | null): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

export function formatTime(value: string | null): string {
  const ms = validTime(value);
  if (ms === null) return "--";
  return new Date(ms).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** "6m 14s", "42s", "1h 2m". Null when either end is missing or invalid. */
export function formatDuration(start: string, end: string | null): string | null {
  const a = validTime(start);
  const b = validTime(end);
  if (a === null || b === null) return null;
  const total = Math.max(0, Math.round((b - a) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** Real offset label from milliseconds: "+0.0s", "+2.4s", "+6m 14s". */
export function formatOffset(ms: number): string {
  const safe = Math.max(0, ms);
  if (safe < 60_000) return `+${(safe / 1000).toFixed(1)}s`;
  const total = Math.round(safe / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `+${h}h ${m}m` : `+${m}m ${s}s`;
}

export function eventMs(value: string): number {
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

const EVENT_LABELS: Record<string, string> = {
  alert_received: "Alert received",
  queued_to_redis: "Queued to Redis",
  triage_completed: "Triage completed",
  commit_correlation_completed: "Commit correlation completed",
  runbook_retrieval_completed: "Runbook retrieval completed",
  impact_estimation_completed: "Impact estimation completed",
  brief_posted: "Brief posted to Slack",
  resolved: "Alert resolved",
  postmortem_generated: "Postmortem generated",
};

export function eventLabel(type: string): string {
  return EVENT_LABELS[type] ?? type.replace(/_/g, " ");
}
