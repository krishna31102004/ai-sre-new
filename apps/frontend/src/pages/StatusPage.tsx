import { Check, RefreshCw, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";

import { api, type Health } from "../api";
import { ErrorState, LoadingState } from "../components";

const faults = [
  { name: "adFailure", description: "Returns failures from the ad service and surfaces frontend HTTP 500s." },
  { name: "paymentFailure", description: "Simulates a payment service failure during checkout." },
  { name: "productCatalogFailure", description: "Simulates product catalog lookup errors for the storefront." },
];

type Toast = { tone: "success" | "error"; message: string } | null;

export function StatusPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [variants, setVariants] = useState<Record<string, "on" | "off">>({});
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = async () => {
    try {
      const [healthResult, ...faultResults] = await Promise.all([api.health(), ...faults.map((fault) => api.fault(fault.name))]);
      setHealth(healthResult);
      setVariants(Object.fromEntries(faultResults.map((result) => [result.flag, result.variant])));
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to read system state");
    }
  };
  useEffect(() => { void load(); }, []);

  const toggle = async (flag: string) => {
    const next = variants[flag] === "on" ? "off" : "on";
    setUpdating(flag);
    try {
      const result = await api.setFault(flag, next);
      const confirmed = await api.fault(flag);
      setVariants((current) => ({ ...current, [result.flag]: confirmed.variant }));
      setToast({ tone: "success", message: `${flag} is ${confirmed.variant}.` });
    } catch (reason) {
      setToast({ tone: "error", message: reason instanceof Error ? reason.message : "Fault update failed" });
    } finally {
      setUpdating(null);
      window.setTimeout(() => setToast(null), 3500);
    }
  };

  if (!health && !error) return <LoadingState />;
  return (
    <section className="max-w-5xl pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="eyebrow">Runtime control</p><h1>System status</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Live health reads from the API, worker heartbeat, Postgres, and Redis. Fault controls only proxy the three supported demo flags.</p></div>
        <button className="icon-button" onClick={() => void load()} aria-label="Refresh system state" title="Refresh system state"><RefreshCw size={16} /></button>
      </div>
      {error && <div className="mt-5"><ErrorState message={error} /></div>}
      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {health && [
          { label: "API", ok: health.api.ok, detail: "reachable" },
          { label: "Worker", ok: health.worker.ok, detail: health.worker.seconds_since_last_heartbeat === null ? "no heartbeat" : `${Math.round(health.worker.seconds_since_last_heartbeat)}s ago` },
          { label: "Postgres", ok: health.postgres.ok, detail: health.postgres.ok ? "connected" : "unavailable" },
          { label: "Redis", ok: health.redis.ok, detail: health.redis.ok ? "connected" : "unavailable" },
        ].map((item) => <HealthCard key={item.label} {...item} />)}
      </div>
      <div className="mt-10 border-t border-line/80 pt-7"><p className="eyebrow">Feature flags</p><div className="mt-1 flex items-center gap-2"><Zap size={18} className="text-cyan-300" /><h2>Fault controls</h2></div><p className="mt-2 text-sm text-slate-500">Enable a fault only to run the controlled demo. The investigation system remains read-only.</p></div>
      <div className="mt-5 overflow-hidden rounded-lg border border-line bg-panel">
        {faults.map((fault) => {
          const isOn = variants[fault.name] === "on";
          const isUpdating = updating === fault.name;
          return <div key={fault.name} className="flex flex-wrap items-center gap-5 border-b border-line/70 p-5 last:border-b-0"><div className="min-w-[230px] flex-1"><p className="font-mono text-sm font-medium text-cyan-300">{fault.name}</p><p className="mt-1 max-w-xl text-sm leading-5 text-slate-400">{fault.description}</p></div><span className={`badge ${isOn ? "badge-red" : "badge-slate"}`}>{variants[fault.name] ?? "loading"}</span><button role="switch" aria-checked={isOn} aria-label={`Turn ${fault.name} ${isOn ? "off" : "on"}`} onClick={() => void toggle(fault.name)} disabled={isUpdating || !variants[fault.name]} className={`relative inline-flex h-8 w-[62px] shrink-0 items-center rounded-full border p-1 transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 ${isOn ? "border-red-400/45 bg-red-400/20" : "border-slate-600 bg-slate-800"}`}><span className={`h-6 w-6 rounded-full bg-slate-100 shadow-sm transition duration-200 ${isOn ? "translate-x-[29px]" : "translate-x-0"}`} />{isUpdating && <span className="absolute inset-0 rounded-full bg-slate-950/35" />}</button><span className="w-20 text-right font-mono text-xs tabular-nums text-slate-500">{isUpdating ? "updating" : isOn ? "enabled" : "disabled"}</span></div>;
        })}
      </div>
      {toast && <div className={`toast ${toast.tone === "success" ? "toast-success" : "toast-error"}`} role="status" aria-live="polite">{toast.tone === "success" ? <Check size={16} /> : <X size={16} />}{toast.message}</div>}
    </section>
  );
}

function HealthCard({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return <div className="rounded-lg border border-line bg-panel p-4 shadow-lg shadow-slate-950/10"><div className="flex items-center gap-2.5"><span className={`status-dot h-2.5 w-2.5 rounded-full ${ok ? "bg-emerald-400" : "bg-red-400"}`} /><span className="font-medium text-slate-200">{label}</span></div><p className="mt-3 font-mono text-xs tabular-nums text-slate-500">{detail}</p></div>;
}
