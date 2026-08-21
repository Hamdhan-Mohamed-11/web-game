"use client";

import { useEffect, useMemo, useState } from "react";
import { useParticipant } from "@/lib/participant/useParticipant";
import { useRound, type RoundData } from "@/lib/realtime/useRound";
import { useQuestionState } from "@/lib/realtime/useQuestionState";
import { useGameLocks, isGameUnlocked } from "@/lib/realtime/useGameLocks";
import { useTick } from "@/lib/realtime/useTick";
import { serverNow } from "@/lib/realtime/serverClock";
import { QUESTION_DURATION_MS } from "@/lib/scoring/lockstep";
import { getBrowserSupabaseClient } from "@/lib/supabase/browserClient";
import { GENRE_CROWN_FICTION_QUESTIONS, GENRE_CROWN_NONFICTION_QUESTIONS } from "@/lib/data/genreCrown.questions";
import { getGameMeta } from "@/lib/games";
import JoinForm from "@/components/participant/JoinForm";
import QuestionCard from "@/components/participant/QuestionCard";
import FinalResult from "@/components/participant/FinalResult";
import GameLockedNotice from "@/components/participant/GameLockedNotice";
import BrandMark from "@/components/shared/BrandMark";

const GAME_SLUG = "genre-crown";
const meta = getGameMeta(GAME_SLUG)!;

export default function GenreCrownPlayPage() {
  const { participant, ready, join } = useParticipant(GAME_SLUG);
  const { round: fictionRound } = useRound(GAME_SLUG, "fiction");
  const { round: nonfictionRound } = useRound(GAME_SLUG, "nonfiction");

  // Non-fiction wins the tie. start_question now closes the sibling round
  // server-side, but checking non-fiction first also protects the moment
  // between the two writes landing on this client.
  const activeRound: RoundData | null =
    nonfictionRound?.status === "active" ? nonfictionRound : fictionRound?.status === "active" ? fictionRound : null;

  const { current } = useQuestionState(activeRound?.id);
  const { locks, loaded: locksLoaded } = useGameLocks();
  const [fictionScore, setFictionScore] = useState<number | null>(null);
  const [myScore, setMyScore] = useState<number | null>(null);

  const gameOver = nonfictionRound?.status === "confirmed";

  // Keeps the elapsed-time check below live while a question is running.
  useTick(current?.startedAt != null);

  // "Fiction is finished" the instant its last question's 15s elapses —
  // don't make players stare at a dead question until the admin happens to
  // start the next round. Derived from the server timestamp, not a local
  // timer, so it can't drift.
  const fictionFinished =
    fictionRound !== null &&
    (fictionRound.status === "closed" ||
      fictionRound.status === "confirmed" ||
      (activeRound?.roundKey === "fiction" &&
        current !== null &&
        current.questionIndex === fictionRound.totalQuestions - 1 &&
        current.startedAt !== null &&
        serverNow() - new Date(current.startedAt).getTime() > QUESTION_DURATION_MS));

  const showFictionIntermission = fictionFinished && nonfictionRound?.status !== "active" && !gameOver;

  // Fiction's total, for the intermission card between the two rounds.
  // 'closed' as well as 'confirmed': a round is closed the moment the next
  // one starts, and the intermission wants the score right then — waiting
  // for the admin to confirm winners would leave it blank.
  useEffect(() => {
    if (!participant || !fictionRound) return;
    if (fictionRound.status !== "closed" && fictionRound.status !== "confirmed") return;

    const supabase = getBrowserSupabaseClient();
    supabase
      .from("leaderboard_entries")
      .select("total_points")
      .eq("round_id", fictionRound.id)
      .eq("participant_id", participant.id)
      .maybeSingle()
      .then(({ data }) => setFictionScore(data?.total_points ?? 0));
  }, [participant, fictionRound]);

  // Running score for the round currently being played. Reset on every
  // round switch (fiction -> nonfiction) so a leftover fiction total can't
  // flash before the real nonfiction total loads; each new answer then
  // updates it locally via QuestionCard's onScoreUpdate.
  useEffect(() => {
    if (!activeRound?.id || !participant) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMyScore(null);
    const supabase = getBrowserSupabaseClient();
    supabase
      .from("leaderboard_entries")
      .select("total_points")
      .eq("round_id", activeRound.id)
      .eq("participant_id", participant.id)
      .maybeSingle()
      .then(({ data }) => setMyScore(data?.total_points ?? 0));
  }, [activeRound?.id, participant]);

  // Both rounds are ranked separately on the results screen — they crown two
  // separate rulers, so one combined placing would be meaningless. Keyed on
  // the ids because useRound rebuilds the round objects on every tick.
  const resultRounds = useMemo(
    () =>
      [
        fictionRound ? { label: "Fiction", roundId: fictionRound.id } : null,
        nonfictionRound ? { label: "Non-Fiction", roundId: nonfictionRound.id } : null,
      ].filter((r): r is { label: string; roundId: string } => r !== null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fictionRound?.id, nonfictionRound?.id]
  );

  if (!ready) return null;

  if (!participant) {
    if (!locksLoaded) return null;
    if (!isGameUnlocked(locks, GAME_SLUG)) {
      return <GameLockedNotice gameName={meta.name} />;
    }
    return <JoinForm gameName={meta.name} onJoin={join} />;
  }

  if (gameOver) {
    return (
      <FinalResult
        displayName={participant.displayName}
        participantId={participant.id}
        rounds={resultRounds}
      />
    );
  }

  if (showFictionIntermission) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-cream-50 px-6 text-center">
        <BrandMark />
        <span className="mt-6 rounded-full bg-navy-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">
          Fiction complete
        </span>
        <h1 className="mt-5 font-display text-3xl font-bold text-navy-900">
          Next up: <span className="text-gold-700">Non-Fiction</span>
        </h1>
        {fictionScore !== null && (
          <p className="mt-3 text-lg text-navy-900">
            Your Fiction score: <span className="font-display font-bold text-gold-700">{fictionScore}</span> pts
          </p>
        )}
        <p className="mt-4 text-sm text-ink-600">Hang tight — the next round starts shortly.</p>
      </main>
    );
  }

  if (!activeRound || !current) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-cream-50 px-6 text-center">
        <BrandMark />
        <h1 className="mt-6 font-display text-2xl font-semibold text-navy-900">You&apos;re in, {participant.displayName}!</h1>
        <p className="mt-3 text-sm text-ink-600">Waiting for the quiz to start…</p>
      </main>
    );
  }

  const questions = activeRound.roundKey === "fiction" ? GENRE_CROWN_FICTION_QUESTIONS : GENRE_CROWN_NONFICTION_QUESTIONS;
  const question = questions[current.questionIndex];
  const label = activeRound.roundKey === "fiction" ? "Fiction Round" : "Non-Fiction Round";

  return (
    <div>
      <p className="bg-navy-900 py-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">
        {label}
      </p>
      <QuestionCard
        key={current.id}
        questionStateId={current.id}
        participantId={participant.id}
        questionNumber={current.questionIndex + 1}
        totalQuestions={activeRound.totalQuestions}
        prompt={question.question}
        choices={question.choices}
        startedAt={current.startedAt}
        myScore={myScore}
        onScoreUpdate={setMyScore}
      />
    </div>
  );
}
