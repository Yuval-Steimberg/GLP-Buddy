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
