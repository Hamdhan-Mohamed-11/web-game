"use client";

import { useEffect, useState } from "react";
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
  const [scores, setScores] = useState<{ fiction: number | null; nonfiction: number | null }>({
    fiction: null,
    nonfiction: null,
  });

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

  useEffect(() => {
    if (!participant) return;
    const supabase = getBrowserSupabaseClient();

    async function fetchScore(round: RoundData | null, key: "fiction" | "nonfiction") {
      if (!round || !participant) return;
      const { data } = await supabase
        .from("leaderboard_entries")
        .select("total_points")
        .eq("round_id", round.id)
        .eq("participant_id", participant.id)
        .maybeSingle();
      setScores((prev) => ({ ...prev, [key]: data?.total_points ?? 0 }));
    }

    // 'closed' as well as 'confirmed': a round is closed the moment the
    // next one starts, and the intermission wants to show the score right
    // then — waiting for the admin to confirm winners would leave it blank.
    const isDone = (s?: string) => s === "closed" || s === "confirmed";
    if (isDone(fictionRound?.status)) fetchScore(fictionRound, "fiction");
    if (isDone(nonfictionRound?.status)) fetchScore(nonfictionRound, "nonfiction");
  }, [participant, fictionRound, nonfictionRound]);

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
      <main className="flex min-h-screen flex-col items-center justify-center bg-cream-50 px-6 text-center">
        <BrandMark />
        <h1 className="mt-6 font-display text-3xl font-bold text-navy-900">Game over!</h1>
        <p className="mt-3 text-lg text-navy-900">
          Fiction: <span className="font-display font-bold text-gold-700">{scores.fiction ?? "…"}</span> pts
        </p>
        <p className="text-lg text-navy-900">
          Non-Fiction: <span className="font-display font-bold text-gold-700">{scores.nonfiction ?? "…"}</span> pts
        </p>
        <p className="mt-4 text-sm text-ink-600">Look at the LED screen for the winners.</p>
      </main>
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
        {scores.fiction !== null && (
          <p className="mt-3 text-lg text-navy-900">
            Your Fiction score: <span className="font-display font-bold text-gold-700">{scores.fiction}</span> pts
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
      />
    </div>
  );
}
