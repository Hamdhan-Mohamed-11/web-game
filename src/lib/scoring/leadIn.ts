// Keep in sync with the `interval '3 seconds'` literals in
// supabase/migrations/0009_lead_in.sql (start_question / start_round).
//
// `started_at` is stamped this far in the future, so "the lead-in is running"
// is simply `serverNow() < startedAt` — no offset has to be threaded through
// the countdown or the scoring maths.
export const LEAD_IN_MS = 3_000;
