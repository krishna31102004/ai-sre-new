import { SignalLine } from "../components/SignalLine";
import { Signal } from "lucide-react";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { landingStats } from "../mockData";

function LogoTile({ size }: { size: number }) {
  return (
    <span
      className="relative flex items-center justify-center border border-line bg-ink/[0.06] text-ink"
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.22) }}
    >
      <Signal size={Math.round(size * 0.53)} strokeWidth={2.6} />
      <span
        className="absolute rounded-full bg-healthy"
        style={{ width: size * 0.28, height: size * 0.28, right: -size * 0.04, top: -size * 0.04 }}
      />
    </span>
  );
}

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
        <LogoTile size={96} />
      </div>
    );
  }

  return (
    <div className="relative h-[630px] w-[1200px] overflow-hidden bg-canvas">
      <div className="absolute left-16 top-14 flex items-center gap-3.5 font-sans text-[26px] font-semibold text-ink">
        <LogoTile size={44} />
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
