"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase/browserClient";

export interface ParticipantIdentity {
  id: string;
  displayName: string;
}

function storageKey(gameSlug: string): string {
  return `quiznight:participant:${gameSlug}`;
}

async function joinGame(gameSlug: string, displayName: string): Promise<ParticipantIdentity> {
  const supabase = getBrowserSupabaseClient();
  const { data, error } = await supabase.rpc("join_game", {
    p_game_slug: gameSlug,
    p_display_name: displayName,
  });
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to join");
  }
  const identity: ParticipantIdentity = { id: data, displayName };
  window.localStorage.setItem(storageKey(gameSlug), JSON.stringify(identity));
  return identity;
}

/**
 * Persists the participant's uuid + name in localStorage per game, so a page
 * reload resumes the same participant row instead of creating a duplicate.
 *
 * The stored id is verified against the database before it's trusted.
 * Resetting a game deletes its participants, but every phone that already
 * joined keeps the old id in storage — and submit_lockstep_answer rejects
 * those with "unknown participant", so the player would answer every
 * question and silently score nothing. When the row is gone we transparently
 * re-join under the same display name so they can keep playing.
 */
export function useParticipant(gameSlug: string) {
  const [participant, setParticipant] = useState<ParticipantIdentity | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      let stored: ParticipantIdentity | null = null;
      try {
        // Read post-mount, not in a lazy useState initializer: localStorage
        // doesn't exist during SSR, so reading it on the first render would
        // desync from the server-rendered HTML and break hydration.
        const raw = window.localStorage.getItem(storageKey(gameSlug));
        if (raw) stored = JSON.parse(raw) as ParticipantIdentity;
      } catch {
        // ignore malformed/unavailable storage
      }

      if (!stored?.id) {
        if (!cancelled) setReady(true);
        return;
      }

      let resolved: ParticipantIdentity | null = null;
      try {
        const supabase = getBrowserSupabaseClient();
        const { data, error } = await supabase
          .from("participants")
          .select("id")
          .eq("id", stored.id)
          .maybeSingle();

        if (error) {
          // Can't reach the DB to check — trust what we have rather than
          // forcing a rejoin on a flaky connection.
          resolved = stored;
        } else if (data) {
          resolved = stored;
        } else if (stored.displayName) {
          resolved = await joinGame(gameSlug, stored.displayName);
        }
      } catch {
        window.localStorage.removeItem(storageKey(gameSlug));
      }

      if (cancelled) return;
      setParticipant(resolved);
      setReady(true);
    }

    restore();
    return () => {
      cancelled = true;
    };
  }, [gameSlug]);

  const join = useCallback(
    async (displayName: string) => {
      const identity = await joinGame(gameSlug, displayName);
      setParticipant(identity);
      return identity;
    },
    [gameSlug]
  );

  return { participant, ready, join };
}
