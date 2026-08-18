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

/**
 * All question_state rows for a round, kept in sync via Realtime. The
 * "current" question is derived as the highest-index row with a non-null
 * started_at — admin always advances forward, never reopens a prior one.
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

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [roundId]);

  const effectiveRows = roundId ? rows : [];
  const effectiveLoading = roundId ? loading : true;

  const current =
    effectiveRows.filter((r) => r.startedAt !== null).sort((a, b) => b.questionIndex - a.questionIndex)[0] ?? null;

  return { rows: effectiveRows, current, loading: effectiveLoading };
}
