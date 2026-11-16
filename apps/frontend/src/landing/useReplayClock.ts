import { useCallback, useEffect, useRef, useState } from "react";

type ClockState = "idle" | "running" | "done";

/**
 * One clock for the whole replay. Returns elapsed timeline seconds (0 to `end`).
 * Speed scales how fast timeline seconds accumulate, so 2x doubles the clock and
 * changing speed mid-run never jumps. Pauses while the tab is hidden.
 */
export function useReplayClock(speed: number, end: number) {
  const [elapsed, setElapsed] = useState(0);
  const [state, setState] = useState<ClockState>("idle");
  const [runId, setRunId] = useState(0);
  const speedRef = useRef(speed);
  const accRef = useRef(0);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    if (state !== "running") return;
    let raf = 0;
    let last: number | null = null;

    const tick = (now: number) => {
      if (document.hidden) {
        last = null;
      } else {
        if (last !== null) {
          // Clamp so a long frame stall never skips a beat.
          accRef.current += Math.min((now - last) / 1000, 0.1) * speedRef.current;
        }
        last = now;
        if (accRef.current >= end) {
          accRef.current = end;
          setElapsed(end);
          setState("done");
          return;
        }
        setElapsed(accRef.current);
      }
      raf = requestAnimationFrame(tick);
    };

    const onVisibility = () => {
      last = null;
    };
    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [state, runId, end]);

  /** Start from 0 if the clock has not run yet. */
  const start = useCallback(() => {
    setState((current) => {
      if (current !== "idle") return current;
      accRef.current = 0;
      setElapsed(0);
      return "running";
    });
  }, []);

  /** Restart from 0 at any time. */
  const restart = useCallback(() => {
    accRef.current = 0;
    setElapsed(0);
    setRunId((id) => id + 1);
    setState("running");
  }, []);

  return { elapsed, started: state !== "idle", done: state === "done", runId, start, restart };
}
