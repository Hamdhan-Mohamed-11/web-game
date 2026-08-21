-- Participant-facing result feedback: which choice was right, and where the
-- player finished.
--
-- The correct answer must never be readable before a player has committed.
-- question_answer_keys stays unreadable by anon (see 0003_rls.sql); these
-- SECURITY DEFINER functions are the only way out, and each one gates on the
-- player having already answered or the question having already closed.

-- 1) submit_lockstep_answer additionally reports the outcome of THIS answer.
--    Safe by construction: the row is inserted before we return, so the
--    caller has already spent their one answer on this question.
--    Return type changes (points/total_points -> +is_correct/+correct_choice_index),
--    which create-or-replace can't do.
drop function if exists submit_lockstep_answer(uuid, uuid, int);

create function submit_lockstep_answer(
  p_question_state_id uuid,
  p_participant_id uuid,
  p_selected_choice_index int
)
returns table (points int, total_points int, is_correct boolean, correct_choice_index int)
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
  v_total_points int;
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
      updated_at = now()
  returning leaderboard_entries.total_points into v_total_points;

  return query select v_points, v_total_points, v_is_correct, v_correct_index;
exception
  when unique_violation then
    raise exception 'already answered';
end;
$$;

grant execute on function submit_lockstep_answer(uuid, uuid, int) to anon;

-- 2) The reveal for players who never answered (they ran out of time), who
--    otherwise would be the only ones left not knowing. Gated on the answer
--    window having fully elapsed, so it cannot be used to peek mid-question
--    -- the 15s here is the same window submit_lockstep_answer enforces.
create or replace function get_question_result(p_question_state_id uuid)
returns table (correct_choice_index int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_started_at timestamptz;
begin
  select qs.started_at into v_started_at
    from question_state qs where qs.id = p_question_state_id;

  if not found then
    raise exception 'unknown question_state: %', p_question_state_id;
  end if;
  if v_started_at is null or now() < v_started_at + interval '15 seconds' then
    raise exception 'question is still open';
  end if;

  return query
    select qak.correct_choice_index
    from question_answer_keys qak
    where qak.question_state_id = p_question_state_id;
end;
$$;

grant execute on function get_question_result(uuid) to anon;

-- 3) Final placing for the "you came Nth of M" line on the player's phone.
--    Ordering must match useLeaderboard's exactly or a player would be told
--    a different position than the screen shows them in: points desc, then
--    the tie-break, which differs per game (see the hook's LeaderboardTieBreak).
--    rank() (not row_number()) so genuinely tied players share a placing.
create or replace function get_participant_rank(
  p_round_id uuid,
  p_participant_id uuid,
  p_tie_break text default 'elapsed'
)
returns table (rank int, total_participants int, total_points int)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with ranked as (
    select
      le.participant_id,
      le.total_points as pts,
      rank() over (
        order by
          le.total_points desc,
          case when p_tie_break = 'elapsed' then le.total_elapsed_ms end asc nulls last,
          case when p_tie_break = 'reachedAt' then le.score_reached_at end asc nulls last
      )::int as rnk
    from leaderboard_entries le
    where le.round_id = p_round_id
  )
  select r.rnk, (select count(*)::int from ranked), r.pts
  from ranked r
  where r.participant_id = p_participant_id;
end;
$$;

grant execute on function get_participant_rank(uuid, uuid, text) to anon;
