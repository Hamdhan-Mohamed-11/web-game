-- 1) Server clock reference.
--    CountdownTimer compares a server-stamped started_at against the
--    browser's Date.now(). Any skew on the display machine corrupts the
--    reading — a laptop 8s behind the DB showed a 15s question as ~23s.
--    Clients call this once to derive an offset and correct for it.
create or replace function server_now()
returns timestamptz
language sql
stable
as $$
  select now();
$$;

grant execute on function server_now() to anon;

-- 2) Continuous speed scoring, replacing the 5-second bands.
--    Bands meant everyone inside the same window scored identically, so
--    "fastest wins" wasn't literally true. Now points decay linearly from
--    100 (instant) to 50 (at the 15s buzzer) so every second genuinely
--    counts. Endpoints match the old top and bottom bands.
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

-- 3) Starting a round must close any sibling round still marked active.
--    Genre Crown has two rounds in one game; fiction stayed 'active'
--    forever, so when non-fiction started the participant page still
--    resolved the active round to fiction and kept showing fiction
--    questions. Closing siblings makes "which round is live" unambiguous.
--    Note this writes only on an actual transition — within a round the
--    sibling is already non-active, so it costs no extra realtime traffic.
create or replace function close_sibling_rounds(p_round_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update rounds
  set status = 'closed'
  where game_slug = (select game_slug from rounds where id = p_round_id)
    and id <> p_round_id
    and status = 'active';
end;
$$;

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
  set started_at = now(), closed_at = null
  where round_id = p_round_id and question_index = p_question_index;

  if not found then
    raise exception 'no such question: round % index %', p_round_id, p_question_index;
  end if;
end;
$$;

revoke all on function start_question(uuid, int) from public;
grant execute on function start_question(uuid, int) to service_role;

create or replace function start_round(p_round_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform close_sibling_rounds(p_round_id);
  update rounds set status = 'active' where id = p_round_id;
end;
$$;

revoke all on function start_round(uuid) from public;
grant execute on function start_round(uuid) to service_role;

-- 4) Book Match trimmed 12 -> 10 pairs so the whole board fits one phone
--    screen without scrolling. Drops one character and one idea pair,
--    keeping all three pair types represented (4 authors / 3 characters /
--    3 ideas). Keys must stay in sync with src/lib/data/bookMatch.items.ts.
delete from book_match_pairs where item_key in ('lion-witch-wardrobe', 'ikigai');

-- Continuous completion bonus, same reasoning as the question scoring
-- above: decays from 400 (instant) to 100 (at the 75s buzzer).
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
  v_total_pairs int;
begin
  select count(*)::int into v_total_pairs from book_match_pairs;

  select * into v_session from book_match_sessions where id = p_session_id for update;
  if not found then
    raise exception 'unknown session: %', p_session_id;
  end if;
  if v_session.started_at is null or now() >= v_session.ends_at or v_session.is_finished then
    raise exception 'session is not accepting matches';
  end if;

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

    if v_new_count >= v_total_pairs then
      v_elapsed_ms := greatest(0, floor(extract(epoch from (now() - v_session.started_at)) * 1000))::int;
      v_bonus := round(400 - (300.0 * least(v_elapsed_ms, 75000) / 75000.0))::int;
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
        is_finished = (v_new_count >= v_total_pairs),
        score_reached_at = now(),
        updated_at = now()
    where round_id = v_session.round_id and participant_id = v_session.participant_id;
  else
    v_new_count := v_session.correct_matches_count;
    v_new_points := v_session.total_points;
  end if;

  return query select v_is_correct, (v_new_count >= v_total_pairs), v_new_count, v_new_points;
end;
$$;

grant execute on function bookmatch_submit_match(uuid, text, text) to anon;

-- Book Match's round row still advertised 12 questions.
update rounds set total_questions = 10 where game_slug = 'book-match';
