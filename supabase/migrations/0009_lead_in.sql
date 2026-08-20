-- Synchronised 3-2-1 lead-in for every game.
--
-- Design: `started_at` keeps its exact existing meaning — "the moment this
-- question/round is genuinely open" — and the lead-in is expressed simply by
-- stamping it 3 seconds in the FUTURE. Everything already anchored to
-- started_at (the 15s countdown ring, the elapsed_ms scoring maths, the
-- close check) therefore needs no offset threaded through it: a client just
-- renders 3-2-1 while now() < started_at. The alternative — keeping
-- started_at as "now" and subtracting a lead-in inside every elapsed
-- calculation — would have put the same constant in five places that must
-- never disagree.
--
-- Keep LEAD_IN in sync with LEAD_IN_MS in src/lib/scoring/leadIn.ts.

-- Book Match has no per-question row to hang the ceremony off, so the round
-- itself carries the moment its board opens.
alter table rounds add column if not exists started_at timestamptz;

-- 1) Lockstep games: the question row goes live immediately (so every client
--    learns about it at once and can start counting down together), but its
--    started_at — and therefore scoring and the answer window — is 3s out.
create or replace function start_question(p_round_id uuid, p_question_index int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform close_sibling_rounds(p_round_id);

  update rounds
  set status = 'active'
  where id = p_round_id and status is distinct from 'active';

  update question_state
  set started_at = now() + interval '3 seconds', closed_at = null
  where round_id = p_round_id and question_index = p_question_index;

  if not found then
    raise exception 'no such question: round % index %', p_round_id, p_question_index;
  end if;
end;
$$;

revoke all on function start_question(uuid, int) from public;
grant execute on function start_question(uuid, int) to service_role;

-- 2) Scoring must refuse answers submitted during the lead-in. Without this
--    the existing greatest(0, ...) clamp would silently award a *perfect*
--    100 to anyone whose client submitted early — the exact opposite of the
--    intent, and the kind of hole a doctored client would find first.
create or replace function submit_lockstep_answer(
  p_question_state_id uuid,
  p_participant_id uuid,
  p_selected_choice_index int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_started_at timestamptz;
  v_correct_index int;
  v_round_id uuid;
  v_display_name text;
  v_elapsed_ms int;
  v_is_correct boolean;
  v_points int;
begin
  select qs.started_at, qak.correct_choice_index, qs.round_id
    into v_started_at, v_correct_index, v_round_id
    from question_state qs
    join question_answer_keys qak on qak.question_state_id = qs.id
    where qs.id = p_question_state_id;

  if not found then
    raise exception 'unknown question_state: %', p_question_state_id;
  end if;
  if v_started_at is null or now() < v_started_at then
    raise exception 'question is not open yet';
  end if;

  select display_name into v_display_name from participants where id = p_participant_id;
  if not found then
    raise exception 'unknown participant: %', p_participant_id;
  end if;

  v_elapsed_ms := greatest(0, floor(extract(epoch from (now() - v_started_at)) * 1000))::int;
  if v_elapsed_ms > 15000 then
    raise exception 'question is closed';
  end if;

  v_is_correct := (p_selected_choice_index = v_correct_index);

  if v_is_correct then
    v_points := round(100 - (50.0 * v_elapsed_ms / 15000.0))::int;
  else
    v_points := 0;
  end if;

  insert into answers (
    question_state_id, participant_id, selected_choice_index,
    is_correct, elapsed_ms, points
  ) values (
    p_question_state_id, p_participant_id, p_selected_choice_index,
    v_is_correct, v_elapsed_ms, v_points
  );

  insert into leaderboard_entries (
    round_id, participant_id, display_name, total_points, total_elapsed_ms, progress, updated_at
  ) values (
    v_round_id, p_participant_id, v_display_name, v_points, v_elapsed_ms, 1, now()
  )
  on conflict (round_id, participant_id) do update
  set total_points = leaderboard_entries.total_points + excluded.total_points,
      total_elapsed_ms = leaderboard_entries.total_elapsed_ms + excluded.total_elapsed_ms,
      progress = leaderboard_entries.progress + 1,
      display_name = excluded.display_name,
      updated_at = now();
exception
  when unique_violation then
    raise exception 'already answered';
end;
$$;

grant execute on function submit_lockstep_answer(uuid, uuid, int) to anon;

-- 3) Book Match: the round carries the ceremony. Previously each phone ran
--    its own local 3-2-1 the instant it noticed status='active', so phones
--    that noticed a second apart counted down a second apart — and the LED
--    screen and admin panel had no ceremony at all. Stamping the moment the
--    boards open makes all three views count down off one server timestamp.
create or replace function start_round(p_round_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform close_sibling_rounds(p_round_id);
  update rounds
  set status = 'active',
      started_at = now() + interval '3 seconds'
  where id = p_round_id;
end;
$$;

revoke all on function start_round(uuid) from public;
grant execute on function start_round(uuid) to service_role;

-- Check-in is what stamps a participant's authoritative 75s window, so it is
-- also where an early board would be bought — refuse it until the ceremony
-- has actually elapsed.
create or replace function bookmatch_check_in(p_round_id uuid, p_participant_id uuid)
returns table (id uuid, started_at timestamptz, ends_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_round_status text;
  v_round_started_at timestamptz;
  v_display_name text;
begin
  -- Bare `id`/`started_at` are ambiguous here: RETURNS TABLE makes both
  -- PL/pgSQL variables in this function's scope, colliding with any
  -- unqualified column reference — every lookup below must qualify them.
  select rounds.status, rounds.started_at
    into v_round_status, v_round_started_at
    from rounds where rounds.id = p_round_id;

  if v_round_status is distinct from 'active' then
    raise exception 'round is not active';
  end if;
  if v_round_started_at is not null and now() < v_round_started_at then
    raise exception 'round has not started yet';
  end if;

  select display_name into v_display_name from participants where participants.id = p_participant_id;
  if not found then
    raise exception 'unknown participant: %', p_participant_id;
  end if;

  insert into book_match_sessions (round_id, participant_id, started_at, ends_at)
  values (p_round_id, p_participant_id, now(), now() + interval '75 seconds')
  on conflict (round_id, participant_id) do nothing;

  insert into leaderboard_entries (round_id, participant_id, display_name, updated_at)
  values (p_round_id, p_participant_id, v_display_name, now())
  on conflict (round_id, participant_id) do nothing;

  return query
    select s.id, s.started_at, s.ends_at
    from book_match_sessions s
    where s.round_id = p_round_id and s.participant_id = p_participant_id;
end;
$$;

grant execute on function bookmatch_check_in(uuid, uuid) to anon;

-- 4) Reset must clear the new column too, or a re-run of a game would start
--    with a stale ceremony timestamp already in the past.
create or replace function reset_game(p_game_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from round_results where round_id in (select id from rounds where game_slug = p_game_slug);
  delete from leaderboard_entries where round_id in (select id from rounds where game_slug = p_game_slug);
  delete from participants where game_slug = p_game_slug; -- cascades answers / book_match_sessions / book_match_answers

  update question_state
  set started_at = null, closed_at = null
  where round_id in (select id from rounds where game_slug = p_game_slug);

  update rounds set status = 'pending', started_at = null where game_slug = p_game_slug;
end;
$$;

revoke all on function reset_game(text) from public;
grant execute on function reset_game(text) to service_role;
