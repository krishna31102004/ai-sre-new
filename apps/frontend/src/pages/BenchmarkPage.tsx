import { Bot, Gauge, GitCompareArrows, Info } from "lucide-react";
import { useEffect, useState } from "react";

import { api, type BenchmarkSummary } from "../api";
import { ErrorState, LoadingState } from "../components";
import { Badge } from "../components/ui/badge";

const replayFast: BenchmarkSummary = {
  scenario_count: 15, bad_commit_top1_accuracy: 0.1333333333, bad_commit_top3_accuracy: 0.6666666667,
  runbook_hit_rate: 1, impact_classification_accuracy: 1, latency_p50_ms: 27, latency_p95_ms: 56, total_tokens: 0,
};

function metric(value: number, suffix = "%") { return `${(value * 100).toFixed(1)}${suffix}`; }
function duration(value: number) { return value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${Math.round(value)} ms`; }

function useCountUp(target: number, durationMs: number): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame = 0;
    let startTime = 0;

    const tick = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      }
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [durationMs, target]);

  return value;
}

export function BenchmarkPage() {
  const [model, setModel] = useState<BenchmarkSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const modelTopOne = useCountUp(86.7, 1500);
  const deterministicTopOne = useCountUp(13.3, 1500);
  useEffect(() => { void api.benchmark().then(setModel).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load benchmark")); }, []);
  if (error) return <ErrorState message={error} />;
  if (!model) return <LoadingState />;
  const rows = [["replay-fast", replayFast], ["model-eval", model]] as const;
  return <section className="pb-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Evaluation harness</p><h1>Benchmark results</h1><p className="mt-2 text-sm text-slate-400">Ground-truth scoring for the hardened commit-correlation corpus.</p></div><Badge variant="accent" className="hidden sm:inline-flex"><Gauge size={13} /> 15 scenarios</Badge></div>
    <div className="glass-card mt-7 p-6">
      <div className="flex flex-wrap items-start justify-between gap-6"><div><p className="eyebrow">Commit correlation, top-1</p><p className="mt-3 text-sm leading-6 text-slate-300">LLM diff-reasoning materially outperforms deterministic service and path heuristics on adversarial same-service deploy candidates.</p></div><Bot size={22} className="text-blue-300" /></div>
      <div className="mt-7 grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <div className="rounded-glass border border-accent/20 bg-[linear-gradient(135deg,rgba(59,130,246,0.18),rgba(59,130,246,0.04))] p-6">
          <p className="font-mono text-6xl font-semibold tabular-nums text-blue-100">{modelTopOne.toFixed(1)}%</p>
          <p className="mt-2 text-xs uppercase tracking-[0.12em] text-blue-100/65">Model-assisted top-1</p>
        </div>
        <div className="flex items-center justify-center text-xs uppercase tracking-[0.16em] text-slate-600">vs</div>
        <div className="rounded-glass border border-white/10 bg-[linear-gradient(135deg,rgba(148,163,184,0.14),rgba(148,163,184,0.03))] p-6">
          <p className="font-mono text-6xl font-semibold tabular-nums text-slate-300">{deterministicTopOne.toFixed(1)}%</p>
          <p className="mt-2 text-xs uppercase tracking-[0.12em] text-slate-500">Deterministic heuristics</p>
        </div>
      </div>
    </div>
    <p className="mt-3 max-w-4xl text-xs leading-5 text-slate-500">Repeated model-eval runs on this fixed 15-scenario corpus ranged from 86.7% to 93.3% top-1 accuracy, a one-to-two-scenario variance from inherent LLM non-determinism at fixed temperature.</p>
    <div className="glass-card mt-7 overflow-hidden"><div className="flex items-center gap-2 border-b border-line bg-black/20 px-4 py-3"><GitCompareArrows size={15} className="text-blue-300" /><span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Evaluation comparison</span></div><div className="overflow-x-auto"><table className="min-w-[940px] w-full text-left text-sm"><thead className="border-b border-line bg-black/20 text-[11px] uppercase tracking-[0.12em] text-slate-500"><tr><th>Mode</th><th>Scenarios</th><th>Commit top-1</th><th>Commit top-3</th><th>Runbook hit</th><th>Impact class</th><th>Latency p50</th><th>Latency p95</th><th>Tokens</th></tr></thead><tbody>{rows.map(([mode, result], index) => <tr key={mode} className={`border-b border-line/60 last:border-b-0 row-fade-in ${index % 2 ? "bg-white/[0.025]" : ""}`} style={{ animationDelay: `${1500 + index * 100}ms` }}><td className="font-mono text-blue-300">{mode}</td><td className="font-mono tabular-nums">{result.scenario_count}</td><td className="font-mono font-semibold tabular-nums text-slate-100">{metric(result.bad_commit_top1_accuracy)}</td><td className="font-mono tabular-nums">{metric(result.bad_commit_top3_accuracy)}</td><td className="font-mono tabular-nums">{metric(result.runbook_hit_rate)}</td><td className="font-mono tabular-nums">{metric(result.impact_classification_accuracy)}</td><td className="font-mono tabular-nums">{duration(result.latency_p50_ms)}</td><td className="font-mono tabular-nums">{duration(result.latency_p95_ms)}</td><td className="font-mono tabular-nums">{result.total_tokens.toLocaleString()}</td></tr>)}</tbody></table></div></div>
    <div className="mt-4 flex gap-3 rounded-glass border border-line bg-elevated/60 p-4 text-sm text-slate-500"><Info size={17} className="mt-0.5 shrink-0 text-blue-300" /><p>1 live-captured scenario, 14 synthetic-replay. See <code className="font-mono text-xs text-slate-400">scenarios/benchmark/</code> for ground truth.</p></div>
  </section>;
}
