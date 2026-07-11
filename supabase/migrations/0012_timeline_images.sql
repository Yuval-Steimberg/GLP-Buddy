-- ===========================================================================
-- 0012 — Photos on the timeline.
--
-- A timeline event can carry a compressed image (data URL on the row, same as
-- chat images / avatars — no Storage bucket, protected by the same relationship
-- RLS). timeline_events is already in the realtime publication, so the image
-- rides along live. Size-capped like the other data-URL columns.
-- ===========================================================================
alter table public.timeline_events
  add column if not exists image_url text;

alter table public.timeline_events
  drop constraint if exists timeline_image_len;
alter table public.timeline_events
  add constraint timeline_image_len check (image_url is null or char_length(image_url) <= 3000000);
