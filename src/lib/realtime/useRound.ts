"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase/browserClient";
import { ensureClockSynced } from "@/lib/realtime/serverClock";

export interface RoundData {
  id: string;
  gameSlug: string;
  roundKey: string;
  orderIndex: number;
  totalQuestions: number;
  status: "pending" | "active" | "closed" | "confirmed";
  /**
   * When this round's board actually opens — stamped 3s ahead of the admin's
   * click so every view can run the same 3-2-1. Only Book Match uses it; the
   * lockstep games hang their ceremony off question_state.started_at instead.
   */
  startedAt: string | null;
}

/** Safety-net poll interval — see useQuestionState for the full rationale. */
const RECONCILE_MS = 3000;

export function useRound(gameSlug: string, roundKey: string) {
  const [round, setRound] = useState<RoundData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = getBrowserSupabaseClient();

    // Every view that shows a countdown mounts this hook, and it mounts well
    // before any question arrives. Measuring the clock offset here means the
    // 3-2-1 has a corrected clock the instant it needs one, instead of a
    // freshly-loaded phone computing its first numeral against a skewed
    // local clock and skipping the ceremony entirely.
    ensureClockSynced();

    async function load() {
      const { data, error } = await supabase
        .from("rounds")
        .select("id, game_slug, round_key, order_index, total_questions, status, started_at")
        .eq("game_slug", gameSlug)
        .eq("round_key", roundKey)
        .single();

      if (cancelled) return;
      if (error || !data) {
        setRound(null);
        setLoading(false);
        return;
      }

      setRound({
        id: data.id,
        gameSlug: data.game_slug,
        roundKey: data.round_key,
        orderIndex: data.order_index,
        totalQuestions: data.total_questions,
        status: data.status,
        startedAt: data.started_at,
      });
      setLoading(false);
    }

    load();

    // Filter server-side on game_slug rather than receiving every game's
    // round updates and discarding the irrelevant ones client-side.
    // Supabase Realtime bills one message per receiving client, so an
    // unfiltered subscription would spend quota delivering (say) Book Match
    // events to every First Lines player. round_key still has to be checked
    // in the handler because postgres_changes supports only one filter.
    const channel = supabase
      .channel(`round-${gameSlug}-${roundKey}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rounds", filter: `game_slug=eq.${gameSlug}` },
        (payload) => {
          const row = payload.new as {
            id: string;
            game_slug: string;
            round_key: string;
            order_index: number;
            total_questions: number;
            status: RoundData["status"];
            started_at: string | null;
          };
          if (row.round_key === roundKey) {
            setRound({
              id: row.id,
              gameSlug: row.game_slug,
              roundKey: row.round_key,
              orderIndex: row.order_index,
              totalQuestions: row.total_questions,
              status: row.status,
              startedAt: row.started_at,
            });
          }
        }
      )
      .subscribe();

    // Realtime messages are dropped (not queued) once a project exceeds its
    // plan's messages/second quota, so a missed round transition would
    // otherwise strand players — Book Match never leaving "waiting to
    // start", or nobody seeing the winner reveal. Reconcile on a timer and
    // whenever a backgrounded phone returns to the foreground.
    const reconcile = setInterval(load, RECONCILE_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(reconcile);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [gameSlug, roundKey]);

  return { round, loading };
}
