-- =============================================================================
-- Add nullable homepage_rank for manual Popular Models ordering (1–4).
-- Reuses existing boolean `featured` as 首页推荐.
-- Compatible with existing rows (null = not ranked).
-- Run in Supabase SQL Editor if migrations are applied manually.
-- =============================================================================

alter table public.vehicles
  add column if not exists homepage_rank integer;

alter table public.vehicles
  drop constraint if exists vehicles_homepage_rank_range;

alter table public.vehicles
  add constraint vehicles_homepage_rank_range
  check (homepage_rank is null or homepage_rank between 1 and 4);

create unique index if not exists vehicles_homepage_rank_unique
  on public.vehicles (homepage_rank)
  where homepage_rank is not null;

comment on column public.vehicles.homepage_rank is
  'Homepage Popular Models slot: 1–4. Null when not homepage-featured.';
