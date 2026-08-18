"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase/browserClient";

export interface QuestionStateRow {
  id: string;
  roundId: string;
  questionIndex: number;
  startedAt: string | null;
  closedAt: string | null;
}

/** Safety-net poll interval — see the note on RECONCILE_MS usage below. */
const RECONCILE_MS = 3000;

/**
 * All question_state rows for a round, kept in sync via Realtime. The
 * "current" question is derived as the highest-index row with a non-null
 * started_at — admin always advances forward, never reopens a prior one.
 *
 * Realtime is the fast path, but it is NOT guaranteed delivery: Supabase
 * bills one message per receiving client and DROPS (does not queue) the
 * overflow once a project exceeds its plan's messages/second quota. With a
 * large room that means some phones would otherwise sit on "waiting for
 * the quiz to start" for the entire question. The interval below reconciles
 * missed events so a dropped message costs a few seconds rather than the
 * whole round. Scoring is unaffected either way — points are computed
 * server-side from started_at, never from when the client noticed.
 */
export function useQuestionState(roundId: string | undefined) {
  const [rows, setRows] = useState<QuestionStateRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roundId) return;

    const rid = roundId;
    let cancelled = false;
    const supabase = getBrowserSupabaseClient();

    async function load() {
      const { data, error } = await supabase
        .from("question_state")
        .select("id, round_id, question_index, started_at, closed_at")
        .eq("round_id", rid)
        .order("question_index", { ascending: true });

      if (cancelled) return;
      if (!error && data) {
        setRows(
          data.map((r) => ({
            id: r.id,
            roundId: r.round_id,
            questionIndex: r.question_index,
            startedAt: r.started_at,
            closedAt: r.closed_at,
          }))
        );
      }
      setLoading(false);
    }

    load();

    const channel = supabase
      .channel(`question-state-${roundId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "question_state", filter: `round_id=eq.${roundId}` },
        () => {
          load();
        }
      )
      .subscribe();

    const reconcile = setInterval(load, RECONCILE_MS);
    // A backgrounded phone throttles timers, so also reconcile the moment
    // it comes back to the foreground rather than waiting out the interval.
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
  }, [roundId]);

  const effectiveRows = roundId ? rows : [];
  const effectiveLoading = roundId ? loading : true;

  const current =
    effectiveRows.filter((r) => r.startedAt !== null).sort((a, b) => b.questionIndex - a.questionIndex)[0] ?? null;

  return { rows: effectiveRows, current, loading: effectiveLoading };
}
