-- ============================================================================
-- GLPenPal — WIPE ALL DATA (start from zero users)
-- ============================================================================
--  ⚠️  DESTRUCTIVE AND IRREVERSIBLE. This permanently deletes every account
--      and all associated data. There is no undo. Only run this on purpose.
--
--  Because every table's foreign keys are ON DELETE CASCADE from
--  auth.users -> public.profiles -> everything else, deleting the users
--  clears the entire app. The explicit truncates afterward are a safety net
--  for any orphaned rows and to reset cleanly.
--
--  HOW TO RUN:
--    Supabase dashboard -> SQL Editor -> New query -> paste this -> Run.
-- ============================================================================

begin;

-- 1) Delete every user. Cascades to profiles and all public.* app tables,
--    and to auth.identities / auth.sessions / auth.refresh_tokens.
delete from auth.users;

-- 2) Safety net: clear any app rows not tied to a user (should be none).
truncate table
  public.push_subscriptions,
  public.trio_messages,
  public.trio_members,
  public.trios,
  public.reports_blocks,
  public.notifications,
  public.timeline_events,
  public.milestones,
  public.messages,
  public.relationships,
  public.match_approvals,
  public.profiles
restart identity cascade;

commit;

-- 3) Verify everything is empty (all counts should be 0).
select 'auth.users'        as table, count(*) from auth.users
union all select 'profiles',          count(*) from public.profiles
union all select 'match_approvals',   count(*) from public.match_approvals
union all select 'relationships',     count(*) from public.relationships
union all select 'messages',          count(*) from public.messages
union all select 'milestones',        count(*) from public.milestones
union all select 'timeline_events',   count(*) from public.timeline_events
union all select 'notifications',     count(*) from public.notifications
union all select 'reports_blocks',    count(*) from public.reports_blocks
union all select 'trios',             count(*) from public.trios
union all select 'trio_members',      count(*) from public.trio_members
union all select 'trio_messages',     count(*) from public.trio_messages
union all select 'push_subscriptions',count(*) from public.push_subscriptions;
