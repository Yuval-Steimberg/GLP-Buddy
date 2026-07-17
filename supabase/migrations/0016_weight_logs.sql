-- ===========================================================================
-- 0016 — Optional weight logging.
--   Lets a user record their weight over time so recaps can show real progress
--   ("Lost 8.4 kg this year"). PRIVATE to the user — unlike check-ins, weight is
--   never visible to buddies (self-only RLS, no notify trigger).
-- ===========================================================================

create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kg numeric(5, 1) not null,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint weight_logs_kg_range check (kg > 0 and kg < 1000)
);
create index if not exists idx_weight_logs_user on public.weight_logs(user_id, logged_at desc);

alter table public.weight_logs enable row level security;

-- Self-only: a user can read/write/delete only their own weight entries.
drop policy if exists weight_logs_insert on public.weight_logs;
create policy weight_logs_insert on public.weight_logs
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists weight_logs_read on public.weight_logs;
create policy weight_logs_read on public.weight_logs
  for select to authenticated using (user_id = auth.uid());
drop policy if exists weight_logs_delete on public.weight_logs;
create policy weight_logs_delete on public.weight_logs
  for delete to authenticated using (user_id = auth.uid());
