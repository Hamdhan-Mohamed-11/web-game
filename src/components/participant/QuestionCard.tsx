"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase/browserClient";
import { QUESTION_DURATION_MS } from "@/lib/scoring/lockstep";
import { useLeadIn } from "@/lib/realtime/useLeadIn";
import { playCorrect, playWrong, playLockIn, playTimeUp } from "@/lib/audio/sfx";
import CountdownTimer from "@/components/shared/CountdownTimer";
import LeadIn from "@/components/shared/LeadIn";
import BrandMark from "@/components/shared/BrandMark";

interface QuestionCardProps {
  questionStateId: string;
  participantId: string;
  questionNumber: number;
  totalQuestions: number;
  prompt: string;
  choices: readonly string[];
  startedAt: string | null;
  myScore: number | null;
  onScoreUpdate: (totalPoints: number) => void;
}

// Render with `key={questionStateId}` at the call site — that forces a full
// remount (and therefore a clean reset of the state below) on every new
// question, instead of an effect watching questionStateId to reset it.
export default function QuestionCard({
  questionStateId,
  participantId,
  questionNumber,
  totalQuestions,
  prompt,
  choices,
  startedAt,
  myScore,
  onScoreUpdate,
}: QuestionCardProps) {
  const [lockedChoice, setLockedChoice] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expired, setExpired] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const leadIn = useLeadIn(startedAt);

  async function handleAnswer(choiceIndex: number) {
    if (confirmed || submitting || expired) return;
    setSubmitting(true);
    setSubmitError(null);
    setLockedChoice(choiceIndex);
    playLockIn();

    const supabase = getBrowserSupabaseClient();
    const { data, error } = await supabase.rpc("submit_lockstep_answer", {
      p_question_state_id: questionStateId,
      p_participant_id: participantId,
      p_selected_choice_index: choiceIndex,
    });

    setSubmitting(false);

    if (!error) {
      const result = data?.[0];
      if (result) {
        onScoreUpdate(result.total_points);
        setCorrectIndex(result.correct_choice_index);
        setWasCorrect(result.is_correct);
        setPointsEarned(result.points);
        if (result.is_correct) {
          playCorrect();
          if ("vibrate" in navigator) navigator.vibrate([30, 40, 30]);
        } else {
          playWrong();
          if ("vibrate" in navigator) navigator.vibrate(180);
        }
      }
      setConfirmed(true);
      return;
    }

    // "already answered" means the server has a score for this player on
    // this question — the outcome we wanted, so treat it as success.
    if (error.message.includes("already answered")) {
      setConfirmed(true);
      return;
    }

    // Anything else genuinely failed to score. Never swallow it: a silent
    // failure here showed "Answer locked in" while the player banked
    // nothing, which is exactly how a whole round can be lost without
    // anyone noticing. Unlock so they can try again.
    setLockedChoice(null);
    setSubmitError(
      error.message.includes("question is closed")
        ? "Too slow — that question closed."
        : "That didn't save. Tap your answer again."
    );
  }

  const handleExpire = useCallback(() => {
    setExpired(true);
  }, []);

  // Players who ran out of time never saw which answer was right — they'd be
  // the only ones in the room left guessing. The window has fully elapsed by
  // now, so the server will release the key (see get_question_result).
  useEffect(() => {
    if (!expired || correctIndex !== null) return;
    if (confirmed) return;

    playTimeUp();

    let cancelled = false;
    const supabase = getBrowserSupabaseClient();
    supabase
      .rpc("get_question_result", { p_question_state_id: questionStateId })
      .then(({ data }) => {
        if (cancelled) return;
        const row = data?.[0];
        if (row) setCorrectIndex(row.correct_choice_index);
      });

    return () => {
      cancelled = true;
    };
  }, [expired, confirmed, correctIndex, questionStateId]);

  const isLocked = confirmed || expired;
  const revealed = correctIndex !== null;

  // The prompt stays hidden for the whole ceremony. Revealing it early would
  // hand a head start to whoever's phone happened to render first, which is
  // precisely what the synchronised 3-2-1 exists to prevent. Only the first
  // question of a round gets the ceremony at all (see start_question in
  // 0011_leadin_first_question_only.sql) — gating on questionNumber here too
  // means a skewed clock can't make a later question's near-instant
  // started_at read as still-pending and flash a stray countdown frame.
  if (questionNumber === 1 && leadIn.pending) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-navy-950 px-6">
        <span className="mb-10 rounded-full border border-white/15 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-white/60">
          Question {questionNumber} / {totalQuestions}
        </span>
        <LeadIn count={leadIn.count} size="phone" alert />
      </main>
    );
  }

  return (
    <main
      className="no-copy flex min-h-screen flex-col bg-cream-50 px-5 pb-10 pt-6"
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="mb-4 flex justify-center">
          <BrandMark size="compact" />
        </div>
        {myScore !== null && (
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-ink-600">
            Your score: <span className="font-display font-bold text-gold-700">{myScore}</span> pts
          </p>
        )}
        <div className="mb-6 flex items-center justify-between">
          <span className="rounded-full bg-navy-900 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
            Question {questionNumber} / {totalQuestions}
          </span>
          <CountdownTimer startedAt={startedAt} durationMs={QUESTION_DURATION_MS} onExpire={handleExpire} size={56} />
        </div>

        <h1 className="mb-6 font-display text-2xl font-semibold leading-snug text-navy-900 sm:text-3xl">{prompt}</h1>

        <div className="flex flex-col gap-3">
          {choices.map((choice, i) => {
            const isSelected = lockedChoice === i;
            const isRight = revealed && i === correctIndex;
            const isWrongPick = revealed && isSelected && i !== correctIndex;

            // Once revealed, the answer key drives the colours; before that,
            // selection alone is shown in navy so no outcome leaks early.
            let style: string;
            if (isRight) {
              style = "border-success-600 bg-success-600 text-white shadow-card animate-correct-flash";
            } else if (isWrongPick) {
              style = "border-danger-600 bg-danger-600 text-white shadow-card animate-shake";
            } else if (isSelected && !revealed) {
              style = "border-navy-900 bg-navy-900 text-white shadow-card";
            } else {
              style = "border-navy-100 bg-white text-navy-900 active:scale-[0.98]";
            }

            const dimmed = isLocked && !isSelected && !isRight;

            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={isLocked || submitting}
                className={`flex min-h-[56px] items-center rounded-xl border px-4 py-4 text-left text-base font-medium transition-all duration-200 ${style} ${
                  dimmed ? "opacity-40" : ""
                } ${isLocked ? "cursor-default" : "cursor-pointer"}`}
              >
                <span
                  className={`mr-2 font-display font-bold ${
                    isRight || isWrongPick || (isSelected && !revealed) ? "text-white/80" : "text-gold-600"
                  }`}
                >
                  {String.fromCharCode(65 + i)}.
                </span>
                <span className="flex-1">{choice}</span>

                {/* A glyph as well as the colour: the outcome must not be
                    carried by red-vs-green alone. */}
                {isRight && <span aria-label="Correct answer" className="ml-2 shrink-0 text-lg font-bold">✓</span>}
                {isWrongPick && <span aria-label="Your answer, incorrect" className="ml-2 shrink-0 text-lg font-bold">✕</span>}
              </button>
            );
          })}
        </div>

        {submitError && (
          <p className="mt-6 text-center text-sm font-medium text-danger-600" role="alert">
            {submitError}
          </p>
        )}

        {!submitError && submitting && (
          <p className="mt-6 text-center text-sm text-ink-600">Saving your answer…</p>
        )}

        {!submitError && !submitting && isLocked && (
          <div className="mt-6 text-center" role="status">
            {wasCorrect === true && (
              <p className="font-display text-lg font-bold text-success-600">
                Correct! +{pointsEarned} pts
              </p>
            )}
            {wasCorrect === false && (
              <p className="font-display text-lg font-bold text-danger-600">Not quite.</p>
            )}
            {wasCorrect === null && (
              <p className="font-display text-lg font-bold text-ink-600">
                {expired && !confirmed ? "Time's up." : "Answer locked in."}
              </p>
            )}
            <p className="mt-1 text-sm text-ink-600">Waiting for the next question…</p>
          </div>
        )}
      </div>
    </main>
  );
}
