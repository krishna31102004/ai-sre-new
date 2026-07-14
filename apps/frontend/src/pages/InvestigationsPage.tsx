import { Activity, ChevronRight, TerminalSquare } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api, type InvestigationSummary } from "../api";
import { ConfidencePill, ErrorState, LoadingState, SeverityBadge, StatusBadge } from "../components";
import { Badge } from "../components/ui/badge";
import { relativeTime, truncate } from "../lib";

export function InvestigationsPage() {
  const [investigations, setInvestigations] = useState<InvestigationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const knownIds = useRef(new Set<string>());
  const [newIds, setNewIds] = useState(new Set<string>());
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await api.investigations();
        if (!active) return;
        const previous = knownIds.current;
        const incoming = new Set(data.investigations.map((item) => item.investigation_id));
        if (previous.size) {
          const added = new Set([...incoming].filter((id) => !previous.has(id)));
          setNewIds(added);
          window.setTimeout(() => active && setNewIds(new Set()), 2200);
        }
        knownIds.current = incoming;
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

  return (
    <section className="pb-8">
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Live investigation queue</p>
          <h1>Investigations</h1>
          <p className="mt-2 text-sm text-slate-400">The latest 20 evidence-backed investigations, refreshed every 5 seconds.</p>
        </div>
        <Badge variant="accent" className="hidden sm:inline-flex">
          <Activity size={13} />
          Live polling
        </Badge>
      </div>
      {error && <ErrorState message={error} />}
      {investigations === null && !error && <LoadingState />}
      {investigations?.length === 0 && (
        <div className="glass-card flex min-h-72 flex-col items-center justify-center border-dashed px-6 text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-accent/25 bg-accent/10 text-blue-200 shadow-glow"><TerminalSquare size={22} /></span>
          <h2>No investigations yet</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">Trigger a supported demo fault from <a className="text-cyan-300 hover:text-cyan-200" href="/status">System status</a> to start an evidence-backed investigation.</p>
        </div>
      )}
      {!!investigations?.length && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="min-w-[1050px] w-full text-left text-sm">
            <thead className="border-b border-line bg-black/20 text-[11px] uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th>Started</th><th>Alert</th><th>Service</th><th>Status</th><th>Suspect commit</th><th>Confidence</th><th>Severity</th><th>Runbook</th><th aria-label="Open" />
              </tr>
            </thead>
            <tbody>
              {investigations.map((item) => {
                const status = item.status?.toLowerCase();
                const borderTone = status === "resolved" ? "border-l-healthy" : status === "firing" ? "border-l-accent" : "border-l-transparent";
                return (
                <tr
                  key={item.investigation_id}
                  onClick={() => navigate(`/investigations/${item.investigation_id}`)}
                  className={`group cursor-pointer border-b border-l-2 border-b-line/60 ${borderTone} transition duration-150 hover:bg-white/[0.04] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${newIds.has(item.investigation_id) ? "new-row" : ""}`}
                >
                  <td className="whitespace-nowrap font-mono text-xs tabular-nums text-slate-400">{relativeTime(item.started_at)}</td>
                  <td className="font-medium text-slate-100">{item.alert_name}</td>
                  <td className="font-mono text-blue-300">{item.service}</td>
                  <td><StatusBadge status={item.status} /></td>
                  <td className="max-w-[270px] font-mono text-xs text-slate-300">
                    {item.suspect_commit_sha ? <span className="flex min-w-0 items-center gap-2"><span className="shrink-0 rounded-md border border-line bg-white/[0.04] px-2 py-1 text-blue-200">{item.suspect_commit_sha.slice(0, 7)}</span><span className="min-w-0 truncate text-slate-400" title={item.suspect_commit_title ?? undefined}>{truncate(item.suspect_commit_title, 40)}</span></span> : "--"}
                  </td>
                  <td><ConfidencePill confidence={item.confidence} /></td>
                  <td><SeverityBadge severity={item.severity} /></td>
                  <td className="max-w-[180px] truncate text-slate-400">{item.runbook_id ?? "--"}</td>
                  <td className="pr-5 text-right"><ChevronRight size={16} className="ml-auto text-slate-600 opacity-0 transition duration-150 group-hover:translate-x-0.5 group-hover:text-blue-300 group-hover:opacity-100" /></td>
                </tr>
              );})}
            </tbody>
          </table>
          </div>
          <div className="flex items-center justify-between border-t border-line bg-black/20 px-4 py-2.5 text-xs text-slate-500"><span>Newest investigations appear first.</span><span className="font-mono tabular-nums">{investigations.length} shown</span></div>
        </div>
      )}
    </section>
  );
}
