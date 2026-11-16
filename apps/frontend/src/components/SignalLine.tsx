import { motion, useReducedMotion } from "motion/react";

type SignalLineProps = {
  variant: "hero" | "loader";
  /** Hero only: a flat line with no bump or spike (used on the 404 page). Static, uses currentColor. */
  flat?: boolean;
  className?: string;
};

// Hero geometry in a 1000x48 box. One continuous trace, with the accent spike overlaid as a second path on top.
const TRACE = "M0 24 L380 24 L400 24 L412 18 L424 24 L520 24 L540 24 L556 4 L572 44 L588 24 L1000 24";
const SPIKE = "M520 24 L540 24 L556 4 L572 44 L588 24";
const DRAW_SECONDS = 1.6;
const DRAW_DELAY = 0.2;
// The spike spans x 520 to 588 of 1000 along the trace, so it is overlaid as the draw reaches it.
const SPIKE_START = 0.52;
const SPIKE_SHARE = 0.08;

export function SignalLine({ variant, flat = false, className }: SignalLineProps) {
  const reduce = useReducedMotion();

  if (variant === "loader") {
    return (
      <svg
        className={className}
        width={120}
        height={16}
        viewBox="0 0 120 16"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M0 8 L40 8 L46 5 L52 8 L60 8 L64 1 L68 15 L72 8 L120 8"
          style={{ stroke: "rgb(var(--color-ink) / 0.16)" }}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          className="signal-loader-run"
          d="M0 8 L40 8 L46 5 L52 8 L60 8 L64 1 L68 15 L72 8 L120 8"
          pathLength={120}
          style={{ stroke: "rgb(var(--color-ink) / 0.6)" }}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (flat) {
    return (
      <svg
        className={className}
        viewBox="0 0 160 8"
        preserveAspectRatio="none"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M0 4 L160 4" stroke="currentColor" strokeOpacity={0.6} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      </svg>
    );
  }

  return (
    <svg
      className={className}
      viewBox="0 0 1000 48"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <motion.path
        d={TRACE}
        style={{ stroke: "rgb(var(--color-ink) / 0.42)" }}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={reduce ? { duration: 0 } : { duration: DRAW_SECONDS, delay: DRAW_DELAY, ease: "linear" }}
      />
      <motion.path
        d={SPIKE}
        style={{ stroke: "rgb(var(--color-accent))" }}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={reduce ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={
          reduce
            ? { duration: 0 }
            : { duration: DRAW_SECONDS * SPIKE_SHARE, delay: DRAW_DELAY + DRAW_SECONDS * SPIKE_START, ease: "linear" }
        }
      />
    </svg>
  );
}
