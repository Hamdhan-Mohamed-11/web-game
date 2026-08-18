"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase/browserClient";

const POLL_MS = 1000;

/**
 * Live "how many people have answered this question" counts for the admin
 * panel, so the MC can tell whether the room is done before advancing.
 *
 * Deliberately polled rather than driven by a Realtime subscription on
 * `answers`: that table is never exposed to the anon role (a row with
 * is_correct = true leaks the answer key), and the admin is a single
 * client, so a 1s poll is far cheaper than the per-answer Realtime fan-out
 * would be during a 150-player burst.
 */
export function useQuestionStats(questionStateId: string | undefined) {
  const [answered, setAnswered] = useState(0);
  const [participants, setParticipants] = useState(0);

  useEffect(() => {
    if (!questionStateId) {
      return;
    }

    let cancelled = false;
    const supabase = getBrowserSupabaseClient();

    async function load() {
      const { data, error } = await supabase.rpc("question_answer_stats", {
        p_question_state_id: questionStateId as string,
      });
      if (cancelled || error) return;
      const row = data?.[0];
      if (row) {
        setAnswered(row.answered_count);
        setParticipants(row.participant_count);
      }
    }

    load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [questionStateId]);

  return questionStateId ? { answered, participants } : { answered: 0, participants: 0 };
}
