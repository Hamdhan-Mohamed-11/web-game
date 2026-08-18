"use client";

import { useRound } from "@/lib/realtime/useRound";
import { useQuestionState } from "@/lib/realtime/useQuestionState";
import { useLeaderboard } from "@/lib/realtime/useLeaderboard";
import { QUESTION_DURATION_MS } from "@/lib/scoring/lockstep";
import { getGameMeta } from "@/lib/games";
import CountdownTimer from "@/components/shared/CountdownTimer";
import Scoreboard from "@/components/shared/Scoreboard";
import WinnerReveal from "@/components/screen/WinnerReveal";

const GAME_SLUG = "first-lines";
const meta = getGameMeta(GAME_SLUG)!;

export default function FirstLinesScreenPage() {
  const { round } = useRound(GAME_SLUG, "main");
  const { current } = useQuestionState(round?.id);
  const { rows } = useLeaderboard(round?.id);

  if (!round || round.status === "pending") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-navy-950 px-8 text-center">
        <span className="text-lg font-semibold uppercase tracking-[0.3em] text-gold-400">Readers&rsquo; Summit 2026</span>
        <h1 className="mt-4 font-display text-5xl font-bold text-white sm:text-6xl">{meta.name}</h1>
        <p className="mt-4 text-2xl text-white/70">{meta.tagline}</p>
        <p className="mt-16 text-3xl font-semibold uppercase tracking-[0.4em] text-gold-500">Ready</p>
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
      <div className="mb-10 flex items-start justify-between">
        <h1 className="font-display text-4xl font-bold text-white">{meta.name}</h1>
        {current && (
          <div className="flex items-center gap-6 text-right">
            <div>
              <div className="text-lg text-white/60">
                Question {current.questionIndex + 1} / {round.totalQuestions}
              </div>
            </div>
            <CountdownTimer startedAt={current.startedAt} durationMs={QUESTION_DURATION_MS} size={96} theme="dark" />
          </div>
        )}
      </div>

      <h2 className="mb-4 text-xl font-semibold uppercase tracking-widest text-gold-400">Live Top 10</h2>
      <div className="mx-auto max-w-2xl">
        <Scoreboard rows={rows} theme="dark" />
      </div>
    </main>
  );
}
