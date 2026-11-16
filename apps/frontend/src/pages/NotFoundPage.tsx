import { Link } from "react-router-dom";

import { cn, T } from "../components/primitives";
import { SignalLine } from "../components/SignalLine";

export function NotFoundPage() {
  return (
    <div className="flex min-h-[calc(100svh-56px-32px-64px)] flex-col items-center justify-center text-center">
      <SignalLine variant="hero" flat className="h-2 w-40 text-ink-3" />
      <p className={cn(T.data, "mt-6 text-ink-3")}>404</p>
      <h1 className={cn(T.h1, "mt-2")}>
        No alert fired here.
      </h1>
      <p className={cn(T.body, "mt-2")}>This route does not exist.</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/"
          className={cn(T.body, "press inline-flex h-9 items-center rounded-lg bg-accent px-5 font-medium text-canvas hover:bg-accent/90")}
        >
          Overview
        </Link>
        <Link
          to="/investigations"
          className={cn(T.body, "press inline-flex h-9 items-center rounded-lg border border-white/[0.12] px-5 font-medium text-ink")}
        >
          Investigations
        </Link>
      </div>
    </div>
  );
}
