import { motion, useReducedMotion } from "motion/react";
import type { ElementType, ReactNode } from "react";

import { commitLabel } from "../mockData";
import { cn } from "../lib/utils";

/** Spec 9a: bg-panel, 1px line border, radius 12, padding 20 (16 under 768). */
export function Panel({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}) {
  return <Tag className={cn("rounded-xl border border-white/[0.07] bg-panel p-4 md:p-5", className)}>{children}</Tag>;
}

/** 11px mono uppercase label, tracking 0.08em, ink-3. */
export function Eyebrow({ children, className, as: Tag = "p" }: { children: ReactNode; className?: string; as?: ElementType }) {
  return <Tag className={cn("font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3", className)}>{children}</Tag>;
}

/** 6px dot plus 12px mono uppercase label. firing pulses (static under reduced motion). */
export function StatusDot({ status, className }: { status: string; className?: string }) {
  const reduce = useReducedMotion();
  const normalized = status.toLowerCase();
  const tone = normalized === "firing" ? "bg-firing" : normalized === "resolved" ? "bg-healthy" : "bg-ink-3";
  const text = normalized === "firing" ? "text-firing" : normalized === "resolved" ? "text-healthy" : "text-ink-3";
  const pulse = normalized === "firing" && !reduce;
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tabular-nums", text, className)}>
      {pulse ? (
        <motion.span
          className={cn("h-1.5 w-1.5 rounded-full", tone)}
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
          aria-hidden="true"
        />
      ) : (
        <span className={cn("h-1.5 w-1.5 rounded-full", tone)} aria-hidden="true" />
      )}
      {status}
    </span>
  );
}

/** 22px tall mono chip for a service or source name. */
export function ServiceChip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] max-w-full items-center rounded-md border border-white/[0.07] px-2 font-mono text-[12px] text-ink-2",
        className,
      )}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}

/** 48 x 2px track with an accent fill, then the value with 2 decimals. `value` 0 to 1. */
export function ScoreBar({ value, label = "pre-rank score", className }: { value: number | null; label?: string; className?: string }) {
  const clamped = value === null ? 0 : Math.min(1, Math.max(0, value));
  const text = value === null ? "--" : value.toFixed(2);
  return (
    <span
      role="img"
      aria-label={`${label} ${text}`}
      title={label}
      className={cn("inline-flex shrink-0 items-center gap-2", className)}
    >
      <span className="relative h-0.5 w-12 overflow-hidden rounded-full bg-white/[0.07]" aria-hidden="true">
        <span className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${clamped * 100}%` }} />
      </span>
      <span className="font-mono text-[12px] tabular-nums text-ink-2" aria-hidden="true">{text}</span>
    </span>
  );
}

/** 7-char SHA in accent mono, then the human summary on one truncated line. Raw title goes in `title`. */
export function CommitSummary({
  sha,
  title,
  className,
}: {
  sha: string;
  /** Raw commit title. Used as the tooltip, and as the text only when no human summary exists. */
  title?: string | null;
  className?: string;
}) {
  const summary = commitLabel(sha) ?? title ?? "No change summary recorded";
  return (
    <span className={cn("flex min-w-0 items-baseline gap-2", className)} title={title ?? undefined}>
      <span className="shrink-0 font-mono text-[12px] tabular-nums text-accent">{sha.slice(0, 7)}</span>
      <span className="min-w-0 truncate text-[14px] text-ink">{summary}</span>
    </span>
  );
}

export type FilterChipOption = { value: string; label: string; count?: number };

/** Single-select pill group. Each chip is a button with `aria-pressed`. */
export function FilterChips({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: FilterChipOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn("flex flex-wrap items-center gap-2", className)}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "press inline-flex h-11 items-center gap-1.5 rounded-full border border-white/[0.07] px-3 text-[12px] focus-visible:outline-offset-2 nav:h-7",
              selected ? "bg-white/[0.08] text-ink" : "text-ink-2 hover:border-white/[0.12] hover:text-ink",
            )}
          >
            {option.label}
            {option.count !== undefined ? <span className="font-mono tabular-nums text-ink-3">{option.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
