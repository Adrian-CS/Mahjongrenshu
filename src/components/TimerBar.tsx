"use client";

import { useEffect, useState } from "react";

/** Countdown bar for timed mode: drains from full to empty by the deadline. */
export function TimerBar({ deadline, seconds }: { deadline: number; seconds: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [deadline]);
  const left = Math.max(0, deadline - now);
  const fraction = Math.min(1, left / (seconds * 1000));
  const urgent = left < 3000;
  return (
    <div className="flex w-full items-center gap-2" role="timer" aria-label="Tiempo restante">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-emerald-950/40">
        <div
          className={`h-full rounded-full transition-[width] duration-100 ease-linear ${urgent ? "bg-red-400" : "bg-amber-300"}`}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
      <span className={`w-10 text-right text-sm tabular-nums ${urgent ? "text-red-200" : "text-emerald-100"}`}>{(left / 1000).toFixed(1)}s</span>
    </div>
  );
}
