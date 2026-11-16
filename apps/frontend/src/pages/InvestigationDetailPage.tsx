import { ArrowLeft, ExternalLink } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import { api, DEMO_MODE, type InvestigationDetail } from "../api";
import { ErrorState, LoadingState } from "../components";
import { cn, ServiceChip, StatusDot, T } from "../components/primitives";
import { Tooltip, TooltipContent, TooltipTrigger } from "../components/ui/tooltip";
import { CommitCorrelationCard, ImpactCard, RunbookCard } from "../detail/FindingCards";
import { RawTab } from "../detail/RawTab";
import { ReplayStrip } from "../detail/ReplayStrip";
import { SuspectCommitHero } from "../detail/SuspectCommitHero";
import { TimelineTab } from "../detail/TimelineTab";
import { candidatesFrom, formatDuration, formatTime } from "../detail/helpers";
import { DUR, EASE } from "../motion";

const TABS = [
  { id: "brief", label: "Brief" },
  { id: "timeline", label: "Timeline" },
  { id: "raw", label: "Raw" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function parseTab(value: string | null): TabId {
  return TABS.some((tab) => tab.id === value) ? (value as TabId) : "brief";
}

function Tabs({ active, onChange }: { active: TabId; onChange: (id: TabId) => void }) {
  const reduce = useReducedMotion();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = TABS.findIndex((tab) => tab.id === active);
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = TABS.length - 1;
    else return;
    event.preventDefault();
    onChange(TABS[next].id);
    refs.current[next]?.focus();
  };
  return (
    <div role="tablist" aria-label="Investigation views" onKeyDown={onKeyDown} className="flex border-b border-line">
      {TABS.map((tab, index) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            ref={(node) => {
              refs.current[index] = node;
            }}
            id={`tab-${tab.id}`}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={`panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={cn(
              T.body,
              "relative h-11 px-4 font-medium transition-colors duration-[160ms] focus-visible:outline-offset-[-2px] nav:h-10",
              selected ? "text-ink" : "text-ink-2 hover:text-ink",
            )}
          >
            {tab.label}
            {selected ? (
              <motion.span
                layoutId="detail-tab-underline"
                className="absolute inset-x-0 -bottom-px h-0.5 bg-accent"
                transition={{ duration: reduce ? 0 : DUR.base, ease: EASE }}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function ExternalLinks({ detail }: { detail: InvestigationDetail }) {
  const { investigation } = detail;
  const slackUrl =
    investigation.slack_thread_ts && investigation.slack_channel
      ? `https://app.slack.com/client/${investigation.slack_channel}/thread/${investigation.slack_thread_ts.replace(".", "")}`
      : null;
  const traceUrl = investigation.langsmith_trace_url;
  const demoButton = (label: string, tip: string) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="link-button cursor-not-allowed opacity-60" disabled>
          {label} <ExternalLink size={15} />
        </button>
      </TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
  return (
    <div className="flex flex-wrap gap-3">
      {slackUrl &&
        (DEMO_MODE ? (
          demoButton("Slack thread", "Slack thread available in live deployment")
        ) : (
          <a className="link-button" href={slackUrl} target="_blank" rel="noreferrer">Slack thread <ExternalLink size={15} /></a>
        ))}
      {traceUrl &&
        (DEMO_MODE ? (
          demoButton("LangSmith trace", "LangSmith trace available in live deployment, see GitHub for setup.")
        ) : (
          <a className="link-button" href={traceUrl} target="_blank" rel="noreferrer">LangSmith trace <ExternalLink size={15} /></a>
        ))}
      {!slackUrl && !traceUrl && <span className={cn(T.small, "text-ink-3")}>No external links were recorded.</span>}
    </div>
  );
}

export function InvestigationDetailPage() {
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const [detail, setDetail] = useState<InvestigationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tab = parseTab(params.get("tab"));

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setError(null);
    api
      .investigation(id)
      .then((value) => {
        if (!cancelled) setDetail(value);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Unable to load investigation");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const candidates = useMemo(() => (detail ? candidatesFrom(detail) : []), [detail]);

  if (error) return <ErrorState message={error} />;
  if (!detail) return <LoadingState />;

  const { investigation } = detail;
  const duration = formatDuration(investigation.started_at, investigation.resolved_at);
  const timing = investigation.resolved_at
    ? `Started ${formatTime(investigation.started_at)} · Resolved ${formatTime(investigation.resolved_at)}${duration ? ` · Duration ${duration}` : ""}`
    : `Started ${formatTime(investigation.started_at)} · Not resolved`;

  const setTab = (next: TabId) => {
    setParams(
      (current) => {
        const copy = new URLSearchParams(current);
        if (next === "brief") copy.delete("tab");
        else copy.set("tab", next);
        return copy;
      },
      { replace: true },
    );
  };

  return (
    <section>
      <Link
        to="/investigations"
        className={cn(T.small, "press inline-flex min-h-11 items-center gap-1.5 rounded-md text-ink-3 hover:text-ink nav:min-h-0")}
      >
        <ArrowLeft size={14} aria-hidden="true" /> Investigations
      </Link>

      <header className="mb-6 mt-3 md:mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className={cn(T.h1, "break-words")}>{investigation.alert_name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
            <StatusDot status={investigation.status} />
            <ServiceChip>{investigation.service}</ServiceChip>
            <span className={cn(T.small, "text-ink-3")}>{timing}</span>
          </div>
        </div>
        <ExternalLinks detail={detail} />
      </header>

      <Tabs active={tab} onChange={setTab} />

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="mt-6 md:mt-8">
        {tab === "brief" ? (
          <div className="flex flex-col gap-8 md:gap-10">
            <SuspectCommitHero top={candidates[0] ?? null} />
            <div className="grid grid-cols-1 gap-3 md:gap-4 lg:grid-cols-3">
              <CommitCorrelationCard candidates={candidates} />
              <RunbookCard investigation={investigation} />
              <ImpactCard investigation={investigation} />
            </div>
            <ReplayStrip key={investigation.investigation_id} detail={detail} />
          </div>
        ) : tab === "timeline" ? (
          <TimelineTab events={detail.events} />
        ) : (
          <RawTab brief={detail.brief} />
        )}
      </div>
    </section>
  );
}
