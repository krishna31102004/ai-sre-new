import { Eyebrow, Panel } from "../components/primitives";
import { commitLabel } from "../mockData";
import { cn } from "../lib/utils";
import type { Candidate } from "./helpers";

export function SuspectCommitHero({ top }: { top: Candidate | null }) {
  if (!top) {
    return (
      <Panel className="border-dashed border-white/[0.12] bg-transparent p-6">
        <p className="text-[15px] text-ink">No commit candidates in the lookback window.</p>
        <p className="mt-1 text-[13px] text-ink-2">The agent reports that instead of guessing.</p>
      </Panel>
    );
  }
  const summary = commitLabel(top.sha) ?? top.title ?? "No change summary recorded";
  const validated = top.validation?.toLowerCase() === "validated";
  const score = top.score;
  const evidence = top.evidence.slice(0, 3);
  return (
    <section aria-label="Suspect commit" className="rounded-xl border border-white/[0.07] border-l-2 border-l-accent bg-elevated p-4 md:p-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <Eyebrow>Suspect commit</Eyebrow>
          <p className="mt-3 break-all font-mono text-[14px] tabular-nums text-accent">{top.sha.slice(0, 12)}</p>
          <h2
            className="mt-2 font-display text-[20px] font-normal leading-[1.2] text-ink md:text-[28px]"
            title={top.title ?? undefined}
          >
            {summary}
          </h2>
          <div className="mt-5">
            <Eyebrow>Top evidence</Eyebrow>
            {evidence.length ? (
              <ul className="mt-2 flex flex-col gap-2">
                {evidence.map((item, index) => (
                  <li key={`${item.reference ?? item.summary}-${index}`} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
                    <span className="shrink-0 font-mono text-[11px] uppercase tabular-nums text-ink-3 sm:w-14">{item.kind ?? "note"}</span>
                    <span className="min-w-0 text-[13px] leading-5 text-ink-2">
                      {item.summary}
                      {item.reference ? (
                        <span className="block break-all font-mono text-[12px] text-ink-3">{item.reference}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[13px] text-ink-2">No structured evidence was recorded.</p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 md:w-[200px] md:shrink-0">
          <p className="font-mono text-[40px] font-medium leading-none tabular-nums text-ink" aria-label={`pre-rank score ${score === null ? "not available" : score.toFixed(2)}`}>
            {score === null ? "--" : score.toFixed(2)}
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">pre-rank score</p>
          <div className="h-0.5 w-full overflow-hidden rounded-full bg-white/[0.07]" aria-hidden="true">
            <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(1, Math.max(0, score ?? 0)) * 100}%` }} />
          </div>
          <span
            className={cn(
              "mt-1 inline-flex h-6 w-fit items-center rounded-full border px-2.5 font-mono text-[11px] uppercase",
              validated ? "border-healthy/60 text-healthy" : "border-white/[0.12] text-ink-3",
            )}
          >
            {validated ? "validated" : (top.validation ?? "not validated")}
          </span>
        </div>
      </div>
    </section>
  );
}
