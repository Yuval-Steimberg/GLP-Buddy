-- ===========================================================================
-- 0013 — GLP-journey features:
--   (2)  Injection-day support — a weekly injection weekday on the profile.
--   (3)  Side-effect check-ins — how a user feels today, visible to buddies.
--   (11) "Someone Gets It" — one-tap request for support to all active buddies.
-- (Buddy Memories (6) and the Journey Capsule (15) are derived client-side from
--  existing data, so they need no schema.)
-- ===========================================================================

-- --- (2) Injection day -----------------------------------------------------
-- GLP-1s are weekly; store the injection weekday (0=Sun .. 6=Sat), null = unset.
alter table public.profiles add column if not exists injection_weekday int;
alter table public.profiles drop constraint if exists profiles_injection_weekday_chk;
alter table public.profiles add constraint profiles_injection_weekday_chk
  check (injection_weekday is null or (injection_weekday between 0 and 6));
-- Migration 0010 revoked blanket UPDATE and re-granted only editable columns;
-- add this new editable column to that grant.
grant update (injection_weekday) on public.profiles to authenticated;

-- --- (3) Side-effect check-ins ---------------------------------------------
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null,
  note text,
  created_at timestamptz not null default now(),
  constraint checkins_note_len check (note is null or char_length(note) <= 500)
);
create index if not exists idx_checkins_user on public.checkins(user_id, created_at desc);
alter table public.checkins enable row level security;

-- Do I share an ACTIVE relationship with this user? (buddy visibility)
create or replace function public.shares_relationship(other uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (
    select 1 from public.relationships r
    where r.active and (
      (r.user_a = auth.uid() and r.user_b = other) or
      (r.user_b = auth.uid() and r.user_a = other))
  );
$$;

drop policy if exists checkins_insert on public.checkins;
create policy checkins_insert on public.checkins
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists checkins_read on public.checkins;
create policy checkins_read on public.checkins
  for select to authenticated
  using (user_id = auth.uid() or public.shares_relationship(user_id));
drop policy if exists checkins_delete on public.checkins;
create policy checkins_delete on public.checkins
  for delete to authenticated using (user_id = auth.uid());

-- Notify a user's active buddies when they post a check-in.
create or replace function public.notify_on_checkin()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  author_name text;
  rec record;
begin
  select nickname into author_name from public.profiles where id = new.user_id;
  for rec in
    select case when r.user_a = new.user_id then r.user_b else r.user_a end as buddy
    from public.relationships r
    where r.active and (r.user_a = new.user_id or r.user_b = new.user_id)
  loop
    insert into public.notifications (user_id, type, title, body, link)
    values (rec.buddy, 'checkin',
      author_name || ' shared how they''re feeling',
      author_name || ' checked in. Tap to send a little support.',
      '/home');
  end loop;
  return new;
end; $$;
drop trigger if exists trg_notify_checkin on public.checkins;
create trigger trg_notify_checkin after insert on public.checkins
  for each row execute function public.notify_on_checkin();

do $$ begin
  alter publication supabase_realtime add table public.checkins;
exception when duplicate_object then null; end $$;

-- --- (11) "Someone Gets It" ------------------------------------------------
-- One tap notifies all of the caller's active buddies. SECURITY DEFINER so it
-- can write notifications rows for other users (clients can't). Returns the
-- number of buddies notified.
create or replace function public.request_support()
returns int language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  my_name text;
  rec record;
  n int := 0;
begin
  if me is null then raise exception 'not authenticated'; end if;
  select nickname into my_name from public.profiles where id = me;
  for rec in
    select case when r.user_a = me then r.user_b else r.user_a end as buddy
    from public.relationships r
    where r.active and (r.user_a = me or r.user_b = me)
  loop
    insert into public.notifications (user_id, type, title, body, link)
    values (rec.buddy, 'support_request',
      my_name || ' could use a little support today',
      'No explanation needed — just reach out and let them know you''re there.',
      '/home');
    n := n + 1;
  end loop;
  return n;
end; $$;
grant execute on function public.request_support() to authenticated;
