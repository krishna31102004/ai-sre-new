import { cn, Eyebrow, Panel, sentenceCase, T } from "../components/primitives";
import { commitLabel } from "../mockData";
import type { Candidate } from "./helpers";

export function SuspectCommitHero({ top }: { top: Candidate | null }) {
  if (!top) {
    return (
      <Panel className="border-dashed border-white/[0.12] bg-transparent">
        <p className={T.body}>No commit candidates in the lookback window.</p>
        <p className={cn(T.small, "mt-1")}>The agent reports that instead of guessing.</p>
      </Panel>
    );
  }
  const summary = commitLabel(top.sha) ?? top.title ?? "No change summary recorded";
  const validated = top.validation?.toLowerCase() === "validated";
  const score = top.score;
  const evidence = top.evidence.slice(0, 3);
  return (
    <section aria-label="Suspect commit" className="rounded-xl border border-line border-l-2 border-l-accent bg-elevated p-4 md:p-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <Eyebrow>Suspect commit</Eyebrow>
          <p className={cn(T.data, "mt-2 break-all text-accent")}>{top.sha.slice(0, 12)}</p>
          <h2
            className={cn(T.h2, "mt-1")}
            title={top.title ?? undefined}
          >
            {summary}
          </h2>
          <div className="mt-6">
            <Eyebrow>Top evidence</Eyebrow>
            {evidence.length ? (
              <ul className="mt-2 flex flex-col gap-2">
                {evidence.map((item, index) => (
                  <li key={`${item.reference ?? item.summary}-${index}`} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
                    <span className={cn(T.label, "shrink-0 sm:w-16")}>{sentenceCase(item.kind ?? "note")}</span>
                    <span className={cn(T.small, "min-w-0")}>
                      {item.summary}
                      {item.reference ? (
                        <span className={cn(T.dataSm, "block break-all")}>{item.reference}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={cn(T.small, "mt-2")}>No structured evidence was recorded.</p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 md:w-[200px] md:shrink-0">
          <p className={T.dataXl} aria-label={`pre-rank score ${score === null ? "not available" : score.toFixed(2)}`}>
            {score === null ? "--" : score.toFixed(2)}
          </p>
          <p className={T.label}>Pre-rank score</p>
          <div className="h-0.5 w-full overflow-hidden rounded-full bg-white/[0.07]" aria-hidden="true">
            <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(1, Math.max(0, score ?? 0)) * 100}%` }} />
          </div>
          <span
            className={cn(
              T.label,
              "mt-1 inline-flex h-[22px] w-fit items-center rounded-md px-2",
              validated ? "bg-healthy/[0.12] text-healthy" : "bg-white/[0.06] text-ink-2",
            )}
          >
            {sentenceCase(validated ? "validated" : (top.validation ?? "not validated"))}
          </span>
        </div>
      </div>
    </section>
  );
}
