-- ---------------------------------------------------------------------------
-- Ask the panel — live Q&A
--
-- The audience-facing form stays where it is, on HostGator at
-- /events/panel/questions.html: roughly 150 QR codes are already printed
-- pointing at that exact URL, so the page cannot move. Only its backend
-- changes — it now posts to the quiz app instead of submit.php, and the
-- moderator reads the queue here.
--
-- Note there are NO anon grants anywhere below. Unlike the networking game,
-- which the crowd's phones talk to directly, every request here arrives from
-- a page on a different origin and passes through /api/panel/*, which holds
-- the service key. That keeps the whole table invisible to the public key and
-- leaves validation and rate limiting in one place instead of split between
-- SQL and a static file someone pastes into cPanel.
-- ---------------------------------------------------------------------------

create table if not exists panel_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null check (length(btrim(question)) between 1 and 500),
  asker_name text check (asker_name is null or length(asker_name) <= 80),
  status text not null default 'new'
    check (status in ('new', 'starred', 'answered', 'hidden')),
  -- Coarse origin note for spam triage: enough to spot one device flooding
  -- the queue, not enough to identify anyone afterwards.
  submitted_from text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The moderator reads newest-first and filters by status; both are covered.
create index if not exists panel_questions_created_idx
  on panel_questions (created_at desc);
create index if not exists panel_questions_status_idx
  on panel_questions (status, created_at desc);

alter table panel_questions enable row level security;

-- Belt and braces, as with networking_round: Supabase grants ALL on new
-- public tables to anon and authenticated by default. RLS with no policy
-- already returns nothing, but revoking means a future policy added in
-- haste cannot quietly expose the queue.
revoke all on panel_questions from anon, authenticated;
