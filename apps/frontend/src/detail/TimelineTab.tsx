import type { InvestigationDetail } from "../api";
import { ServiceChip } from "../components/primitives";
import { cn } from "../lib/utils";
import { eventLabel, eventMs, formatOffset } from "./helpers";

function dotTone(type: string): string {
  if (type === "alert_received") return "bg-firing";
  if (type === "resolved") return "bg-healthy";
  return "bg-accent";
}

export function TimelineTab({ events }: { events: InvestigationDetail["events"] }) {
  if (!events.length) {
    return <p className="text-[14px] text-ink-2">No events were recorded for this investigation.</p>;
  }
  const t0 = eventMs(events[0].occurred_at);
  return (
    <ol className="relative">
      <span aria-hidden="true" className="absolute bottom-2 left-[87.5px] top-2 w-px bg-white/[0.07]" />
      {events.map((event, index) => (
        <li key={`${event.event_type}-${event.occurred_at}-${index}`} className="relative grid grid-cols-[72px_8px_minmax(0,1fr)] gap-x-3 py-3">
          <span className="pt-0.5 text-right font-mono text-[12px] tabular-nums text-ink-3">{formatOffset(eventMs(event.occurred_at) - t0)}</span>
          <span aria-hidden="true" className={cn("relative z-10 mt-1.5 h-2 w-2 rounded-full", dotTone(event.event_type))} />
          <div className="min-w-0">
            <p className="text-[14px] leading-5 text-ink">{eventLabel(event.event_type)}</p>
            <p className="mt-1 text-[13px] leading-5 text-ink-2">{event.summary}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ServiceChip>{event.source}</ServiceChip>
              {event.reference ? <span className="break-all font-mono text-[12px] text-ink-3">{event.reference}</span> : null}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
