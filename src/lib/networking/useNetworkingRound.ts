"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase/browserClient";

export interface NetworkingRound {
  /** Null until a host starts the round. */
  endsAt: number | null;
  /** Whole seconds remaining, floored at 0. Null when no round is running. */
  secondsLeft: number | null;
  /** False only once a started round's deadline has passed. */
  isOpen: boolean;
  /** True once the first poll has answered — before that, render nothing. */
  loaded: boolean;
  durationSeconds: number;
  refresh: () => void;
}

/** How often to re-ask the server. The local ticker fills the gaps. */
const POLL_MS = 10_000;

interface RoundSnapshot {
  endsAt: number | null;
  durationSeconds: number;
  /** Server clock minus this device's clock, in ms. */
  skewMs: number;
}

/**
 * One round trip to the state RPC, returning the deadline together with this
 * device's clock error.
 *
 * Module-level rather than a hook callback so the polling effect below can
 * own its own async function, matching useNetworkingDashboard — an effect
 * that calls a setState-bearing callback from its dependency list is exactly
 * what the compiler's set-state-in-effect rule exists to catch.
 */
async function fetchRoundState(): Promise<RoundSnapshot | null> {
  const supabase = getBrowserSupabaseClient();
  const sentAt = Date.now();
  const { data, error } = await supabase.rpc("networking_round_state");
  if (error || !data) return null;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  const receivedAt = Date.now();
  // Assume the two legs of the round trip took roughly the same time, so the
  // server's stamp lines up with the midpoint — the same assumption
  // serverClock.ts makes for the quiz countdowns.
  const midpoint = sentAt + (receivedAt - sentAt) / 2;

  return {
    endsAt: row.ends_at ? new Date(row.ends_at as string).getTime() : null,
    durationSeconds: (row.duration_seconds as number) ?? 300,
    skewMs: new Date(row.server_now as string).getTime() - midpoint,
  };
}

/**
 * The networking round's countdown, corrected for the device's clock.
 *
 * The correction is the whole reason this doesn't just read `ends_at` and
 * subtract Date.now(). A phone eight seconds fast would show 4:52 while the
 * wall shows 5:00, and would keep submitting after the wall hit zero. The
 * state RPC returns the database's own `now()` alongside the deadline, so
 * every device measures the remaining time against the same clock — the one
 * the server also uses to decide whether a submission still counts.
 *
 * Polled rather than subscribed: the deadline changes at most a handful of
 * times an evening, and a websocket per phone is a far worse trade on venue
 * wifi than one small request every ten seconds.
 */
export function useNetworkingRound(): NetworkingRound {
  const [snapshot, setSnapshot] = useState<RoundSnapshot | null>(null);
  /** Ticked once a second so the digits move between polls. */
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const next = await fetchRoundState();
      if (!cancelled && next) setSnapshot(next);
    }

    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const refresh = useCallback(() => {
    fetchRoundState().then((next) => {
      if (next) setSnapshot(next);
    });
  }, []);

  const endsAt = snapshot?.endsAt ?? null;
  const secondsLeft =
    endsAt === null
      ? null
      : Math.max(0, Math.ceil((endsAt - (now + (snapshot?.skewMs ?? 0))) / 1000));

  return {
    endsAt,
    secondsLeft,
    // A round that was never started is open — matching the SQL, which
    // deliberately does not lock the game out before anyone presses start.
    isOpen: secondsLeft === null || secondsLeft > 0,
    loaded: snapshot !== null,
    durationSeconds: snapshot?.durationSeconds ?? 300,
    refresh,
  };
}

/** m:ss, for display. */
export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
