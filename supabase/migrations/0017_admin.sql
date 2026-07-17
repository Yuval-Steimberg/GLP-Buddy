-- ===========================================================================
-- 0017 — Staff admin dashboard RPCs.
--   The per-user RLS (migration 0010) correctly hides other users' profiles and
--   messages from every client — including staff. So the admin dashboard can't
--   just `select * from profiles`. Instead it goes through these SECURITY
--   DEFINER RPCs, each gated on is_staff(), returning aggregate or minimized
--   data. All pin search_path='' (same hardening as 0010's definer funcs).
--
--   Grant yourself staff first:
--     update profiles set is_staff=true where id='<your-user-id>';
-- ===========================================================================

-- One-shot overview counters for the dashboard header.
create or replace function public.admin_overview()
returns json language plpgsql security definer set search_path = '' as $$
declare result json;
begin
  if not public.is_staff() then
    raise exception 'not authorized';
  end if;
  select json_build_object(
    'users_total',      (select count(*) from public.profiles),
    'users_7d',         (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'users_30d',        (select count(*) from public.profiles where created_at > now() - interval '30 days'),
    'onboarded',        (select count(*) from public.profiles where onboarding_complete),
    'premium',          (select count(*) from public.profiles where is_premium),
    'staff',            (select count(*) from public.profiles where is_staff),
    'pairs_active',     (select count(*) from public.relationships where active),
    'pairs_total',      (select count(*) from public.relationships),
    'messages_total',   (select count(*) from public.messages),
    'messages_7d',      (select count(*) from public.messages where created_at > now() - interval '7 days'),
    'milestones_total', (select count(*) from public.milestones),
    'checkins_7d',      (select count(*) from public.checkins where created_at > now() - interval '7 days'),
    'reports_open',     (select count(*) from public.reports_blocks where not resolved),
    'reports_total',    (select count(*) from public.reports_blocks)
  ) into result;
  return result;
end;
$$;
grant execute on function public.admin_overview() to authenticated;

-- New signups per day (last 30 days) — powers the growth mini-chart.
create or replace function public.admin_signups_daily()
returns table(day date, count bigint)
language sql security definer set search_path = '' as $$
  select date_trunc('day', created_at)::date as day, count(*)
  from public.profiles
  where public.is_staff() and created_at > now() - interval '30 days'
  group by 1
  order by 1;
$$;
grant execute on function public.admin_signups_daily() to authenticated;

-- Recent users (minimized columns), optionally filtered by nickname.
create or replace function public.admin_users(p_limit int default 100, p_search text default null)
returns table(
  id uuid, nickname text, medication text, treatment_stage text,
  country text, created_at timestamptz, onboarding_complete boolean,
  is_premium boolean, is_staff boolean
)
language sql security definer set search_path = '' as $$
  select p.id, p.nickname, p.medication, p.treatment_stage, p.country,
         p.created_at, p.onboarding_complete, p.is_premium, p.is_staff
  from public.profiles p
  where public.is_staff()
    and (p_search is null or p_search = '' or p.nickname ilike '%' || p_search || '%')
  order by p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;
grant execute on function public.admin_users(int, text) to authenticated;

-- Reports & blocks with reporter/target nicknames resolved.
create or replace function public.admin_reports(p_limit int default 200)
returns table(
  id uuid, kind text, reason text, resolved boolean, created_at timestamptz,
  reporter_id uuid, reporter_nick text, target_id uuid, target_nick text
)
language sql security definer set search_path = '' as $$
  select r.id, r.kind::text, r.reason, r.resolved, r.created_at,
         r.reporter_id, rp.nickname, r.target_user_id, tp.nickname
  from public.reports_blocks r
  left join public.profiles rp on rp.id = r.reporter_id
  left join public.profiles tp on tp.id = r.target_user_id
  where public.is_staff()
  order by r.resolved asc, r.created_at desc
  limit greatest(1, least(coalesce(p_limit, 200), 1000));
$$;
grant execute on function public.admin_reports(int) to authenticated;

-- Mark a report resolved / reopened.
create or replace function public.admin_resolve_report(p_id uuid, p_resolved boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff() then
    raise exception 'not authorized';
  end if;
  update public.reports_blocks set resolved = coalesce(p_resolved, true) where id = p_id;
end;
$$;
grant execute on function public.admin_resolve_report(uuid, boolean) to authenticated;
