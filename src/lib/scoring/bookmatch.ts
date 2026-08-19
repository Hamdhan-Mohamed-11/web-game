// Mirrors the maths in supabase/migrations/0008_scoring_rounds_and_clock.sql
// (bookmatch_submit_match). UI display only — the DB is authoritative.

export const MATCH_ROUND_DURATION_MS = 75_000;
export const TOTAL_PAIRS = 10;
export const POINTS_PER_MATCH = 50;

export const MAX_COMPLETION_BONUS = 400;
export const MIN_COMPLETION_BONUS = 100;

/** Completion bonus decays linearly from 400 (instant) to 100 (at 75s). */
export function estimateCompletionBonus(elapsedMs: number): number {
  const clamped = Math.min(Math.max(elapsedMs, 0), MATCH_ROUND_DURATION_MS);
  return Math.round(
    MAX_COMPLETION_BONUS - (MAX_COMPLETION_BONUS - MIN_COMPLETION_BONUS) * (clamped / MATCH_ROUND_DURATION_MS)
  );
}
