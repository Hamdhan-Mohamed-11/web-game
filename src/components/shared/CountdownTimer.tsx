"use client";

import { useEffect, useState } from "react";

interface CountdownTimerProps {
  startedAt: string | null;
  durationMs: number;
  onExpire?: () => void;
  size?: number;
  theme?: "light" | "dark";
}

/**
 * Display-only countdown, rendered as a circular progress ring. Always
 * re-derives remaining time from the server `startedAt` timestamp rather
 * than free-running its own clock, so a backgrounded tab (visibilitychange)
 * or drift never desyncs the display — and it can never affect scoring,
 * which is computed server-side regardless.
 */
export default function CountdownTimer({
  startedAt,
  durationMs,
  onExpire,
  size = 88,
  theme = "light",
}: CountdownTimerProps) {
  const [remainingMs, setRemainingMs] = useState<number>(durationMs);

  useEffect(() => {
    if (!startedAt) return;

    const startedAtMs = new Date(startedAt).getTime();
    let expired = false;

    function tick() {
      const elapsed = Date.now() - startedAtMs;
      const remaining = Math.max(0, durationMs - elapsed);
      setRemainingMs(remaining);
      if (remaining === 0 && !expired) {
        expired = true;
        onExpire?.();
      }
    }

    tick();
    const interval = setInterval(tick, 200);
    document.addEventListener("visibilitychange", tick);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [startedAt, durationMs, onExpire]);

  const seconds = Math.ceil(remainingMs / 1000);
  const fraction = Math.max(0, Math.min(1, remainingMs / durationMs));
  const urgent = remainingMs <= 5000 && remainingMs > 0;

  const radius = size / 2 - 6;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - fraction);

  const track = theme === "dark" ? "stroke-white/15" : "stroke-navy-100";
  const progress = urgent ? "stroke-danger-600" : "stroke-gold-500";
  const numeral = theme === "dark" ? "text-white" : "text-navy-900";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={5} fill="none" className={track} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={5}
          fill="none"
          strokeLinecap="round"
          className={`${progress} transition-[stroke-dashoffset] duration-200 ease-linear`}
          style={{ strokeDasharray: circumference, strokeDashoffset: offset }}
        />
      </svg>
      <span
        className={`absolute font-display font-bold tabular-nums ${numeral}`}
        style={{ fontSize: size * 0.34 }}
        role="timer"
        aria-live="off"
      >
        {seconds}
      </span>
    </div>
  );
}
