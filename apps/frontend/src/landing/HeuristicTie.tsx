import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import { heuristicTie } from "../mockData";
import { DUR, EASE, SCROLL_IN, STAGGER } from "../motion";

const INITIAL_ORDER = heuristicTie.map((row) => row.sha);
const FINAL_ORDER = [
  ...heuristicTie.filter((row) => row.correct).map((row) => row.sha),
  ...heuristicTie.filter((row) => !row.correct).map((row) => row.sha),
];
const PAUSE_MS = 600;

export function HeuristicTie() {
  const reduce = useReducedMotion();
  const listRef = useRef<HTMLUListElement>(null);
  const inView = useInView(listRef, { once: true, amount: 0.6 });
  const [reordered, setReordered] = useState<boolean>(!!reduce);
  const [staggering, setStaggering] = useState(false);

  useEffect(() => {
    if (reduce) {
      setReordered(true);
      return;
    }
    if (!inView) return;
    let clearId: number | undefined;
    const id = window.setTimeout(() => {
      setStaggering(true);
      setReordered(true);
      // Stagger belongs to this single reorder only; clear it once it has finished.
      clearId = window.setTimeout(
        () => setStaggering(false),
        (DUR.slow + (heuristicTie.length - 1) * STAGGER) * 1000 + 50,
      );
    }, PAUSE_MS);
    return () => {
      window.clearTimeout(id);
      if (clearId !== undefined) window.clearTimeout(clearId);
    };
  }, [inView, reduce]);

  const order = reordered ? FINAL_ORDER : INITIAL_ORDER;
  const rows = order.map((sha) => heuristicTie.find((row) => row.sha === sha)!);
  const columnLabel = reordered ? "After reading the diff" : "Deterministic rank";
  const correct = heuristicTie.find((row) => row.correct);

  return (
    <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 md:py-24" aria-labelledby="heuristic-tie-heading">
      <motion.div {...(reduce ? {} : SCROLL_IN)}>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Why heuristics fail</p>
        <h2
          id="heuristic-tie-heading"
          className="mt-3 max-w-[760px] font-display text-[28px] leading-[1.1] tracking-[-0.01em] text-ink sm:text-4xl"
        >
          Deterministic ranking ties. Reading the change resolves it.
        </h2>
        <p className="mt-4 max-w-[560px] text-[15px] leading-6 text-ink-2">
          Three commits to the same service landed in the same window. Recency and service match score them identically.
        </p>
      </motion.div>

      <div className="mt-10 max-w-[760px]">
        <div className="relative mb-3 h-5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={columnLabel}
              className="absolute left-0 top-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : DUR.fast, ease: EASE }}
            >
              {columnLabel}
            </motion.span>
          </AnimatePresence>
        </div>

        <ul ref={listRef} className="flex flex-col gap-2">
          {rows.map((row, index) => {
            const isCorrect = !!row.correct;
            const dim = reordered && !isCorrect;
            return (
              <motion.li
                key={row.sha}
                layout={!reduce}
                transition={{
                  layout: { duration: DUR.slow, ease: EASE, delay: staggering ? index * STAGGER : 0 },
                }}
                className="relative flex h-16 items-center gap-3 rounded-xl border border-white/[0.07] bg-panel px-4 sm:gap-4"
              >
                {isCorrect && (
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-y-3 left-0 w-[2px] rounded-full bg-healthy"
                    initial={false}
                    animate={{ opacity: reordered ? 1 : 0 }}
                    transition={{ duration: reduce ? 0 : DUR.slow, ease: EASE }}
                  />
                )}
                <span className="w-5 shrink-0 font-mono text-[13px] tabular-nums text-ink-3">{index + 1}</span>
                <motion.span
                  className="w-[72px] shrink-0 font-mono text-[13px] tabular-nums text-ink"
                  initial={false}
                  animate={{ opacity: dim ? 0.55 : 1 }}
                  transition={{ duration: reduce ? 0 : DUR.slow, ease: EASE }}
                >
                  {row.sha}
                </motion.span>
                <span className="min-w-0 flex-1">
                  <motion.span
                    className="line-clamp-2 block text-[14px] leading-5 text-ink sm:line-clamp-1"
                    initial={false}
                    animate={{ opacity: dim ? 0.55 : 1 }}
                    transition={{ duration: reduce ? 0 : DUR.slow, ease: EASE }}
                  >
                    {row.title}
                  </motion.span>
                  <span className="relative block h-4 text-[12px] leading-4 text-ink-3">
                    {reordered && isCorrect && (
                      <span className="absolute inset-0 flex items-center gap-1 text-healthy">
                        <Check className="h-3 w-3" aria-hidden="true" />
                        ground truth
                      </span>
                    )}
                    {reordered && !isCorrect && row.note && <span className="absolute inset-0 truncate">{row.note}</span>}
                  </span>
                </span>
                <span className="shrink-0 rounded-full border border-white/[0.07] px-2.5 py-0.5 font-mono text-[13px] tabular-nums text-ink-2">
                  {row.score.toFixed(2)}
                </span>
              </motion.li>
            );
          })}
        </ul>

        <p className="sr-only" aria-live="polite">
          {reordered && correct
            ? `After reading the diff, commit ${correct.sha} moved to rank 1. The scores stay identical.`
            : ""}
        </p>
      </div>
    </section>
  );
}
