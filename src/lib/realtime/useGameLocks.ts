"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase/browserClient";
import type { GameSlug } from "@/lib/games";

export interface GameLockState {
  slug: GameSlug;
  isUnlocked: boolean;
}

const RECONCILE_MS = 3000;

/**
 * Live lock state for every game, for the single-QR hub and the per-game
 * play pages' entry gate. Same belt-and-suspenders pattern as
 * useRound/useQuestionState: Realtime is the fast path, but Supabase drops
 * (doesn't queue) messages past a project's quota, and a dropped unlock
 * event here means someone stares at "not open yet" for the rest of the
 * event with no way to notice — so a short poll reconciles regardless.
 */
export function useGameLocks() {
  const [locks, setLocks] = useState<GameLockState[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = getBrowserSupabaseClient();

    async function load() {
      const { data, error } = await supabase.from("games").select("slug, is_unlocked");
      if (cancelled || error || !data) return;
      setLocks(data.map((g) => ({ slug: g.slug as GameSlug, isUnlocked: g.is_unlocked })));
      setLoaded(true);
    }

    load();

    const channel = supabase
      .channel("game-locks")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "games" }, () => load())
      .subscribe();

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
  }, []);

  return { locks, loaded };
}

export function isGameUnlocked(locks: GameLockState[], slug: GameSlug): boolean {
  return locks.find((l) => l.slug === slug)?.isUnlocked ?? false;
}
