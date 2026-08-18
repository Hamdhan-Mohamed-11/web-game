"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase/browserClient";

export interface BookMatchSessionState {
  id: string;
  startedAt: string | null;
  endsAt: string | null;
  isFinished: boolean;
}

/**
 * Resolves (and lets the caller create) this participant's Book Match
 * session. On mount it first looks for an existing session — a page reload
 * mid-round resumes the same 75s window instead of restarting it. If none
 * exists yet, the caller invokes checkIn() once their local 3-2-1 ceremony
 * finishes, which stamps the server-authoritative started_at/ends_at.
 */
export function useBookMatchSession(roundId: string | undefined, participantId: string | undefined) {
  const [session, setSession] = useState<BookMatchSessionState | null>(null);
  const [matchedItemKeys, setMatchedItemKeys] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!roundId || !participantId) return;
    let cancelled = false;
    const supabase = getBrowserSupabaseClient();

    async function load() {
      // A thrown (not just error-envelope) failure here — e.g. a dropped
      // mobile connection — must still resolve `loaded`, or the page is
      // stuck blank forever with no way for the participant to retry.
      // Treating it as "no cached session" is safe: checkIn()'s upsert is
      // idempotent, so if a session already existed server-side it's simply
      // returned again rather than duplicated.
      try {
        const { data } = await supabase
          .from("book_match_sessions")
          .select("id, started_at, ends_at, is_finished")
          .eq("round_id", roundId as string)
          .eq("participant_id", participantId as string)
          .maybeSingle();

        if (cancelled) return;

        if (data) {
          setSession({ id: data.id, startedAt: data.started_at, endsAt: data.ends_at, isFinished: data.is_finished });

          const { data: progress } = await supabase
            .from("book_match_progress")
            .select("item_key")
            .eq("book_match_session_id", data.id);

          if (!cancelled && progress) {
            setMatchedItemKeys(new Set(progress.map((p) => p.item_key)));
          }
        }
      } catch {
        // Fall through to setLoaded(true) below regardless.
      }
      if (!cancelled) setLoaded(true);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [roundId, participantId]);

  const checkIn = useCallback(async () => {
    if (!roundId || !participantId) throw new Error("Not ready to check in yet");
    const supabase = getBrowserSupabaseClient();
    const { data, error } = await supabase.rpc("bookmatch_check_in", {
      p_round_id: roundId,
      p_participant_id: participantId,
    });
    const row = data?.[0];
    if (error || !row) {
      throw new Error(error?.message ?? "Check-in failed");
    }
    setSession({ id: row.id, startedAt: row.started_at, endsAt: row.ends_at, isFinished: false });
  }, [roundId, participantId]);

  const markMatched = useCallback((itemKey: string) => {
    setMatchedItemKeys((prev) => new Set(prev).add(itemKey));
  }, []);

  return { session, matchedItemKeys, loaded, checkIn, markMatched };
}
