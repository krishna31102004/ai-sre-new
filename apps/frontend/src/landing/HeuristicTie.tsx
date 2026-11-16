import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";
import { commitLabel, heuristicTie } from "../mockData";
import { cn, T } from "../components/primitives";
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
    <section className="mx-auto max-w-[1200px] px-4 pt-20 md:px-6 md:pt-32" aria-labelledby="heuristic-tie-heading">
      <motion.div {...(reduce ? {} : SCROLL_IN)}>
        <p className={T.label}>Why heuristics fail</p>
        <h2
          id="heuristic-tie-heading"
          className={cn(T.h1, "mt-2 max-w-[760px]")}
        >
          Deterministic ranking ties. Reading the change resolves it.
        </h2>
        <p className={cn(T.body, "mt-2 max-w-[560px]")}>
          Three commits to the same service landed in the same window. Recency and service match score them identically.
        </p>
      </motion.div>

      <div className="mt-4 max-w-[760px] md:mt-6">
        <div className={cn(T.label, "relative mb-2 h-4")}>
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

        <ul ref={listRef} className="flex flex-col gap-3 md:gap-4">
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
                className="relative flex h-16 items-center gap-3 rounded-xl border border-line bg-panel px-4 sm:gap-4"
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
                <span className={cn(T.dataSm, "w-5 shrink-0")}>{index + 1}</span>
                <motion.span
                  className={cn(T.data, "w-[72px] shrink-0 text-accent")}
                  initial={false}
                  animate={{ opacity: dim ? 0.55 : 1 }}
                  transition={{ duration: reduce ? 0 : DUR.slow, ease: EASE }}
                >
                  {row.sha}
                </motion.span>
                <span className="min-w-0 flex-1">
                  <motion.span
                    title={row.title}
                    className={cn(T.body, "line-clamp-2 block text-ink sm:line-clamp-1")}
                    initial={false}
                    animate={{ opacity: dim ? 0.55 : 1 }}
                    transition={{ duration: reduce ? 0 : DUR.slow, ease: EASE }}
                  >
                    {commitLabel(row.sha) ?? row.title}
                  </motion.span>
                  <span className={cn(T.label, "relative block h-4")}>
                    {reordered && isCorrect && (
                      <span className="absolute inset-0 flex items-center gap-1 text-healthy">
                        <Check className="h-3 w-3" aria-hidden="true" />
                        actual cause
                      </span>
                    )}
                    {reordered && !isCorrect && row.note && <span className="absolute inset-0 truncate">{row.note}</span>}
                  </span>
                </span>
                <span className={cn(T.data, "shrink-0")}>
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
