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
