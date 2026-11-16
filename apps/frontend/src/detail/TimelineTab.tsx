import type { InvestigationDetail } from "../api";
import { cn, ServiceChip, T } from "../components/primitives";
import { eventLabel, eventMs, formatOffset } from "./helpers";

function dotTone(type: string): string {
  if (type === "alert_received") return "bg-firing";
  if (type === "resolved") return "bg-healthy";
  return "bg-ink-3";
}

export function TimelineTab({ events }: { events: InvestigationDetail["events"] }) {
  if (!events.length) {
    return <p className={T.body}>No events were recorded for this investigation.</p>;
  }
  const t0 = eventMs(events[0].occurred_at);
  return (
    <ol className="relative">
      <span aria-hidden="true" className="absolute bottom-2 left-[87.5px] top-2 w-px bg-ink/[0.07]" />
      {events.map((event, index) => (
        <li key={`${event.event_type}-${event.occurred_at}-${index}`} className="relative grid grid-cols-[72px_8px_minmax(0,1fr)] gap-x-3 py-3">
          <span className={cn(T.dataSm, "pt-0.5 text-right")}>{formatOffset(eventMs(event.occurred_at) - t0)}</span>
          <span aria-hidden="true" className={cn("relative z-10 mt-1.5 h-2 w-2 rounded-full", dotTone(event.event_type))} />
          <div className="min-w-0">
            <p className={cn(T.body, "font-medium text-ink")}>{eventLabel(event.event_type)}</p>
            <p className={cn(T.small, "mt-1")}>{event.summary}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ServiceChip>{event.source}</ServiceChip>
              {event.reference ? <span className={cn(T.dataSm, "break-all")}>{event.reference}</span> : null}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
