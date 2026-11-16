import { motion, useReducedMotion } from "motion/react";
import { Link } from "react-router-dom";
import { cn, T } from "../components/primitives";
import { SCROLL_IN } from "../motion";
import { landingStats } from "../mockData";

export function NumbersBand() {
  const reduce = useReducedMotion();
  return (
    <section aria-label="Benchmark numbers" className="pt-20 md:pt-32">
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
                className={`px-4 py-8 md:px-6 ${i % 2 === 1 ? "border-l border-white/[0.07]" : ""} ${
                  i > 0 ? "md:border-l md:border-white/[0.07]" : ""
                } ${i >= 2 ? "border-t border-white/[0.07] md:border-t-0" : ""}`}
              >
                <div className="flex flex-col-reverse">
                  <dt className={cn(T.small, "mt-1")}>
                    {cell.label}
                  </dt>
                  <dd className={cn(T.dataLg, "flex items-baseline whitespace-nowrap")}>
                    {prefix ? (
                      <span className={cn(T.small, "mr-2 text-ink-3")}>
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
      <p className={cn(T.small, "mx-auto mt-4 max-w-[1200px] px-4 text-ink-3 md:px-6")}>
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
