"use client";

import { useEffect, useState } from "react";
import { ensureClockSynced, serverNow } from "@/lib/realtime/serverClock";

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

    // serverNow() rather than Date.now(): started_at comes from the
    // database's clock, so a skewed display device would otherwise render
    // a completely different number than the phones in the room.
    function tick() {
      const elapsed = serverNow() - startedAtMs;
      const remaining = Math.max(0, Math.min(durationMs, durationMs - elapsed));
      setRemainingMs(remaining);
      if (remaining === 0 && !expired) {
        expired = true;
        onExpire?.();
      }
    }

    // Paint immediately from whatever offset we have, then re-tick once the
    // sync lands so a cold start doesn't show a wrong number for a moment.
    tick();
    ensureClockSynced().then(tick);

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
