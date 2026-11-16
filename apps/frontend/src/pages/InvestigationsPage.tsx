import { ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { api, type InvestigationSummary } from "../api";
import { ErrorState } from "../components";
import { cn, CommitSummary, FilterChips, Panel, ScoreBar, ServiceChip, StatusDot, T } from "../components/primitives";
import { SignalLine } from "../components/SignalLine";
import { relativeTime } from "../lib";

const GRID = "grid grid-cols-[96px_minmax(0,2fr)_minmax(0,1fr)_120px_96px_20px] lg:grid-cols-[96px_minmax(0,1.3fr)_minmax(0,1.5fr)_120px_96px_20px] items-center gap-x-4";
const ROW_FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]";

function absoluteTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function isFiring(item: InvestigationSummary): boolean {
  return item.status.toLowerCase() === "firing";
}

export function InvestigationsPage() {
  const [investigations, setInvestigations] = useState<InvestigationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await api.investigations();
        if (!active) return;
        setInvestigations(data.investigations);
        setError(null);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load investigations");
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const summary = useMemo(() => {
    if (!investigations) return null;
    const firing = investigations.filter(isFiring).length;
    const resolved = investigations.filter((item) => item.status.toLowerCase() === "resolved").length;
    const average = investigations.length
      ? investigations.reduce((total, item) => total + (item.confidence ?? 0), 0) / investigations.length
      : 0;
    return { total: investigations.length, resolved, firing, average };
  }, [investigations]);

  const services = useMemo(
    () => (investigations ? [...new Set(investigations.map((item) => item.service))].sort() : []),
    [investigations],
  );

  const visible = useMemo(
    () =>
      (investigations ?? []).filter(
        (item) =>
          (statusFilter === "all" || item.status.toLowerCase() === statusFilter) &&
          (serviceFilter === "all" || item.service === serviceFilter),
      ),
    [investigations, statusFilter, serviceFilter],
  );

  const clearFilters = () => {
    setStatusFilter("all");
    setServiceFilter("all");
  };

  const metrics = summary
    ? [
        { label: "Total investigations", value: String(summary.total) },
        { label: "Resolved", value: String(summary.resolved) },
        { label: "Firing", value: String(summary.firing) },
        { label: "Average pre-rank score", value: `${Math.round(summary.average * 100)}%` },
      ]
    : [];

  return (
    <section>
      <div className="mb-6 md:mb-8">
        <h1 className={T.h1}>Investigations</h1>
        <p className={cn(T.body, "mt-2")}>Recorded sample data. The live system runs locally against a fault-injected stack.</p>
      </div>

      {error && <ErrorState message={error} />}

      {summary && (
        <Panel className="mb-8 grid grid-cols-2 p-0 md:mb-10 md:grid-cols-4 md:p-0">
          {metrics.map((metric, index) => (
            <div
              key={metric.label}
              className={`p-4 md:p-6 ${index % 2 === 1 ? "border-l border-line" : ""} ${index >= 2 ? "border-t border-line md:border-t-0" : ""} ${index > 0 ? "md:border-l md:border-line" : ""}`}
            >
              <p className={T.label}>{metric.label}</p>
              <p className={cn(T.dataLg, "mt-1 text-ink-2")}>{metric.value}</p>
            </div>
          ))}
        </Panel>
      )}

      {summary && summary.total > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 md:mb-6">
          <FilterChips
            ariaLabel="Filter by status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "All", count: summary.total },
              { value: "firing", label: "Firing", count: summary.firing },
              { value: "resolved", label: "Resolved", count: summary.resolved },
            ]}
          />
          <span className="hidden h-4 w-px bg-ink/[0.07] sm:block" aria-hidden="true" />
          <FilterChips
            ariaLabel="Filter by service"
            value={serviceFilter}
            onChange={setServiceFilter}
            options={[{ value: "all", label: "All services" }, ...services.map((service) => ({ value: service, label: service }))]}
          />
        </div>
      )}

      {investigations === null && !error && (
        <div aria-busy="true" aria-label="Loading investigations">
          <Panel className="overflow-hidden p-0 md:p-0">
            {[0, 1, 2, 3, 4].map((row) => (
              <div key={row} className="flex h-[52px] items-center gap-4 border-b border-line px-4 last:border-b-0">
                <span className="h-3 w-16 rounded bg-ink/[0.04]" />
                <span className="h-3 w-1/3 rounded bg-ink/[0.04]" />
                <span className="hidden h-3 w-1/4 rounded bg-ink/[0.04] md:block" />
                <span className="ml-auto h-3 w-12 rounded bg-ink/[0.04]" />
              </div>
            ))}
          </Panel>
        </div>
      )}

      {investigations !== null && visible.length === 0 && (
        <Panel className="flex min-h-64 flex-col items-center justify-center gap-4 text-center">
          <SignalLine variant="hero" flat className="h-2 w-[120px] text-ink-3" />
          <p className={T.body}>No investigations match these filters.</p>
          {(statusFilter !== "all" || serviceFilter !== "all") && (
            <button
              type="button"
              onClick={clearFilters}
              className={cn(T.body, "press inline-flex h-11 items-center rounded-lg border border-line px-4 font-medium text-ink nav:h-9")}
            >
              Clear filters
            </button>
          )}
        </Panel>
      )}

      {visible.length > 0 && (
        <>
          {/* From 768: table rows. */}
          <Panel className="hidden overflow-hidden p-0 md:block md:p-0">
            <div className={cn(T.label, GRID, "border-b border-l-2 border-line border-l-transparent px-4 py-2.5")}>
              <span>Status</span>
              <span>Alert</span>
              <span>Suspect commit</span>
              <span>Pre-rank score</span>
              <span>Started</span>
              <span aria-hidden="true" />
            </div>
            <ul>
              {visible.map((item) => (
                <li key={item.investigation_id} className="border-b border-line last:border-b-0">
                  <Link
                    to={`/investigations/${item.investigation_id}`}
                    className={`group ${GRID} h-[52px] border-l-2 px-4 transition-colors duration-[120ms] hover:bg-ink/[0.03] ${ROW_FOCUS} ${isFiring(item) ? "border-l-firing" : "border-l-transparent"}`}
                  >
                    <StatusDot status={item.status} />
                    <span className="flex min-w-0 items-center gap-2">
                      <span className={cn(T.body, "truncate font-medium text-ink")}>{item.alert_name}</span>
                      <ServiceChip className="shrink-0">{item.service}</ServiceChip>
                    </span>
                    {item.suspect_commit_sha ? (
                      <CommitSummary sha={item.suspect_commit_sha} title={item.suspect_commit_title} />
                    ) : (
                      <span className="text-ink-3" aria-label="No suspect commit">-</span>
                    )}
                    <ScoreBar value={item.confidence} />
                    <span className={cn(T.small, "truncate text-ink-3")} title={absoluteTime(item.started_at)}>
                      {relativeTime(item.started_at)}
                    </span>
                    <ChevronRight size={16} aria-hidden="true" className="text-ink-3 opacity-0 transition-opacity duration-[120ms] group-hover:opacity-100 group-focus-visible:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>

          {/* Under 768: stacked cards. */}
          <ul className="flex flex-col gap-3 md:hidden">
            {visible.map((item) => (
              <li key={item.investigation_id}>
                <Link
                  to={`/investigations/${item.investigation_id}`}
                  className={`block rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2`}
                >
                  <Panel className={`flex flex-col gap-2 hover:border-ink/20 ${isFiring(item) ? "border-l-2 border-l-firing" : ""}`}>
                    <div className="flex items-center justify-between gap-3">
                      <StatusDot status={item.status} />
                      <span className={cn(T.small, "text-ink-3")} title={absoluteTime(item.started_at)}>
                        {relativeTime(item.started_at)}
                      </span>
                    </div>
                    <p className={cn(T.body, "font-medium text-ink")}>{item.alert_name}</p>
                    <div><ServiceChip>{item.service}</ServiceChip></div>
                    {item.suspect_commit_sha ? (
                      <CommitSummary sha={item.suspect_commit_sha} title={item.suspect_commit_title} />
                    ) : (
                      <span className="text-ink-3" aria-label="No suspect commit">-</span>
                    )}
                    <ScoreBar value={item.confidence} />
                  </Panel>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
