import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Fragment, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { SignalLine } from "../components/SignalLine";
import { EASE } from "../motion";
import { landingStats } from "../mockData";
import { cn, T } from "../components/primitives";

const REPO_URL = "https://github.com/krishna31102004/ai-sre-new";

const H1_LINES = [
  "The on-call engineer's",
  "first five minutes,",
  "automated.",
];

/** Pressable button-like link styles shared by the CTAs. */
const CTA_BASE = cn(
  T.body,
  "inline-flex h-11 items-center justify-center whitespace-nowrap rounded-lg px-3 font-medium transition sm:px-5-[transform,color,border-color,background-color] duration-[120ms] active:scale-[0.97]",
);

function Bar({
  fraction,
  tone,
}: {
  fraction: number;
  tone: "accent" | "muted";
}) {
  return (
    <div
      className="mt-4 h-0.5 w-full rounded-full bg-white/[0.07]"
      aria-hidden="true"
    >
      <div
        className={`h-full rounded-full ${tone === "accent" ? "bg-accent" : "bg-ink-3"}`}
        style={{ width: `${fraction * 100}%` }}
      />
    </div>
  );
}

function ProofCard() {
  const { llm, heuristic } = landingStats.top1;
  return (
    <div className="rounded-2xl border border-white/[0.12] bg-white/[0.03] p-4 backdrop-blur-md md:p-6">
      <p className={T.label}>
        Commit top-1
      </p>
      <div className="mt-4 grid grid-cols-2 gap-6">
        <div className="min-w-0">
          <p className={cn(T.dataXl, "text-accent")}>
            {llm.display}
          </p>
          <Bar fraction={llm.fraction} tone="accent" />
          <p className={cn(T.small, "mt-2")}>{llm.label}</p>
        </div>
        <div className="min-w-0">
          <p className={cn(T.dataXl, "text-ink-3")}>
            {heuristic.display}
          </p>
          <Bar fraction={heuristic.fraction} tone="muted" />
          <p className={cn(T.small, "mt-2")}>{heuristic.label}</p>
        </div>
      </div>
      <p className={cn(T.small, "mt-4 sm:mt-5")}>
        {landingStats.caption}
      </p>
      <Link
        to="/benchmark"
        className={cn(T.body, "mt-1 inline-flex min-h-[44px] items-center font-medium text-accent transition-[color,transform] duration-[160ms] hover:text-ink active:scale-[0.97] md:mt-2 md:min-h-0")}
      >
        How we measured
      </Link>
    </div>
  );
}

export function Hero() {
  const reduce = useReducedMotion();

  const enter = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay, ease: EASE },
        };

  function scrollToDemo(event: MouseEvent<HTMLAnchorElement>) {
    const target = document.getElementById("demo");
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
    window.history.replaceState(null, "", "#demo");
  }

  return (
    <section className="relative flex min-h-[calc(100svh-56px)] items-center overflow-hidden lg:max-h-[760px]">
      {/* Dot grid backdrop, fades out by 70% radius. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage:
            "radial-gradient(ellipse at center, #000 0%, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, #000 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-[1200px] px-4 py-6 md:px-6 sm:pb-16 sm:pt-12 lg:pb-20 lg:pt-8">
        <div className="grid items-center gap-4 sm:gap-8 lg:grid-cols-12 lg:gap-0">
          <div className="min-w-0 lg:col-span-7">
            <motion.div {...enter(0)}>
              <span className={cn(T.label, "inline-flex h-[22px] items-center gap-2 rounded-md bg-white/[0.06] px-2 text-ink-2")}>
                <span
                  className="h-1.5 w-1.5 rounded-full bg-healthy"
                  aria-hidden="true"
                />
                Autonomous incident response agent
              </span>
            </motion.div>

            {/*
              Headline alternatives:
              - "From alert to cited root cause before the pager is acknowledged."
              - "Every alert gets an investigation, not just a page."
            */}
            <h1 className="mt-4 font-display text-[clamp(36px,4.4vw,64px)] font-normal leading-[0.98] tracking-[-0.02em] text-ink">
              {H1_LINES.map((line, i) => (
                <Fragment key={line}>
                  {i > 0 ? " " : null}
                  <motion.span className="block" {...enter(0.07 * i)}>
                    {line}
                  </motion.span>
                </Fragment>
              ))}
            </h1>

            <motion.p
              className={cn(T.lead, "mt-4 max-w-[560px] sm:mt-5")}
              {...enter(0.25)}
            >
              When a Prometheus alert fires, Glassbox finds the bad commit,
              pulls the right runbook, computes real impact, and posts a cited
              brief to Slack.
            </motion.p>

            <motion.div
              className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 sm:mt-6"
              {...enter(0.35)}
            >
              <div className="flex w-full gap-3 sm:w-auto">
                <a
                  href="#demo"
                  onClick={scrollToDemo}
                  className={cn(CTA_BASE, "flex-1 bg-accent text-[#05070d] hover:bg-accent/90 sm:flex-none")}
                >
                  Watch it investigate
                </a>
                <Link
                  to="/pipeline"
                  className={cn(CTA_BASE, "flex-1 border border-white/[0.12] text-ink sm:flex-none")}
                >
                  See the pipeline
                </Link>
              </div>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(T.body, "inline-flex h-11 items-center gap-1 px-2 font-medium text-ink-2 transition-colors duration-[160ms] hover:text-ink")}
              >
                View on GitHub
                <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            </motion.div>
          </div>

          <div className="min-w-0 lg:col-span-5 lg:col-start-8 lg:pl-6">
            <ProofCard />
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-8 hidden sm:block">
        <div className="mx-auto max-w-[1200px] px-6">
          <SignalLine variant="hero" className="h-12 w-full" />
        </div>
      </div>
    </section>
  );
}
