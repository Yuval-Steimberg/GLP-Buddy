-- 0021_no_reshow_ended_matches.sql
-- Once a match ends — either buddy disconnects / unmatches / removes the
-- connection — that person must NEVER reappear in the Matches feed again, on
-- any device or session. The relationship row already persists in the database
-- (it is only flipped to active=false on end, never deleted), so it is the
-- durable, symmetric record of "these two were connected." We redefine the
-- match-discovery RPC to exclude anyone the caller shares a relationship row
-- with, regardless of that row's active flag.
--
-- This is symmetric by construction: a single relationships row holds both
-- user_a and user_b, so ending it hides each person from the other — the rule
-- applies no matter who initiated the disconnect.
--
-- Idempotent: create-or-replace only. Safe to paste into the SQL Editor.

create or replace function public.discover_candidates(p_limit int default 200)
returns table (
  id uuid,
  nickname text,
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
  interests text[],
  avatar_url text,
  onboarding_complete boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select p.id, p.nickname, p.age_range, p.gender, p.gender_preference, p.language,
         p.country, p.medication, p.treatment_stage, p.current_weight_range,
         p.goal_weight_range, p.main_goal, p.communication_preference, p.bio,
         p.interests, p.avatar_url, p.onboarding_complete, p.created_at
    from public.profiles p
   where p.onboarding_complete = true
     and p.id <> auth.uid()
     and not exists (
       select 1 from public.reports_blocks b
        where (b.reporter_id = auth.uid() and b.target_user_id = p.id)
           or (b.reporter_id = p.id and b.target_user_id = auth.uid())
     )
     -- Never re-show a current OR former buddy. Any relationship row between us
     -- (active = still matched, or ended = disconnected/unmatched) permanently
     -- removes them from discovery.
     and not exists (
       select 1 from public.relationships r
        where (r.user_a = auth.uid() and r.user_b = p.id)
           or (r.user_b = auth.uid() and r.user_a = p.id)
     )
   order by p.created_at desc
   limit greatest(1, least(coalesce(p_limit, 200), 500));
$$;

grant execute on function public.discover_candidates(int) to authenticated;
