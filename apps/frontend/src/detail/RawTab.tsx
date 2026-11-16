import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn, T } from "../components/primitives";

export function RawTab({ brief }: { brief: string | null }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    if (!brief) return;
    try {
      await navigator.clipboard.writeText(brief);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-1.5">
        <span className={T.label}>Rendered brief</span>
        <button
          type="button"
          onClick={() => void copy()}
          disabled={!brief}
          aria-label={copied ? "Brief copied" : "Copy rendered brief"}
          className={cn(T.label, "press inline-flex h-11 items-center gap-1.5 rounded-lg border border-white/[0.12] px-3 text-ink-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50 nav:h-9")}
        >
          {copied ? <Check size={14} className="text-healthy" aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className={cn(T.data, "whitespace-pre-wrap break-words p-4 leading-[22px] text-ink-2")}>
        {brief ?? "No final brief was persisted."}
      </pre>
    </div>
  );
}
