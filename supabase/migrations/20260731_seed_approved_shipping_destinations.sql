-- =============================================================================
-- Seed approved destination countries + major ports (idempotent).
-- Safe to re-run. Does NOT overwrite existing non-zero freight prices.
-- Does NOT delete Ghana/Nigeria or any other existing rows.
-- Apply manually in Supabase SQL editor if needed.
-- =============================================================================

insert into public.shipping_countries (
  id, name_en, name_fr, name_zh, enabled, display_order, updated_at
)
values
  ('cm', 'Cameroon', 'Cameroun', '喀麦隆', true, 10, now()),
  ('bj', 'Benin', 'Bénin', '贝宁', true, 40, now()),
  ('tg', 'Togo', 'Togo', '多哥', true, 50, now()),
  ('ao', 'Angola', 'Angola', '安哥拉', true, 60, now()),
  (
    'cg',
    'Republic of the Congo',
    'République du Congo',
    '刚果共和国（刚果布）',
    true,
    70,
    now()
  ),
  (
    'cd',
    'Democratic Republic of the Congo',
    'République démocratique du Congo',
    '刚果民主共和国（刚果金）',
    true,
    80,
    now()
  )
on conflict (id) do update set
  name_en = excluded.name_en,
  name_fr = excluded.name_fr,
  name_zh = excluded.name_zh,
  display_order = excluded.display_order,
  updated_at = now();
  -- enabled is intentionally left unchanged on conflict (preserve admin disable)

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
