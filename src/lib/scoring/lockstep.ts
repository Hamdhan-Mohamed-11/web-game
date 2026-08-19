// Mirrors the maths in supabase/migrations/0008_scoring_rounds_and_clock.sql
// (submit_lockstep_answer). UI display only — the DB always computes the
// authoritative score from its own clock.

export const QUESTION_DURATION_MS = 15_000;

export const MAX_QUESTION_POINTS = 100;
export const MIN_QUESTION_POINTS = 50;

/**
 * Points decay linearly from 100 (instant) to 50 (at the 15s buzzer), so
 * being fastest genuinely beats being merely inside the same few seconds.
 */
export function estimateLockstepPoints(elapsedMs: number, isCorrect: boolean): number {
  if (!isCorrect) return 0;
  const clamped = Math.min(Math.max(elapsedMs, 0), QUESTION_DURATION_MS);
  return Math.round(
    MAX_QUESTION_POINTS - (MAX_QUESTION_POINTS - MIN_QUESTION_POINTS) * (clamped / QUESTION_DURATION_MS)
  );
}
