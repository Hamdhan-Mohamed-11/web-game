"use client";

import { useRound } from "@/lib/realtime/useRound";
import { useLeaderboard } from "@/lib/realtime/useLeaderboard";
import { TOTAL_PAIRS } from "@/lib/scoring/bookmatch";
import { getGameMeta } from "@/lib/games";
import Scoreboard from "@/components/shared/Scoreboard";
import WinnerReveal from "@/components/screen/WinnerReveal";

const GAME_SLUG = "book-match";
const meta = getGameMeta(GAME_SLUG)!;

export default function BookMatchScreenPage() {
  const { round } = useRound(GAME_SLUG, "match");
  const { rows } = useLeaderboard(round?.id, 10, "reachedAt");

  if (!round || round.status === "pending") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-navy-950 px-8 text-center">
        <span className="text-lg font-semibold uppercase tracking-[0.3em] text-gold-400">Readers&rsquo; Summit 2026</span>
        <h1 className="mt-4 font-display text-5xl font-bold text-white sm:text-6xl">{meta.name}</h1>
        <p className="mt-4 text-2xl text-white/70">{meta.tagline}</p>
        <p className="mt-16 text-3xl font-semibold uppercase tracking-[0.4em] text-gold-500">Get Ready</p>
      </main>
    );
  }

  if (round.status === "confirmed") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-navy-950 px-8 py-16">
        <WinnerReveal roundId={round.id} title={meta.name} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-navy-950 px-10 py-10">
      <h1 className="mb-10 font-display text-4xl font-bold text-white">{meta.name}</h1>
      <h2 className="mb-4 text-xl font-semibold uppercase tracking-widest text-gold-400">Live Top 10</h2>
      <div className="mx-auto max-w-2xl">
        <Scoreboard rows={rows} showProgress progressTotal={TOTAL_PAIRS} theme="dark" />
      </div>
    </main>
  );
}
