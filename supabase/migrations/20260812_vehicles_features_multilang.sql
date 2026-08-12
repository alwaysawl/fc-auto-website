-- =============================================================================
-- FC Auto Export — vehicles.features auto-translations columns
-- =============================================================================

-- Backwards compatible:
-- - keep existing `features` as the admin-entered "original" content (English page)
-- - add `features_fr` / `features_zh` for localized display

alter table public.vehicles
  add column if not exists features_fr text,
  add column if not exists features_zh text;

