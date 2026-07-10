-- ===========================================================================
-- Image messages in chat. The (compressed) image is stored as a data URL on
-- the message row — protected by the same relationship RLS as the text, and
-- no Storage bucket to configure. `text` is now optional (image-only messages).
-- ===========================================================================
alter table public.messages
  add column if not exists image_url text;

alter table public.messages
  alter column text drop not null;
