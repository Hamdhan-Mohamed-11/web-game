-- Book Club Quiz Night — core schema
-- One-off event: no per-tenant/user-account concerns, RLS is used purely to
-- withhold answer keys from the anon role, not to isolate rows per-user.

create extension if not exists "pgcrypto";

create table games (
  slug          text primary key,
  display_name  text not null
);

create table rounds (
  id              uuid primary key default gen_random_uuid(),
  game_slug       text not null references games(slug) on delete cascade,
  round_key       text not null, -- 'main' | 'fiction' | 'nonfiction' | 'match'
  order_index     int not null,
  total_questions int not null,
  status          text not null default 'pending'
                    check (status in ('pending','active','closed','confirmed')),
  unique (game_slug, round_key)
);

-- Publicly-readable (via anon SELECT + Realtime). Contains no secret data:
-- question text/choices live in client-safe TS constants keyed by
-- (round_key, question_index), not in this table.
create table question_state (
  id              uuid primary key default gen_random_uuid(),
  round_id        uuid not null references rounds(id) on delete cascade,
  question_index  int not null, -- 0-based
  started_at      timestamptz,
  closed_at       timestamptz,
  unique (round_id, question_index)
);

-- Secret. Deliberately a SEPARATE table (not just a column) from
-- question_state: Supabase Realtime's postgres_changes ships every column of
-- a row it's allowed to see, so a secret column can't safely live inside a
-- table anon has SELECT on. No grants are given on this table at all — only
-- SECURITY DEFINER functions (see 0002_functions.sql) ever read it.
create table question_answer_keys (
  question_state_id    uuid primary key references question_state(id) on delete cascade,
  correct_choice_index int not null
);

create table participants (
  id            uuid primary key default gen_random_uuid(),
  game_slug     text not null references games(slug) on delete cascade,
  display_name  text not null,
  joined_at     timestamptz not null default now(),
  is_active     boolean not null default true
);
create index participants_game_slug_idx on participants(game_slug);

create table answers (
  id                    uuid primary key default gen_random_uuid(),
  question_state_id     uuid not null references question_state(id) on delete cascade,
  participant_id        uuid not null references participants(id) on delete cascade,
  selected_choice_index int not null,
  is_correct            boolean not null,
  elapsed_ms            int not null,
  points                int not null,
  answered_at           timestamptz not null default now(),
  unique (question_state_id, participant_id)
);
create index answers_question_state_idx on answers(question_state_id);
create index answers_participant_idx on answers(participant_id);

-- Secret mapping only (item -> correct match key). Labels for both the item
-- and the match-option pool live in client-safe TS constants keyed by these
-- same string keys — no grants are given on this table at all, matching
-- question_answer_keys above.
create table book_match_pairs (
  item_key    text primary key,
  correct_key text not null
);

create table book_match_sessions (
  id                     uuid primary key default gen_random_uuid(),
  round_id               uuid not null references rounds(id) on delete cascade,
  participant_id         uuid not null references participants(id) on delete cascade,
  started_at             timestamptz,
  ends_at                timestamptz,
  completed_at           timestamptz,
  correct_matches_count  int not null default 0,
  total_points           int not null default 0,
  is_finished            boolean not null default false,
  unique (round_id, participant_id)
);
create index book_match_sessions_round_idx on book_match_sessions(round_id);

create table book_match_answers (
  id                      uuid primary key default gen_random_uuid(),
  book_match_session_id   uuid not null references book_match_sessions(id) on delete cascade,
  item_key                text not null,
  matched_key             text not null,
  is_correct              boolean not null,
  answered_at             timestamptz not null default now()
);
create index book_match_answers_session_idx on book_match_answers(book_match_session_id);

create table round_results (
  round_id      uuid primary key references rounds(id) on delete cascade,
  confirmed_at  timestamptz not null default now(),
  winners       jsonb not null
);

-- Safe, pre-aggregated leaderboard rows maintained by the scoring RPCs.
-- This is deliberately the ONLY table anon reads for live scores: `answers`
-- and `book_match_answers` are never granted to anon because a row with
-- is_correct = true directly exposes the correct choice/match key (whatever
-- the participant picked, since it matched). Aggregating server-side into
-- this table means the leak vector never exists rather than relying on
-- careful column-level grants.
create table leaderboard_entries (
  round_id           uuid not null references rounds(id) on delete cascade,
  participant_id     uuid not null references participants(id) on delete cascade,
  display_name       text not null,
  total_points       int not null default 0,
  total_elapsed_ms   bigint not null default 0, -- lockstep tie-break: lower wins
  progress           int not null default 0,    -- questions answered / correct matches
  is_finished        boolean not null default false,
  score_reached_at   timestamptz,                -- book-match tie-break: earlier wins
  updated_at         timestamptz not null default now(),
  primary key (round_id, participant_id)
);
create index leaderboard_entries_round_points_idx
  on leaderboard_entries (round_id, total_points desc, total_elapsed_ms asc);
