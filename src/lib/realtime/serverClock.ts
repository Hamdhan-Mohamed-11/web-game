"use client";

import { getBrowserSupabaseClient } from "@/lib/supabase/browserClient";

/**
 * Corrects for clock skew between the viewing device and the database.
 *
 * Countdowns compare a server-stamped `started_at` against the browser's
 * own clock. A display laptop whose clock drifts (they routinely do — one
 * measured 8s behind) renders a 15-second question as ~23 seconds, while
 * phones with network-synced clocks show it correctly. Everyone must see
 * the same number, so all countdown maths goes through serverNow().
 *
 * Scoring never depended on this — points are computed server-side from
 * the database's own clock — so this only ever affected what was displayed.
 */
let offsetMs = 0;
let syncing: Promise<void> | null = null;

async function measureOffset(): Promise<void> {
  const supabase = getBrowserSupabaseClient();
  const sentAt = Date.now();
  const { data, error } = await supabase.rpc("server_now");
  const receivedAt = Date.now();
  if (error || !data) return;

  // Assume the request and response legs took roughly equal time, so the
  // server's timestamp lines up with the midpoint of the round trip.
  const midpoint = sentAt + (receivedAt - sentAt) / 2;
  offsetMs = new Date(data as unknown as string).getTime() - midpoint;
}

/** Kick off a one-time sync; safe to call from many components. */
export function ensureClockSynced(): Promise<void> {
  if (!syncing) syncing = measureOffset().catch(() => undefined);
  return syncing;
}

/** Current time on the database's clock, in ms. */
export function serverNow(): number {
  return Date.now() + offsetMs;
}
