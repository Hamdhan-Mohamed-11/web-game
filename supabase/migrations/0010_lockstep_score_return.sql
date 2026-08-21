-- Participants could see their own score at game-over, but never after an
-- individual question — submit_lockstep_answer returned void. Book Match's
-- equivalent RPC already hands back total_points on every call; do the same
-- here so the play pages can show a running score, not just a final one.
-- Return type is changing (void -> table), which create-or-replace can't do.
drop function if exists submit_lockstep_answer(uuid, uuid, int);

create function submit_lockstep_answer(
  p_question_state_id uuid,
  p_participant_id uuid,
  p_selected_choice_index int
)
returns table (points int, total_points int)
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
      updated_at = now()
  returning leaderboard_entries.total_points into v_total_points;

  return query select v_points, v_total_points;
exception
  when unique_violation then
    raise exception 'already answered';
end;
$$;

grant execute on function submit_lockstep_answer(uuid, uuid, int) to anon;
