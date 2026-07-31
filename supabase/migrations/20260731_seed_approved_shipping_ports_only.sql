-- =============================================================================
-- Seed approved shipping ports only (idempotent).
-- Safe to re-run. Does NOT create/drop/delete tables or rows.
-- New prices default to 0. Existing non-zero freight prices are never overwritten.
-- enabled forced true on insert; left unchanged on conflict.
-- Requires matching shipping_countries rows (cm, bj, tg, ao, cg, cd).
-- Apply manually in Supabase SQL Editor.
-- =============================================================================

insert into public.shipping_ports (
  country_id,
  port_id,
  name_en,
  name_fr,
  name_zh,
  single_vehicle_usd,
  container_40ft_usd,
  enabled,
  display_order,
  updated_at
)
values
  -- Cameroon
  ('cm', 'douala', 'Douala', 'Douala', '杜阿拉', 0, 0, true, 10, now()),
  ('cm', 'kribi', 'Kribi', 'Kribi', '克里比', 0, 0, true, 20, now()),
  -- Benin
  ('bj', 'cotonou', 'Cotonou', 'Cotonou', '科托努', 0, 0, true, 10, now()),
  -- Togo
  ('tg', 'lome', 'Lomé', 'Lomé', '洛美', 0, 0, true, 10, now()),
  -- Angola
  ('ao', 'luanda', 'Luanda', 'Luanda', '罗安达', 0, 0, true, 10, now()),
  ('ao', 'lobito', 'Lobito', 'Lobito', '洛比托', 0, 0, true, 20, now()),
  -- Republic of the Congo
  (
    'cg',
    'pointe-noire',
    'Pointe-Noire',
    'Pointe-Noire',
    '黑角',
    0,
    0,
    true,
    10,
    now()
  ),
  -- Democratic Republic of the Congo
  ('cd', 'matadi', 'Matadi', 'Matadi', '马塔迪', 0, 0, true, 10, now())
on conflict (country_id, port_id) do update set
  name_en = excluded.name_en,
  name_fr = excluded.name_fr,
  name_zh = excluded.name_zh,
  display_order = excluded.display_order,
  updated_at = now();
  -- single_vehicle_usd / container_40ft_usd intentionally omitted
  -- so existing non-zero freight prices are never overwritten.
  -- enabled intentionally left unchanged on conflict.
