import { Gauge, GitCompareArrows } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import { api, type BenchmarkSummary } from "../api";
import { ErrorState, LoadingState } from "../components";
import { Badge } from "../components/ui/badge";
import { benchmarkModes } from "../mockData";
import { DUR, EASE } from "../motion";

function metric(value: number, suffix = "%") { return value === 1 ? `100${suffix}` : `${(value * 100).toFixed(1)}${suffix}`; }
function duration(value: number) { return value >= 1000 ? `${(value / 1000).toFixed(2)} s` : `${Math.round(value)} ms`; }

const BASELINE_SUFFIX = " (baseline)";

const headers = ["Mode", "Scenarios", "Commit top-1", "Commit top-3", "Runbook hit", "Impact class", "Latency p50", "Latency p95", "Tokens", "Estimated USD/run"];

function ScoreBar({ fraction, tone, reduce }: { fraction: number; tone: "accent" | "muted"; reduce: boolean }) {
  return <div className="mt-6 h-0.5 w-full bg-white/[0.07]" aria-hidden="true">
    <motion.div
      className={`h-full origin-left ${tone === "accent" ? "bg-accent" : "bg-ink-3"}`}
      style={{ width: `${fraction * 100}%` }}
      initial={reduce ? false : { scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: DUR.slow, ease: EASE }}
    />
  </div>;
}

