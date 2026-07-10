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
    <section>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="eyebrow">Live queue history</p>
          <h1>Investigations</h1>
          <p className="mt-2 text-sm text-slate-400">Latest 20 investigations. Refreshes every 5 seconds.</p>
        </div>
        <span className="text-xs text-slate-500">Evidence-first, read-only</span>
      </div>
      {error && <ErrorState message={error} />}
      {investigations === null && !error && <LoadingState />}
      {investigations?.length === 0 && <LoadingState label="No investigations have been persisted yet." />}
      {!!investigations?.length && (
        <div className="overflow-x-auto rounded border border-line bg-panel shadow-2xl shadow-slate-950/20">
          <table className="min-w-[1050px] w-full text-left text-sm">
            <thead className="border-b border-line bg-slate-950/30 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th>Started</th><th>Alert</th><th>Service</th><th>Status</th><th>Suspect commit</th><th>Confidence</th><th>Severity</th><th>Runbook</th>
              </tr>
            </thead>
            <tbody>
              {investigations.map((item) => (
                <tr
                  key={item.investigation_id}
                  onClick={() => navigate(`/investigations/${item.investigation_id}`)}
                  className={`cursor-pointer border-b border-line/70 transition hover:bg-slate-800/70 ${newIds.has(item.investigation_id) ? "new-row" : ""}`}
                >
                  <td className="whitespace-nowrap text-slate-400">{relativeTime(item.started_at)}</td>
                  <td className="font-medium text-slate-100">{item.alert_name}</td>
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
      )}
    </section>
  );
}
