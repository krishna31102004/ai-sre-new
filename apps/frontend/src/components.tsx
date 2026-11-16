import * as Dialog from "@radix-ui/react-dialog";
import { ChevronDown, Github, Menu, Signal, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import type { PropsWithChildren } from "react";
import { NavLink, useLocation } from "react-router-dom";

import { DEMO_MODE } from "./api";
import { SignalLine } from "./components/SignalLine";
import { Progress } from "./components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "./components/ui/tooltip";
import { DUR, EASE } from "./motion";

const REPO_URL = "https://github.com/krishna31102004/ai-sre-new";

const NAV_LINKS = [
  { to: "/", label: "Overview", end: true },
  { to: "/investigations", label: "Investigations", end: false },
  { to: "/pipeline", label: "Pipeline", end: false },
  { to: "/benchmark", label: "Benchmark", end: false },
  { to: "/status", label: "Status", end: false },
];

function Logo() {
  return (
    <NavLink to="/" className="press flex shrink-0 items-center gap-2.5 rounded-md text-[15px] font-semibold text-ink">
      <span className="relative flex h-7 w-7 items-center justify-center rounded-md border border-accent/30 bg-accent/15 text-accent">
        <Signal size={15} strokeWidth={2.6} />
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-healthy pulse-dot" />
      </span>
      Glassbox SRE
    </NavLink>
  );
}

function DemoPill() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Demo mode, sample data"
          className="relative inline-flex h-7 shrink-0 items-center gap-2 rounded-full border border-line px-3 font-mono text-[11px] text-ink-2 transition-[border-color] duration-[160ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-white/[0.12] before:absolute before:-inset-y-2 before:inset-x-0 before:content-['']"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="max-[479px]:hidden">Demo mode · sample data</span>
          <span className="hidden max-[479px]:inline">Demo</span>
        </button>
      </TooltipTrigger>
      <TooltipContent>
        Running on sample data. Full setup on{" "}
        <a className="text-accent underline-offset-2 hover:underline" href={REPO_URL} target="_blank" rel="noreferrer">
          GitHub
        </a>
        .
      </TooltipContent>
    </Tooltip>
  );
}

function MobileMenu() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const onChange = () => {
      if (mq.matches) setOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  const isActive = (to: string, end: boolean) => (end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`));
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button type="button" aria-label="Open menu" className="icon-button h-10 w-10 nav:hidden">
          <Menu size={18} />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-scrim fixed inset-0 z-40 bg-black/60" />
        <Dialog.Content
          aria-describedby={undefined}
          className="sheet-content fixed inset-y-0 right-0 z-50 flex w-[min(320px,86vw)] flex-col border-l border-line bg-elevated p-4"
        >
          <div className="flex items-center justify-between pb-2">
            <Dialog.Title className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-3">Menu</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" aria-label="Close menu" className="icon-button h-10 w-10">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>
          <nav className="flex flex-col" aria-label="Primary">
            {NAV_LINKS.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setOpen(false)}
                className={`flex h-12 items-center gap-3 rounded-lg px-3 text-base ${isActive(to, end) ? "text-ink" : "text-ink-2"}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isActive(to, end) ? "bg-accent" : "bg-transparent"}`} />
                {label}
              </NavLink>
            ))}
          </nav>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-2 flex h-12 items-center gap-3 rounded-lg px-3 text-base text-ink-2"
          >
            <Github size={16} />
            GitHub
          </a>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Shell({ children }: PropsWithChildren) {
  const { pathname } = useLocation();
  const isLanding = pathname === "/";
  const reduce = useReducedMotion();
  const isActive = (to: string, end: boolean) => (end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`));
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <header className="sticky top-0 z-30 h-14 border-b border-line bg-canvas/70 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-[1200px] items-center gap-4 px-4 sm:px-6">
          <Logo />
          <nav aria-label="Primary" className="ml-4 hidden items-center gap-1 nav:flex">
            {NAV_LINKS.map(({ to, label, end }) => {
              const active = isActive(to, end);
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={`press relative rounded-lg px-3 py-1.5 text-sm font-medium hover:text-ink ${active ? "text-ink" : "text-ink-2"}`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-lg bg-white/[0.06]"
                      transition={reduce ? { duration: 0 } : { duration: DUR.base, ease: EASE }}
                    />
                  )}
                  <span className="relative">{label}</span>
                </NavLink>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {DEMO_MODE && <DemoPill />}
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              aria-label="View source on GitHub"
              className="icon-button hidden nav:inline-flex"
            >
              <Github size={16} />
            </a>
            <MobileMenu />
          </div>
        </div>
      </header>
      <main
        className={
          isLanding ? "relative flex-1" : "relative mx-auto w-full max-w-[1200px] flex-1 px-4 pb-16 pt-8 sm:px-6"
        }
      >
        {children}
      </main>
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
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 py-16" role="status">
      <SignalLine variant="loader" />
      <p className="text-center text-sm text-ink-3">{label}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return <div className="rounded-glass border border-firing/25 bg-red-950/40 p-4 text-sm text-red-200">{message}</div>;
}
