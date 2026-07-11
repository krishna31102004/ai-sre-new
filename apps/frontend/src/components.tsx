import { Activity, BarChart3, ChevronDown, ClipboardList, Server } from "lucide-react";
import { NavLink } from "react-router-dom";
import type { PropsWithChildren } from "react";

export function Shell({ children }: PropsWithChildren) {
  const links = [
    { to: "/", label: "Investigations", icon: ClipboardList },
    { to: "/status", label: "System status", icon: Server },
    { to: "/benchmark", label: "Benchmark", icon: BarChart3 },
  ];
  return (
    <div className="min-h-screen bg-canvas text-slate-100">
      <header className="sticky top-0 z-20 border-b border-line/90 bg-[#090e1b]/90 backdrop-blur">
        <div className="mx-auto flex max-w-screen-2xl items-center gap-4 px-4 py-3 sm:gap-8 sm:px-5">
          <NavLink to="/" className="flex shrink-0 items-center gap-3 font-semibold tracking-wide text-slate-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-300 text-slate-950 shadow-[0_0_18px_rgba(77,215,245,0.16)]">
              <Activity size={18} strokeWidth={3} />
            </span>
            Glassbox SRE
          </NavLink>
          <nav className="flex min-w-0 items-center gap-1 overflow-x-auto text-sm">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-2 rounded-md px-3 py-2 transition ${
                    isActive ? "border border-cyan-400/15 bg-cyan-400/10 text-cyan-200" : "border border-transparent text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
                  }`
                }
              >
                <Icon size={15} />
                {label}
              </NavLink>
            ))}
          </nav>
          <span className="ml-auto hidden text-xs text-slate-500 sm:block">Read-only incident investigation</span>
        </div>
      </header>
      <main className="mx-auto max-w-screen-2xl px-4 py-7 sm:px-5">{children}</main>
    </div>
  );
}

export function StatusBadge({ status }: { status: string | null }) {
  const resolved = status?.toLowerCase() === "resolved";
  return (
    <span className={`badge ${resolved ? "badge-green" : "badge-red"}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status ?? "unknown"}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: string | null }) {
  const normalized = severity?.toLowerCase() ?? "unknown";
  const tone = normalized === "page" ? "badge-red" : normalized === "ticket" ? "badge-amber" : "badge-slate";
  return <span className={`badge ${tone}`}>{severity ?? "--"}</span>;
}

export function ConfidencePill({ confidence }: { confidence: number | null }) {
  if (confidence === null) return <span className="text-slate-500">--</span>;
  const tone = confidence >= 0.8 ? "bg-emerald-400" : confidence >= 0.5 ? "bg-amber-400" : "bg-red-400";
  return <span className="inline-flex min-w-[92px] items-center gap-2 font-mono text-xs tabular-nums text-slate-300"><span className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-700"><span className={`block h-full rounded-full ${tone}`} style={{ width: `${Math.round(confidence * 100)}%` }} /></span>{Math.round(confidence * 100)}%</span>;
}

export function Collapsible({ title, children, open = false }: PropsWithChildren<{ title: React.ReactNode; open?: boolean }>) {
  return (
    <details className="border-t border-line py-4" open={open}>
      <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-slate-200">
        {title}
        <ChevronDown size={18} className="text-slate-500" />
      </summary>
      <div className="pt-4 text-sm text-slate-300">{children}</div>
    </details>
  );
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return <div className="py-16 text-center text-sm text-slate-500">{label}</div>;
}

export function ErrorState({ message }: { message: string }) {
  return <div className="rounded border border-red-900 bg-red-950/40 p-4 text-sm text-red-200">{message}</div>;
}
