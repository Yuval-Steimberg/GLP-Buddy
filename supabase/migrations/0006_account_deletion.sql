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
