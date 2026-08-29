-- ---------------------------------------------------------------------------
-- Panel Q&A: screener → moderator
--
-- The first cut had one page and a "star" that changed a flag in place, which
-- is why pressing it looked like the question vanished: it moved to a tab two
-- inches away on the same screen. The real workflow has two people.
--
--   audience  →  screener reads everything, hand-picks a few
--                          →  moderator reads only those, on stage, and answers
--
-- So `starred` becomes `shortlisted`, and it now means "handed to the
-- moderator" rather than "marked by me". The moderator's queue is exactly the
-- rows in that state, which is what makes the hand-off visible: a question
-- leaves the screener's inbox and appears on a different page, for a
-- different person.
-- ---------------------------------------------------------------------------

-- Drop first: the existing constraint would reject the update below.
alter table panel_questions drop constraint if exists panel_questions_status_check;

update panel_questions set status = 'shortlisted' where status = 'starred';

alter table panel_questions
  add constraint panel_questions_status_check
  check (status in ('new', 'shortlisted', 'answered', 'hidden'));

-- The moderator works oldest-first through what the screener sent, so that
-- ordering gets its own index rather than reusing the newest-first one the
-- screener's inbox uses.
create index if not exists panel_questions_shortlisted_idx
  on panel_questions (created_at asc)
  where status = 'shortlisted';
