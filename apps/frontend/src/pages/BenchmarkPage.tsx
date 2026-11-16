import { Check, ChevronRight, Gauge, GitCompareArrows, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import { api, type BenchmarkSummary } from "../api";
import { ErrorState, LoadingState } from "../components";
import { Badge } from "../components/ui/badge";
import { cn, FilterChips, ScoreBar as PreRankBar, sentenceCase, T } from "../components/primitives";
import { benchmarkModes, commitLabel, benchmarkScenarios, type BenchmarkModeId, type BenchmarkScenario } from "../mockData";
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

const MODE_COLUMNS: { id: BenchmarkModeId; label: string; short: string }[] = [
  { id: "replay-fast", label: "replay-fast", short: "RF" },
  { id: "gpt-4.1-mini", label: "gpt-4.1-mini", short: "MINI" },
  { id: "gpt-6-luna", label: "gpt-6-luna", short: "LUNA" },
];
const ROW_GRID = "grid grid-cols-[16px_minmax(0,1fr)_repeat(3,56px)] items-center gap-x-2 md:grid-cols-[16px_minmax(0,1fr)_auto_repeat(3,88px)] md:gap-x-3";
const badgeClass = (live: boolean) => cn(T.label, "inline-flex h-[22px] shrink-0 items-center rounded-md px-2", live ? "bg-healthy/[0.12] text-healthy" : "bg-white/[0.06] text-ink-2");

function ModeCell({ scenario, mode }: { scenario: BenchmarkScenario; mode: BenchmarkModeId }) {
  const result = scenario.modes[mode];
  if (result.right === null) return <span className={cn(T.dataSm, "flex justify-center")} title="not recorded" aria-label="not recorded">--</span>;
  const runs = mode === "gpt-6-luna" && "runsRight" in result && result.runsRight !== null ? result.runsRight : null;
  const verb = result.right ? "picked the actual cause first" : "missed the actual cause";
  return <span className="flex items-center justify-center gap-1" aria-label={`${mode} ${verb}${runs !== null ? `, ${runs} of 4 runs right` : ""}`}>
    {result.right ? <Check size={16} className="text-healthy" aria-hidden="true" /> : <X size={16} className="text-firing" aria-hidden="true" />}
    {runs !== null ? <span className={T.dataSm} aria-hidden="true">{runs}/4</span> : null}
  </span>;
}

function ScenarioRow({ scenario, open, onToggle, reduce }: { scenario: BenchmarkScenario; open: boolean; onToggle: () => void; reduce: boolean }) {
  const live = scenario.capture === "live";
  const panelId = `scenario-${scenario.id}`;
  const dur = reduce ? 0 : DUR.base;
  return <li className="border-b border-line last:border-b-0">
    <button type="button" aria-expanded={open} aria-controls={panelId} onClick={onToggle} className={`${ROW_GRID} press min-h-[52px] w-full max-md:py-2 md:h-[52px] px-4 text-left transition-colors duration-[160ms] hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent`}>
      <motion.span className="flex text-ink-3" aria-hidden="true" initial={false} animate={{ rotate: open ? 90 : 0 }} transition={{ duration: dur, ease: EASE }}><ChevronRight size={16} /></motion.span>
      <span className="min-w-0">
        <span className={cn(T.body, "line-clamp-2 font-medium text-ink md:block md:truncate")}>{scenario.title}</span>
        <span className={cn(T.dataSm, "block truncate max-md:hidden")}>{scenario.id}</span>
        <span className="md:hidden"><span className={badgeClass(live)}>{sentenceCase(scenario.capture)}</span></span>
      </span>
      <span className={cn(badgeClass(live), "max-md:hidden")}>{sentenceCase(scenario.capture)}</span>
      {MODE_COLUMNS.map((column) => <ModeCell key={column.id} scenario={scenario} mode={column.id} />)}
    </button>
    <AnimatePresence initial={false}>
      {open ? <motion.div id={panelId} key="detail" className="overflow-hidden bg-canvas" initial={reduce ? false : { height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { height: 0, opacity: 0 }} transition={{ duration: dur, ease: EASE }}>
        <div className="px-4 py-4">
          <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className={T.label}>Ranked candidates</p>
            {scenario.preRankScore !== null ? <PreRankBar value={scenario.preRankScore} /> : <span className={T.dataSm} title="pre-rank score: no deterministic finding">pre-rank score n/a</span>}
          </div>
          <ol className="flex flex-col">
            {scenario.candidates.map((candidate, index) => {
              const pickedBy = MODE_COLUMNS.filter((column) => scenario.modes[column.id].firstPick === candidate.sha);
              const actual = candidate.sha === scenario.actualCause;
              return <li key={candidate.sha} className="relative -mx-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-line px-4 py-3 last:border-b-0">
                {actual ? <span aria-hidden="true" className="absolute inset-y-3 left-0 w-[2px] rounded-full bg-healthy" /> : null}
                <span className={cn(T.dataSm, "w-5 shrink-0")}>{index + 1}</span>
                <span className="flex min-w-0 flex-1 basis-[200px] items-baseline gap-2"><span className={cn(T.data, "shrink-0 text-accent")}>{candidate.sha.slice(0, 7)}</span><span className={cn(T.small, "min-w-0 text-ink max-md:break-words md:truncate")}>{commitLabel(candidate.sha) ?? "No change summary recorded"}</span></span>
                {candidate.score !== null ? <PreRankBar value={candidate.score} /> : null}
                <span className="flex flex-wrap items-center gap-1.5">
                  {pickedBy.map((column) => <span key={column.id} className={cn(T.label, "inline-flex h-[22px] items-center rounded-md bg-white/[0.06] px-2 text-ink-2")} title={`${column.label} picked this first`}>{column.label} first pick</span>)}
                  {actual ? <span className={cn(T.label, "inline-flex h-[22px] items-center gap-1 rounded-md bg-healthy/[0.12] px-2 text-healthy")}><Check size={12} aria-hidden="true" />actual cause</span> : null}
                </span>
              </li>;
            })}
          </ol>
        </div>
      </motion.div> : null}
    </AnimatePresence>
  </li>;
}

type ScenarioFilter = "all" | "heuristics" | "mini";

function ScenarioDrilldown({ reduce }: { reduce: boolean }) {
  const [filter, setFilter] = useState<ScenarioFilter>("all");
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const missed = (mode: BenchmarkModeId) => benchmarkScenarios.filter((scenario) => scenario.modes[mode].right === false);
  const visible = filter === "heuristics" ? missed("replay-fast") : filter === "mini" ? missed("gpt-4.1-mini") : benchmarkScenarios;
  const toggle = (id: string) => setOpenIds((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  return <section className="mt-8 md:mt-10">
    <h2 className={T.h2}>All {benchmarkScenarios.length} scenarios</h2>
    <p className={cn(T.small, "mt-2")}>First pick per mode. Expand a row for the ranked candidates.</p>
    <FilterChips className="mt-4" ariaLabel="Filter scenarios" value={filter} onChange={(value) => setFilter(value as ScenarioFilter)} options={[
      { value: "all", label: "All", count: benchmarkScenarios.length },
      { value: "heuristics", label: "Heuristics missed", count: missed("replay-fast").length },
      { value: "mini", label: "Mini missed", count: missed("gpt-4.1-mini").length },
    ]} />
    <div className="mt-4 overflow-hidden rounded-xl border border-line bg-panel">
      <div className={cn(T.label, ROW_GRID, "border-b border-line px-4 py-2.5")} aria-hidden="true">
        <span /><span>Scenario</span><span className="max-md:hidden">Capture</span>
        {MODE_COLUMNS.map((column) => <span key={column.id} className="text-center"><span className="md:hidden">{sentenceCase(column.short)}</span><span className="max-md:hidden">{column.label}</span></span>)}
      </div>
      <ul>{visible.map((scenario) => <ScenarioRow key={scenario.id} scenario={scenario} open={openIds.has(scenario.id)} onToggle={() => toggle(scenario.id)} reduce={reduce} />)}</ul>
    </div>
  </section>;
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
  const headCell = cn(T.label, "whitespace-nowrap border-b border-line px-4 py-3");
  const cell = cn(T.data, "h-[52px] whitespace-nowrap border-b border-line px-4 py-0 group-last:border-b-0");
  return <section>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className={T.label}>Evaluation harness</p><h1 className={cn(T.h1, "mt-2")}>Benchmark results</h1><p className={cn(T.body, "mt-2")}>Ground-truth scoring for the fixed 15-scenario corpus; gpt-6-luna uses medium reasoning and strict JSON schema.</p></div><Badge variant="accent" className="hidden sm:inline-flex"><Gauge size={13} /> 15 scenarios</Badge></div>
    <div className="mt-6 overflow-hidden rounded-xl border border-line bg-panel transition-colors duration-[160ms] hover:border-white/[0.12] md:mt-8">
      <div className="border-b border-line p-4 md:p-6"><p className={T.label}>Commit correlation, top-1</p><p className={cn(T.body, "mt-2 max-w-3xl text-ink")}>gpt-6-luna selected the ground-truth commit 15/15 in 4 of 4 runs on this 15-scenario benchmark, versus 13.3% for deterministic heuristics.</p></div>
      <div className="relative grid md:grid-cols-2">
        <div className="min-w-0 p-4 md:p-6">
          <p className={cn(T.dataHero, "text-accent")}>{metric(lunaTop1)}</p>
          <ScoreBar fraction={lunaTop1} tone="accent" reduce={reduce} />
          <p className={cn(T.small, "mt-2")}>gpt-6-luna top-1 on this 15-scenario benchmark</p>
        </div>
        <div className="min-w-0 border-t border-line p-4 md:border-l md:border-t-0 md:p-6">
          <p className={cn(T.label, "mb-2 md:hidden")} aria-hidden="true">vs</p>
          <p className={cn(T.dataHero, "text-ink-3")}>{metric(heuristicTop1)}</p>
          <ScoreBar fraction={heuristicTop1} tone="muted" reduce={reduce} />
          <p className={cn(T.small, "mt-2")}>Deterministic heuristics</p>
        </div>
        <span className={cn(T.label, "pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 rounded-md bg-panel px-2 py-1 md:block")}>vs</span>
      </div>
    </div>
    <p className={cn(T.small, "mt-3 max-w-3xl")}>gpt-6-luna scored 100% (15/15) in 4 of 4 runs. gpt-4.1-mini ranged 86.7% to 93.3% on the same corpus.</p>
    <div className="mt-8 overflow-hidden rounded-xl border border-line bg-panel transition-colors duration-[160ms] hover:border-white/[0.12] md:mt-10">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3"><GitCompareArrows size={15} className="text-ink-3" aria-hidden="true" /><span className={T.label}>Evaluation comparison</span></div>
      <div className="overflow-x-auto rounded-b-xl focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent" tabIndex={0} role="region" aria-label="Evaluation comparison table">
        <table className="w-full min-w-[1040px] border-separate border-spacing-0 text-left">
          <thead><tr>{headers.map((header, index) => <th key={header} scope="col" className={`${headCell} ${index === 0 ? "max-md:sticky max-md:left-0 max-md:z-10 max-md:border-r max-md:bg-panel max-md:border-r-line" : ""}`}>{header}</th>)}</tr></thead>
          <tbody>{rows.map(({ label: mode, result, cost }) => {
            const highlighted = mode === luna.label;
            const isBaseline = mode.endsWith(BASELINE_SUFFIX);
            const fullName = isBaseline ? mode.slice(0, -BASELINE_SUFFIX.length) : mode;
            const qualified = /^(.*?)(\s+\(.*\))$/.exec(fullName);
            const name = qualified ? qualified[1] : fullName;
            const qualifier = qualified ? qualified[2].trim() : null;
            return <tr key={mode} className={`group ${highlighted ? "bg-accent/[0.06]" : ""}`}>
              <td className={cn(cell, "border-l-2 max-md:sticky max-md:left-0 max-md:z-10 max-md:border-r max-md:border-r-line", highlighted ? "border-l-accent text-accent max-md:bg-[rgb(14_23_42)]" : "border-l-transparent text-ink max-md:bg-panel")}>
                <span className="inline-flex items-center gap-2">{name}{qualifier ? <span className={cn(T.small, "text-ink-3")}>{qualifier}</span> : null}{isBaseline ? <Badge variant="muted">{sentenceCase("baseline")}</Badge> : null}</span>
              </td>
              <td className={cell}>{result.scenario_count}</td>
              <td className={cn(cell, "font-medium")}>{metric(result.bad_commit_top1_accuracy)}</td>
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
    <ScenarioDrilldown reduce={reduce} />
    <div className="mt-8 max-w-[760px] md:mt-10"><p className={T.label}>Limitations</p><ul className={cn(T.small, "mt-3 space-y-2")}>
      <li className="flex gap-2"><span className={cn(T.small, "w-6 shrink-0 text-ink-3")}>(a)</span><span>14 of 15 scenarios are synthetic replays; 1 is live-captured.</span></li>
      <li className="flex gap-2"><span className={cn(T.small, "w-6 shrink-0 text-ink-3")}>(b)</span><span>Deploy history is seeded.</span></li>
      <li className="flex gap-2"><span className={cn(T.small, "w-6 shrink-0 text-ink-3")}>(c)</span><span>One LLM call per scenario: commit diff ranking.</span></li>
      <li className="flex gap-2"><span className={cn(T.small, "w-6 shrink-0 text-ink-3")}>(d)</span><span>Benchmark runbook retrieval is local lexical; the live pipeline uses pgvector.</span></li>
      <li className="flex gap-2"><span className={cn(T.small, "w-6 shrink-0 text-ink-3")}>(e)</span><span>The displayed score is a deterministic pre-rank score, not model confidence.</span></li>
      <li className="flex gap-2"><span className={cn(T.small, "w-6 shrink-0 text-ink-3")}>(f)</span><span>Results measure this fixed corpus, not general incident-response accuracy. Inspected commits add short Markdown change notes, not application source-code changes; distractor notes explicitly identify benign or harmless changes with no expected error or latency impact.</span></li>
    </ul></div>
  </section>;
}
