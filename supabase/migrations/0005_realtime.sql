-- ===========================================================================
-- Enable realtime delivery so chat, group chat, timeline and notifications
-- update live (no refresh) — like any real messaging app. Adds the relevant
-- tables to Supabase's built-in `supabase_realtime` publication. Idempotent:
-- re-running is safe (already-published tables are skipped).
-- ===========================================================================
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.trio_messages;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.timeline_events;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.milestones;
exception when duplicate_object then null; end $$;
