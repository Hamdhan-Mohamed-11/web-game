"use client";

import { useEffect, useRef } from "react";
import { serverNow } from "@/lib/realtime/serverClock";
import { QUESTION_DURATION_MS } from "@/lib/scoring/lockstep";

/**
 * How long the closed question stays on screen after its clock runs out,
 * before the next one opens. This is the window in which players read their
 * green/red answer feedback — advancing the instant the timer hit zero
 * snatched the result away before anyone could see whether they were right.
 */
export const ANSWER_REVIEW_MS = 4500;

interface AutoAdvanceOptions {
  /** False while the round is confirmed, missing, or not yet started. */
  enabled: boolean;
  /** Identity of the open question — the guard against double-firing. */
  questionStateId: string | undefined;
  questionIndex: number | undefined;
  startedAt: string | null | undefined;
  totalQuestions: number;
  onAdvance: (nextIndex: number) => void;
}

/**
 * Drives a lockstep round forward on its own: when the open question's
 * answer window closes, the next one starts after ANSWER_REVIEW_MS.
 *
 * This runs on the admin page rather than server-side because that is the
 * one client guaranteed to be present and authenticated for the whole round,
 * and it already owns every other transition. The manual "Start question"
 * button stays live alongside it — if this tab is closed or the operator
 * wants to hold the room, the round simply waits for a human, exactly as
 * before.
 *
 * The timeout is derived from the server-stamped started_at (not from when
 * this effect happened to run), so an admin laptop that reloads mid-question
 * picks the schedule back up at the right moment instead of restarting it.
 */
export function useAutoAdvance({
  enabled,
  questionStateId,
  questionIndex,
  startedAt,
  totalQuestions,
  onAdvance,
}: AutoAdvanceOptions) {
  // Latest callback without making it an effect dependency — the parent
  // rebuilds it on every render, which would otherwise reschedule the
  // timeout continuously and never let it fire.
  const onAdvanceRef = useRef(onAdvance);
  useEffect(() => {
    onAdvanceRef.current = onAdvance;
  }, [onAdvance]);

  // One advance per question, even across the remounts that realtime
  // updates cause.
  const firedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !questionStateId || questionIndex === undefined || !startedAt) return;
    if (firedFor.current === questionStateId) return;

    const nextIndex = questionIndex + 1;
    if (nextIndex >= totalQuestions) return; // Last question: the operator reveals winners.

    const closesAt = new Date(startedAt).getTime() + QUESTION_DURATION_MS + ANSWER_REVIEW_MS;
    const delay = Math.max(0, closesAt - serverNow());

    const timer = setTimeout(() => {
      firedFor.current = questionStateId;
      onAdvanceRef.current(nextIndex);
    }, delay);

    return () => clearTimeout(timer);
  }, [enabled, questionStateId, questionIndex, startedAt, totalQuestions]);
}
