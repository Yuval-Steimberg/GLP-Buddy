-- 0014 — "Hey Coach" in the shared buddy chat (server-authored, privacy-first).
-- A buddy summons the AI Coach in their 1:1 chat by typing "Hey Coach …". The
-- reply is posted as a normal message row flagged `from_coach`, so it syncs to
-- BOTH buddies over the existing realtime publication.
--
-- HARDENING (see also the ask-coach Edge Function):
--   * Coach messages are inserted ONLY by the Edge Function using the service
--     role. Normal clients are revoked the ability to set `from_coach`, so a
--     tampered client can NOT fake a Coach bubble to their buddy.
--   * The Edge Function sends ONLY the user's typed question to the model — no
--     names, no chat history, no profile/health data ("never talk about
--     personal data"). Nothing about the conversation is stored beyond the
--     single reply row.
--   * The no-medical-advice guardrail stays in the function's server-side prompt.

alter table public.messages
  add column if not exists from_coach boolean not null default false;

-- Column-scoped INSERT (same pattern as 0010's reactions-only UPDATE): normal
-- clients may insert every real message column EXCEPT from_coach. service_role
-- (the Edge Function) keeps full privileges and is the only writer that can set
-- from_coach = true.
revoke insert on public.messages from authenticated;
grant insert (relationship_id, sender_id, text, image_url, reply_to)
  on public.messages to authenticated;
