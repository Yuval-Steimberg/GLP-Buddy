-- 0014 — "Hey Coach" in the shared buddy chat.
-- A buddy can summon the AI Coach inside their 1:1 chat by typing "Hey Coach …".
-- The asker's client calls the ask-coach Edge Function and posts the reply as a
-- normal message row flagged `from_coach`, so it syncs to BOTH buddies over the
-- existing realtime publication with no new plumbing.
--
-- Security notes:
--   * INSERT on messages is still gated by the existing RLS (sender_id =
--     auth.uid() AND relationship membership), so a coach message can only be
--     written into a chat the sender belongs to.
--   * `from_coach` is cosmetic (renders the bubble as "The Coach"); it does NOT
--     grant any privilege. It is NOT added to the reactions-only UPDATE grant
--     from 0010, so it stays immutable after insert.
--   * The no-medical-advice guardrail lives server-side in the ask-coach
--     function and is unchanged.

alter table public.messages
  add column if not exists from_coach boolean not null default false;
