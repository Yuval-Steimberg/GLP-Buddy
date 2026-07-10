-- ===========================================================================
-- Profile pictures. Stored as a small compressed data URL directly on the
-- profile row (no Storage bucket / extra RLS to configure). The client resizes
-- images to a thumbnail before saving, so rows stay small.
-- ===========================================================================
alter table public.profiles
  add column if not exists avatar_url text;
