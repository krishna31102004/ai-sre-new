import { clsx, type ClassValue } from "clsx";
import { motion, useReducedMotion } from "motion/react";
import type { ElementType, ReactNode } from "react";
import { extendTailwindMerge } from "tailwind-merge";

import { commitLabel } from "../mockData";

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display", "h1", "h1-m", "h2", "h2-m", "h3", "lead", "lead-m", "body", "small", "label",
            "data", "data-sm", "data-lg", "data-lg-m", "data-xl", "data-xl-m", "data-hero",
          ],
        },
      ],
    },
  },
});

/** Class merger that knows the type-scale tokens, so `text-h1` is a size and not a colour. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** One class string per type-scale step (TYPE_SYSTEM.md section 2). Override colour or weight with `cn`. */
export const T = {
  h1: "font-sans font-semibold text-h1-m md:text-h1 text-ink",
  h2: "font-sans font-semibold text-h2-m md:text-h2 text-ink",
  h3: "font-sans font-semibold text-h3 text-ink",
  lead: "font-sans font-normal text-lead-m md:text-lead text-ink-2",
  body: "font-sans font-normal text-body text-ink-2",
  small: "font-sans font-normal text-small text-ink-2",
  label: "font-sans font-medium text-label text-ink-3",
  data: "font-mono font-normal tabular-nums text-data text-ink",
  dataSm: "font-mono font-normal tabular-nums text-data-sm text-ink-3",
  dataLg: "font-mono font-medium tabular-nums text-data-lg-m md:text-data-lg text-ink",
  dataXl: "font-mono font-medium tabular-nums text-data-xl-m md:text-data-xl text-ink",
  dataHero: "font-mono font-medium tabular-nums text-data-hero text-ink",
} as const;

/** "FIRING" or "resolved" to "Firing" or "Resolved". Rendering only. */
export function sentenceCase(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/** Level 1 surface: bg-panel, 1px line border, radius 12, padding 24 (16 under 768). */
export function Panel({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}) {
  return <Tag className={cn("rounded-xl border border-line bg-panel p-4 md:p-6", className)}>{children}</Tag>;
}

/** `label` step: 12px Geist 500, ink-3. */
export function Eyebrow({ children, className, as: Tag = "p" }: { children: ReactNode; className?: string; as?: ElementType }) {
  return <Tag className={cn(T.label, className)}>{children}</Tag>;
}

/** 6px dot plus `label` step text in sentence case. firing pulses (static under reduced motion). */
export function StatusDot({ status, className }: { status: string; className?: string }) {
  const reduce = useReducedMotion();
  const normalized = status.toLowerCase();
  const tone = normalized === "firing" ? "bg-firing" : normalized === "resolved" ? "bg-healthy" : "bg-ink-3";
  const text = normalized === "firing" ? "text-firing" : normalized === "resolved" ? "text-healthy" : "text-ink-3";
  const pulse = normalized === "firing" && !reduce;
  return (
    <span className={cn(T.label, "inline-flex items-center gap-1.5", text, className)}>
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
      {sentenceCase(status)}
    </span>
  );
}

/** 22px tall badge for a service or source name. No border. */
export function ServiceChip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        T.label, "inline-flex h-[22px] max-w-full items-center rounded-md bg-white/[0.06] px-2 text-ink-2",
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
      <span className={T.data} aria-hidden="true">{text}</span>
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
      <span className={cn(T.data, "shrink-0 text-accent")}>{sha.slice(0, 7)}</span>
      <span className={cn(T.small, "min-w-0 truncate text-ink")}>{summary}</span>
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
              T.label,
              "press inline-flex h-11 items-center gap-1.5 rounded-full border border-white/[0.12] px-3 focus-visible:outline-offset-2 nav:h-7",
              selected ? "bg-white/[0.08] text-ink" : "text-ink-2 hover:text-ink",
            )}
          >
            {option.label}
            {option.count !== undefined ? <span className={T.dataSm}>{option.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
