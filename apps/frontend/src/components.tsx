import * as Dialog from "@radix-ui/react-dialog";
import { ChevronDown, Github, Menu, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import type { PropsWithChildren } from "react";
import { NavLink, useLocation } from "react-router-dom";

import { Logo } from "./components/Logo";
import { SignalLine } from "./components/SignalLine";
import { cn, sentenceCase, T } from "./components/primitives";
import { Progress } from "./components/ui/progress";
import { DUR, EASE } from "./motion";

const REPO_URL = "https://github.com/krishna31102004/ai-sre-new";

const NAV_LINKS = [
  { to: "/", label: "Overview", end: true },
  { to: "/investigations", label: "Investigations", end: false },
  { to: "/pipeline", label: "Pipeline", end: false },
  { to: "/benchmark", label: "Benchmark", end: false },
  { to: "/status", label: "Status", end: false },
];

function BrandLink() {
  return (
    <NavLink to="/" className={cn(T.h3, "press flex shrink-0 items-center gap-2 rounded-md")}>
      <Logo size={24} />
      Glassbox SRE
    </NavLink>
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
            <Dialog.Title className={T.label}>Menu</Dialog.Title>
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
                className={cn(T.lead, "flex h-12 items-center gap-3 rounded-lg px-3", isActive(to, end) ? "text-ink" : "text-ink-2")}
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
            className={cn(T.lead, "mt-2 flex h-12 items-center gap-3 rounded-lg px-3 text-ink-2")}
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
        <div className="mx-auto flex h-full max-w-[1200px] items-center gap-4 px-4 md:px-6">
          <BrandLink />
          <nav aria-label="Primary" className="ml-4 hidden items-center gap-1 nav:flex">
            {NAV_LINKS.map(({ to, label, end }) => {
              const active = isActive(to, end);
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={cn(T.body, "press relative rounded-lg px-3 py-1.5 font-medium hover:text-ink", active ? "text-accent" : "text-ink-2")}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-lg bg-ink/[0.06]"
                      transition={reduce ? { duration: 0 } : { duration: DUR.base, ease: EASE }}
                    />
                  )}
                  <span className="relative">{label}</span>
                </NavLink>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3">
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
          isLanding ? "relative flex-1" : "relative mx-auto w-full max-w-[1200px] flex-1 px-4 pb-16 pt-8 md:px-6 md:pb-24 md:pt-12"
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
      {sentenceCase(status ?? "unknown")}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: string | null }) {
  const normalized = severity?.toLowerCase() ?? "unknown";
  const tone = normalized === "page" ? "badge-red" : normalized === "ticket" ? "badge-amber" : "badge-slate";
  return <span className={`badge ${tone}`}>{severity ?? "--"}</span>;
}

export function ConfidencePill({ confidence }: { confidence: number | null }) {
  if (confidence === null) return <span className="text-ink-3">--</span>;
  const tone = confidence >= 0.8 ? "bg-healthy" : confidence >= 0.5 ? "bg-ink-2" : "bg-firing";
  return (
    <span className={cn(T.dataSm, "inline-flex min-w-[112px] items-center gap-2 text-ink-2")}>
      <Progress value={Math.round(confidence * 100)} className="w-14" indicatorClassName={tone} />
      {Math.round(confidence * 100)}%
    </span>
  );
}

export function Collapsible({ title, children, open = false }: PropsWithChildren<{ title: React.ReactNode; open?: boolean }>) {
  return (
    <details className="border-t border-line py-4" open={open}>
      <summary className={cn(T.body, "flex cursor-pointer list-none items-center justify-between font-medium text-ink")}>
        {title}
        <ChevronDown size={18} className="text-ink-3" />
      </summary>
      <div className={cn(T.body, "pt-4")}>{children}</div>
    </details>
  );
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 py-16" role="status">
      <SignalLine variant="loader" />
      <p className={cn(T.body, "text-center")}>{label}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return <div className={cn(T.body, "rounded-glass border border-firing/40 bg-panel p-4 text-firing")}>{message}</div>;
}
