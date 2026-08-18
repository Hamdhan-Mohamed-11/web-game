-- RPC functions. Functions marked SECURITY DEFINER are the only code paths
-- that ever read an answer key; the anon role has no direct SELECT grant on
-- correct_choice_index / book_match_pairs (see 0003_rls.sql).

-- ---------------------------------------------------------------------------
-- Participant join (anon-callable directly)
-- ---------------------------------------------------------------------------
create or replace function join_game(p_game_slug text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := btrim(coalesce(p_display_name, ''));
  v_id uuid;
begin
  if v_name = '' then
    raise exception 'display_name is required';
  end if;
  if length(v_name) > 40 then
    v_name := left(v_name, 40);
  end if;
  if not exists (select 1 from games where slug = p_game_slug) then
    raise exception 'unknown game: %', p_game_slug;
  end if;

  insert into participants (game_slug, display_name)
  values (p_game_slug, v_name)
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function join_game(text, text) to anon;

-- ---------------------------------------------------------------------------
-- Admin: start a lockstep question (First Lines / Genre Crown).
-- Only ever called from a server route after the admin-cookie check, using
-- the service-role client — so EXECUTE is restricted to service_role only.
-- ---------------------------------------------------------------------------
create or replace function start_question(p_round_id uuid, p_question_index int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update rounds set status = 'active' where id = p_round_id;

  update question_state
  set started_at = now(), closed_at = null
  where round_id = p_round_id and question_index = p_question_index;

  if not found then
    raise exception 'no such question: round % index %', p_round_id, p_question_index;
  end if;
end;
$$;

revoke all on function start_question(uuid, int) from public;
grant execute on function start_question(uuid, int) to service_role;

-- ---------------------------------------------------------------------------
-- Participant: submit an answer to a lockstep question (anon-callable).
-- Elapsed time and correctness are computed entirely from server timestamps;
-- the client only ever supplies which choice it picked.
-- ---------------------------------------------------------------------------
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
    where qs.id = p_question_state_id
    for update of qs;

  if not found then
    raise exception 'unknown question_state: %', p_question_state_id;
  end if;
  if v_started_at is null then
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

  v_points := case
    when not v_is_correct then 0
    when v_elapsed_ms <= 5000 then 100
    when v_elapsed_ms <= 10000 then 75
    else 50
  end;

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

-- ---------------------------------------------------------------------------
-- Admin: start a round (used for Book Match's synchronized ceremonial start,
-- and to mark a Genre Crown sub-round as active).
-- ---------------------------------------------------------------------------
create or replace function start_round(p_round_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update rounds set status = 'active' where id = p_round_id;
$$;

revoke all on function start_round(uuid) from public;
grant execute on function start_round(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Participant: check in to Book Match once their local countdown ends.
-- Stamps THIS participant's own server-authoritative 75s window. Idempotent
-- so a reconnect doesn't reset the clock.
-- ---------------------------------------------------------------------------
create or replace function bookmatch_check_in(p_round_id uuid, p_participant_id uuid)
returns table (id uuid, started_at timestamptz, ends_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_round_status text;
  v_display_name text;
begin
  -- Bare `id` is ambiguous here: RETURNS TABLE(id uuid, ...) makes `id` a
  -- PL/pgSQL variable in this function's scope, colliding with any
  -- unqualified `id` column reference — every lookup below must qualify it.
  select status into v_round_status from rounds where rounds.id = p_round_id;
  if v_round_status is distinct from 'active' then
    raise exception 'round is not active';
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

-- ---------------------------------------------------------------------------
-- Participant: attempt one match in Book Match (anon-callable).
-- Returns whether the attempt was correct so the UI can lock/unlock the
-- cards immediately, per the spec's real-time matching flow.
-- ---------------------------------------------------------------------------
create or replace function bookmatch_submit_match(
  p_session_id uuid,
  p_item_key text,
  p_selected_key text
)
returns table (is_correct boolean, is_finished boolean, correct_matches_count int, total_points int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session book_match_sessions%rowtype;
  v_correct_key text;
  v_already boolean;
  v_is_correct boolean;
  v_new_count int;
  v_new_points int;
  v_elapsed_ms int;
  v_bonus int;
begin
  select * into v_session from book_match_sessions where id = p_session_id for update;
  if not found then
    raise exception 'unknown session: %', p_session_id;
  end if;
  if v_session.started_at is null or now() >= v_session.ends_at or v_session.is_finished then
    raise exception 'session is not accepting matches';
  end if;

  -- Bare `is_correct` would be ambiguous here for the same reason as in
  -- bookmatch_check_in above: this function's RETURNS TABLE names an
  -- `is_correct` OUT parameter, so the column must be table-qualified.
  select exists (
    select 1 from book_match_answers
    where book_match_session_id = p_session_id
      and item_key = p_item_key
      and book_match_answers.is_correct
  ) into v_already;
  if v_already then
    raise exception 'item already matched';
  end if;

  select correct_key into v_correct_key from book_match_pairs where item_key = p_item_key;
  if v_correct_key is null then
    raise exception 'unknown item: %', p_item_key;
  end if;

  v_is_correct := (v_correct_key = p_selected_key);

  if v_is_correct then
    insert into book_match_answers (book_match_session_id, item_key, matched_key, is_correct)
    values (p_session_id, p_item_key, p_selected_key, true);

    v_new_count := v_session.correct_matches_count + 1;
    v_new_points := v_session.total_points + 50;

    if v_new_count >= 12 then
      v_elapsed_ms := greatest(0, floor(extract(epoch from (now() - v_session.started_at)) * 1000))::int;
      v_bonus := case
        when v_elapsed_ms <= 30000 then 400
        when v_elapsed_ms <= 45000 then 300
        when v_elapsed_ms <= 60000 then 200
        else 100
      end;
      v_new_points := v_new_points + v_bonus;

      update book_match_sessions
      set correct_matches_count = v_new_count,
          total_points = v_new_points,
          is_finished = true,
          completed_at = now()
      where id = p_session_id;
    else
      update book_match_sessions
      set correct_matches_count = v_new_count,
          total_points = v_new_points
      where id = p_session_id;
    end if;

    update leaderboard_entries
    set total_points = v_new_points,
        progress = v_new_count,
        is_finished = (v_new_count >= 12),
        score_reached_at = now(),
        updated_at = now()
    where round_id = v_session.round_id and participant_id = v_session.participant_id;
  else
    v_new_count := v_session.correct_matches_count;
    v_new_points := v_session.total_points;
  end if;

  return query select v_is_correct, (v_new_count >= 12), v_new_count, v_new_points;
end;
$$;

grant execute on function bookmatch_submit_match(uuid, text, text) to anon;

-- ---------------------------------------------------------------------------
-- Admin: confirm final winners for a round (freezes a snapshot for the LED).
-- ---------------------------------------------------------------------------
create or replace function confirm_round(p_round_id uuid, p_winners jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update rounds set status = 'confirmed' where id = p_round_id;

  insert into round_results (round_id, winners)
  values (p_round_id, p_winners)
  on conflict (round_id) do update set winners = excluded.winners, confirmed_at = now();
end;
$$;

revoke all on function confirm_round(uuid, jsonb) from public;
grant execute on function confirm_round(uuid, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Admin: wipe rehearsal data for a game before doors open.
-- ---------------------------------------------------------------------------
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

  update rounds set status = 'pending' where game_slug = p_game_slug;
end;
$$;

revoke all on function reset_game(text) from public;
grant execute on function reset_game(text) to service_role;
