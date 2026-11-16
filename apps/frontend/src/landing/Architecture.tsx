import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Link } from "react-router-dom";
import { Activity, ArrowRight, Database, Layers, MessageSquare, Server, Workflow, type LucideIcon } from "lucide-react";
import { DUR, EASE, STAGGER } from "../motion";

type Node = { label: string; icon: LucideIcon; parallel?: boolean };

const NODES: Node[] = [
  { label: "Prometheus", icon: Activity },
  { label: "FastAPI", icon: Server },
  { label: "Redis", icon: Layers },
  { label: "LangGraph", icon: Workflow, parallel: true },
  { label: "Postgres + pgvector", icon: Database },
  { label: "Slack", icon: MessageSquare },
];

function Arrow({ vertical }: { vertical?: boolean }) {
  return (
    <svg
      width="6"
      height="8"
      viewBox="0 0 6 8"
      aria-hidden="true"
      className={`shrink-0 text-white/[0.25] ${vertical ? "rotate-90" : ""}`}
    >
      <path d="M0.5 0.5 L5 4 L0.5 7.5" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export function Architecture() {
  const reduce = useReducedMotion();
  const [stacked, setStacked] = useState(
    () => typeof window !== "undefined" && !window.matchMedia("(min-width: 900px)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const update = () => setStacked(!mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 md:py-24" aria-labelledby="architecture-heading">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Architecture</p>
      <h2
        id="architecture-heading"
        className="mt-3 font-display text-[28px] leading-[1.1] tracking-[-0.01em] text-ink sm:text-4xl"
      >
        Six hops from alert to answer.
      </h2>

      <ol className="mt-10 flex flex-col nav:flex-row nav:items-center">
        {NODES.map((node, i) => {
          const Icon = node.icon;
          const last = i === NODES.length - 1;
          return (
            <motion.li
              key={node.label}
              className={`flex flex-col nav:flex-row nav:items-center ${last ? "" : "nav:min-w-0 nav:flex-1"}`}
              {...(reduce
                ? {}
                : {
                    initial: { opacity: 0, y: 12 },
                    whileInView: { opacity: 1, y: 0 },
                    viewport: { once: true, amount: 0.3 },
                    transition: { duration: DUR.slow, ease: EASE, delay: stacked ? 0 : i * STAGGER },
                  })}
            >
              <div
                className={`flex shrink-0 self-start rounded-lg border border-white/[0.07] bg-panel px-3 font-mono text-[12px] text-ink ${
                  node.parallel ? "min-h-[40px] flex-col justify-center gap-2 py-3" : "h-10 items-center gap-2"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-ink-2" aria-hidden="true" />
                  {node.label}
                </span>
                {node.parallel && (
                  <span className="flex flex-col gap-[3px]">
                    <span className="flex flex-col gap-[3px]" aria-hidden="true">
                      <span className="h-1.5 rounded-full bg-accent/60" />
                      <span className="h-1.5 rounded-full bg-accent/60" />
                      <span className="h-1.5 rounded-full bg-accent/60" />
                    </span>
                    <span className="text-[11px] text-ink-3">3 parallel nodes</span>
                  </span>
                )}
              </div>

              {!last && (
                <>
                  <div className="ml-6 flex h-6 w-2 -translate-x-1/2 flex-col items-center nav:hidden" aria-hidden="true">
                    <div className="w-px flex-1 bg-white/[0.12]" />
                    <Arrow vertical />
                  </div>
                  <div className="hidden min-w-4 flex-1 items-center nav:flex" aria-hidden="true">
                    <div className="h-px flex-1 bg-white/[0.12]" />
                    <Arrow />
                  </div>
                </>
              )}
            </motion.li>
          );
        })}
      </ol>

      <Link
        to="/pipeline"
        className="mt-10 inline-flex min-h-[44px] items-center gap-1.5 text-[14px] font-medium text-accent transition-[color,transform] duration-[120ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-ink active:scale-[0.97]"
      >
        Open the interactive pipeline
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
