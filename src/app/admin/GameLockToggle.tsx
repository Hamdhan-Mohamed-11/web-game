"use client";

import { useState } from "react";
import type { GameSlug } from "@/lib/games";
import { useGameLocks, isGameUnlocked } from "@/lib/realtime/useGameLocks";
import Button from "@/components/shared/Button";

async function setActiveGame(gameSlug: GameSlug | null) {
  const res = await fetch("/api/admin/set-active-game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameSlug }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(data.error ?? "Request failed");
  }
}

/**
 * Per-game lock toggle, rendered inline beside that game's other actions
 * so "open this game" sits next to "run this game" rather than in a
 * separate panel the operator has to look away to.
 */
export default function GameLockToggle({ slug }: { slug: GameSlug }) {
  const { locks, loaded } = useGameLocks();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unlocked = loaded && isGameUnlocked(locks, slug);

  async function handleToggle() {
    setBusy(true);
    setError(null);
    try {
      await setActiveGame(unlocked ? null : slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant={unlocked ? "success" : "outline"}
        onClick={handleToggle}
        disabled={busy || !loaded}
        className="min-w-[7.5rem]"
      >
        {unlocked ? "Unlocked" : "Locked"}
      </Button>
      {error && <span className="text-xs text-danger-600">{error}</span>}
    </div>
  );
}
