import { motion, useReducedMotion } from "motion/react";
import { Link } from "react-router-dom";
import { SCROLL_IN } from "../motion";
import { landingStats } from "../mockData";

export function NumbersBand() {
  const reduce = useReducedMotion();
  return (
    <section aria-label="Benchmark numbers" className="py-16 md:py-24">
      <h2 className="sr-only">Benchmark numbers</h2>
      <div className="border-y border-white/[0.07]">
        <motion.dl
          {...(reduce ? {} : SCROLL_IN)}
          className="mx-auto grid max-w-[1200px] grid-cols-2 md:grid-cols-4"
        >
          {landingStats.cells.map((cell, i) => {
            const match = /^(about)\s+(.*)$/.exec(cell.value);
            const prefix = match ? match[1] : null;
            const figure = match ? match[2] : cell.value;
            return (
              <div
                key={cell.label}
                className={`px-4 py-8 sm:px-6 ${i % 2 === 1 ? "border-l border-white/[0.07]" : ""} ${
                  i > 0 ? "md:border-l md:border-white/[0.07]" : ""
                } ${i >= 2 ? "border-t border-white/[0.07] md:border-t-0" : ""}`}
              >
                <div className="flex flex-col-reverse">
                  <dt className="mt-3 text-[13px] leading-5 text-ink-2">
                    {cell.label}
                  </dt>
                  <dd className="flex h-7 items-baseline whitespace-nowrap font-mono text-[28px] font-semibold leading-none tabular-nums text-ink sm:h-10 sm:text-[40px]">
                    {prefix ? (
                      <span className="mr-1.5 text-base font-normal text-ink-2">
                        {prefix}
                      </span>
                    ) : null}
                    {figure}
                  </dd>
                </div>
              </div>
            );
          })}
        </motion.dl>
      </div>
      <p className="mx-auto mt-4 max-w-[1200px] px-4 text-[13px] leading-5 text-ink-3 sm:px-6">
        1 live-captured and 14 synthetic-replay scenarios.{" "}
        <Link
          to="/benchmark"
          className="underline underline-offset-2 transition-colors duration-[160ms] hover:text-ink"
        >
          See limitations
        </Link>
        .
      </p>
    </section>
  );
}