export function BenchmarkPage() {
  const [model, setModel] = useState<BenchmarkSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reduce = useReducedMotion() ?? false;
  useEffect(() => { void api.benchmark().then(setModel).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load benchmark")); }, []);
  if (error) return <ErrorState message={error} />;
  if (!model) return <LoadingState />;
  const rows = benchmarkModes;
  const luna = rows.find((row) => row.label.startsWith("gpt-6-luna"));
  const heuristic = rows.find((row) => row.label === "replay-fast");
  if (!luna || !heuristic) throw new Error("benchmarkModes is missing a required row");
  const lunaTop1 = luna.result.bad_commit_top1_accuracy;
  const heuristicTop1 = heuristic.result.bad_commit_top1_accuracy;
  const headCell = "whitespace-nowrap border-b border-white/[0.07] px-4 py-3 font-mono text-[11px] font-normal uppercase tracking-[0.12em] text-ink-3";
  const cell = "whitespace-nowrap border-b border-white/[0.07] px-4 py-3 font-mono text-[13px] tabular-nums text-ink-2 group-last:border-b-0";
  return <section className="pb-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Evaluation harness</p><h1 className="mt-1">Benchmark results</h1><p className="mt-2 text-[15px] leading-6 text-ink-2">Ground-truth scoring for the fixed 15-scenario corpus; gpt-6-luna uses medium reasoning and strict JSON schema.</p></div><Badge variant="accent" className="hidden sm:inline-flex"><Gauge size={13} /> 15 scenarios</Badge></div>
    <div className="mt-8 overflow-hidden rounded-xl border border-white/[0.07] bg-panel transition-colors duration-[160ms] hover:border-white/[0.12]">
      <div className="border-b border-white/[0.07] p-4 sm:p-6"><p className="eyebrow">Commit correlation, top-1</p><p className="mt-3 max-w-3xl text-[15px] leading-6 text-ink-2">gpt-6-luna selected the ground-truth commit 15/15 in 4 of 4 runs on this 15-scenario benchmark, versus 13.3% for deterministic heuristics.</p></div>
      <div className="relative grid md:grid-cols-2">
        <div className="min-w-0 p-4 sm:p-6 md:p-8">
          <p className="font-mono text-[clamp(64px,11vw,128px)] font-semibold leading-none tabular-nums text-accent">{metric(lunaTop1)}</p>
          <ScoreBar fraction={lunaTop1} tone="accent" reduce={reduce} />
          <p className="mt-3 text-[13px] leading-5 text-ink-2">gpt-6-luna top-1 on this 15-scenario benchmark</p>
        </div>
        <div className="min-w-0 border-t border-white/[0.07] p-4 sm:p-6 md:border-l md:border-t-0 md:p-8">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3 md:hidden" aria-hidden="true">vs</p>
          <p className="font-mono text-[clamp(64px,11vw,128px)] font-semibold leading-none tabular-nums text-ink-3">{metric(heuristicTop1)}</p>
          <ScoreBar fraction={heuristicTop1} tone="muted" reduce={reduce} />
          <p className="mt-3 text-[13px] leading-5 text-ink-2">Deterministic heuristics</p>
        </div>
        <span className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 rounded-full md:block border border-white/[0.07] bg-panel px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">vs</span>
      </div>
    </div>
    <p className="mt-3 max-w-3xl text-[13px] leading-5 text-ink-2">gpt-6-luna scored 100% (15/15) in 4 of 4 runs. gpt-4.1-mini ranged 86.7% to 93.3% on the same corpus.</p>
    <div className="mt-8 overflow-hidden rounded-xl border border-white/[0.07] bg-panel transition-colors duration-[160ms] hover:border-white/[0.12]">
      <div className="flex items-center gap-2 border-b border-white/[0.07] px-4 py-3"><GitCompareArrows size={15} className="text-ink-3" aria-hidden="true" /><span className="eyebrow">Evaluation comparison</span></div>
      <div className="overflow-x-auto rounded-b-xl focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent" tabIndex={0} role="region" aria-label="Evaluation comparison table">
        <table className="w-full min-w-[1040px] border-separate border-spacing-0 text-left">
          <thead><tr>{headers.map((header, index) => <th key={header} scope="col" className={`${headCell} ${index === 0 ? "max-md:sticky max-md:left-0 max-md:z-10 max-md:border-r max-md:bg-panel max-md:border-r-white/[0.07]" : ""}`}>{header}</th>)}</tr></thead>
          <tbody>{rows.map(({ label: mode, result, cost }) => {
            const highlighted = mode === luna.label;
            const isBaseline = mode.endsWith(BASELINE_SUFFIX);
            const name = isBaseline ? mode.slice(0, -BASELINE_SUFFIX.length) : mode;
            return <tr key={mode} className={`group ${highlighted ? "bg-accent/[0.06]" : ""}`}>
              <td className={`${cell} border-l-2 ${highlighted ? "border-l-accent text-accent" : "border-l-transparent text-ink"} max-md:sticky max-md:left-0 max-md:z-10 max-md:border-r max-md:border-r-white/[0.07] ${highlighted ? "max-md:bg-[rgb(14_23_42)]" : "max-md:bg-panel"}`}>
                <span className="inline-flex items-center gap-2">{name}{isBaseline ? <Badge variant="muted" className="px-1.5 py-0.5 text-[10px] leading-4">baseline</Badge> : null}</span>
              </td>
              <td className={cell}>{result.scenario_count}</td>
              <td className={`${cell} font-semibold text-ink`}>{metric(result.bad_commit_top1_accuracy)}</td>
              <td className={cell}>{metric(result.bad_commit_top3_accuracy)}</td>
              <td className={cell}>{metric(result.runbook_hit_rate)}</td>
              <td className={cell}>{metric(result.impact_classification_accuracy)}</td>
              <td className={cell}>{duration(result.latency_p50_ms)}</td>
              <td className={cell}>{duration(result.latency_p95_ms)}</td>
              <td className={cell}>{result.total_tokens.toLocaleString()}</td>
              <td className={cell}>{cost}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>
    </div>
    <div className="mt-8 max-w-[760px]"><p className="eyebrow">Limitations</p><ul className="mt-3 space-y-1.5 text-[13px] leading-5 text-ink-2">
      <li className="flex gap-2"><span className="w-6 shrink-0 font-mono text-ink-3">(a)</span><span>14 of 15 scenarios are synthetic replays; 1 is live-captured.</span></li>
      <li className="flex gap-2"><span className="w-6 shrink-0 font-mono text-ink-3">(b)</span><span>Deploy history is seeded.</span></li>
      <li className="flex gap-2"><span className="w-6 shrink-0 font-mono text-ink-3">(c)</span><span>One LLM call per scenario: commit diff ranking.</span></li>
      <li className="flex gap-2"><span className="w-6 shrink-0 font-mono text-ink-3">(d)</span><span>Benchmark runbook retrieval is local lexical; the live pipeline uses pgvector.</span></li>
      <li className="flex gap-2"><span className="w-6 shrink-0 font-mono text-ink-3">(e)</span><span>The displayed score is a deterministic pre-rank score, not model confidence.</span></li>
      <li className="flex gap-2"><span className="w-6 shrink-0 font-mono text-ink-3">(f)</span><span>Results measure this fixed corpus, not general incident-response accuracy. Inspected commits add short Markdown change notes, not application source-code changes; distractor notes explicitly identify benign or harmless changes with no expected error or latency impact.</span></li>
    </ul></div>
  </section>;
}
