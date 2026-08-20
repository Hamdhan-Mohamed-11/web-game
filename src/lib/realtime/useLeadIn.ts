"use client";

import { useEffect, useState } from "react";
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

/**
 * Countdown to a server-stamped `startsAt` that is deliberately in the
 * future (see supabase/migrations/0009_lead_in.sql).
 *
 * Uses serverNow() rather than Date.now() for the same reason CountdownTimer
 * does: started_at comes from the database's clock, and a display machine in
 * this room was once measured 8s adrift — which would have had the projector
 * showing "1" while the phones still showed "3".
 */
export function useLeadIn(startsAt: string | null | undefined): LeadInState {
  const [state, setState] = useState<LeadInState>(IDLE);

  useEffect(() => {
    if (!startsAt) return;

    const startsAtMs = new Date(startsAt).getTime();

    function tick() {
      const remaining = startsAtMs - serverNow();
      // Clamped to MAX_COUNT so a badly skewed clock degrades to a short
      // ceremony rather than counting down from some absurd number.
      setState(
        remaining > 0 ? { pending: true, count: Math.min(MAX_COUNT, Math.ceil(remaining / 1000)) } : IDLE
      );
    }

    // Paint from whatever offset we already have, then correct once the sync
    // lands — otherwise a cold start flashes the wrong numeral.
    tick();
    ensureClockSynced().then(tick);

    // 100ms, not 1000ms: the numeral should change on the server's second
    // boundary, not on whatever phase this component happened to mount at.
    const interval = setInterval(tick, 100);
    document.addEventListener("visibilitychange", tick);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [startsAt]);

  // Derived rather than reset via setState in the effect above: with no
  // timestamp there is nothing to count down, and reading it this way keeps
  // a stale count from a previous question out of the render.
  return startsAt ? state : IDLE;
}
