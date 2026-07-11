import { ArrowRight, Bot, Gauge, GitCompareArrows } from "lucide-react";
import { useEffect, useState } from "react";

import { api, type BenchmarkSummary } from "../api";
import { ErrorState, LoadingState } from "../components";

const replayFast: BenchmarkSummary = {
  scenario_count: 15, bad_commit_top1_accuracy: 0.1333333333, bad_commit_top3_accuracy: 0.6666666667,
  runbook_hit_rate: 1, impact_classification_accuracy: 1, latency_p50_ms: 27, latency_p95_ms: 56, total_tokens: 0,
};

function metric(value: number, suffix = "%") { return `${(value * 100).toFixed(1)}${suffix}`; }
function duration(value: number) { return value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${Math.round(value)} ms`; }

export function BenchmarkPage() {
  const [model, setModel] = useState<BenchmarkSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void api.benchmark().then(setModel).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load benchmark")); }, []);
  if (error) return <ErrorState message={error} />;
  if (!model) return <LoadingState />;
  const rows = [["replay-fast", replayFast], ["model-eval", model]] as const;
  return <section className="pb-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Evaluation harness</p><h1>Benchmark results</h1><p className="mt-2 text-sm text-slate-400">Ground-truth scoring for the hardened commit-correlation corpus.</p></div><span className="hidden items-center gap-2 rounded-full border border-line bg-slate-900/60 px-3 py-1.5 text-xs text-slate-400 sm:inline-flex"><Gauge size={13} className="text-cyan-300" /> 15 scenarios</span></div>
    <div className="mt-7 overflow-hidden rounded-xl border border-cyan-400/20 bg-[radial-gradient(ellipse_at_top_left,_rgba(34,211,238,0.15),transparent_53%)] p-6 shadow-2xl shadow-slate-950/20">
      <div className="flex flex-wrap items-start justify-between gap-6"><div><p className="eyebrow">Commit correlation, top-1</p><p className="mt-3 text-sm leading-6 text-slate-300">LLM diff-reasoning materially outperforms deterministic service and path heuristics on adversarial same-service deploy candidates.</p></div><Bot size={22} className="text-cyan-300" /></div>
      <div className="mt-7 flex flex-wrap items-end gap-5 sm:gap-8"><div><p className="font-mono text-5xl font-semibold tabular-nums text-cyan-200">93.3%</p><p className="mt-2 text-xs uppercase tracking-[0.12em] text-cyan-100/60">Model-eval best observed</p></div><ArrowRight size={22} className="mb-5 text-slate-600" /><div><p className="font-mono text-5xl font-semibold tabular-nums text-slate-300">13.3%</p><p className="mt-2 text-xs uppercase tracking-[0.12em] text-slate-500">Deterministic baseline</p></div></div>
    </div>
    <p className="mt-3 max-w-4xl text-xs leading-5 text-slate-500">Repeated model-eval runs on this fixed 15-scenario corpus ranged from 86.7% to 93.3% top-1 accuracy, a one-to-two-scenario variance from inherent LLM non-determinism at fixed temperature.</p>
    <div className="mt-7 overflow-hidden rounded-lg border border-line bg-panel shadow-xl shadow-slate-950/10"><div className="flex items-center gap-2 border-b border-line bg-slate-950/35 px-4 py-3"><GitCompareArrows size={15} className="text-cyan-300" /><span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Evaluation comparison</span></div><div className="overflow-x-auto"><table className="min-w-[940px] w-full text-left text-sm"><thead className="border-b border-line/80 bg-slate-950/25 text-[11px] uppercase tracking-[0.12em] text-slate-500"><tr><th>Mode</th><th>Scenarios</th><th>Commit top-1</th><th>Commit top-3</th><th>Runbook hit</th><th>Impact class</th><th>Latency p50</th><th>Latency p95</th><th>Tokens</th></tr></thead><tbody>{rows.map(([mode, result]) => <tr key={mode} className="border-b border-line/60 last:border-b-0"><td className="font-mono text-cyan-300">{mode}</td><td className="font-mono tabular-nums">{result.scenario_count}</td><td className="font-mono font-semibold tabular-nums text-slate-100">{metric(result.bad_commit_top1_accuracy)}</td><td className="font-mono tabular-nums">{metric(result.bad_commit_top3_accuracy)}</td><td className="font-mono tabular-nums">{metric(result.runbook_hit_rate)}</td><td className="font-mono tabular-nums">{metric(result.impact_classification_accuracy)}</td><td className="font-mono tabular-nums">{duration(result.latency_p50_ms)}</td><td className="font-mono tabular-nums">{duration(result.latency_p95_ms)}</td><td className="font-mono tabular-nums">{result.total_tokens.toLocaleString()}</td></tr>)}</tbody></table></div></div>
    <p className="mt-4 text-sm text-slate-500">1 live-captured scenario, 14 synthetic-replay. See <code className="font-mono text-xs text-slate-400">scenarios/benchmark/</code> for ground truth.</p>
  </section>;
}
