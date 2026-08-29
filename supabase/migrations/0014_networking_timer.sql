-- ---------------------------------------------------------------------------
-- Networking round timer
--
-- The activity is a timed sprint, not an open evening: the room needs to see
-- the clock running down, and the leaderboard has to stop moving the moment
-- it hits zero, or the winner announced on stage is overtaken by a straggler
-- submitting from the back of the hall.
--
-- The deadline lives here rather than in the browser because it must be the
-- SAME deadline for every device. 150 phones each running their own five
-- minutes is 150 different finish lines, and phone clocks are routinely
-- seconds out. Clients render a countdown from this row purely for display;
-- whether a submission actually counts is decided below, by the database's
-- own clock, where it cannot be argued with.
-- ---------------------------------------------------------------------------

-- Single-row table. The `id boolean primary key default true check (id)`
-- trick makes a second row impossible at the schema level, which is cheaper
-- to guarantee than to remember.
create table if not exists networking_round (
  id boolean primary key default true check (id),
  started_at timestamptz,
  duration_seconds int not null default 300
    check (duration_seconds between 30 and 7200),
  updated_at timestamptz not null default now()
);

insert into networking_round (id) values (true) on conflict (id) do nothing;

alter table networking_round enable row level security;

-- Two layers, because Supabase grants ALL on new public tables to anon and
-- authenticated by default -- RLS with no policy already returns zero rows,
-- but leaving the grant in place means one accidentally-permissive policy
-- later is the only thing between a participant and the deadline. Revoking
-- as well makes "no policy and no grant" actually true.
revoke all on networking_round from anon, authenticated;

-- anon reaches this row only through networking_round_state below, which is
-- security definer. Keeps the readable surface to exactly what a countdown
-- needs.

-- ---------------------------------------------------------------------------
-- Round state, including the server's own clock
-- ---------------------------------------------------------------------------

create or replace function networking_round_state()
returns table (
  started_at timestamptz,
  ends_at timestamptz,
  duration_seconds int,
  server_now timestamptz,
  is_open boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.started_at,
    case when r.started_at is null then null
         else r.started_at + make_interval(secs => r.duration_seconds) end,
    r.duration_seconds,
    now(),
    -- Open until started, then open until the deadline passes.
    --
    -- Deliberately open BEFORE the host presses start: the alternative locks
    -- out every rehearsal, every load test and every early scan, and turns
    -- "nobody remembered to press the button" into a dead game in front of a
    -- full room. A timer that has never been started simply is not running.
    (r.started_at is null
     or now() < r.started_at + make_interval(secs => r.duration_seconds))
  from networking_round r
  where r.id;
$$;

grant execute on function networking_round_state() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Enforcement
--
-- Replaces 0013's version, adding the deadline check as the first thing it
-- does. Same signature and same return shape, so no client changes are
-- forced by this; a closed round raises, and the portal shows "time's up".
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
  v_open boolean;
begin
  -- The clock check comes first and uses now() from this transaction, not a
  -- timestamp the caller supplied. This is the only place the deadline is
  -- actually binding; everything the phones and the wall draw is cosmetic.
  select s.is_open into v_open from networking_round_state() s;
  if not v_open then
    raise exception 'networking round is closed';
  end if;

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
-- Admin controls
--
-- REVOKE is the load-bearing line in this block. Postgres grants EXECUTE on a
-- new function to PUBLIC by default, so without these the anon key could
-- restart the clock -- a participant handing themselves another five minutes
-- while the room watches the wall say otherwise.
-- ---------------------------------------------------------------------------

create or replace function networking_round_begin(p_duration_seconds int)
returns void
language sql
security definer
set search_path = public
as $$
  update networking_round
     set started_at = now(),
         duration_seconds = p_duration_seconds,
         updated_at = now()
   where id;
$$;

create or replace function networking_round_end()
returns void
language sql
security definer
set search_path = public
as $$
  -- Backdates the start so the deadline is already behind us, rather than
  -- shrinking duration_seconds, which would trip its 30-second lower bound
  -- whenever a host stops the round early.
  update networking_round
     set started_at = now() - make_interval(secs => duration_seconds),
         updated_at = now()
   where id;
$$;

revoke all on function networking_round_begin(int) from public, anon, authenticated;
revoke all on function networking_round_end() from public, anon, authenticated;
