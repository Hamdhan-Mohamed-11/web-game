"use client";

import { useEffect, useReducer } from "react";
import { ensureClockSynced, serverNow } from "@/lib/realtime/serverClock";
import { LEAD_IN_MS } from "@/lib/scoring/leadIn";

export interface LeadInState {
  /** True while the ceremony is still running — the question/board is not open yet. */
  pending: boolean;
  /** 3, 2, 1 … then 0, which every caller renders as "Go!". */
  count: number;
}

const IDLE: LeadInState = { pending: false, count: 0 };
const MAX_COUNT = Math.ceil(LEAD_IN_MS / 1000);

function remainingMs(startsAt: string): number {
  return new Date(startsAt).getTime() - serverNow();
}

/**
 * Countdown to a server-stamped `startsAt` that is deliberately in the
 * future (see supabase/migrations/0009_lead_in.sql).
 *
 * Uses serverNow() rather than Date.now() for the same reason CountdownTimer
 * does: started_at comes from the database's clock, and a display machine in
 * this room was once measured 8s adrift — which would have had the projector
 * showing "1" while the phones still showed "3".
 *
 * The result is computed DURING RENDER rather than held in state and written
 * by the effect. Holding it in state meant the first render after a new
 * question arrived still reported "not pending", so the phone painted the
 * question text and its 15s timer for a frame before the ceremony replaced
 * it — a measured ~100ms flash of exactly the head start the 3-2-1 exists to
 * prevent. State here only schedules re-renders; it is never the source of
 * truth.
 */
export function useLeadIn(startsAt: string | null | undefined): LeadInState {
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    if (!startsAt) return;
    if (remainingMs(startsAt) <= 0) return;

    let cancelled = false;
    // 100ms, not 1000ms: the numeral should change on the server's second
    // boundary, not on whatever phase this component happened to mount at.
    const interval = setInterval(() => {
      rerender();
      // Stop as soon as the ceremony is over — otherwise this would keep
      // re-rendering the caller ten times a second for the whole 15s
      // question that follows, for a value that can no longer change.
      if (remainingMs(startsAt) <= 0) clearInterval(interval);
    }, 100);

    // Re-render once the clock offset lands, in case this client had not
    // synced yet and computed the first numeral against a skewed clock.
    ensureClockSynced().then(() => {
      if (!cancelled) rerender();
    });

    document.addEventListener("visibilitychange", rerender);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", rerender);
    };
  }, [startsAt]);

  if (!startsAt) return IDLE;

  const remaining = remainingMs(startsAt);
  if (remaining <= 0) return IDLE;

  // Clamped to MAX_COUNT so a badly skewed clock degrades to a short
  // ceremony rather than counting down from some absurd number.
  return { pending: true, count: Math.min(MAX_COUNT, Math.ceil(remaining / 1000)) };
}
