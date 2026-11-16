import { Check, RotateCcw } from "lucide-react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Logo } from "../components/Logo";
import { SignalLine } from "../components/SignalLine";
import { SeverityBadge } from "../components";
import { cn, sentenceCase, T } from "../components/primitives";
import { commitLabel, demoReplay } from "../mockData";
import { EASE } from "../motion";
import { useReplayClock } from "./useReplayClock";

/**
 * The whole timeline, in seconds at 1x (spec 3b). Every element derives its state
 * from the single clock compared against these values. `d*` entries are durations.
 */
export const BEATS = {
  alert: 0.0,
  alertDur: 0.3,
  ringPulses: 2,
  ringDur: 0.7,
  connector: 0.6,
  connectorDur: 0.3,
  triageLoad: 0.6,
  triageDone: 1.2,
  lanesActive: 1.4,
  commit: 2.8,
  runbook: 3.2,
  impact: 3.6,
  laneFade: 0.2,
  synthesis: 3.9,
  synthesisDur: 0.5,
  synthesisSummary: 4.4,
  brief: 4.8,
  briefDur: 0.3,
  briefLines: 4.9,
  briefLineStagger: 0.06,
  reply: 6.2,
  replyDur: 0.3,
  hold: 7.2,
  end: 8.0,
} as const;

const RING_END = BEATS.alert + BEATS.ringPulses * BEATS.ringDur;

export type Ctx = { t: number; started: boolean; speed: number; reduce: boolean };
export const ReplayCtx = createContext<Ctx>({ t: 0, started: false, speed: 1, reduce: false });

function useOn(beat: number) {
  const { t, started, reduce } = useContext(ReplayCtx);
  return reduce || (started && t >= beat);
}

function useTransition(duration: number) {
  const { speed, reduce } = useContext(ReplayCtx);
  return reduce ? { duration: 0 } : { duration: duration / speed, ease: EASE };
}

/** Fades (and optionally lifts) its children when `on` flips. Space is always reserved. */
function Reveal({
  on,
  dur,
  y = 0,
  ghost = 0,
  className,
  children,
}: {
  on: boolean;
  dur: number;
  y?: number;
  /** Opacity while pending. A small value shows the final content as a faint placeholder. */
  ghost?: number;
  className?: string;
  children: ReactNode;
}) {
  const { reduce } = useContext(ReplayCtx);
  const transition = useTransition(dur);
  const off = { opacity: ghost, y };
  return (
    <motion.div
      className={className}
      initial={reduce ? false : off}
      animate={on ? { opacity: 1, y: 0 } : off}
      transition={transition}
      aria-hidden={!on}
    >
      {children}
    </motion.div>
  );
}

/** A pending slot: dim outline always present underneath; content card fades in over it. */
function Slot({
  on,
  dur,
  y,
  ghost,
  className = "",
  innerClassName = "",
  children,
}: {
  on: boolean;
  dur: number;
  y?: number;
  ghost?: number;
  className?: string;
  innerClassName?: string;
  children: ReactNode;
}) {
  return (
    <div className={`relative rounded-lg ${className}`}>
      <div className="pointer-events-none absolute inset-0 rounded-lg bg-ink/[0.03] opacity-40" aria-hidden="true" />
      <Reveal
        on={on}
        dur={dur}
        y={y}
        ghost={ghost}
        className={`relative h-full rounded-lg bg-ink/[0.03] ${innerClassName}`}
      >
        {children}
      </Reveal>
    </div>
  );
}

function FiringDot({ ringing }: { ringing: boolean }) {
  const { speed, reduce } = useContext(ReplayCtx);
  return (
    <span className="relative inline-flex h-2 w-2">
      {ringing && !reduce ? (
        <motion.span
          className="absolute inset-0 rounded-full bg-firing"
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: 2.4, opacity: 0 }}
          transition={{ duration: BEATS.ringDur / speed, ease: EASE, repeat: BEATS.ringPulses - 1, repeatType: "loop" }}
          aria-hidden="true"
        />
      ) : null}
      <span className="relative h-2 w-2 rounded-full bg-firing" />
    </span>
  );
}

