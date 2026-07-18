-- ===========================================================================
-- Private journey tracking for the first GLPenPal Plus release.
--
-- Injection and symptom entries are visible only to their owner. They power
-- personal trends and clinician-ready exports; buddies continue to see only
-- the intentionally shared daily check-in from migration 0013.
-- ===========================================================================

create table if not exists public.injection_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  medication text not null,
  dose_text text,
  injection_site text,
  note text,
  injected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint injection_logs_medication_len
    check (char_length(medication) between 1 and 60),
  constraint injection_logs_dose_len
    check (dose_text is null or char_length(dose_text) <= 40),
  constraint injection_logs_site_len
    check (injection_site is null or char_length(injection_site) <= 80),
  constraint injection_logs_note_len
    check (note is null or char_length(note) <= 500)
);

create index if not exists idx_injection_logs_user_date
  on public.injection_logs(user_id, injected_at desc);

alter table public.injection_logs enable row level security;

grant select, insert, delete on public.injection_logs to authenticated;

drop policy if exists injection_logs_read_own on public.injection_logs;
create policy injection_logs_read_own on public.injection_logs
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists injection_logs_insert_own on public.injection_logs;
create policy injection_logs_insert_own on public.injection_logs
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists injection_logs_delete_own on public.injection_logs;
create policy injection_logs_delete_own on public.injection_logs
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.symptom_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  symptom text not null,
  severity smallint not null,
  note text,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint symptom_logs_symptom_len
    check (char_length(symptom) between 1 and 80),
  constraint symptom_logs_severity_range
    check (severity between 1 and 5),
  constraint symptom_logs_note_len
    check (note is null or char_length(note) <= 500)
);

create index if not exists idx_symptom_logs_user_date
  on public.symptom_logs(user_id, logged_at desc);

alter table public.symptom_logs enable row level security;

grant select, insert, delete on public.symptom_logs to authenticated;

drop policy if exists symptom_logs_read_own on public.symptom_logs;
create policy symptom_logs_read_own on public.symptom_logs
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists symptom_logs_insert_own on public.symptom_logs;
create policy symptom_logs_insert_own on public.symptom_logs
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists symptom_logs_delete_own on public.symptom_logs;
create policy symptom_logs_delete_own on public.symptom_logs
  for delete to authenticated
  using ((select auth.uid()) = user_id);
