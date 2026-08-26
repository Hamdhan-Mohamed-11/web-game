-- The Readers' Summit networking game.
--
-- Deliberately separate from the quiz tables: this activity has no rounds,
-- no questions and no lock — it runs for the whole evening alongside
-- whichever quiz is open, and anyone can join at any point.
--
-- Read model note: the live dashboard polls a handful of SECURITY DEFINER
-- aggregate functions rather than subscribing to the raw tables. That keeps
-- who-met-whom unreadable by anon (only the aggregates leave the database),
-- and means 150 phones hold zero realtime subscriptions between them — the
-- only client doing any polling is the single screen on the projector.

-- Normalisation is what makes "Atomic Habits", "atomic habits" and
-- " Atomic  Habits " one book, and what stops the same person being counted
-- twice under different spacing. Must be IMMUTABLE to be usable in the
-- generated columns and unique index below.
create or replace function networking_normalize(t text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(lower(btrim(coalesce(t, ''))), '\s+', ' ', 'g'), '');
$$;

-- Book titles additionally lose a leading article, so "The Alchemist" and
-- "Alchemist" group together.
create or replace function networking_normalize_book(t text)
returns text
language sql
immutable
as $$
  select regexp_replace(networking_normalize(t), '^(the|a|an) ', '');
$$;

create table if not exists networking_participants (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  company text,
  contact text,
  created_at timestamptz not null default now()
);

