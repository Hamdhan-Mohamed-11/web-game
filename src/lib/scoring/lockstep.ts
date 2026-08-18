// Mirrors the tiering in supabase/migrations/0002_functions.sql
// (submit_lockstep_answer). This copy is for UI display only (e.g. showing
// the countdown, or an estimated tier) — the DB always computes the
// authoritative score from its own clock.

export const QUESTION_DURATION_MS = 15_000;

export const LOCKSTEP_TIERS = [
  { maxElapsedMs: 5_000, points: 100 },
  { maxElapsedMs: 10_000, points: 75 },
  { maxElapsedMs: 15_000, points: 50 },
] as const;

export function estimateLockstepPoints(elapsedMs: number, isCorrect: boolean): number {
  if (!isCorrect) return 0;
  const tier = LOCKSTEP_TIERS.find((t) => elapsedMs <= t.maxElapsedMs);
  return tier?.points ?? 0;
}
