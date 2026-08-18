-- Concurrency fix + admin live stats.
--
-- 1) submit_lockstep_answer previously took `for update of qs` on the
--    question_state row. Every participant answering the SAME question
--    contends on that one row, so 150 simultaneous answers serialized
--    behind a single lock. The lock was never needed: this function only
--    READS question_state, and double-submission is already prevented by
--    the unique(question_state_id, participant_id) constraint on answers.
--    Removing it lets all participants score in parallel.
--
--    Note on fairness: Postgres `now()` is transaction-start time, so lock
--    waiting never inflated anyone's elapsed_ms. This is purely throughput.

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

-- 2) start_question used to unconditionally `update rounds set
--    status='active'`. From question 2 onward the status is ALREADY
--    'active', so that was a no-op write that still fanned a Realtime
--    message out to every connected participant — doubling the per-question
--    message count for no benefit. Supabase Realtime bills one message per
--    receiving client, so on a 150-player game that wasted 150 messages
--    against the plan's messages/second quota on every single question.
--    Guarding the update halves per-question Realtime load.
create or replace function start_question(p_round_id uuid, p_question_index int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
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

-- 3) Live answer counts for the admin panel, so the MC can see how many
--    people have answered the current question without exposing anything
--    about WHICH answers were given (the answers table stays ungranted to
--    anon — see 0003_rls.sql — because is_correct leaks the answer key).
--    SECURITY DEFINER + aggregate-only return keeps that guarantee.
create or replace function question_answer_stats(p_question_state_id uuid)
returns table (answered_count int, participant_count int)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*)::int from answers a where a.question_state_id = p_question_state_id),
    (select count(*)::int
       from participants p
       join question_state qs on qs.id = p_question_state_id
       join rounds r on r.id = qs.round_id
      where p.game_slug = r.game_slug);
$$;

grant execute on function question_answer_stats(uuid) to anon;