function AlertCard() {
  const { t, started, reduce } = useContext(ReplayCtx);
  const on = useOn(BEATS.alert);
  const ringing = !reduce && started && t >= BEATS.alert && t < RING_END;
  const { alert } = demoReplay;
  return (
    <Slot on={on} dur={BEATS.alertDur} y={8} className="min-h-[88px] md:w-[60%] md:shrink-0" innerClassName="flex flex-col justify-center gap-2 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="badge badge-red">
          <FiringDot ringing={ringing} />
          {sentenceCase(alert.status)}
        </span>
        <span className={T.label}>{alert.service}</span>
      </div>
      <p className={cn(T.h3, "break-all")}>{alert.name}</p>
    </Slot>
  );
}

function Connector() {
  const on = useOn(BEATS.connector);
  const transition = useTransition(BEATS.connectorDur);
  const { reduce } = useContext(ReplayCtx);
  return (
    <>
      <div className="mx-auto flex h-4 w-px items-stretch md:hidden" aria-hidden="true">
        <motion.span
          className="w-px origin-top bg-ink/[0.2]"
          style={{ flex: 1 }}
          initial={reduce ? false : { scaleY: 0 }}
          animate={{ scaleY: on ? 1 : 0 }}
          transition={transition}
        />
      </div>
      <div className="hidden w-8 shrink-0 items-center md:flex" aria-hidden="true">
        <motion.span
          className="h-px w-full origin-left bg-ink/[0.2]"
          initial={reduce ? false : { scaleX: 0 }}
          animate={{ scaleX: on ? 1 : 0 }}
          transition={transition}
        />
      </div>
    </>
  );
}

/** Loader and result stacked in one grid cell so the cell is always as tall as the result. */
function Crossfade({ loading, done, loader, result }: { loading: boolean; done: boolean; loader: ReactNode; result: ReactNode }) {
  const { reduce } = useContext(ReplayCtx);
  const transition = useTransition(BEATS.laneFade);
  const showLoader = loading && !done;
  return (
    <div className="grid">
      <motion.div
        className="flex items-center [grid-area:1/1]"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: showLoader ? 1 : 0 }}
        transition={transition}
        aria-hidden={!showLoader}
      >
        {loader}
      </motion.div>
      <motion.div
        className="[grid-area:1/1]"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: done ? 1 : 0 }}
        transition={transition}
        aria-hidden={!done}
      >
        {result}
      </motion.div>
    </div>
  );
}

function TriageChip() {
  const loading = useOn(BEATS.triageLoad);
  const done = useOn(BEATS.triageDone);
  const { triage } = demoReplay;
  return (
    <Slot on={loading} dur={BEATS.laneFade} className="min-h-[88px] md:flex-1" innerClassName="flex flex-col justify-center gap-2 p-4">
      <span className={T.label}>{triage.label}</span>
      <Crossfade
        loading={loading}
        done={done}
        loader={<SignalLine variant="loader" />}
        result={<p className={cn(T.small, "text-ink")}>{triage.result}</p>}
      />
    </Slot>
  );
}

export function Lane({
  title,
  resolveAt,
  result,
  surface = "inset",
}: {
  title: string;
  resolveAt: number;
  result: ReactNode;
  /** "inset" sits inside a level 1 surface (demo frame); "card" is itself a level 1 surface. */
  surface?: "inset" | "card";
}) {
  const { reduce } = useContext(ReplayCtx);
  const active = useOn(BEATS.lanesActive);
  const done = useOn(resolveAt);
  const transition = useTransition(BEATS.laneFade);
  const dimBorder = { opacity: 0.58 };
  const dimBody = { opacity: 0.4 };
  const status = done ? "done" : active ? "running" : "waiting";
  return (
    <div className={cn("relative flex flex-col gap-3", surface === "card" ? "rounded-xl bg-panel p-4 md:p-6" : "rounded-lg bg-ink/[0.03] p-4")}>
      <motion.div
        className={cn("pointer-events-none absolute inset-0 border border-line", surface === "card" ? "rounded-xl" : "rounded-lg")}
        initial={reduce ? false : dimBorder}
        animate={active ? { opacity: 1 } : dimBorder}
        transition={transition}
        aria-hidden="true"
      />
      <div className="flex items-center justify-between gap-2">
        <h3 className={T.h3}>{title}</h3>
        <span className={cn(T.label, done ? "text-healthy" : "text-ink-3")}>{sentenceCase(status)}</span>
      </div>
      <motion.div
        initial={reduce ? false : dimBody}
        animate={active ? { opacity: 1 } : dimBody}
        transition={transition}
      >
        <Crossfade loading={active} done={done} loader={<SignalLine variant="loader" />} result={result} />
      </motion.div>
    </div>
  );
}

