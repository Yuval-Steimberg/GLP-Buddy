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
