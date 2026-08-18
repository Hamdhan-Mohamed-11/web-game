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

/**
 * Persists the participant's uuid + name in localStorage per game, so a page
 * reload resumes the same participant row instead of creating a duplicate.
 * Read only happens client-side (useEffect) to avoid SSR/hydration mismatch.
 */
export function useParticipant(gameSlug: string) {
  const [participant, setParticipant] = useState<ParticipantIdentity | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey(gameSlug));
      if (raw) {
        // Must run post-mount, not in a lazy useState initializer:
        // localStorage is unavailable during SSR, so reading it during the
        // initial render would desync from the server-rendered HTML and
        // break hydration.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setParticipant(JSON.parse(raw) as ParticipantIdentity);
      }
    } catch {
      // ignore malformed/unavailable storage
    }
    setReady(true);
  }, [gameSlug]);

  const join = useCallback(
    async (displayName: string) => {
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
      setParticipant(identity);
      return identity;
    },
    [gameSlug]
  );

  return { participant, ready, join };
}
