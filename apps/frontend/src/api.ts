export type InvestigationSummary = {
  investigation_id: string;
  alert_name: string;
  service: string;
  status: string;
  started_at: string;
  resolved_at: string | null;
  suspect_commit_sha: string | null;
  suspect_commit_title: string | null;
  confidence: number | null;
  validation_state: string | null;
  runbook_id: string | null;
  runbook_section: string | null;
  runbook_score: number | null;
  error_rate: number | null;
  affected_requests: number | null;
  severity: string | null;
  slack_thread_ts: string | null;
  slack_channel: string | null;
  langsmith_trace_url: string | null;
};

export type Finding = {
  finding_id: string;
  commit_sha: string | null;
  commit_title: string | null;
  service: string | null;
  confidence: number | null;
  validation_state: string | null;
  evidence: unknown;
  reasoning: string | null;
};

export type InvestigationDetail = {
  investigation: InvestigationSummary;
  brief: string | null;
  findings: Finding[];
  events: Array<{
    event_type: string;
    occurred_at: string;
    source: string;
    summary: string;
    reference: string | null;
  }>;
};

export type Health = {
  api: { ok: boolean };
  worker: { ok: boolean; seconds_since_last_heartbeat: number | null };
  postgres: { ok: boolean };
  redis: { ok: boolean };
};

export type BenchmarkSummary = {
  scenario_count: number;
  bad_commit_top1_accuracy: number;
  bad_commit_top3_accuracy: number;
  runbook_hit_rate: number;
  impact_classification_accuracy: number;
  latency_p50_ms: number;
  latency_p95_ms: number;
  total_tokens: number;
};

import {
  getMockFault,
  getMockInvestigationDetail,
  getMockInvestigationsResponse,
  mockBenchmark,
  mockHealth,
} from "./mockData";

export const DEMO_MODE = ["1", "true", "yes", "on"].includes(
  String(import.meta.env.VITE_DEMO_MODE ?? "").toLowerCase(),
);

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  if (DEMO_MODE) {
    switch (path) {
      case "/api/investigations":
        return getMockInvestigationsResponse() as T;
      case "/api/health":
        return mockHealth as T;
      case "/api/benchmark/latest":
        return mockBenchmark as T;
      default: {
        if (path.startsWith("/api/investigations/")) {
          return getMockInvestigationDetail(path.replace("/api/investigations/", "")) as T;
        }
        if (path.startsWith("/api/fault/")) {
          return getMockFault(path.replace("/api/fault/", "")) as T;
        }
      }
    }
  }

  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  investigations: () => request<{ investigations: InvestigationSummary[] }>("/api/investigations"),
  investigation: (id: string) => request<InvestigationDetail>(`/api/investigations/${id}`),
  health: () => request<Health>("/api/health"),
  fault: (flag: string) => request<{ flag: string; variant: "on" | "off" }>(`/api/fault/${flag}`),
  setFault: (flag: string, variant: "on" | "off") =>
    request<{ flag: string; variant: "on" | "off" }>(`/api/fault/${flag}`, {
      method: "POST",
      body: JSON.stringify({ variant }),
    }),
  benchmark: () => request<BenchmarkSummary>("/api/benchmark/latest"),
};
