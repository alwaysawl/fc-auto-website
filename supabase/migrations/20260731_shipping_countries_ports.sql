-- =============================================================================
-- Country / port freight (admin-managed). Does NOT touch vehicles.shipping_tiers.
-- Apply manually in Supabase SQL editor. Safe to re-run (IF NOT EXISTS).
-- =============================================================================

create table if not exists public.shipping_countries (
  id            text primary key,
  name_en       text not null,
  name_fr       text,
  name_zh       text,
  enabled       boolean not null default true,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.shipping_ports (
  id                   uuid primary key default gen_random_uuid(),
  country_id           text not null references public.shipping_countries (id) on delete cascade,
  port_id              text not null,
  name_en              text not null,
  name_fr              text,
  name_zh              text,
  single_vehicle_usd   numeric not null default 0 check (single_vehicle_usd >= 0),
  container_40ft_usd   numeric not null default 0 check (container_40ft_usd >= 0),
  enabled              boolean not null default true,
  display_order        integer not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint shipping_ports_country_port_unique unique (country_id, port_id)
);

create index if not exists shipping_countries_enabled_order_idx
  on public.shipping_countries (enabled, display_order);

create index if not exists shipping_ports_country_enabled_idx
  on public.shipping_ports (country_id, enabled, display_order);

alter table public.shipping_countries enable row level security;
alter table public.shipping_ports enable row level security;

drop policy if exists "service_role_all" on public.shipping_countries;
create policy "service_role_all" on public.shipping_countries
  for all to service_role using (true) with check (true);

drop policy if exists "service_role_all" on public.shipping_ports;
create policy "service_role_all" on public.shipping_ports
  for all to service_role using (true) with check (true);

-- Seed from existing static sampleCartFreightUsd (container method).
-- ON CONFLICT DO NOTHING preserves any admin edits already applied.

insert into public.shipping_countries (id, name_en, name_fr, name_zh, enabled, display_order)
values
  ('cm', 'Cameroon', 'Cameroun', '喀麦隆', true, 10),
  ('gh', 'Ghana', 'Ghana', '加纳', true, 20),
  ('ng', 'Nigeria', 'Nigéria', '尼日利亚', true, 30),
  ('bj', 'Benin', 'Bénin', '贝宁', true, 40),
  ('tg', 'Togo', 'Togo', '多哥', true, 50),
  ('ao', 'Angola', 'Angola', '安哥拉', true, 60),
  ('cg', 'Congo', 'Congo', '刚果', true, 70),
  ('cd', 'DR Congo', 'RD Congo', '刚果（金）', true, 80)
on conflict (id) do nothing;

insert into public.shipping_ports (
  country_id, port_id, name_en, name_fr, name_zh,
  single_vehicle_usd, container_40ft_usd, enabled, display_order
)
values
  ('cm', 'douala', 'Douala', 'Douala', '杜阿拉', 2450, 6800, true, 10),
  ('gh', 'tema', 'Tema', 'Tema', '特马', 2350, 6500, true, 10),
  ('ng', 'lagos', 'Lagos', 'Lagos', '拉各斯', 2550, 7100, true, 10),
  ('bj', 'cotonou', 'Cotonou', 'Cotonou', '科托努', 2400, 6700, true, 10),
  ('tg', 'lome', 'Lomé', 'Lomé', '洛美', 2380, 6600, true, 10),
  ('ao', 'luanda', 'Luanda', 'Luanda', '罗安达', 3200, 9000, true, 10),
  ('cg', 'pointe-noire', 'Pointe-Noire', 'Pointe-Noire', '黑角', 2800, 7800, true, 10),
  ('cd', 'matadi', 'Matadi', 'Matadi', '马塔迪', 3500, 9800, true, 10)
on conflict (country_id, port_id) do nothing;

-- Note: vehicles.shipping_tiers is unchanged (legacy vehicle-specific tiers).
-- Admin Shipping Management no longer edits those fields.
-- Cart freight uses shipping_ports.single_vehicle_usd / container_40ft_usd.
