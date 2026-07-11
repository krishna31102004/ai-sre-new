import { Activity, ArrowUpRight, Radar } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api, type InvestigationSummary } from "../api";
import { ConfidencePill, ErrorState, LoadingState, SeverityBadge, StatusBadge } from "../components";
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
        <span className="hidden items-center gap-2 rounded-full border border-line bg-slate-900/60 px-3 py-1.5 text-xs text-slate-400 sm:inline-flex"><Activity size={13} className="text-cyan-300" /> Live polling</span>
      </div>
      {error && <ErrorState message={error} />}
      {investigations === null && !error && <LoadingState />}
      {investigations?.length === 0 && (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-line bg-panel/45 px-6 text-center">
          <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 text-cyan-300"><Radar size={21} /></span>
          <h2>No investigations yet</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">Trigger a supported demo fault from <a className="text-cyan-300 hover:text-cyan-200" href="/status">System status</a> to start an evidence-backed investigation.</p>
        </div>
      )}
      {!!investigations?.length && (
        <div className="overflow-hidden rounded-lg border border-line bg-panel shadow-2xl shadow-slate-950/20">
          <div className="overflow-x-auto">
          <table className="min-w-[1050px] w-full text-left text-sm">
            <thead className="border-b border-line bg-slate-950/45 text-[11px] uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th>Started</th><th>Alert</th><th>Service</th><th>Status</th><th>Suspect commit</th><th>Confidence</th><th>Severity</th><th>Runbook</th>
              </tr>
            </thead>
            <tbody>
              {investigations.map((item) => (
                <tr
                  key={item.investigation_id}
                  onClick={() => navigate(`/investigations/${item.investigation_id}`)}
                  className={`group cursor-pointer border-b border-line/60 transition duration-200 hover:bg-slate-800/65 ${newIds.has(item.investigation_id) ? "new-row" : ""}`}
                >
                  <td className="whitespace-nowrap font-mono text-xs tabular-nums text-slate-400">{relativeTime(item.started_at)}</td>
                  <td className="font-medium text-slate-100"><span className="inline-flex items-center gap-2">{item.alert_name}<ArrowUpRight size={14} className="opacity-0 transition group-hover:opacity-80" /></span></td>
                  <td className="font-mono text-cyan-300">{item.service}</td>
                  <td><StatusBadge status={item.status} /></td>
                  <td className="max-w-[270px] font-mono text-xs text-slate-300">
                    {item.suspect_commit_sha ? `${item.suspect_commit_sha.slice(0, 7)} ${truncate(item.suspect_commit_title, 40)}` : "--"}
                  </td>
                  <td><ConfidencePill confidence={item.confidence} /></td>
                  <td><SeverityBadge severity={item.severity} /></td>
                  <td className="max-w-[180px] truncate text-slate-400">{item.runbook_id ?? "--"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="flex items-center justify-between border-t border-line/70 bg-slate-950/20 px-4 py-2.5 text-xs text-slate-500"><span>Newest investigations appear first.</span><span className="font-mono tabular-nums">{investigations.length} shown</span></div>
        </div>
      )}
    </section>
  );
}
