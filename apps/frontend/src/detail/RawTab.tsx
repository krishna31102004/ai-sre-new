import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
    <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-canvas">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3">rendered brief</span>
        <button
          type="button"
          onClick={() => void copy()}
          disabled={!brief}
          aria-label={copied ? "Brief copied" : "Copy rendered brief"}
          className="press inline-flex h-11 items-center gap-1.5 rounded-lg border border-white/[0.07] px-3 text-[12px] text-ink-2 hover:border-white/[0.12] hover:text-ink disabled:cursor-not-allowed disabled:opacity-50 nav:h-8"
        >
          {copied ? <Check size={14} className="text-healthy" aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="whitespace-pre-wrap break-words p-4 font-mono text-[13px] leading-[22px] text-ink-2">
        {brief ?? "No final brief was persisted."}
      </pre>
    </div>
  );
}
