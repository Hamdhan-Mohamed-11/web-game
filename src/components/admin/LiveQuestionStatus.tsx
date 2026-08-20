"use client";

import { useState } from "react";
import { QUESTION_DURATION_MS } from "@/lib/scoring/lockstep";
import { useQuestionStats } from "@/lib/realtime/useQuestionStats";
import { useLeadIn } from "@/lib/realtime/useLeadIn";
import CountdownTimer from "@/components/shared/CountdownTimer";
import LeadIn from "@/components/shared/LeadIn";

interface LiveQuestionStatusProps {
  questionStateId: string | undefined;
  startedAt: string | null | undefined;
  questionNumber: number | undefined;
  totalQuestions: number;
  prompt: string | undefined;
}

/**
 * What the MC needs while a question is live: the same countdown the room
 * is watching, and how much of the room has actually answered — so they
 * can tell "everyone's done, move on" from "half the room is still
 * thinking" without guessing.
 *
 * Render with `key={questionStateId}` so a new question remounts this and
 * resets the expired flag, rather than an effect watching for the change.
 */
export default function LiveQuestionStatus({
  questionStateId,
  startedAt,
  questionNumber,
  totalQuestions,
  prompt,
}: LiveQuestionStatusProps) {
  const { answered, participants } = useQuestionStats(questionStateId);
  const [expired, setExpired] = useState(false);
  const leadIn = useLeadIn(startedAt);

  if (!questionStateId || !startedAt) {
    return (
      <div className="rounded-xl border border-dashed border-navy-100 bg-cream-100/50 px-4 py-6 text-center text-sm text-ink-600">
        No question is live yet.
      </div>
    );
  }

  // The MC needs to see the same ceremony the room does, so they know the
  // question is genuinely on its way and don't click again thinking it
  // failed to land.
  if (leadIn.pending) {
    return (
      <div className="rounded-xl border border-navy-100 bg-white px-4 py-6">
        <LeadIn
          count={leadIn.count}
          size="inline"
          tone="light"
          label={`Question ${questionNumber} / ${totalQuestions}`}
        />
      </div>
    );
  }

  const pct = participants > 0 ? Math.min(100, Math.round((answered / participants) * 100)) : 0;
  const allAnswered = participants > 0 && answered >= participants;

  return (
    <div className="rounded-xl border border-navy-100 bg-white p-4">
      <div className="flex items-center gap-4">
        <CountdownTimer
          startedAt={startedAt}
          durationMs={QUESTION_DURATION_MS}
          onExpire={() => setExpired(true)}
          size={64}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-600">
              Question {questionNumber} / {totalQuestions}
            </span>
            <span
              className={`text-xs font-semibold uppercase tracking-wider ${
                expired ? "text-danger-600" : "text-success-600"
              }`}
            >
              {expired ? "Time up" : "Live"}
            </span>
          </div>

          {prompt && <p className="mt-1 truncate text-sm text-navy-900">{prompt}</p>}

          <div className="mt-3">
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="text-ink-600">Answered</span>
              <span className="font-display font-bold tabular-nums text-navy-900">
                {answered}
                <span className="text-ink-600"> / {participants}</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-cream-200">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ease-out ${
                  allAnswered ? "bg-success-600" : "bg-gold-500"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {allAnswered && !expired && (
        <p className="mt-3 text-center text-sm font-medium text-success-600">
          Everyone has answered — safe to move on.
        </p>
      )}
    </div>
  );
}
