// Mirrors the tiering in supabase/migrations/0002_functions.sql
// (bookmatch_submit_match). UI display only — the DB is authoritative.

export const MATCH_ROUND_DURATION_MS = 75_000;
export const TOTAL_PAIRS = 12;
export const POINTS_PER_MATCH = 50;

export const COMPLETION_BONUS_TIERS = [
  { maxElapsedMs: 30_000, bonus: 400 },
  { maxElapsedMs: 45_000, bonus: 300 },
  { maxElapsedMs: 60_000, bonus: 200 },
  { maxElapsedMs: 75_000, bonus: 100 },
] as const;

export function estimateCompletionBonus(elapsedMs: number): number {
  const tier = COMPLETION_BONUS_TIERS.find((t) => elapsedMs <= t.maxElapsedMs);
  return tier?.bonus ?? 0;
}
