-- ===========================================================================
-- 0020 — Shared buddy goals/challenges: a buddy pair sets a joint target
--   (e.g. "log 5 meals this week") and tallies progress together with a
--   manual "+1" tap. Visible to BOTH members of the relationship (unlike
--   checkins/meals/weight_logs, which are per-user).
-- ===========================================================================

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  title text not null,
  target_count int not null,
  progress_count int not null default 0,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint goals_title_len check (char_length(title) between 1 and 140),
  constraint goals_target_range check (target_count between 1 and 1000),
  constraint goals_progress_range check (progress_count between 0 and target_count)
);
create index if not exists idx_goals_relationship on public.goals(relationship_id, created_at desc);

alter table public.goals enable row level security;

drop policy if exists goals_insert on public.goals;
create policy goals_insert on public.goals
  for insert to authenticated
  with check (public.is_relationship_member(relationship_id) and created_by = auth.uid());
drop policy if exists goals_read on public.goals;
create policy goals_read on public.goals
  for select to authenticated using (public.is_relationship_member(relationship_id));
drop policy if exists goals_delete on public.goals;
create policy goals_delete on public.goals
  for delete to authenticated using (public.is_relationship_member(relationship_id));

-- No client UPDATE grant: progress only moves through the atomic RPC below, so
-- two buddies tapping "+1" at the same moment can't race each other into a
-- lost update (a plain client-side "read progress, write progress+1" would).
create or replace function public.increment_goal_progress(p_goal_id uuid)
returns public.goals language plpgsql security definer set search_path = '' as $$
declare
  g public.goals;
begin
  if not exists (
    select 1 from public.goals where id = p_goal_id and public.is_relationship_member(relationship_id)
  ) then
    raise exception 'not authorized';
  end if;
  update public.goals
    set progress_count = least(target_count, progress_count + 1),
        completed_at = case
          when completed_at is null and progress_count + 1 >= target_count then now()
          else completed_at
        end
    where id = p_goal_id
    returning * into g;
  return g;
end; $$;
grant execute on function public.increment_goal_progress(uuid) to authenticated;

-- Notify both buddies when a shared goal is completed.
create or replace function public.notify_on_goal_complete()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  rel record;
begin
  if new.completed_at is not null and old.completed_at is null then
    select user_a, user_b into rel from public.relationships where id = new.relationship_id;
    insert into public.notifications (user_id, type, title, body, link) values
      (rel.user_a, 'goal_reached', 'Goal reached: ' || new.title, 'You and your buddy hit your shared goal together.', '/home'),
      (rel.user_b, 'goal_reached', 'Goal reached: ' || new.title, 'You and your buddy hit your shared goal together.', '/home');
  end if;
  return new;
end; $$;
drop trigger if exists trg_notify_goal_complete on public.goals;
create trigger trg_notify_goal_complete after update on public.goals
  for each row execute function public.notify_on_goal_complete();

do $$ begin
  alter publication supabase_realtime add table public.goals;
exception when duplicate_object then null; end $$;
