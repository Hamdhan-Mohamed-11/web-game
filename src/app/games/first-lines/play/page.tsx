"use client";

import { useEffect, useMemo, useState } from "react";
import { useParticipant } from "@/lib/participant/useParticipant";
import { useRound } from "@/lib/realtime/useRound";
import { useQuestionState } from "@/lib/realtime/useQuestionState";
import { useGameLocks, isGameUnlocked } from "@/lib/realtime/useGameLocks";
import { getBrowserSupabaseClient } from "@/lib/supabase/browserClient";
import { FIRST_LINES_QUESTIONS } from "@/lib/data/firstLines.questions";
import { getGameMeta } from "@/lib/games";
import JoinForm from "@/components/participant/JoinForm";
import QuestionCard from "@/components/participant/QuestionCard";
import FinalResult from "@/components/participant/FinalResult";
import GameLockedNotice from "@/components/participant/GameLockedNotice";
import BrandMark from "@/components/shared/BrandMark";

const GAME_SLUG = "first-lines";
const meta = getGameMeta(GAME_SLUG)!;

export default function FirstLinesPlayPage() {
  const { participant, ready, join } = useParticipant(GAME_SLUG);
  const { round } = useRound(GAME_SLUG, "main");
  const { current } = useQuestionState(round?.id);
  const { locks, loaded: locksLoaded } = useGameLocks();
  const [myScore, setMyScore] = useState<number | null>(null);

  // Picks up any score already on the board (e.g. after a page reload
  // mid-round) so the running total doesn't reset to blank; each new answer
  // then updates it locally via QuestionCard's onScoreUpdate.
  useEffect(() => {
    if (!round?.id || !participant) return;
    const supabase = getBrowserSupabaseClient();
    supabase
      .from("leaderboard_entries")
      .select("total_points")
      .eq("round_id", round.id)
      .eq("participant_id", participant.id)
      .maybeSingle()
      .then(({ data }) => setMyScore(data?.total_points ?? 0));
  }, [round?.id, participant]);

  // Memoised so FinalResult's effect isn't re-run by a fresh array identity
  // on every realtime tick — hence keying on the id rather than the object,
  // which useRound rebuilds each time.
  const resultRounds = useMemo(
    () => (round ? [{ roundId: round.id }] : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [round?.id]
  );

  if (!ready) return null;

  if (!participant) {
    if (!locksLoaded) return null;
    if (!isGameUnlocked(locks, GAME_SLUG)) {
      return <GameLockedNotice gameName={meta.name} />;
    }
    return <JoinForm gameName={meta.name} onJoin={join} />;
  }

  if (round?.status === "confirmed") {
    return (
      <FinalResult
        displayName={participant.displayName}
        participantId={participant.id}
        rounds={resultRounds}
      />
    );
  }

  if (!round || !current) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-cream-50 px-6 text-center">
        <BrandMark />
        <h1 className="mt-6 font-display text-2xl font-semibold text-navy-900">You&apos;re in, {participant.displayName}!</h1>
        <p className="mt-3 text-sm text-ink-600">Waiting for the quiz to start…</p>
      </main>
    );
  }

  const question = FIRST_LINES_QUESTIONS[current.questionIndex];

  return (
    <QuestionCard
      key={current.id}
      questionStateId={current.id}
      participantId={participant.id}
      questionNumber={current.questionIndex + 1}
      totalQuestions={round.totalQuestions}
      prompt={question.line}
      choices={question.choices}
      startedAt={current.startedAt}
      myScore={myScore}
      onScoreUpdate={setMyScore}
    />
  );
}
