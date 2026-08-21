-- The 3-2-1 lead-in was firing before every single question, not just at the
-- start of a round — First Lines showed it 10 times, Genre Crown 20 times.
-- Restrict the ceremony to question_index = 0 (the start of each round):
-- First Lines has one round (1 ceremony), Genre Crown has two rounds
-- (fiction + non-fiction, 2 ceremonies), Book Match's ceremony already lives
-- on start_round (1 ceremony) and is untouched — 4 ceremonies total across
-- all three games. Questions after the first now open immediately.
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
  set started_at = case when p_question_index = 0 then now() + interval '3 seconds' else now() end,
      closed_at = null
  where round_id = p_round_id and question_index = p_question_index;

  if not found then
    raise exception 'no such question: round % index %', p_round_id, p_question_index;
  end if;
end;
$$;
