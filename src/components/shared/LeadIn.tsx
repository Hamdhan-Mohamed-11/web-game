"use client";

import { useEffect, useRef } from "react";
import { playTick, playGo } from "@/lib/audio/sfx";

interface LeadInProps {
  count: number;
  /** "screen" scales for a projector; "phone" for a handset; "inline" for the admin panel. */
  size?: "screen" | "phone" | "inline";
  /** "inline" sits on the admin panel's white card; the others on navy. */
  tone?: "dark" | "light";
  label?: string;
  /**
   * Play a blip and buzz on each numeral. Off for the admin panel's inline
   * copy, which would otherwise chirp in the operator's ear alongside the
   * projector doing the same thing a metre away.
   */
  alert?: boolean;
}

const NUMERAL_SIZE = {
  screen: "text-[22vh] leading-none",
  phone: "text-8xl",
  inline: "text-4xl",
} as const;

const LABEL_SIZE = {
  screen: "text-2xl tracking-[0.5em] lg:text-4xl",
  phone: "text-sm tracking-[0.4em]",
  inline: "text-xs tracking-[0.3em]",
} as const;

const RING_SIZE = {
  screen: "h-[26vh] w-[26vh]",
  phone: "h-40 w-40",
  inline: "h-16 w-16",
} as const;

/**
 * The synchronised 3-2-1. Every view — phone, projector, admin panel —
 * renders this off the same server timestamp so the whole room counts
 * together; see useLeadIn for why it can't be a local setInterval.
 *
 * `key={count}` on the numeral and the ring is what re-fires their
 * animations on each tick; without it React reuses the node and the number
 * changes silently.
 */
export default function LeadIn({
  count,
  size = "screen",
  tone = "dark",
  label = "Get Ready",
  alert = false,
}: LeadInProps) {
  // Guards against re-firing on re-renders that didn't change the numeral —
  // useLeadIn re-renders ten times a second, and without this every one of
  // them would retrigger the blip.
  const lastCount = useRef<number | null>(null);

  useEffect(() => {
    if (!alert) return;
    if (lastCount.current === count) return;
    lastCount.current = count;

    // Haptics are for the handset only. The projector has nothing to buzz,
    // and calling vibrate() on a page the operator never tapped just logs a
    // blocked-autoplay warning on every tick.
    const canBuzz = size === "phone" && typeof navigator !== "undefined" && "vibrate" in navigator;

    if (count > 0) {
      playTick(count);
      // Short buzz per numeral, a longer one on "Go!" — the phone is often
      // face-down on a table until the question actually opens.
      if (canBuzz) navigator.vibrate(45);
    } else {
      playGo();
      if (canBuzz) navigator.vibrate([70, 40, 120]);
    }
  }, [count, alert, size]);

  const ringColor = tone === "dark" ? "border-gold-500" : "border-gold-600";

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${alert ? "animate-countdown-thump" : ""}`} key={count}>
      <span
        className={`font-display font-semibold uppercase ${LABEL_SIZE[size]} ${
          tone === "dark" ? "text-white/50" : "text-ink-600"
        }`}
      >
        {label}
      </span>

      <div className="relative flex items-center justify-center">
        {/* Two rings offset in time read as a pulse rather than a single
            blip, which is what makes the countdown catch the eye. */}
        <span
          aria-hidden="true"
          className={`animate-countdown-ring pointer-events-none absolute rounded-full border-2 ${ringColor} ${RING_SIZE[size]}`}
        />
        <span
          aria-hidden="true"
          className={`animate-countdown-ring pointer-events-none absolute rounded-full border ${ringColor} ${RING_SIZE[size]}`}
          style={{ animationDelay: "160ms" }}
        />

        <span
          className={`animate-pop-in relative font-display font-bold tabular-nums ${NUMERAL_SIZE[size]} ${
            tone === "dark" ? "text-gold-500" : "text-gold-600"
          }`}
          style={tone === "dark" ? { textShadow: "0 0 60px rgba(224,152,44,0.45)" } : undefined}
        >
          {count > 0 ? count : "Go!"}
        </span>
      </div>
    </div>
  );
}