function ResultHead({ children, accent = false }: { children: ReactNode; accent?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Check size={14} className="shrink-0 text-healthy" aria-hidden="true" />
      <span className={cn(T.data, "break-all", accent && "text-ink")}>{children}</span>
    </div>
  );
}

function Lanes() {
  const { commit, runbook, impact } = demoReplay.lanes;
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
      <Lane
        title="Commit correlation"
        resolveAt={BEATS.commit}
        result={
          <div className="flex flex-col gap-2">
            <ResultHead accent>{commit.sha}</ResultHead>
            <p className={cn(T.small, "text-ink")} title={commit.title}>
              {commitLabel(commit.sha) ?? commit.title}
            </p>
            <p className={T.small}>{commit.evidence}</p>
          </div>
        }
      />
      <Lane
        title="Runbook RAG"
        resolveAt={BEATS.runbook}
        result={
          <div className="flex flex-col gap-2">
            <ResultHead>{runbook.runbookId}</ResultHead>
            <p className={cn(T.small, "text-ink")}>{runbook.section}</p>
            <p className={T.data}>score {runbook.score.toFixed(2)}</p>
          </div>
        }
      />
      <Lane
        title="Impact estimation"
        resolveAt={BEATS.impact}
        result={
          <div className="flex flex-col items-start gap-2">
            <ResultHead>
              {impact.affectedRequests} / {impact.totalRequests} requests
            </ResultHead>
            <SeverityBadge severity={impact.severity} />
          </div>
        }
      />
    </div>
  );
}

function SynthesisBar() {
  const { reduce } = useContext(ReplayCtx);
  const on = useOn(BEATS.synthesis);
  const summaryOn = useOn(BEATS.synthesisSummary);
  const fill = useTransition(BEATS.synthesisDur);
  const text = useTransition(BEATS.laneFade);
  const { synthesis } = demoReplay;
  return (
    <div className="relative min-h-11 overflow-hidden rounded-lg bg-ink/[0.03]">
      <motion.div
        className="absolute inset-0 origin-left bg-ink/[0.08]"
        initial={reduce ? false : { scaleX: 0 }}
        animate={{ scaleX: on ? 1 : 0 }}
        transition={fill}
        aria-hidden="true"
      />
      <div className="relative flex min-h-11 flex-col justify-center gap-0.5 px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:py-0">
        <motion.span
          className={T.label}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: on ? 1 : 0 }}
          transition={text}
          aria-hidden={!on}
        >
          {synthesis.label}
        </motion.span>
        <motion.span
          className={cn(T.small, "text-ink sm:truncate")}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: summaryOn ? 1 : 0 }}
          transition={text}
          aria-hidden={!summaryOn}
        >
          {synthesis.summary}
        </motion.span>
      </div>
    </div>
  );
}

function BriefLine({ index, label, value, title }: { index: number; label: string; value: string; title?: string }) {
  const on = useOn(BEATS.briefLines + index * BEATS.briefLineStagger);
  return (
    <Reveal on={on} dur={BEATS.laneFade} ghost={0.6} className="grid grid-cols-1 gap-0.5 sm:grid-cols-[120px_1fr] sm:gap-3">
      <span className={T.label}>{label}</span>
      <span className={cn(T.small, "text-ink")} title={title}>{value}</span>
    </Reveal>
  );
}

