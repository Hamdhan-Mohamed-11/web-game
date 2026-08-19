"use client";

import { useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase/browserClient";
import { QUESTION_DURATION_MS } from "@/lib/scoring/lockstep";
import CountdownTimer from "@/components/shared/CountdownTimer";
import BrandMark from "@/components/shared/BrandMark";

interface QuestionCardProps {
  questionStateId: string;
  participantId: string;
  questionNumber: number;
  totalQuestions: number;
  prompt: string;
  choices: readonly string[];
  startedAt: string | null;
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
}: QuestionCardProps) {
  const [lockedChoice, setLockedChoice] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expired, setExpired] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  async function handleAnswer(choiceIndex: number) {
    if (confirmed || submitting || expired) return;
    setSubmitting(true);
    setSubmitError(null);
    setLockedChoice(choiceIndex);

    const supabase = getBrowserSupabaseClient();
    const { error } = await supabase.rpc("submit_lockstep_answer", {
      p_question_state_id: questionStateId,
      p_participant_id: participantId,
      p_selected_choice_index: choiceIndex,
    });

    setSubmitting(false);

    if (!error) {
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

  const isLocked = confirmed || expired;

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
        <div className="mb-6 flex items-center justify-between">
          <span className="rounded-full bg-navy-900 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
            Question {questionNumber} / {totalQuestions}
          </span>
          <CountdownTimer startedAt={startedAt} durationMs={QUESTION_DURATION_MS} onExpire={() => setExpired(true)} size={56} />
        </div>

        <h1 className="mb-6 font-display text-2xl font-semibold leading-snug text-navy-900 sm:text-3xl">{prompt}</h1>

        <div className="flex flex-col gap-3">
          {choices.map((choice, i) => {
            const isSelected = lockedChoice === i;
            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={isLocked || submitting}
                className={`min-h-[56px] rounded-xl border px-4 py-4 text-left text-base font-medium transition-all duration-200 ${
                  isSelected
                    ? "border-navy-900 bg-navy-900 text-white shadow-card"
                    : "border-navy-100 bg-white text-navy-900 active:scale-[0.98]"
                } ${isLocked && !isSelected ? "opacity-40" : ""} ${isLocked ? "cursor-default" : "cursor-pointer"}`}
              >
                <span className="mr-2 font-display font-bold text-gold-600">{String.fromCharCode(65 + i)}.</span>
                {choice}
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
          <p className="mt-6 text-center text-sm text-ink-600">
            {expired && !confirmed ? "Time's up." : "Answer locked in — waiting for the next question…"}
          </p>
        )}
      </div>
    </main>
  );
}
