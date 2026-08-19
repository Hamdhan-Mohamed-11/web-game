"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase/browserClient";
import type { GameSlug } from "@/lib/games";

export interface GameLockState {
  slug: GameSlug;
  isUnlocked: boolean;
}

const RECONCILE_MS = 3000;

/*
 * Single shared subscription behind the hook.
 *
 * Supabase keys channels by name, so several components each calling
 * `.channel("game-locks")` throws "cannot add postgres_changes callbacks
 * after subscribe()" — which is exactly what happened once the admin page
 * rendered one lock toggle per game. Giving each instance a unique channel
 * name would also work, but would open N redundant channels for identical
 * data and spend realtime message quota N times over on every unlock.
 * Instead the subscription is created once for the first listener and torn
 * down after the last one leaves.
 */
type Listener = (locks: GameLockState[], loaded: boolean) => void;

const listeners = new Set<Listener>();
let currentLocks: GameLockState[] = [];
let currentLoaded = false;
let teardown: (() => void) | null = null;

function emit() {
  listeners.forEach((l) => l(currentLocks, currentLoaded));
}

function startSubscription() {
  const supabase = getBrowserSupabaseClient();
  let cancelled = false;

  async function load() {
    const { data, error } = await supabase.from("games").select("slug, is_unlocked");
    if (cancelled || error || !data) return;
    currentLocks = data.map((g) => ({ slug: g.slug as GameSlug, isUnlocked: g.is_unlocked }));
    currentLoaded = true;
    emit();
  }

  load();

  const channel = supabase
    .channel("game-locks")
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "games" }, () => load())
    .subscribe();

  // Realtime drops (rather than queues) messages past a project's quota, so
  // a missed unlock would strand players on "not open yet" all night.
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
}

export function useGameLocks() {
  const [locks, setLocks] = useState<GameLockState[]>(currentLocks);
  const [loaded, setLoaded] = useState(currentLoaded);

  useEffect(() => {
    const listener: Listener = (nextLocks, nextLoaded) => {
      setLocks(nextLocks);
      setLoaded(nextLoaded);
    };
    listeners.add(listener);
    if (!teardown) teardown = startSubscription();

    return () => {
      listeners.delete(listener);
      if (listeners.size === 0 && teardown) {
        teardown();
        teardown = null;
        currentLoaded = false;
      }
    };
  }, []);

  return { locks, loaded };
}

export function isGameUnlocked(locks: GameLockState[], slug: GameSlug): boolean {
  return locks.find((l) => l.slug === slug)?.isUnlocked ?? false;
}
