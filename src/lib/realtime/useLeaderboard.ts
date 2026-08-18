"use client";

import { useEffect, useRef, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase/browserClient";

export interface LeaderboardRow {
  participantId: string;
  displayName: string;
  totalPoints: number;
  totalElapsedMs: number;
  progress: number;
  isFinished: boolean;
  scoreReachedAt: string | null;
}

const REFETCH_DEBOUNCE_MS = 400;

/**
 * Live Top-N leaderboard for a round. Realtime events on leaderboard_entries
 * are treated purely as "something changed" pings — each one triggers a
 * debounced re-fetch of the correctly-ordered Top-N query rather than trying
 * to reconstruct rankings from individual row payloads client-side.
 */
export type LeaderboardTieBreak = "elapsed" | "reachedAt";

/**
 * "elapsed" (default): lockstep games (First Lines, Genre Crown) — lower
 * accumulated response time wins a tie.
 * "reachedAt": Book Match — whoever reached the tied point total earliest
 * wins, since points there only ever increase monotonically.
 */
export function useLeaderboard(roundId: string | undefined, limit = 10, tieBreak: LeaderboardTieBreak = "elapsed") {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!roundId) return;

    const rid = roundId;
    let cancelled = false;
    const supabase = getBrowserSupabaseClient();

    async function fetchNow() {
      let query = supabase
        .from("leaderboard_entries")
        .select(
          "participant_id, display_name, total_points, total_elapsed_ms, progress, is_finished, score_reached_at"
        )
        .eq("round_id", rid)
        .order("total_points", { ascending: false });

      query =
        tieBreak === "elapsed"
          ? query.order("total_elapsed_ms", { ascending: true })
          : query.order("score_reached_at", { ascending: true });

      const { data, error } = await query.limit(limit);

      if (cancelled) return;
      if (!error && data) {
        setRows(
          data.map((r) => ({
            participantId: r.participant_id,
            displayName: r.display_name,
            totalPoints: r.total_points,
            totalElapsedMs: r.total_elapsed_ms,
            progress: r.progress,
            isFinished: r.is_finished,
            scoreReachedAt: r.score_reached_at,
          }))
        );
      }
      setLoading(false);
    }

    function scheduleRefetch() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(fetchNow, REFETCH_DEBOUNCE_MS);
    }

    fetchNow();

    const channel = supabase
      .channel(`leaderboard-${roundId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leaderboard_entries", filter: `round_id=eq.${roundId}` },
        scheduleRefetch
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
    };
  }, [roundId, limit, tieBreak]);

  return { rows: roundId ? rows : [], loading: roundId ? loading : true };
}
