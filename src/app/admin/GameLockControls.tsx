"use client";

import { useState } from "react";
import { GAMES, type GameSlug } from "@/lib/games";
import { useGameLocks, isGameUnlocked } from "@/lib/realtime/useGameLocks";
import Card from "@/components/shared/Card";
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

export default function GameLockControls() {
  const { locks, loaded } = useGameLocks();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSet(slug: GameSlug | null) {
    setBusy(slug ?? "lock-all");
    setError(null);
    try {
      await setActiveGame(slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  const activeSlug = locks.find((l) => l.isUnlocked)?.slug ?? null;

  return (
    <Card className="mb-6 p-5">
      <h2 className="mb-1 font-display text-lg font-semibold text-navy-900">Which game is open?</h2>
      <p className="mb-4 text-sm text-ink-600">
        Players scan one QR code to a hub — only the game you unlock here is tappable for them. Unlocking a game
        automatically locks the others.
      </p>

      {error && <p className="mb-3 text-sm text-danger-600">{error}</p>}

      <div className="flex flex-wrap gap-3">
        {GAMES.map((game) => {
          const unlocked = loaded && isGameUnlocked(locks, game.slug);
          return (
            <Button
              key={game.slug}
              variant={unlocked ? "gold" : "outline"}
              onClick={() => handleSet(game.slug)}
              disabled={busy !== null || unlocked}
            >
              {unlocked ? `${game.name} — open` : `Unlock ${game.name}`}
            </Button>
          );
        })}
        <Button variant="danger" onClick={() => handleSet(null)} disabled={busy !== null || !activeSlug}>
          Lock all
        </Button>
      </div>
    </Card>
  );
}
