-- ===========================================================================
-- 0015 — Premium tier flag.
--   The Journey Book (monthly auto-story) is free — it's the retention hook.
--   Premium unlocks the keepsake exports (PDF + shareable image cards).
--
-- `is_premium` is a PRIVILEGED flag, exactly like `is_staff` (migration 0010):
-- it is NOT added to the editable-column GRANT, so `authenticated` clients
-- CANNOT set it. It is written only by the service role — a future billing
-- webhook (Stripe on the web / App Store Server Notifications on native) or an
-- admin in the SQL editor. The client only ever READS it.
-- ===========================================================================

alter table public.profiles
  add column if not exists is_premium boolean not null default false;

comment on column public.profiles.is_premium is
  'Premium subscriber flag. Not client-writable (never granted UPDATE to authenticated) — set only by the billing webhook / service role, same model as is_staff.';

-- No GRANT here on purpose: migration 0010 revoked blanket UPDATE and re-grants
-- only user-editable columns. Omitting is_premium keeps it read-only to clients.
