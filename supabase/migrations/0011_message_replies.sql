-- ===========================================================================
-- 0011 — Reply-to-message (quoted replies, WhatsApp-style).
--
-- A message can reference the message it's replying to. Same relationship RLS
-- governs it (the quoted message is in the same relationship). ON DELETE SET
-- NULL so deleting a quoted message doesn't cascade-delete the reply.
-- messages is already in the realtime publication, so reply_to rides along.
-- ===========================================================================
alter table public.messages
  add column if not exists reply_to uuid references public.messages(id) on delete set null;
