-- Single-QR flow: participants scan one code to a hub listing all 3 games,
-- where at most one is unlocked at a time. The admin advances the event by
-- unlocking the next game (which atomically locks the others), instead of
-- each game having its own separate QR code.

alter table games add column is_unlocked boolean not null default false;

-- games was already anon-readable (see 0003_rls.sql) for display_name; the
-- new column rides on that same safe grant. It does need to be added to the
-- realtime publication so the hub page updates live without a refresh.
alter publication supabase_realtime add table games;

-- Unlocks exactly one game and locks every other one in the same
-- transaction, so there's never a moment where two games are unlocked at
-- once (or zero, mid-toggle) if the admin issues the calls in sequence.
-- p_game_slug = null locks everything (used between games / before doors
-- open).
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

  -- `slug = p_game_slug` alone would be NULL (not false) for every row
  -- when p_game_slug is null, due to SQL's three-valued logic — which
  -- would try to write NULL into a NOT NULL column and fail. The explicit
  -- `is not null` guard makes the "lock everything" case set false instead.
  update games set is_unlocked = (p_game_slug is not null and slug = p_game_slug);
end;
$$;

revoke all on function set_active_game(text) from public;
grant execute on function set_active_game(text) to service_role;
