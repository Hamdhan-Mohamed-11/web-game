"use client";

import { useState } from "react";
import Link from "next/link";
import { useRound } from "@/lib/realtime/useRound";
import { useLeaderboard } from "@/lib/realtime/useLeaderboard";
import { useLeadIn } from "@/lib/realtime/useLeadIn";
import { TOTAL_PAIRS } from "@/lib/scoring/bookmatch";
import { getGameMeta } from "@/lib/games";
import Scoreboard from "@/components/shared/Scoreboard";
import LeadIn from "@/components/shared/LeadIn";
import Button, { buttonClassName } from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import BrandMark from "@/components/shared/BrandMark";

const GAME_SLUG = "book-match";
const meta = getGameMeta(GAME_SLUG)!;

async function postAdmin(path: string, body: unknown) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(data.error ?? "Request failed");
  }
}

export default function BookMatchAdminPage() {
  const { round } = useRound(GAME_SLUG, "match");
  const { rows: leaderboard } = useLeaderboard(round?.id, 10, "reachedAt");
  const leadIn = useLeadIn(round?.status === "active" ? round.startedAt : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function handleStart() {
    if (!round) return;
    run(() => postAdmin(`/api/games/${GAME_SLUG}/start-round`, { roundId: round.id }));
  }

  function handleConfirmWinners() {
    if (!round) return;
    const winners = leaderboard.slice(0, 2).map((r, i) => ({
      place: i + 1,
      displayName: r.displayName,
      points: r.totalPoints,
    }));
    run(() => postAdmin(`/api/games/${GAME_SLUG}/confirm-round`, { roundId: round.id, winners }));
  }

  function handleReset() {
    if (!confirm("Reset all Book Match data? This clears participants and scores.")) return;
    run(() => postAdmin(`/api/games/${GAME_SLUG}/reset`, {}));
  }

  return (
    <main className="min-h-screen bg-cream-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex justify-center">
          <BrandMark />
        </div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-navy-900">{meta.name}</h1>
            <p className="text-sm text-ink-600">Round status: {round?.status ?? "loading…"}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className={buttonClassName("outline", "px-3 py-2 text-xs whitespace-nowrap")}>
              ← Back to admin hub
            </Link>
            <Button variant="danger" onClick={handleReset} disabled={busy}>
              Reset
            </Button>
          </div>
        </div>

        {error && <p className="mb-4 text-sm text-danger-600">{error}</p>}

        <Card className="mb-6 p-5 sm:p-6">
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleStart} disabled={busy || !round || round.status !== "pending"}>
              Start Challenge
            </Button>
            <Button variant="gold" onClick={handleConfirmWinners} disabled={busy || !round || round.status !== "active"}>
              Confirm Top 2 &amp; Reveal
            </Button>
          </div>

          {/* The MC sees the same 3-2-1 the room does, so they know the start
              actually landed rather than wondering whether to click again. */}
          {leadIn.pending && (
            <div className="mt-4 rounded-xl border border-navy-100 bg-white px-4 py-6">
              <LeadIn count={leadIn.count} size="inline" tone="light" label="Boards open in" />
            </div>
          )}
        </Card>

        <h2 className="mb-3 font-display text-lg font-semibold text-navy-900">Live Top 10</h2>
        <Scoreboard rows={leaderboard} showProgress progressTotal={TOTAL_PAIRS} />
      </div>
    </main>
  );
}
