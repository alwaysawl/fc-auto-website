-- =============================================================================
-- Add optional drive_type column to public.vehicles
-- Compatible with existing rows (nullable, no default required).
-- Run in Supabase SQL Editor if migrations are applied manually.
-- =============================================================================

alter table public.vehicles
  add column if not exists drive_type text;

comment on column public.vehicles.drive_type is
  'Drivetrain: FWD | RWD | 2WD | 4WD | AWD';
