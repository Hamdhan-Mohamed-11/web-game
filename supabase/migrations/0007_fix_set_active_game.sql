-- Fixes set_active_game: `update games set ...` with no WHERE clause was
-- rejected by Postgres's update-requires-where safety guard. `where true`
-- is intentional here (every row's is_unlocked needs re-evaluating against
-- the new active slug), not an oversight.
create or replace function set_active_game(p_game_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_game_slug is not null and not exists (select 1 from games where slug = p_game_slug) then
    raise exception 'unknown game: %', p_game_slug;
  end if;

  update games
  set is_unlocked = (p_game_slug is not null and slug = p_game_slug)
  where true;
end;
$$;

revoke all on function set_active_game(text) from public;
grant execute on function set_active_game(text) to service_role;
