"use client";

import { useEffect, useState } from "react";

/**
 * Re-renders on an interval while `active`, so values derived from the
 * current time (e.g. "has this question's window elapsed?") stay live.
 * Nothing changes server-side when a question simply runs out, so without
 * this the UI would sit on the expired question until the next realtime
 * event happened to arrive.
 */
export function useTick(active: boolean, intervalMs = 500) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((n) => n + 1), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);
}