create table if not exists networking_connections (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references networking_participants(id) on delete cascade,
  person_met text not null,
  book_title text not null,
  person_met_norm text generated always as (networking_normalize(person_met)) stored,
  book_title_norm text generated always as (networking_normalize_book(book_title)) stored,
  -- Admin spam control. Hidden rows stay in the table (so the export is a
  -- true record) but leave every count and the leaderboard.
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

-- Duplicate control: a participant may only count a given person once.
-- Partial on is_hidden so that if an admin removes a bad entry, the pair can
-- legitimately be recorded again.
create unique index if not exists networking_connections_unique_person
  on networking_connections (participant_id, person_met_norm)
  where not is_hidden;

create index if not exists networking_connections_book_idx
  on networking_connections (book_title_norm) where not is_hidden;
create index if not exists networking_connections_created_idx
  on networking_connections (created_at desc) where not is_hidden;

alter table networking_participants enable row level security;
alter table networking_connections enable row level security;
-- No anon policies at all: every read and write below goes through a
-- SECURITY DEFINER function, so raw rows are never directly reachable.

-- ---------------------------------------------------------------------------
-- Participant: join.
-- ---------------------------------------------------------------------------
create or replace function networking_join(
  p_display_name text,
  p_company text default null,
  p_contact text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_id uuid;
begin
  v_name := btrim(p_display_name);
  if v_name is null or length(v_name) = 0 then
    raise exception 'name is required';
  end if;
  if length(v_name) > 60 then
    raise exception 'name is too long';
  end if;

  insert into networking_participants (display_name, company, contact)
  values (v_name, nullif(btrim(coalesce(p_company, '')), ''), nullif(btrim(coalesce(p_contact, '')), ''))
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function networking_join(text, text, text) to anon;

-- ---------------------------------------------------------------------------
-- Participant: record one connection.
-- Returns the participant's running total so the phone can say "you've
-- connected with N readers tonight" without a second round trip.
-- ---------------------------------------------------------------------------
create or replace function networking_add_connection(
  p_participant_id uuid,
  p_person_met text,
  p_book_title text
)
returns table (connection_count int, duplicate boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_person text;
  v_book text;
  v_dup boolean := false;
begin
  perform 1 from networking_participants where id = p_participant_id;
  if not found then
    raise exception 'unknown participant';
  end if;

  v_person := btrim(p_person_met);
  v_book := btrim(p_book_title);
  if v_person is null or length(v_person) = 0 then
    raise exception 'person name is required';
  end if;
  if v_book is null or length(v_book) = 0 then
    raise exception 'book title is required';
  end if;
  if length(v_person) > 80 or length(v_book) > 120 then
    raise exception 'entry is too long';
  end if;

  begin
    insert into networking_connections (participant_id, person_met, book_title)
    values (p_participant_id, v_person, v_book);
  exception
    when unique_violation then
      -- Already met: not an error the player did anything wrong, so it is
      -- reported as a flag rather than thrown. The caller shows the
      -- "go meet someone new" nudge.
      v_dup := true;
  end;

  return query
    select count(*)::int, v_dup
    from networking_connections
    where participant_id = p_participant_id and not is_hidden;
end;
$$;

grant execute on function networking_add_connection(uuid, text, text) to anon;

-- ---------------------------------------------------------------------------
-- Dashboard reads. Aggregates only.
-- ---------------------------------------------------------------------------
-- Which spelling of a title to show the room. Grouping is done on the
-- normalised form, but the label has to be one of the spellings people
-- actually typed — so take the most common one, and prefer a capitalised
-- variant over an all-lowercase one when they tie. Showing the first-entered
-- spelling instead meant one person typing "the alchemist" in lower case put
-- exactly that on a twenty-foot screen for the rest of the night.
create or replace view networking_book_tallies as
  with live as (
    select * from networking_connections where not is_hidden
  ),
  spellings as (
    select book_title_norm, book_title, count(*) as spelling_n
    from live group by book_title_norm, book_title
  ),
  best as (
    select distinct on (book_title_norm) book_title_norm, book_title as label
    from spellings
    order by book_title_norm,
             spelling_n desc,
             (book_title = lower(book_title)) asc,
             book_title asc
  ),
  totals as (
    select book_title_norm, count(*)::int as mentions from live group by book_title_norm
  )
  select b.label, t.mentions, t.book_title_norm
  from totals t join best b on b.book_title_norm = t.book_title_norm;

create or replace function networking_stats()
returns table (
  total_connections int,
  total_participants int,
  unique_titles int,
  books_discussed int,
  top_book text,
  top_book_count int
)
language sql
security definer
set search_path = public
stable
as $$
  select
    (select count(*)::int from networking_connections where not is_hidden),
    (select count(*)::int from networking_participants),
    (select count(*)::int from networking_book_tallies),
    (select count(*)::int from networking_connections where not is_hidden),
    (select label from networking_book_tallies order by mentions desc, label asc limit 1),
    (select mentions from networking_book_tallies order by mentions desc, label asc limit 1);
$$;

grant execute on function networking_stats() to anon;

-- Ranked on DISTINCT people met, per the game's rules — not on rows
-- submitted. The unique index already guarantees those are the same number,
-- but counting distinct here keeps that true even if the index is ever
-- relaxed. Ties break on who reached the total first.
create or replace function networking_top_connectors(p_limit int default 5)
returns table (participant_id uuid, display_name text, connections int, reached_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.display_name,
         count(distinct c.person_met_norm)::int as connections,
         max(c.created_at) as reached_at
  from networking_participants p
  join networking_connections c on c.participant_id = p.id and not c.is_hidden
  group by p.id, p.display_name
  order by connections desc, reached_at asc
  limit greatest(1, least(p_limit, 50));
$$;

grant execute on function networking_top_connectors(int) to anon;

create or replace function networking_top_books(p_limit int default 5)
returns table (title text, mentions int)
language sql
security definer
set search_path = public
stable
as $$
  select label, mentions
  from networking_book_tallies
  order by mentions desc, label asc
  limit greatest(1, least(p_limit, 50));
$$;

grant execute on function networking_top_books(int) to anon;

-- The rotating "what are readers talking about right now" feed.
create or replace function networking_recent_books(p_limit int default 12)
returns table (title text, created_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select book_title, created_at
  from networking_connections
  where not is_hidden
  order by created_at desc
  limit greatest(1, least(p_limit, 50));
$$;

grant execute on function networking_recent_books(int) to anon;
