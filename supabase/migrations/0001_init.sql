-- ===========================================================================
-- GLP Buddy — initial schema
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
