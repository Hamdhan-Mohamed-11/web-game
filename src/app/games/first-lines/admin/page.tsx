"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useAutoAdvance } from "@/lib/admin/useAutoAdvance";
import { useRound } from "@/lib/realtime/useRound";
import { useQuestionState } from "@/lib/realtime/useQuestionState";
import { useLeaderboard } from "@/lib/realtime/useLeaderboard";
import { FIRST_LINES_QUESTIONS } from "@/lib/data/firstLines.questions";
import { getGameMeta } from "@/lib/games";
import Scoreboard from "@/components/shared/Scoreboard";
import Button, { buttonClassName } from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import BrandMark from "@/components/shared/BrandMark";
import LiveQuestionStatus from "@/components/admin/LiveQuestionStatus";

const GAME_SLUG = "first-lines";
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

export default function FirstLinesAdminPage() {
  const { round } = useRound(GAME_SLUG, "main");
  const { current, rows: questionRows } = useQuestionState(round?.id);
  const { rows: leaderboard } = useLeaderboard(round?.id, 10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextIndex = current ? current.questionIndex + 1 : 0;
  const isLastQuestion = round ? nextIndex >= round.totalQuestions : false;
  const isFinalQuestionOpen = current !== null && current.questionIndex === (round?.totalQuestions ?? 0) - 1;

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

  // Keyed on the id so auto-advance isn't handed a new callback (and its
  // timeout rescheduled) on every realtime tick.
  const startQuestion = useCallback(
    (index: number) => {
      if (!round) return;
      run(() => postAdmin(`/api/games/${GAME_SLUG}/start-question`, { roundId: round.id, questionIndex: index }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [round?.id]
  );

  function handleStartNext() {
    startQuestion(nextIndex);
  }

  // Rolls the round forward on its own once a question's clock runs out;
  // the button above still works if the operator wants to hold or skip.
  useAutoAdvance({
    enabled: round?.status === "active",
    questionStateId: current?.id,
    questionIndex: current?.questionIndex,
    startedAt: current?.startedAt,
    totalQuestions: round?.totalQuestions ?? 0,
    onAdvance: startQuestion,
  });

  function handleConfirmWinners() {
    if (!round) return;
    const winners = leaderboard.slice(0, 6).map((r, i) => ({
      place: i + 1,
      displayName: r.displayName,
      points: r.totalPoints,
    }));
    run(() => postAdmin(`/api/games/${GAME_SLUG}/confirm-round`, { roundId: round.id, winners }));
  }

  function handleReset() {
    if (!confirm("Reset all First Lines data? This clears participants and scores.")) return;
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
          <div className="mb-4 flex flex-wrap gap-3">
            <Button
              onClick={handleStartNext}
              disabled={busy || !round || round.status === "confirmed" || (isLastQuestion && current !== null)}
            >
              {current ? `Start Question ${nextIndex + 1}` : "Start Question 1"}
            </Button>
            <Button
              variant="gold"
              onClick={handleConfirmWinners}
              disabled={busy || !round || round.status === "confirmed" || !isFinalQuestionOpen}
            >
              Confirm Top 6 &amp; Reveal
            </Button>
          </div>

          <LiveQuestionStatus
            key={current?.id ?? "none"}
            questionStateId={current?.id}
            startedAt={current?.startedAt}
            questionNumber={current ? current.questionIndex + 1 : undefined}
            totalQuestions={round?.totalQuestions ?? 0}
            prompt={current ? FIRST_LINES_QUESTIONS[current.questionIndex]?.line : undefined}
          />

          <p className="mt-3 text-sm text-ink-600">
            {questionRows.filter((r) => r.startedAt).length} / {round?.totalQuestions ?? 0} questions started
          </p>
        </Card>

        <h2 className="mb-3 font-display text-lg font-semibold text-navy-900">Live Top 10</h2>
        <Scoreboard rows={leaderboard} />
      </div>
    </main>
  );
}
