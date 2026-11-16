import { Check, RotateCcw } from "lucide-react";
import { useInView, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";

import type { InvestigationDetail } from "../api";
import { SeverityBadge } from "../components";
import { Eyebrow, Panel } from "../components/primitives";
import { Lane, ReplayCtx, BEATS, type Ctx } from "../landing/LiveDemo";
import { useReplayClock } from "../landing/useReplayClock";
import { number } from "../lib";
import { cn } from "../lib/utils";
import { commitLabel } from "../mockData";
import { candidatesFrom, eventMs, formatOffset } from "./helpers";

/** Real event spacing is scaled linearly so the first-to-last span plays in this many seconds. */
const REPLAY_SECONDS = 8;

type Beat = { summary: string; type: string; real: number; at: number };

function buildBeats(detail: InvestigationDetail): Beat[] {
  const sorted = [...detail.events].sort((a, b) => eventMs(a.occurred_at) - eventMs(b.occurred_at));
  const resolvedIndex = sorted.findIndex((event) => event.event_type === "resolved");
  const upTo = resolvedIndex >= 0 ? sorted.slice(0, resolvedIndex) : sorted;
  if (!upTo.length) return [];
  const t0 = eventMs(upTo[0].occurred_at);
  const span = eventMs(upTo[upTo.length - 1].occurred_at) - t0;
  return upTo.map((event) => {
    const real = eventMs(event.occurred_at) - t0;
    return { summary: event.summary, type: event.event_type, real, at: span > 0 ? (real / span) * REPLAY_SECONDS : 0 };
  });
}

function Result({ head, children }: { head: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Check size={14} className="shrink-0 text-healthy" aria-hidden="true" />
        <span className="break-all font-mono text-[13px] tabular-nums text-ink">{head}</span>
      </div>
      {children}
    </div>
  );
}

export function ReplayStrip({ detail }: { detail: InvestigationDetail }) {
  const reduce = !!useReducedMotion();
  const frameRef = useRef<HTMLDivElement>(null);
  const inView = useInView(frameRef, { amount: 0.3, once: true });
  const clock = useReplayClock(1, REPLAY_SECONDS);

  useEffect(() => {
    if (inView && !reduce) clock.start();
  }, [inView, reduce, clock.start]); // eslint-disable-line react-hooks/exhaustive-deps

  const beats = useMemo(() => buildBeats(detail), [detail]);
  const candidates = useMemo(() => candidatesFrom(detail), [detail]);
  const top = candidates[0] ?? null;
  const inv = detail.investigation;

  const atOf = (type: string): number => beats.find((beat) => beat.type === type)?.at ?? REPLAY_SECONDS;
  // Lanes run from the triage beat (or the first beat) until their own completion beat.
  const laneStart = beats.find((beat) => beat.type === "triage_completed")?.at ?? 0;
  // The exported Lane switches to "running" at BEATS.lanesActive on its own clock, so the
  // compressed clock is remapped so that moment lands exactly on laneStart.
  const toLaneTime = (elapsed: number): number =>
    elapsed < laneStart ? (laneStart > 0 ? (elapsed / laneStart) * (BEATS.lanesActive - 0.01) : 0) : BEATS.lanesActive + (elapsed - laneStart);
  const resolveAt = (type: string): number => Math.max(toLaneTime(atOf(type)), BEATS.lanesActive + 0.001);

  const elapsed = reduce ? REPLAY_SECONDS : clock.elapsed;
  const ctx: Ctx = { t: toLaneTime(elapsed), started: reduce || clock.started, speed: 1, reduce };

  const current = useMemo(() => {
    if (!beats.length) return null;
    if (reduce) return beats[beats.length - 1];
    if (!clock.started) return beats[0];
    let found = beats[0];
    for (const beat of beats) if (beat.at <= elapsed + 1e-6) found = beat;
    return found;
  }, [beats, reduce, clock.started, elapsed]);

  const finished = !reduce && clock.done;
  const buttonClass =
    "press inline-flex h-11 items-center justify-center gap-2 rounded-lg border px-3.5 text-[13px] font-medium nav:h-8";

  return (
    <Panel as="section" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
          <h3 className="text-[14px] font-medium text-ink">Replay this investigation</h3>
          <Eyebrow className="tracking-normal normal-case">Replay, timing compressed</Eyebrow>
        </div>
        <button
          type="button"
          aria-disabled={reduce || beats.length < 2}
          onClick={() => {
            if (!reduce && beats.length >= 2) clock.restart();
          }}
          className={cn(
            buttonClass,
            finished ? "border-accent text-ink" : "border-white/[0.07] text-ink-2 hover:border-white/[0.12] hover:text-ink",
            reduce || beats.length < 2 ? "cursor-not-allowed opacity-50" : "",
          )}
        >
          <RotateCcw size={14} aria-hidden="true" />
          Replay
        </button>
      </div>

      <ReplayCtx.Provider value={ctx}>
        <div ref={frameRef} key={clock.runId} className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Lane
            title="Commits"
            resolveAt={resolveAt("commit_correlation_completed")}
            result={
              top ? (
                <Result head={top.sha.slice(0, 7)}>
                  <p className="text-[14px] leading-5 text-ink" title={top.title ?? undefined}>
                    {commitLabel(top.sha) ?? top.title ?? "No change summary recorded"}
                  </p>
                  <p className="font-mono text-[13px] tabular-nums text-ink-2">
                    pre-rank score {top.score === null ? "--" : top.score.toFixed(2)}
                  </p>
                </Result>
              ) : (
                <p className="text-[13px] leading-5 text-ink-2">No commit candidates.</p>
              )
            }
          />
          <Lane
            title="Runbook"
            resolveAt={resolveAt("runbook_retrieval_completed")}
            result={
              inv.runbook_id ? (
                <Result head={inv.runbook_id}>
                  <p className="text-[14px] leading-5 text-ink">{inv.runbook_section ?? "Section not recorded"}</p>
                  <p className="font-mono text-[13px] tabular-nums text-ink-2">
                    retrieval score {inv.runbook_score === null ? "--" : inv.runbook_score.toFixed(2)}
                  </p>
                </Result>
              ) : (
                <p className="text-[13px] leading-5 text-ink-2">No runbook matched.</p>
              )
            }
          />
          <Lane
            title="Impact"
            resolveAt={resolveAt("impact_estimation_completed")}
            result={
              <Result head={`${inv.error_rate === null ? "--" : `${(inv.error_rate * 100).toFixed(2)}%`} errors`}>
                <p className="font-mono text-[13px] tabular-nums text-ink-2">{number(inv.affected_requests)} affected requests</p>
                <div>{inv.severity ? <SeverityBadge severity={inv.severity} /> : null}</div>
              </Result>
            }
          />
        </div>
      </ReplayCtx.Provider>

      <div>
        <div className="relative h-0.5 w-full rounded-full bg-white/[0.07]" aria-hidden="true">
          <div
            className="absolute inset-0 origin-left rounded-full bg-accent"
            style={{ transform: `scaleX(${Math.min(1, elapsed / REPLAY_SECONDS)})` }}
          />
          {beats.map((beat, index) => (
            <span
              key={`${beat.type}-${index}`}
              className={cn(
                "absolute top-1/2 h-2 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full",
                elapsed >= beat.at - 1e-6 && (reduce || clock.started) ? "bg-accent" : "bg-white/[0.2]",
              )}
              style={{ left: `${(beat.at / REPLAY_SECONDS) * 100}%` }}
            />
          ))}
        </div>
        <p className="mt-3 min-h-10 text-[13px] leading-5 text-ink-2 sm:min-h-5">
          {current ? (
            <>
              <span className="mr-2 font-mono text-[12px] tabular-nums text-ink-3">{formatOffset(current.real)}</span>
              {current.summary}
            </>
          ) : (
            "No events were recorded for this investigation."
          )}
        </p>
      </div>
    </Panel>
  );
}
