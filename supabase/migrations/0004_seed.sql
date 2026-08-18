-- Seed data derived from Book-Club-Quiz-Night-Game-Plans.md.
-- Correct answer keys live ONLY here (question_answer_keys / book_match_pairs).
-- Matching display text/choices live in src/lib/data/*.ts, keyed by the same
-- (round_key, question_index) / item_key values used below — keep both in
-- sync by hand if the .md content ever changes (one-off event, no CMS).

insert into games (slug, display_name) values
  ('first-lines', 'The Famous First Lines Challenge'),
  ('genre-crown', 'The Genre Crown'),
  ('book-match', 'The Book Match Challenge');

insert into rounds (game_slug, round_key, order_index, total_questions) values
  ('first-lines', 'main', 0, 10),
  ('genre-crown', 'fiction', 0, 6),
  ('genre-crown', 'nonfiction', 1, 6),
  ('book-match', 'match', 0, 12);

-- ---------------------------------------------------------------------------
-- First Lines — 10 questions. Choice order is A/B/C/D -> index 0/1/2/3.
-- ---------------------------------------------------------------------------
do $$
declare
  v_round_id uuid := (select id from rounds where game_slug = 'first-lines' and round_key = 'main');
  v_answers int[] := array[0,1,2,0,1,0,1,2,0,2]; -- A,B,C,A,B,A,B,C,A,C
  v_qs_id uuid;
  i int;
begin
  for i in 1..array_length(v_answers, 1) loop
    insert into question_state (round_id, question_index) values (v_round_id, i - 1)
    returning id into v_qs_id;
    insert into question_answer_keys (question_state_id, correct_choice_index)
    values (v_qs_id, v_answers[i]);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Genre Crown — Fiction (6) then Non-Fiction (6).
-- ---------------------------------------------------------------------------
do $$
declare
  v_round_id uuid := (select id from rounds where game_slug = 'genre-crown' and round_key = 'fiction');
  v_answers int[] := array[1,1,0,2,1,0]; -- B,B,A,C,B,A
  v_qs_id uuid;
  i int;
begin
  for i in 1..array_length(v_answers, 1) loop
    insert into question_state (round_id, question_index) values (v_round_id, i - 1)
    returning id into v_qs_id;
    insert into question_answer_keys (question_state_id, correct_choice_index)
    values (v_qs_id, v_answers[i]);
  end loop;
end $$;

do $$
declare
  v_round_id uuid := (select id from rounds where game_slug = 'genre-crown' and round_key = 'nonfiction');
  v_answers int[] := array[1,1,2,0,2,0]; -- B,B,C,A,C,A
  v_qs_id uuid;
  i int;
begin
  for i in 1..array_length(v_answers, 1) loop
    insert into question_state (round_id, question_index) values (v_round_id, i - 1)
    returning id into v_qs_id;
    insert into question_answer_keys (question_state_id, correct_choice_index)
    values (v_qs_id, v_answers[i]);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Book Match — 12 pairs. Keys must match src/lib/data/bookMatch.items.ts.
-- ---------------------------------------------------------------------------
insert into book_match_pairs (item_key, correct_key) values
  ('charlie-chocolate-factory', 'author-roald-dahl'),
  ('fault-in-our-stars',        'author-john-green'),
  ('diary-wimpy-kid',           'author-jeff-kinney'),
  ('little-prince',             'author-saint-exupery'),
  ('matilda',                   'char-matilda-wormwood'),
  ('dune',                      'char-paul-atreides'),
  ('alice-wonderland',          'char-alice'),
  ('lion-witch-wardrobe',       'char-lucy-pevensie'),
  ('who-moved-my-cheese',       'idea-adapting-to-change'),
  ('ikigai',                    'idea-purpose-meaning'),
  ('rich-dad-poor-dad',         'idea-financial-literacy'),
  ('how-to-win-friends',        'idea-relationships-communication');
