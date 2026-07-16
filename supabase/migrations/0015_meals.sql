-- ===========================================================================
-- 0015 — Meal photo log (private food records).
--
-- A user photographs a meal; the `analyze-food` Edge Function (Claude vision)
-- estimates calories + protein, and the result is saved here as a PRIVATE
-- record. Unlike checkins (0013), meals have NO buddy visibility — a user only
-- ever sees their own meals. Sharing a meal to a buddy is an explicit, separate
-- action that copies the photo + numbers into a timeline_event / message
-- (existing RLS-scoped tables); nothing here is exposed to anyone else.
--
-- The photo is a compressed JPEG data URL on the row (same pattern as chat
-- images / avatars / timeline photos — no Storage bucket), size-capped like the
-- other data-URL columns.
-- ===========================================================================
create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  image_url text,
  title text not null default 'Meal',
  calories integer not null default 0,
  protein_g integer not null default 0,
  items jsonb not null default '[]'::jsonb,
  note text,
  created_at timestamptz not null default now(),
  constraint meals_note_len check (note is null or char_length(note) <= 500),
  constraint meals_image_len check (image_url is null or char_length(image_url) <= 3000000)
);
create index if not exists idx_meals_user on public.meals(user_id, created_at desc);
alter table public.meals enable row level security;

-- Own-data-only: a user can read/write ONLY their own meals.
drop policy if exists meals_insert on public.meals;
create policy meals_insert on public.meals
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists meals_read on public.meals;
create policy meals_read on public.meals
  for select to authenticated using (user_id = auth.uid());
drop policy if exists meals_update on public.meals;
create policy meals_update on public.meals
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists meals_delete on public.meals;
create policy meals_delete on public.meals
  for delete to authenticated using (user_id = auth.uid());
