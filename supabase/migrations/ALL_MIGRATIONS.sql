-- ###########################################################################
-- GLPenPal — ALL MIGRATIONS (0001-0007), combined in order.
-- Paste into Supabase -> SQL Editor -> New query -> Run. Idempotent & safe.
-- ###########################################################################

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


