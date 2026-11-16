import { Link } from "react-router-dom";

import { SignalLine } from "../components/SignalLine";

export function NotFoundPage() {
  return (
    <div className="flex min-h-[calc(100svh-56px-32px-64px)] flex-col items-center justify-center text-center">
      <SignalLine variant="hero" flat className="h-2 w-40 text-ink-3" />
      <p className="mt-6 font-mono text-[13px] tabular-nums text-ink-3">404</p>
      <h1 className="mt-3 font-display text-[44px] font-normal leading-[1.05] tracking-[-0.01em] text-ink">
        No alert fired here.
      </h1>
      <p className="mt-3 text-[15px] leading-6 text-ink-2">This route does not exist.</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/"
          className="press inline-flex h-11 items-center rounded-lg bg-accent px-5 text-sm font-medium text-canvas hover:bg-accent/90"
        >
          Overview
        </Link>
        <Link
          to="/investigations"
          className="press inline-flex h-11 items-center rounded-lg border border-line px-5 text-sm font-medium text-ink hover:border-white/[0.12]"
        >
          Investigations
        </Link>
      </div>
    </div>
  );
}
