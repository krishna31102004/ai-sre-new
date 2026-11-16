import { SignalLine } from "../components/SignalLine";
import { Logo } from "../components/Logo";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { landingStats } from "../mockData";

/** Fixed-size frames for headless capture of public/og.png (1200x630) and public/apple-touch-icon.png (180x180, ?icon=1). */
export function OgPage() {
  const [params] = useSearchParams();

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
  const { llm, heuristic } = landingStats.top1;

  if (params.get("icon") === "1") {
    return (
      <div className="flex h-[180px] w-[180px] items-center justify-center overflow-hidden bg-canvas">
        <Logo size={120} />
      </div>
    );
  }

  return (
    <div className="relative h-[630px] w-[1200px] overflow-hidden bg-canvas">
      <div className="absolute left-16 top-14 flex items-center gap-2 font-sans text-[26px] font-semibold text-ink">
        <Logo size={44} />
        Glassbox SRE
      </div>
      <h1 className="absolute left-16 top-[128px] w-[960px] font-display text-[76px] font-normal leading-[1] tracking-[-0.01em] text-ink">
        The on-call engineer&apos;s first five minutes, automated.
      </h1>
      <div className="absolute bottom-[112px] left-16 flex gap-16">
        <div>
          <div className="font-mono text-[88px] font-medium leading-none tabular-nums text-accent">{llm.display}</div>
          <div className="mt-3 font-sans text-[20px] text-ink-2">{llm.label}</div>
        </div>
        <div>
          <div className="font-mono text-[88px] font-medium leading-none tabular-nums text-ink-3">{heuristic.display}</div>
          <div className="mt-3 font-sans text-[20px] text-ink-2">{heuristic.label}</div>
        </div>
      </div>
      <SignalLine variant="hero" className="absolute bottom-10 left-16 h-12 w-[1072px]" />
    </div>
  );
}
