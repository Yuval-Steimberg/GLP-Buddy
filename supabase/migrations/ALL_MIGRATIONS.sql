-- ===========================================================================
-- GLPenPal — initial schema
-- Postgres / Supabase. All access is governed by Row Level Security (RLS):
-- a user can only read/write their own data or data for buddy relationships /
-- trios they belong to. Run with `supabase db push` (see PRODUCTION.md).
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type approval_status as enum ('pending', 'matched', 'passed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_kind as enum ('report', 'block');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- profiles  (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  age_range text,
  gender text,
  gender_preference text,
  language text,
  country text,
  medication text,
  treatment_stage text,
  current_weight_range text,
  goal_weight_range text,
  main_goal text,
  communication_preference text,
  bio text,
  interests text[] default '{}',
  accepted_safety boolean not null default false,
  onboarding_complete boolean not null default false,
  ended_relationship_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- match_approvals  (one row per "I'd like to connect")
-- ---------------------------------------------------------------------------
create table if not exists public.match_approvals (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references public.profiles(id) on delete cascade,
  to_user uuid not null references public.profiles(id) on delete cascade,
  status approval_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (from_user, to_user)
);
create index if not exists idx_approvals_to on public.match_approvals(to_user);
create index if not exists idx_approvals_from on public.match_approvals(from_user);

-- ---------------------------------------------------------------------------
-- relationships  (a mutual buddy pairing)
-- ---------------------------------------------------------------------------
create table if not exists public.relationships (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  active boolean not null default true,
  end_reason text,
  level_keys text[] not null default '{}',
  created_at timestamptz not null default now(),
  check (user_a <> user_b)
);
create index if not exists idx_rel_user_a on public.relationships(user_a);
create index if not exists idx_rel_user_b on public.relationships(user_b);

-- Helper: is the current user a member of this relationship?
create or replace function public.is_relationship_member(rel uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.relationships r
    where r.id = rel and (r.user_a = auth.uid() or r.user_b = auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  reactions text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_msg_rel on public.messages(relationship_id, created_at);

-- ---------------------------------------------------------------------------
-- milestones
-- ---------------------------------------------------------------------------
create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists idx_ms_rel on public.milestones(relationship_id, created_at);

-- ---------------------------------------------------------------------------
-- timeline_events
-- ---------------------------------------------------------------------------
create table if not exists public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  text text not null,
  ref_id uuid,
  reactions text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_tl_rel on public.timeline_events(relationship_id, created_at);

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_ntf_user on public.notifications(user_id, created_at);

-- ---------------------------------------------------------------------------
-- reports_blocks
-- ---------------------------------------------------------------------------
create table if not exists public.reports_blocks (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_user_id uuid not null references public.profiles(id) on delete cascade,
  kind report_kind not null,
  reason text,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- trios + trio_members + trio_messages
-- ---------------------------------------------------------------------------
create table if not exists public.trios (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.trio_members (
  trio_id uuid not null references public.trios(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  approved boolean not null default false,
  primary key (trio_id, user_id)
);

create or replace function public.is_trio_member(t uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.trio_members m
    where m.trio_id = t and m.user_id = auth.uid()
  );
$$;

create table if not exists public.trio_messages (
  id uuid primary key default gen_random_uuid(),
  trio_id uuid not null references public.trios(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  reactions text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_tmsg_trio on public.trio_messages(trio_id, created_at);

-- ---------------------------------------------------------------------------
-- push_subscriptions  (Web Push)
-- ---------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at trigger for profiles
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Auto-create a blank profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, coalesce(new.raw_user_meta_data->>'nickname', 'New buddy'))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table public.profiles          enable row level security;
alter table public.match_approvals   enable row level security;
alter table public.relationships      enable row level security;
alter table public.messages           enable row level security;
alter table public.milestones         enable row level security;
alter table public.timeline_events    enable row level security;
alter table public.notifications      enable row level security;
alter table public.reports_blocks     enable row level security;
alter table public.trios              enable row level security;
alter table public.trio_members       enable row level security;
alter table public.trio_messages      enable row level security;
alter table public.push_subscriptions enable row level security;

-- profiles: anyone authenticated can read (needed for match discovery);
-- only the owner can update their own row.
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated using (true);
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated with check (id = auth.uid());

-- match_approvals: a user sees approvals they sent or received; can only
-- create approvals as themselves; can update ones addressed to them.
drop policy if exists approvals_read on public.match_approvals;
create policy approvals_read on public.match_approvals
  for select to authenticated using (from_user = auth.uid() or to_user = auth.uid());
drop policy if exists approvals_insert on public.match_approvals;
create policy approvals_insert on public.match_approvals
  for insert to authenticated with check (from_user = auth.uid());
drop policy if exists approvals_update on public.match_approvals;
create policy approvals_update on public.match_approvals
  for update to authenticated using (to_user = auth.uid() or from_user = auth.uid());

-- relationships: members only.
drop policy if exists rel_read on public.relationships;
create policy rel_read on public.relationships
  for select to authenticated using (user_a = auth.uid() or user_b = auth.uid());
drop policy if exists rel_write on public.relationships;
create policy rel_write on public.relationships
  for all to authenticated
  using (user_a = auth.uid() or user_b = auth.uid())
  with check (user_a = auth.uid() or user_b = auth.uid());

-- messages / milestones / timeline: relationship members only.
drop policy if exists msg_rw on public.messages;
create policy msg_rw on public.messages
  for all to authenticated
  using (public.is_relationship_member(relationship_id))
  with check (public.is_relationship_member(relationship_id) and sender_id = auth.uid());

drop policy if exists ms_rw on public.milestones;
create policy ms_rw on public.milestones
  for all to authenticated
  using (public.is_relationship_member(relationship_id))
  with check (public.is_relationship_member(relationship_id) and author_id = auth.uid());

drop policy if exists tl_read on public.timeline_events;
create policy tl_read on public.timeline_events
  for select to authenticated using (public.is_relationship_member(relationship_id));
drop policy if exists tl_write on public.timeline_events;
create policy tl_write on public.timeline_events
  for all to authenticated
  using (public.is_relationship_member(relationship_id))
  with check (public.is_relationship_member(relationship_id));

-- notifications: owner only.
drop policy if exists ntf_rw on public.notifications;
create policy ntf_rw on public.notifications
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- reports/blocks: reporter can insert and read their own.
drop policy if exists rpt_insert on public.reports_blocks;
create policy rpt_insert on public.reports_blocks
  for insert to authenticated with check (reporter_id = auth.uid());
drop policy if exists rpt_read on public.reports_blocks;
create policy rpt_read on public.reports_blocks
  for select to authenticated using (reporter_id = auth.uid());

-- trios: members only.
drop policy if exists trio_read on public.trios;
create policy trio_read on public.trios
  for select to authenticated using (public.is_trio_member(id) or created_by = auth.uid());
drop policy if exists trio_write on public.trios;
create policy trio_write on public.trios
  for all to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

drop policy if exists tm_read on public.trio_members;
create policy tm_read on public.trio_members
  for select to authenticated using (public.is_trio_member(trio_id) or user_id = auth.uid());
drop policy if exists tm_write on public.trio_members;
create policy tm_write on public.trio_members
  for all to authenticated using (user_id = auth.uid() or public.is_trio_member(trio_id))
  with check (true);

drop policy if exists tmsg_rw on public.trio_messages;
create policy tmsg_rw on public.trio_messages
  for all to authenticated
  using (public.is_trio_member(trio_id))
  with check (public.is_trio_member(trio_id) and sender_id = auth.uid());

-- push subscriptions: owner only.
drop policy if exists push_rw on public.push_subscriptions;
create policy push_rw on public.push_subscriptions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
-- ===========================================================================
-- approve_buddy(target): the one entry point for "I'd like to connect".
-- Records the caller's approval and, if the target has already approved the
-- caller, atomically creates the mutual relationship + a welcome timeline
-- moment + notifications for both users. Enforces the 3-buddy limit.
-- Returns the relationship id when a match was created, otherwise null.
-- ===========================================================================
create or replace function public.approve_buddy(target uuid)
returns uuid
language plpgsql
security definer
as $$
declare
  me uuid := auth.uid();
  reciprocal uuid;
  active_count int;
  rel_id uuid;
  my_name text;
  their_name text;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if me = target then raise exception 'cannot match with yourself'; end if;

  select count(*) into active_count from public.relationships
    where active and (user_a = me or user_b = me);
  if active_count >= 3 then
    raise exception 'buddy limit reached';
  end if;

  -- Record / upsert my approval.
  insert into public.match_approvals (from_user, to_user, status)
  values (me, target, 'pending')
  on conflict (from_user, to_user) do nothing;

  -- Has the target already approved me?
  select id into reciprocal from public.match_approvals
    where from_user = target and to_user = me and status = 'pending';

  if reciprocal is null then
    return null; -- waiting on them
  end if;

  -- Mutual! Mark both approvals matched and create the relationship.
  update public.match_approvals set status = 'matched'
    where (from_user = me and to_user = target)
       or (from_user = target and to_user = me);

  insert into public.relationships (user_a, user_b)
  values (me, target) returning id into rel_id;

  select nickname into my_name from public.profiles where id = me;
  select nickname into their_name from public.profiles where id = target;

  insert into public.timeline_events (relationship_id, author_id, type, text)
  values (rel_id, me, 'moment',
    my_name || ' and ' || their_name || ' are now buddies! Say hi 👋');

  insert into public.notifications (user_id, type, title, body, link) values
    (me, 'match_created', 'You''re now buddies with ' || their_name || '!',
     'Your private buddy space is ready.', '/home'),
    (target, 'match_created', 'You''re now buddies with ' || my_name || '!',
     'Your private buddy space is ready.', '/home');

  return rel_id;
end; $$;

grant execute on function public.approve_buddy(uuid) to authenticated;
-- ===========================================================================
-- Server-side notifications. Clients cannot insert notifications for another
-- user (RLS), so these SECURITY DEFINER triggers create the buddy's
-- notification when a message or milestone is inserted.
-- ===========================================================================

create or replace function public.notify_on_message()
returns trigger language plpgsql security definer as $$
declare
  rel public.relationships;
  recipient uuid;
  sender_name text;
begin
  select * into rel from public.relationships where id = new.relationship_id;
  recipient := case when rel.user_a = new.sender_id then rel.user_b else rel.user_a end;
  select nickname into sender_name from public.profiles where id = new.sender_id;
  insert into public.notifications (user_id, type, title, body, link)
  values (recipient, 'message', sender_name || ' sent you a message',
          left(new.text, 120), '/chat/' || rel.id);
  return new;
end; $$;

drop trigger if exists trg_notify_message on public.messages;
create trigger trg_notify_message after insert on public.messages
  for each row execute function public.notify_on_message();

create or replace function public.notify_on_milestone()
returns trigger language plpgsql security definer as $$
declare
  rel public.relationships;
  recipient uuid;
  author_name text;
  is_goal boolean := new.type = 'Reached goal weight';
begin
  select * into rel from public.relationships where id = new.relationship_id;
  recipient := case when rel.user_a = new.author_id then rel.user_b else rel.user_a end;
  select nickname into author_name from public.profiles where id = new.author_id;
  insert into public.notifications (user_id, type, title, body, link)
  values (
    recipient,
    case when is_goal then 'goal_reached' else 'milestone' end,
    author_name || ' added a milestone',
    case when is_goal then author_name || ' reached their goal weight! 🎯'
         else new.type || '. React or comment to cheer them on.' end,
    '/timeline');
  return new;
end; $$;

drop trigger if exists trg_notify_milestone on public.milestones;
create trigger trg_notify_milestone after insert on public.milestones
  for each row execute function public.notify_on_milestone();
-- ===========================================================================
-- Compliance (age + terms versioning) and staff moderation access.
-- ===========================================================================

alter table public.profiles
  add column if not exists age_confirmed boolean not null default false,
  add column if not exists terms_version text,
  add column if not exists is_staff boolean not null default false;

-- Staff can read every report/block for the moderation dashboard.
-- (Grant a user staff access manually: update public.profiles set is_staff = true where id = '...';)
create or replace function public.is_staff()
returns boolean language sql security definer stable as $$
  select coalesce((select is_staff from public.profiles where id = auth.uid()), false);
$$;

drop policy if exists rpt_staff_read on public.reports_blocks;
create policy rpt_staff_read on public.reports_blocks
  for select to authenticated using (public.is_staff());

drop policy if exists rpt_staff_update on public.reports_blocks;
create policy rpt_staff_update on public.reports_blocks
  for update to authenticated using (public.is_staff()) with check (public.is_staff());
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
-- ===========================================================================
-- Let a signed-in user permanently delete their own account and all their
-- data. Deleting the auth.users row cascades to public.profiles (FK ON DELETE
-- CASCADE), which in turn cascades to every table that references profiles —
-- messages, relationships, milestones, notifications, trios, etc. So one
-- delete removes the account and every trace of the user's data.
-- ===========================================================================
create or replace function public.delete_own_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

grant execute on function public.delete_own_account() to authenticated;
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
-- ===========================================================================
-- Profile pictures. Stored as a small compressed data URL directly on the
-- profile row (no Storage bucket / extra RLS to configure). The client resizes
-- images to a thumbnail before saving, so rows stay small.
-- ===========================================================================
alter table public.profiles
  add column if not exists avatar_url text;
-- ===========================================================================
-- Image messages in chat. The (compressed) image is stored as a data URL on
-- the message row — protected by the same relationship RLS as the text, and
-- no Storage bucket to configure. `text` is now optional (image-only messages).
-- ===========================================================================
alter table public.messages
  add column if not exists image_url text;

alter table public.messages
  alter column text drop not null;
-- ===========================================================================
-- 0010 — Security hardening.
--
-- Closes a set of authorization holes found in a security review. The common
-- theme: several policies were written as row-ownership-only, but Postgres RLS
-- cannot restrict *columns* or *insert shape*, so members could write columns
-- they shouldn't. We fix these with column-level GRANTs, tighter WITH CHECKs,
-- SECURITY DEFINER RPCs for privileged writes, and value constraints.
--
-- Safe to re-run (idempotent where practical).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- C-1 — Privilege escalation / compliance-flag tampering via profiles UPDATE.
-- RLS `profiles_update` only checks WHICH row, not WHICH columns, and Supabase
-- grants UPDATE on all columns to `authenticated`. So a user could
-- `update profiles set is_staff = true where id = auth.uid()` and read every
-- abuse report, or forge accepted_safety / age_confirmed / onboarding_complete.
-- Fix: revoke blanket UPDATE and re-grant only the user-editable columns.
-- Privileged flags move to the SECURITY DEFINER RPCs below.
-- ---------------------------------------------------------------------------
revoke update on public.profiles from authenticated;
grant update (
  nickname, age_range, gender, gender_preference, language, country,
  medication, treatment_stage, current_weight_range, goal_weight_range,
  main_goal, communication_preference, bio, interests, avatar_url
) on public.profiles to authenticated;

-- Mark onboarding complete for the caller only (replaces the client writing
-- onboarding_complete directly).
create or replace function public.mark_onboarding_complete()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set onboarding_complete = true where id = auth.uid();
$$;
grant execute on function public.mark_onboarding_complete() to authenticated;

-- Record safety + age acceptance for the caller only. is_staff can never be
-- set through here (or anywhere reachable by `authenticated`).
create or replace function public.accept_safety(p_terms_version text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
     set accepted_safety = true,
         age_confirmed = true,
         terms_version = p_terms_version
   where id = auth.uid();
$$;
grant execute on function public.accept_safety(text) to authenticated;

-- ---------------------------------------------------------------------------
-- H-3 — A buddy could rewrite the OTHER person's message text/image, not just
-- react. 0007 widened UPDATE to any relationship/trio member (correct for
-- reactions) but RLS can't scope columns. Restrict UPDATE to `reactions` only.
-- ---------------------------------------------------------------------------
revoke update on public.messages from authenticated;
grant update (reactions) on public.messages to authenticated;

revoke update on public.trio_messages from authenticated;
grant update (reactions) on public.trio_messages to authenticated;

revoke update on public.timeline_events from authenticated;
grant update (reactions) on public.timeline_events to authenticated;

-- M-1 — timeline_events could be inserted with author_id set to the OTHER
-- member (unlike messages/milestones which pin sender/author to auth.uid()).
-- Also drop the over-broad `for all` write policy in favour of scoped ones.
drop policy if exists tl_write on public.timeline_events;
drop policy if exists tl_read on public.timeline_events;

create policy tl_select on public.timeline_events
  for select to authenticated
  using (public.is_relationship_member(relationship_id));

create policy tl_insert on public.timeline_events
  for insert to authenticated
  with check (public.is_relationship_member(relationship_id) and author_id = auth.uid());

create policy tl_update on public.timeline_events
  for update to authenticated
  using (public.is_relationship_member(relationship_id))
  with check (public.is_relationship_member(relationship_id));

create policy tl_delete on public.timeline_events
  for delete to authenticated
  using (public.is_relationship_member(relationship_id) and author_id = auth.uid());

-- ---------------------------------------------------------------------------
-- H-2 — A user could unilaterally INSERT a relationship pairing themselves with
-- any victim, bypassing approve_buddy (mutual consent + 3-buddy limit) and
-- creating an unconsented DM channel. Relationships must only be created by the
-- approve_buddy RPC (SECURITY DEFINER, runs as owner → bypasses RLS). Remove
-- INSERT/DELETE from the client and keep member UPDATE (end / set levels).
-- ---------------------------------------------------------------------------
revoke insert, delete on public.relationships from authenticated;
drop policy if exists rel_write on public.relationships;
create policy rel_update on public.relationships
  for update to authenticated
  using (user_a = auth.uid() or user_b = auth.uid())
  with check (user_a = auth.uid() or user_b = auth.uid());

-- ---------------------------------------------------------------------------
-- C-2 — trio_members had `with check (true)`: any user could insert an
-- arbitrary (approved) membership into any trio and read its private chat.
-- Constrain inserts to self, or to members the trio's creator is adding.
-- ---------------------------------------------------------------------------
drop policy if exists tm_write on public.trio_members;
create policy tm_write on public.trio_members
  for all to authenticated
  using (user_id = auth.uid() or public.is_trio_member(trio_id))
  with check (
    user_id = auth.uid()
    or exists (select 1 from public.trios t
                where t.id = trio_id and t.created_by = auth.uid())
  );

-- Approve a trio membership (self only) and activate the trio once everyone has
-- approved. Moves activation server-side (previously a non-creator's approval
-- would fail the trios UPDATE policy).
create or replace function public.approve_trio_membership(p_trio uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.trio_members
     set approved = true
   where trio_id = p_trio and user_id = auth.uid();

  if not exists (
    select 1 from public.trio_members where trio_id = p_trio and approved = false
  ) then
    update public.trios set active = true where id = p_trio;
  end if;
end;
$$;
grant execute on function public.approve_trio_membership(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- L-3 — give approvals_update an explicit WITH CHECK (it reused USING).
-- ---------------------------------------------------------------------------
drop policy if exists approvals_update on public.match_approvals;
create policy approvals_update on public.match_approvals
  for update to authenticated
  using (to_user = auth.uid() or from_user = auth.uid())
  with check (to_user = auth.uid() or from_user = auth.uid());

-- ---------------------------------------------------------------------------
-- M-4 — data-URL columns (images/avatars stored inline) had no size bound. A
-- crafted client could insert a 50 MB data URL, bloating storage and flooding
-- realtime subscribers. Cap length (~3 MB of base64 ≈ 2.2 MB binary).
-- ---------------------------------------------------------------------------
alter table public.messages
  drop constraint if exists messages_text_len,
  drop constraint if exists messages_image_len;
alter table public.messages
  add constraint messages_text_len check (text is null or char_length(text) <= 8000),
  add constraint messages_image_len check (image_url is null or char_length(image_url) <= 3000000);

alter table public.trio_messages
  drop constraint if exists trio_messages_text_len;
alter table public.trio_messages
  add constraint trio_messages_text_len check (char_length(text) <= 8000);

alter table public.profiles
  drop constraint if exists profiles_avatar_len,
  drop constraint if exists profiles_bio_len;
alter table public.profiles
  add constraint profiles_avatar_len check (avatar_url is null or char_length(avatar_url) <= 500000),
  add constraint profiles_bio_len check (bio is null or char_length(bio) <= 2000);

alter table public.timeline_events
  drop constraint if exists timeline_text_len;
alter table public.timeline_events
  add constraint timeline_text_len check (char_length(text) <= 8000);

-- ---------------------------------------------------------------------------
-- SSRF — push_subscriptions.endpoint was unconstrained. A user could store an
-- internal/attacker URL for their own row, then trigger send-push to POST to
-- it (SSRF from Supabase infra + leaks a VAPID-signed JWT). Constrain to the
-- known Web Push service hosts. (send-push also re-validates — defence in depth.)
-- ---------------------------------------------------------------------------
alter table public.push_subscriptions
  drop constraint if exists push_endpoint_host;
alter table public.push_subscriptions
  add constraint push_endpoint_host check (
    endpoint ~ '^https://([a-z0-9-]+\.)*(googleapis\.com|push\.apple\.com|notify\.windows\.com|push\.services\.mozilla\.com|windows\.com)/'
  );

-- ---------------------------------------------------------------------------
-- M-2 — image-only messages made messages.text nullable (0009) but the notify
-- trigger still did left(new.text,120) → NULL into notifications.body (NOT
-- NULL) → the AFTER INSERT trigger aborted the whole message insert. So sending
-- a photo with no caption FAILED silently in production. coalesce fixes it.
-- Also pin search_path (M-3) on the definer trigger functions.
-- ---------------------------------------------------------------------------
create or replace function public.notify_on_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  rel public.relationships;
  recipient uuid;
  sender_name text;
begin
  select * into rel from public.relationships where id = new.relationship_id;
  recipient := case when rel.user_a = new.sender_id then rel.user_b else rel.user_a end;
  select nickname into sender_name from public.profiles where id = new.sender_id;
  insert into public.notifications (user_id, type, title, body, link)
  values (recipient, 'message', sender_name || ' sent you a message',
          coalesce(nullif(left(new.text, 120), ''), 'Sent a photo'), '/chat/' || rel.id);
  return new;
end; $$;

create or replace function public.notify_on_milestone()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  rel public.relationships;
  recipient uuid;
  author_name text;
  is_goal boolean := new.type = 'Reached goal weight';
begin
  select * into rel from public.relationships where id = new.relationship_id;
  recipient := case when rel.user_a = new.author_id then rel.user_b else rel.user_a end;
  select nickname into author_name from public.profiles where id = new.author_id;
  insert into public.notifications (user_id, type, title, body, link)
  values (
    recipient,
    case when is_goal then 'goal_reached' else 'milestone' end,
    author_name || ' added a milestone',
    case when is_goal then author_name || ' reached their goal weight!'
         else new.type || '. React or comment to cheer them on.' end,
    '/timeline');
  return new;
end; $$;

-- ---------------------------------------------------------------------------
-- M-3 — pin search_path on the remaining SECURITY DEFINER functions (mutable
-- search_path is a definer-privilege-escalation hardening gap).
-- ---------------------------------------------------------------------------
create or replace function public.is_relationship_member(rel uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (
    select 1 from public.relationships r
    where r.id = rel and (r.user_a = auth.uid() or r.user_b = auth.uid())
  );
$$;

create or replace function public.is_trio_member(t uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (
    select 1 from public.trio_members m
    where m.trio_id = t and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_staff()
returns boolean language sql security definer stable set search_path = '' as $$
  select coalesce((select is_staff from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, coalesce(new.raw_user_meta_data->>'nickname', 'New buddy'))
  on conflict (id) do nothing;
  return new;
end; $$;

-- approve_buddy: pin search_path, enforce the buddy limit for BOTH sides, and
-- keep it the sole path that creates relationships.
create or replace function public.approve_buddy(target uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  reciprocal uuid;
  rel_id uuid;
  my_name text;
  their_name text;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if me = target then raise exception 'cannot match with yourself'; end if;

  if (select count(*) from public.relationships where active and (user_a = me or user_b = me)) >= 3 then
    raise exception 'buddy limit reached';
  end if;
  if (select count(*) from public.relationships where active and (user_a = target or user_b = target)) >= 3 then
    raise exception 'that person already has the maximum number of buddies';
  end if;

  insert into public.match_approvals (from_user, to_user, status)
  values (me, target, 'pending')
  on conflict (from_user, to_user) do nothing;

  select id into reciprocal from public.match_approvals
    where from_user = target and to_user = me and status = 'pending';
  if reciprocal is null then
    return null;
  end if;

  update public.match_approvals set status = 'matched'
    where (from_user = me and to_user = target)
       or (from_user = target and to_user = me);

  insert into public.relationships (user_a, user_b)
  values (me, target) returning id into rel_id;

  select nickname into my_name from public.profiles where id = me;
  select nickname into their_name from public.profiles where id = target;

  insert into public.timeline_events (relationship_id, author_id, type, text)
  values (rel_id, me, 'moment',
    my_name || ' and ' || their_name || ' are now buddies! Say hi.');

  insert into public.notifications (user_id, type, title, body, link) values
    (me, 'match_created', 'You''re now buddies with ' || their_name || '!',
     'Your private buddy space is ready.', '/home'),
    (target, 'match_created', 'You''re now buddies with ' || my_name || '!',
     'Your private buddy space is ready.', '/home');

  return rel_id;
end; $$;
grant execute on function public.approve_buddy(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- H-1 — every authenticated user could read EVERY profile's health data
-- (medication, weight ranges, goals) plus internal flags (is_staff,
-- terms_version) via `profiles_read using (true)` + client `select('*')`.
-- Fix: restrict direct profile reads to the caller and people they are actually
-- connected to (buddy, pending approval either direction, or trio co-member),
-- and serve match discovery through a bounded SECURITY DEFINER RPC that returns
-- only match-relevant columns (never staff/compliance flags).
-- ---------------------------------------------------------------------------
create or replace function public.can_view_profile(target uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select
    target = auth.uid()
    or exists (select 1 from public.relationships r
                where (r.user_a = auth.uid() and r.user_b = target)
                   or (r.user_b = auth.uid() and r.user_a = target))
    or exists (select 1 from public.match_approvals a
                where (a.from_user = auth.uid() and a.to_user = target)
                   or (a.to_user = auth.uid() and a.from_user = target))
    or exists (select 1 from public.trio_members m1
                join public.trio_members m2 on m1.trio_id = m2.trio_id
                where m1.user_id = auth.uid() and m2.user_id = target);
$$;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated using (public.can_view_profile(id));

-- Bounded discovery pool. Returns only onboarded users the caller hasn't
-- already passed/blocked (or been blocked by), with match-relevant columns
-- only. is_staff / accepted_safety / age_confirmed / terms_version are never
-- exposed. Capped so no single call can scrape the whole user base.
create or replace function public.discover_candidates(p_limit int default 200)
returns table (
  id uuid,
  nickname text,
  age_range text,
  gender text,
  gender_preference text,
  language text,
  country text,
  medication text,
  treatment_stage text,
  current_weight_range text,
  goal_weight_range text,
  main_goal text,
  communication_preference text,
  bio text,
  interests text[],
  avatar_url text,
  onboarding_complete boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select p.id, p.nickname, p.age_range, p.gender, p.gender_preference, p.language,
         p.country, p.medication, p.treatment_stage, p.current_weight_range,
         p.goal_weight_range, p.main_goal, p.communication_preference, p.bio,
         p.interests, p.avatar_url, p.onboarding_complete, p.created_at
    from public.profiles p
   where p.onboarding_complete = true
     and p.id <> auth.uid()
     and not exists (
       select 1 from public.reports_blocks b
        where (b.reporter_id = auth.uid() and b.target_user_id = p.id)
           or (b.reporter_id = p.id and b.target_user_id = auth.uid())
     )
   order by p.created_at desc
   limit greatest(1, least(coalesce(p_limit, 200), 500));
$$;
grant execute on function public.discover_candidates(int) to authenticated;

-- ---------------------------------------------------------------------------
-- Atomic reaction toggles. The client previously read the reactions array,
-- toggled it locally, and wrote the whole array back (last-writer-wins) — a
-- second reactor within the round-trip window silently erased the first. These
-- toggle server-side so concurrent reactions can't clobber each other. (UPDATE
-- runs as definer/owner but still only touches the reactions column.)
-- ---------------------------------------------------------------------------
create or replace function public.toggle_message_reaction(p_message uuid, p_reaction text)
returns void language plpgsql security definer set search_path = '' as $$
declare rel uuid;
begin
  select relationship_id into rel from public.messages where id = p_message;
  if rel is null or not public.is_relationship_member(rel) then
    raise exception 'not allowed';
  end if;
  update public.messages
     set reactions = case when p_reaction = any(reactions)
                          then array_remove(reactions, p_reaction)
                          else array_append(reactions, p_reaction) end
   where id = p_message;
end; $$;
grant execute on function public.toggle_message_reaction(uuid, text) to authenticated;

create or replace function public.toggle_timeline_reaction(p_event uuid, p_reaction text)
returns void language plpgsql security definer set search_path = '' as $$
declare rel uuid;
begin
  select relationship_id into rel from public.timeline_events where id = p_event;
  if rel is null or not public.is_relationship_member(rel) then
    raise exception 'not allowed';
  end if;
  update public.timeline_events
     set reactions = case when p_reaction = any(reactions)
                          then array_remove(reactions, p_reaction)
                          else array_append(reactions, p_reaction) end
   where id = p_event;
end; $$;
grant execute on function public.toggle_timeline_reaction(uuid, text) to authenticated;

create or replace function public.toggle_trio_reaction(p_message uuid, p_reaction text)
returns void language plpgsql security definer set search_path = '' as $$
declare t uuid;
begin
  select trio_id into t from public.trio_messages where id = p_message;
  if t is null or not public.is_trio_member(t) then
    raise exception 'not allowed';
  end if;
  update public.trio_messages
     set reactions = case when p_reaction = any(reactions)
                          then array_remove(reactions, p_reaction)
                          else array_append(reactions, p_reaction) end
   where id = p_message;
end; $$;
grant execute on function public.toggle_trio_reaction(uuid, text) to authenticated;
