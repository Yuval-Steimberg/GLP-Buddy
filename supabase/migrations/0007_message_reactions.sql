-- ===========================================================================
-- Fix: reacting to a BUDDY's message was blocked by RLS.
--
-- The original `msg_rw` policy used `for all` with
--   with check (... and sender_id = auth.uid())
-- That WITH CHECK also applies to UPDATEs, so adding a reaction to a message
-- your buddy sent (sender_id <> you) was rejected by Postgres — surfacing as an
-- unhandled error and reactions silently failing. Same flaw on trio_messages.
--
-- We split the blanket policy into per-command policies: INSERT/DELETE stay
-- restricted to the author, while UPDATE (used only for reactions) is allowed
-- for any member of the relationship / trio.
-- ===========================================================================

-- ---- messages -------------------------------------------------------------
drop policy if exists msg_rw on public.messages;

create policy msg_select on public.messages
  for select to authenticated
  using (public.is_relationship_member(relationship_id));

create policy msg_insert on public.messages
  for insert to authenticated
  with check (public.is_relationship_member(relationship_id) and sender_id = auth.uid());

create policy msg_update on public.messages
  for update to authenticated
  using (public.is_relationship_member(relationship_id))
  with check (public.is_relationship_member(relationship_id));

create policy msg_delete on public.messages
  for delete to authenticated
  using (public.is_relationship_member(relationship_id) and sender_id = auth.uid());

-- ---- trio_messages (same fix) ---------------------------------------------
drop policy if exists tmsg_rw on public.trio_messages;

create policy tmsg_select on public.trio_messages
  for select to authenticated
  using (public.is_trio_member(trio_id));

create policy tmsg_insert on public.trio_messages
  for insert to authenticated
  with check (public.is_trio_member(trio_id) and sender_id = auth.uid());

create policy tmsg_update on public.trio_messages
  for update to authenticated
  using (public.is_trio_member(trio_id))
  with check (public.is_trio_member(trio_id));

create policy tmsg_delete on public.trio_messages
  for delete to authenticated
  using (public.is_trio_member(trio_id) and sender_id = auth.uid());