function BriefCard() {
  const on = useOn(BEATS.brief);
  const { brief } = demoReplay;
  return (
    <Slot on={on} dur={BEATS.briefDur} y={16} ghost={0.14} innerClassName="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink/[0.08] text-ink" aria-hidden="true">
          <Logo size={20} />
        </span>
        <span className={T.h3}>{brief.app}</span>
        <span className={cn(T.label, "inline-flex h-[22px] items-center rounded-md bg-ink/[0.06] px-2 text-ink-2")}>{sentenceCase(brief.tag)}</span>
      </div>
      <div className="flex flex-col gap-2">
        {brief.lines.map((line, index) => (
          <BriefLine key={line.label} index={index} label={line.label} value={line.value} title={line.title} />
        ))}
      </div>
    </Slot>
  );
}

function ReplyCard() {
  const on = useOn(BEATS.reply);
  const { reply } = demoReplay;
  return (
    <div className="ml-8">
      <Slot on={on} dur={BEATS.replyDur} y={8} className="min-h-[56px]" innerClassName="flex items-start gap-2.5 p-3.5">
        <Check size={16} className="mt-0.5 shrink-0 text-healthy" aria-hidden="true" />
        <p className={T.small}>
          <span className={cn(T.small, "font-medium text-ink")}>{reply.status}</span> {reply.text}
        </p>
      </Slot>
    </div>
  );
}

export function LiveDemo() {
  const reduce = !!useReducedMotion();
  const [speed, setSpeed] = useState<1 | 2>(1);
  const frameRef = useRef<HTMLDivElement>(null);
  const inView = useInView(frameRef, { amount: 0.3, once: true });
  const clock = useReplayClock(speed, BEATS.end);

  useEffect(() => {
    if (inView && !reduce) clock.start();
  }, [inView, reduce, clock.start]); // eslint-disable-line react-hooks/exhaustive-deps

  const t = reduce ? BEATS.end : clock.elapsed;
  const finished = reduce ? false : clock.done;
  const ctx: Ctx = { t, started: reduce || clock.started, speed, reduce };

  const buttonBase =
    T.label + " inline-flex min-h-11 items-center justify-center gap-2 px-3.5 transition-[color,border-color,transform] duration-[160ms] active:scale-[0.97] active:duration-[120ms] md:min-h-9";

  return (
    <section id="demo" className="mx-auto max-w-[1200px] scroll-mt-14 px-4 pt-20 md:px-6 md:pt-32" aria-labelledby="demo-title">
      <div className="mb-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between md:mb-6">
        <div className="flex flex-col gap-2">
          <p className={T.label}>Replay of a recorded investigation</p>
          <h2 id="demo-title" className={T.h1}>
            Watch one alert become an answer.
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {!reduce ? (
            <div role="group" aria-label="Replay speed" className="inline-flex rounded-lg border border-line p-0.5">
              {([1, 2] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={speed === value}
                  onClick={() => setSpeed(value)}
                  className={cn(buttonBase, "rounded-md", speed === value ? "bg-ink/[0.08] text-ink" : "text-ink-2 hover:text-ink")}
                >
                  {value}x
                </button>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            aria-disabled={reduce}
            onClick={() => {
              if (!reduce) clock.restart();
            }}
            className={cn(
              buttonBase,
              "rounded-lg border",
              finished ? "border-ink/30 text-ink" : "border-line text-ink-2 hover:text-ink",
              reduce && "cursor-not-allowed opacity-50",
            )}
          >
            <RotateCcw size={14} aria-hidden="true" />
            Replay
          </button>
        </div>
      </div>

      <ReplayCtx.Provider value={ctx}>
        <div ref={frameRef} className="rounded-xl border border-line bg-panel p-4 md:p-6">
          <div key={clock.runId} className="flex flex-col gap-3 md:gap-4">
            <div className="flex flex-col md:flex-row md:items-stretch">
              <AlertCard />
              <Connector />
              <TriageChip />
            </div>
            <Lanes />
            <SynthesisBar />
            <div className="flex flex-col gap-3 md:gap-4">
              <BriefCard />
              <ReplyCard />
            </div>
          </div>
        </div>
      </ReplayCtx.Provider>
    </section>
  );
}
