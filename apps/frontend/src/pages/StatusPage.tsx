import { Check, Clock3, Database, Loader2, RefreshCw, Server, Signal, ToggleRight, Wifi, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";

import { api, type Health } from "../api";
import { ErrorState, LoadingState } from "../components";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";

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
      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        {health && [
          { label: "API", ok: health.api.ok, detail: "reachable", icon: Server },
          { label: "Worker", ok: health.worker.ok, detail: health.worker.seconds_since_last_heartbeat === null ? "no heartbeat" : `${Math.round(health.worker.seconds_since_last_heartbeat)}s ago`, age: health.worker.seconds_since_last_heartbeat, icon: Clock3 },
          { label: "Postgres", ok: health.postgres.ok, detail: health.postgres.ok ? "connected" : "unavailable", icon: Database },
          { label: "Redis", ok: health.redis.ok, detail: health.redis.ok ? "connected" : "unavailable", icon: Wifi },
        ].map((item) => <HealthCard key={item.label} {...item} />)}
      </div>
      <div className="mt-10 border-t border-line pt-7"><p className="eyebrow">Feature flags</p><div className="mt-1 flex items-center gap-2"><Zap size={18} className="text-blue-300" /><h2>Fault controls</h2></div><p className="mt-2 text-sm text-slate-500">Enable a fault only to run the controlled demo. The investigation system remains read-only.</p></div>
      <div className="mt-5 grid gap-3">
        {faults.map((fault) => {
          const isOn = variants[fault.name] === "on";
          const isUpdating = updating === fault.name;
          return <div key={fault.name} className="glass-card flex flex-wrap items-center gap-5 p-5"><div className="min-w-[230px] flex-1"><p className="font-mono text-sm font-medium text-blue-300">{fault.name}</p><p className="mt-1 max-w-xl text-sm leading-5 text-slate-400">{fault.description}</p></div><Badge variant={isOn ? "danger" : "muted"}>{variants[fault.name] ?? "loading"}</Badge><div className="relative"><Switch checked={isOn} aria-label={`Turn ${fault.name} ${isOn ? "off" : "on"}`} onCheckedChange={() => void toggle(fault.name)} disabled={isUpdating || !variants[fault.name]} />{isUpdating && <Loader2 size={16} className="absolute left-1/2 top-1/2 -ml-2 -mt-2 animate-spin text-blue-200" />}</div><span className="w-20 text-right font-mono text-xs tabular-nums text-slate-500">{isUpdating ? "updating" : isOn ? "enabled" : "disabled"}</span></div>;
        })}
      </div>
      {toast && <div className={`toast ${toast.tone === "success" ? "toast-success" : "toast-error"}`} role="status" aria-live="polite">{toast.tone === "success" ? <Check size={16} /> : <X size={16} />}{toast.message}</div>}
    </section>
  );
}

function HealthCard({ label, ok, detail, age, icon: Icon }: { label: string; ok: boolean; detail: string; age?: number | null; icon: typeof Signal }) {
  const stale = label === "Worker" && typeof age === "number" && age > 30;
  const warning = label === "Worker" && typeof age === "number" && age > 15 && age <= 30;
  const dot = !ok || stale ? "bg-firing" : warning ? "bg-warning" : "bg-healthy";
  return <div className="glass-card p-4"><div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-md border border-line bg-white/[0.03] text-blue-300"><Icon size={18} /></span><div><p className="font-medium text-slate-200">{label}</p><p className="mt-1 font-mono text-xs tabular-nums text-slate-500">{detail}</p></div></div><span className={`status-dot mt-2 h-2.5 w-2.5 rounded-full ${dot}`} /></div></div>;
}
