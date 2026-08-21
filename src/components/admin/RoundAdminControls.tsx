"use client";

import { useCallback, useState } from "react";
import type { RoundData } from "@/lib/realtime/useRound";
import { useAutoAdvance } from "@/lib/admin/useAutoAdvance";
import { useQuestionState } from "@/lib/realtime/useQuestionState";
import { useLeaderboard } from "@/lib/realtime/useLeaderboard";
import Scoreboard from "@/components/shared/Scoreboard";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import LiveQuestionStatus from "@/components/admin/LiveQuestionStatus";

interface RoundAdminControlsProps {
  gameSlug: string;
  round: RoundData | null;
  title: string;
  questionPrompt: (questionIndex: number) => string | undefined;
  winnersCount?: number;
}

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

export default function RoundAdminControls({
  gameSlug,
  round,
  title,
  questionPrompt,
  winnersCount = 2,
}: RoundAdminControlsProps) {
  const { current, rows: questionRows } = useQuestionState(round?.id);
  const { rows: leaderboard } = useLeaderboard(round?.id, 10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextIndex = current ? current.questionIndex + 1 : 0;
  const allQuestionsStarted = round ? current !== null && nextIndex >= round.totalQuestions : false;
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
      run(() => postAdmin(`/api/games/${gameSlug}/start-question`, { roundId: round.id, questionIndex: index }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gameSlug, round?.id]
  );

  function handleStartNext() {
    startQuestion(nextIndex);
  }

  // Rolls this round forward on its own once a question's clock runs out;
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
    const winners = leaderboard.slice(0, winnersCount).map((r, i) => ({
      place: i + 1,
      displayName: r.displayName,
      points: r.totalPoints,
    }));
    run(() => postAdmin(`/api/games/${gameSlug}/confirm-round`, { roundId: round.id, winners }));
  }

  return (
    <Card className="mb-6 p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-navy-900">{title}</h2>
        <span className="rounded-full bg-cream-200 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-ink-600">
          {round?.status ?? "loading…"}
        </span>
      </div>

      {error && <p className="mb-3 text-sm text-danger-600">{error}</p>}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Once every question in this round has been started there is no
            "next question" — showing a permanently-disabled "Start Question
            7" button just looks broken, so it's replaced with the actual
            state and the operator's attention moves to the next control. */}
        {allQuestionsStarted ? (
          <span className="inline-flex min-h-[44px] items-center rounded-xl bg-cream-200 px-4 text-sm font-semibold text-ink-600">
            All {round?.totalQuestions ?? 0} questions done
          </span>
        ) : (
          <Button onClick={handleStartNext} disabled={busy || !round || round.status === "confirmed"}>
            {current ? `Start Question ${nextIndex + 1}` : "Start Question 1"}
          </Button>
        )}
        <Button
          variant="gold"
          onClick={handleConfirmWinners}
          disabled={busy || !round || round.status === "confirmed" || !isFinalQuestionOpen}
        >
          Confirm Top {winnersCount} &amp; Reveal
        </Button>
      </div>

      <LiveQuestionStatus
        key={current?.id ?? "none"}
        questionStateId={current?.id}
        startedAt={current?.startedAt}
        questionNumber={current ? current.questionIndex + 1 : undefined}
        totalQuestions={round?.totalQuestions ?? 0}
        prompt={current ? questionPrompt(current.questionIndex) : undefined}
      />

      <p className="mb-4 mt-3 text-sm text-ink-600">
        {questionRows.filter((r) => r.startedAt).length} / {round?.totalQuestions ?? 0} questions started
      </p>

      <Scoreboard rows={leaderboard} />
    </Card>
  );
}
