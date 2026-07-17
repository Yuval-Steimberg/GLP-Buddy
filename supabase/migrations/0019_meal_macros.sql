-- ===========================================================================
-- 0019 — Full macros on the meal log.
--
-- Extends 0018 `meals` from calories+protein to a full macro breakdown
-- (carbs, fat, fiber). The per-item breakdown (`items` jsonb) also gains grams +
-- carbs/fat per item so the client can let the user edit grams per item and
-- recompute totals — the main accuracy mechanism. jsonb needs no migration for
-- the richer item shape; only the meal-level totals need new columns.
-- Idempotent: safe to paste into the SQL Editor and re-run.
-- ===========================================================================
alter table public.meals add column if not exists carbs_g integer not null default 0;
alter table public.meals add column if not exists fat_g integer not null default 0;
alter table public.meals add column if not exists fiber_g integer not null default 0;
