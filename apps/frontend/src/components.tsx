import { Activity, BarChart3, ChevronDown, ClipboardList, GitBranchPlus, ShieldCheck, Signal, Server } from "lucide-react";
import { NavLink } from "react-router-dom";
import type { PropsWithChildren } from "react";

import { DEMO_MODE } from "./api";
import { Badge } from "./components/ui/badge";
import { Progress } from "./components/ui/progress";

export function Shell({ children }: PropsWithChildren) {
  const links = [
    { to: "/", label: "Investigations", icon: ClipboardList },
    { to: "/pipeline", label: "Pipeline", icon: GitBranchPlus },
    { to: "/status", label: "System status", icon: Server },
    { to: "/benchmark", label: "Benchmark", icon: BarChart3 },
  ];
  return (
    <div className="min-h-screen bg-canvas text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(59,130,246,0.10),transparent_34%),linear-gradient(180deg,rgba(20,29,46,0.52),transparent_280px)]" />
      {DEMO_MODE && (
        <div className="relative z-30 border-b border-accent/25 bg-accent/12 px-4 py-2 text-center text-xs text-blue-100">
          Running in demo mode with sample data. See github.com/krishna31102004/ai-sre-new for full setup.
        </div>
      )}
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/78 backdrop-blur-xl">
        <div className="mx-auto flex max-w-screen-2xl items-center gap-4 px-4 py-3 sm:gap-8 sm:px-5">
          <NavLink to="/" className="group flex shrink-0 items-center gap-3 font-semibold tracking-wide text-slate-100">
            <span className="relative flex h-8 w-8 items-center justify-center rounded-md border border-accent/30 bg-accent/15 text-blue-200 shadow-glow">
              <Signal size={17} strokeWidth={2.6} />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-healthy pulse-dot" />
            </span>
            <span className="text-blue-200 group-hover:text-blue-100">Glassbox SRE</span>
          </NavLink>
          <nav className="flex min-w-0 items-center gap-1 overflow-x-auto text-sm">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `relative flex shrink-0 items-center gap-2 px-3 py-2 transition ${
                    isActive ? "text-blue-200 after:absolute after:bottom-0 after:left-3 after:right-3 after:h-px after:bg-accent" : "text-slate-400 hover:text-slate-100"
                  }`
                }
              >
                <Icon size={15} />
                {label}
              </NavLink>
            ))}
          </nav>
          <Badge variant="muted" className="ml-auto hidden sm:inline-flex">
            <ShieldCheck size={13} className="text-blue-300" />
            Read-only
          </Badge>
        </div>
      </header>
      <main className="relative mx-auto max-w-screen-2xl px-4 py-7 sm:px-5">{children}</main>
    </div>
  );
}

export function StatusBadge({ status }: { status: string | null }) {
  const resolved = status?.toLowerCase() === "resolved";
  const firing = status?.toLowerCase() === "firing";
  return (
    <span className={`badge ${resolved ? "badge-green" : "badge-red"}`}>
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${firing ? "pulse-dot" : ""}`} />
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
  const tone = confidence >= 0.8 ? "bg-healthy" : confidence >= 0.5 ? "bg-warning" : "bg-firing";
  return (
    <span className="inline-flex min-w-[112px] items-center gap-2 font-mono text-xs tabular-nums text-slate-300">
      <Progress value={Math.round(confidence * 100)} className="w-14" indicatorClassName={tone} />
      {Math.round(confidence * 100)}%
    </span>
  );
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
  return (
    <div className="space-y-3 py-16">
      <div className="mx-auto h-4 w-40 skeleton" />
      <div className="mx-auto h-3 w-64 skeleton" />
      <p className="text-center text-sm text-slate-500">{label}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return <div className="rounded-glass border border-firing/25 bg-red-950/40 p-4 text-sm text-red-200">{message}</div>;
}
