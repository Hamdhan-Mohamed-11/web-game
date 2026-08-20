"use client";

import { useEffect, useState } from "react";
import { ensureClockSynced, serverNow } from "@/lib/realtime/serverClock";

interface CountdownTimerProps {
  startedAt: string | null;
  durationMs: number;
  onExpire?: () => void;
  /** Any CSS length; a bare number is treated as px. The LED screens pass vh. */
  size?: number | string;
  theme?: "light" | "dark";
}

// Fixed internal coordinate system so the ring can be sized with ANY CSS
// length (the LED screens size themselves in vh so ten leaderboard rows fit
// on any projector) instead of only whole pixels.
const VIEWBOX = 100;
const STROKE = 8;
const RADIUS = VIEWBOX / 2 - STROKE / 2 - 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Display-only countdown, rendered as a circular progress ring. Always
 * re-derives remaining time from the server `startedAt` timestamp rather
 * than free-running its own clock, so a backgrounded tab (visibilitychange)
 * or drift never desyncs the display — and it can never affect scoring,
 * which is computed server-side regardless.
 *
 * `startedAt` may be in the future during the 3-2-1 lead-in; the ring simply
 * sits full until then, and callers that want the ceremony itself rendered
 * use useLeadIn/LeadIn.
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
      // Guarded on elapsed >= 0 so the lead-in (when startedAt is still in
      // the future) can't fire onExpire before the question even opens.
      if (remaining === 0 && elapsed >= 0 && !expired) {
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

  const track = theme === "dark" ? "stroke-white/15" : "stroke-navy-100";
  const progress = urgent ? "stroke-danger-600" : "stroke-gold-500";
  const numeral = theme === "dark" ? "text-white" : "text-navy-900";

  // font-size on the wrapper is what lets the numeral scale with any unit:
  // the span below reads 0.34em of it, matching the old size * 0.34.
  const length = typeof size === "number" ? `${size}px` : size;

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: length, height: length, fontSize: length }}
    >
      <svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx={VIEWBOX / 2} cy={VIEWBOX / 2} r={RADIUS} strokeWidth={STROKE} fill="none" className={track} />
        <circle
          cx={VIEWBOX / 2}
          cy={VIEWBOX / 2}
          r={RADIUS}
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
          className={`${progress} transition-[stroke-dashoffset] duration-200 ease-linear`}
          style={{ strokeDasharray: CIRCUMFERENCE, strokeDashoffset: CIRCUMFERENCE * (1 - fraction) }}
        />
      </svg>
      <span
        className={`absolute font-display font-bold leading-none tabular-nums ${numeral}`}
        style={{ fontSize: "0.34em" }}
        role="timer"
        aria-live="off"
      >
        {seconds}
      </span>
    </div>
  );
}
