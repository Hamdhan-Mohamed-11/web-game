-- Row-level security + grants. Default posture: anon gets SELECT on the
-- tables that are safe to expose in full (no secret columns), and nothing
-- at all on the tables that hold answer keys or per-attempt correctness.
-- All writes happen through SECURITY DEFINER functions (0002_functions.sql),
-- which run as the function owner and are therefore unaffected by these
-- policies — RLS here exists purely to constrain direct table access via
-- the public anon key (browser clients, Realtime subscriptions).

alter table games enable row level security;
alter table rounds enable row level security;
alter table question_state enable row level security;
alter table participants enable row level security;
alter table leaderboard_entries enable row level security;
alter table round_results enable row level security;

alter table question_answer_keys enable row level security;
alter table book_match_pairs enable row level security;
alter table answers enable row level security;
alter table book_match_answers enable row level security;

-- ---------------------------------------------------------------------------
-- Safe tables: readable in full by anon (used directly by browser clients
-- and by Supabase Realtime's postgres_changes, which enforces these RLS
-- policies per-subscriber).
-- ---------------------------------------------------------------------------
create policy anon_select_games on games for select to anon using (true);
grant select on games to anon;

create policy anon_select_rounds on rounds for select to anon using (true);
grant select on rounds to anon;

create policy anon_select_question_state on question_state for select to anon using (true);
grant select on question_state to anon;

create policy anon_select_participants on participants for select to anon using (true);
grant select on participants to anon;

create policy anon_select_leaderboard_entries on leaderboard_entries for select to anon using (true);
grant select on leaderboard_entries to anon;

create policy anon_select_round_results on round_results for select to anon using (true);
grant select on round_results to anon;

-- book_match_sessions holds only aggregate per-participant state (timer
-- window, correct-match count, points) — no item-level correctness, so it's
-- as safe as leaderboard_entries. The client needs it to know its own
-- session's ends_at/is_finished and to recover its session id on reconnect.
alter table book_match_sessions enable row level security;
create policy anon_select_book_match_sessions on book_match_sessions for select to anon using (true);
grant select on book_match_sessions to anon;

-- A narrow view over book_match_answers exposing only which items a session
-- has already matched correctly (item_key), never matched_key — pairing
-- item_key with matched_key is what would reveal the answer, so it's
-- deliberately left out. Lets a reconnecting participant re-lock the cards
-- they'd already solved instead of re-attempting them. The view owner
-- (postgres, via the migration runner) has BYPASSRLS, so this view can read
-- the RLS-protected book_match_answers table directly; anon's access is
-- controlled entirely by the grant on the view itself.
create view book_match_progress as
  select book_match_session_id, item_key
  from book_match_answers
  where is_correct = true;

grant select on book_match_progress to anon;

-- ---------------------------------------------------------------------------
-- Secret / audit tables: NO policies, NO grants for anon. RLS enabled with
-- zero policies denies all access by default. Explicit revokes below are
-- belt-and-suspenders against any future default-privilege grant.
-- ---------------------------------------------------------------------------
revoke all on question_answer_keys from anon, authenticated;
revoke all on book_match_pairs from anon, authenticated;
revoke all on answers from anon, authenticated;
revoke all on book_match_answers from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: only the safe tables are published, so a change event can never
-- carry a secret column regardless of how the payload is constructed.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table question_state;
alter publication supabase_realtime add table rounds;
alter publication supabase_realtime add table leaderboard_entries;
alter publication supabase_realtime add table round_results;
