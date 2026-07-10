import { Check, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";

import { api, type Health } from "../api";
import { ErrorState, LoadingState } from "../components";

const faults = [
  { name: "adFailure", description: "Returns failures from the ad service, surfacing frontend HTTP 500s." },
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
    <section className="max-w-5xl">
      <p className="eyebrow">Runtime control</p><h1>System status</h1>
      <p className="mt-2 text-sm text-slate-400">Health reads from the running API, Redis heartbeat, Postgres, and Redis. Fault controls proxy only the three supported demo flags.</p>
      {error && <div className="mt-5"><ErrorState message={error} /></div>}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {health && [
          { label: "API", ok: health.api.ok, detail: "reachable" },
          { label: "Worker", ok: health.worker.ok, detail: health.worker.seconds_since_last_heartbeat === null ? "no heartbeat" : `${Math.round(health.worker.seconds_since_last_heartbeat)}s ago` },
          { label: "Postgres", ok: health.postgres.ok, detail: health.postgres.ok ? "connected" : "unavailable" },
          { label: "Redis", ok: health.redis.ok, detail: health.redis.ok ? "connected" : "unavailable" },
        ].map((item) => <HealthCard key={item.label} {...item} />)}
      </div>
      <div className="mt-8 flex items-center justify-between"><div><p className="eyebrow">Feature flags</p><h2>Fault controls</h2></div><button className="icon-button" onClick={() => void load()} aria-label="Refresh system state" title="Refresh system state"><RefreshCw size={16} /></button></div>
      <div className="mt-4 divide-y divide-line rounded border border-line bg-panel">
        {faults.map((fault) => {
          const isOn = variants[fault.name] === "on";
          return <div key={fault.name} className="flex flex-wrap items-center gap-4 p-5"><div className="min-w-[230px] flex-1"><p className="font-mono font-medium text-cyan-300">{fault.name}</p><p className="mt-1 text-sm text-slate-400">{fault.description}</p></div><span className={`badge ${isOn ? "badge-red" : "badge-slate"}`}>{variants[fault.name] ?? "loading"}</span><button onClick={() => void toggle(fault.name)} disabled={updating === fault.name || !variants[fault.name]} className={isOn ? "control-button control-off" : "control-button control-on"}>{updating === fault.name ? "Updating..." : isOn ? "Turn off" : "Turn on"}</button></div>;
        })}
      </div>
      {toast && <div className={`toast ${toast.tone === "success" ? "toast-success" : "toast-error"}`}>{toast.tone === "success" ? <Check size={16} /> : <X size={16} />}{toast.message}</div>}
    </section>
  );
}

function HealthCard({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return <div className="rounded border border-line bg-panel p-4"><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${ok ? "bg-emerald-400" : "bg-red-400"}`} /><span className="font-medium">{label}</span></div><p className="mt-2 text-sm text-slate-500">{detail}</p></div>;
}
