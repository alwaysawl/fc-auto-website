-- =============================================================================
-- FC Auto Export — complete Supabase schema
-- Run this entire script once in the Supabase SQL Editor.
-- Safe to re-run: uses IF NOT EXISTS / ON CONFLICT where possible.
-- =============================================================================

-- Extensions
create extension if not exists "pgcrypto";

-- =============================================================================
-- 1) vehicles
-- Matches src/lib/supabase/vehicle-queries.ts
-- =============================================================================

create table if not exists public.vehicles (
  id                  text primary key,
  brand               text not null,
  model               text not null,
  year                integer not null,
  mileage             integer not null default 0,
  fuel                text not null default 'Petrol',
  transmission        text not null default 'Automatic',
  steering            text not null default 'Left Hand Drive',
  vin                 text not null default '',
  fob_price           numeric not null default 0,
  photos              text[] not null default '{}',
  shipping_tiers      jsonb not null default '[]',
  featured            boolean not null default false,
  status              text not null default '在售',
  currency            text not null default 'USD',
  body_type           text,
  drive_type          text,
  displacement        text,
  color               text,
  seats               integer,
  export_port         text,
  location            text,
  title_en            text,
  description_en      text,
  features            text,
  notes               text,
  main_image_url      text,
  gallery_image_urls  text[] not null default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists vehicles_status_idx
  on public.vehicles (status);

create index if not exists vehicles_featured_idx
  on public.vehicles (featured);

create index if not exists vehicles_brand_model_idx
  on public.vehicles (brand, model);

create index if not exists vehicles_updated_at_idx
  on public.vehicles (updated_at desc);

-- =============================================================================
-- 2) vehicle_images
-- One row per stored image; ordered; cover flag; FK → vehicles
-- =============================================================================

create table if not exists public.vehicle_images (
  id            uuid primary key default gen_random_uuid(),
  vehicle_id    text not null references public.vehicles (id) on delete cascade,
  storage_path  text not null,
  public_url    text not null,
  is_cover      boolean not null default false,
  sort_order    integer not null default 0,
  mime_type     text,
  file_size     integer,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint vehicle_images_storage_path_unique unique (storage_path)
);

create index if not exists vehicle_images_vehicle_id_idx
  on public.vehicle_images (vehicle_id);

create index if not exists vehicle_images_vehicle_sort_idx
  on public.vehicle_images (vehicle_id, sort_order);

create index if not exists vehicle_images_cover_idx
  on public.vehicle_images (vehicle_id, is_cover)
  where is_cover = true;

-- =============================================================================
-- 3) inquiries
-- Lead / form inquiry records (optional FK to vehicles)
-- =============================================================================

create table if not exists public.inquiries (
  id              uuid primary key default gen_random_uuid(),
  inquiry_id      text not null,
  vehicle_id      text references public.vehicles (id) on delete set null,
  vehicle_title   text,
  vehicle_year    text,
  stock_number    text,
  customer_name   text,
  customer_email  text,
  customer_phone  text,
  whatsapp        text,
  message         text,
  source_page     text,
  page_url        text,
  status          text not null default 'new',
  assigned_to     text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint inquiries_inquiry_id_unique unique (inquiry_id)
);

create index if not exists inquiries_created_at_idx
  on public.inquiries (created_at desc);

create index if not exists inquiries_vehicle_id_idx
  on public.inquiries (vehicle_id);

create index if not exists inquiries_status_idx
  on public.inquiries (status);

-- =============================================================================
-- 4) Sales / WhatsApp routing tables
-- Already live in this project; IF NOT EXISTS keeps existing data.
-- Dashboard reads sales_assignments as inquiry leads.
-- =============================================================================

create table if not exists public.sales_agents (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  role            text,
  whatsapp_number text not null,
  display_order   integer not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create index if not exists sales_agents_active_order_idx
  on public.sales_agents (is_active, display_order);

create table if not exists public.sales_router_state (
  id                  integer primary key,
  last_display_order  integer not null default 0,
  updated_at          timestamptz not null default now()
);

insert into public.sales_router_state (id, last_display_order, updated_at)
values (1, 0, now())
on conflict (id) do nothing;

create table if not exists public.sales_assignments (
  id                uuid primary key default gen_random_uuid(),
  inquiry_id        text not null,
  sales_agent_id    uuid references public.sales_agents (id) on delete set null,
  sales_agent_name  text,
  whatsapp_number   text,
  source_page       text,
  page_url          text,
  vehicle_title     text,
  vehicle_year      text,
  stock_number      text,
  created_at        timestamptz not null default now()
);

create index if not exists sales_assignments_created_at_idx
  on public.sales_assignments (created_at desc);

create index if not exists sales_assignments_inquiry_id_idx
  on public.sales_assignments (inquiry_id);

create index if not exists sales_assignments_agent_name_idx
  on public.sales_assignments (sales_agent_name);

-- =============================================================================
-- 5) updated_at helper trigger
-- =============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists vehicles_set_updated_at on public.vehicles;
create trigger vehicles_set_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();

drop trigger if exists vehicle_images_set_updated_at on public.vehicle_images;
create trigger vehicle_images_set_updated_at
  before update on public.vehicle_images
  for each row execute function public.set_updated_at();

drop trigger if exists inquiries_set_updated_at on public.inquiries;
create trigger inquiries_set_updated_at
  before update on public.inquiries
  for each row execute function public.set_updated_at();

drop trigger if exists sales_router_state_set_updated_at on public.sales_router_state;
create trigger sales_router_state_set_updated_at
  before update on public.sales_router_state
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 6) Row Level Security
-- App writes via service_role (server-only). Enable RLS + service_role policies.
-- =============================================================================

alter table public.vehicles enable row level security;
alter table public.vehicle_images enable row level security;
alter table public.inquiries enable row level security;
alter table public.sales_agents enable row level security;
alter table public.sales_assignments enable row level security;
alter table public.sales_router_state enable row level security;

drop policy if exists "service_role_all" on public.vehicles;
create policy "service_role_all" on public.vehicles
  for all to service_role using (true) with check (true);

drop policy if exists "service_role_all" on public.vehicle_images;
create policy "service_role_all" on public.vehicle_images
  for all to service_role using (true) with check (true);

drop policy if exists "service_role_all" on public.inquiries;
create policy "service_role_all" on public.inquiries
  for all to service_role using (true) with check (true);

drop policy if exists "service_role_all" on public.sales_agents;
create policy "service_role_all" on public.sales_agents
  for all to service_role using (true) with check (true);

drop policy if exists "service_role_all" on public.sales_assignments;
create policy "service_role_all" on public.sales_assignments
  for all to service_role using (true) with check (true);

drop policy if exists "service_role_all" on public.sales_router_state;
create policy "service_role_all" on public.sales_router_state
  for all to service_role using (true) with check (true);

-- Optional public read for published inventory (anon)
drop policy if exists "public_read_listed_vehicles" on public.vehicles;
create policy "public_read_listed_vehicles" on public.vehicles
  for select to anon, authenticated
  using (status = '在售');

drop policy if exists "public_read_vehicle_images" on public.vehicle_images;
create policy "public_read_vehicle_images" on public.vehicle_images
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.vehicles v
      where v.id = vehicle_images.vehicle_id
        and v.status = '在售'
    )
  );

-- =============================================================================
-- 7) Storage bucket: vehicle-images (public)
-- Paths used by app: vehicles/{vehicleId}/{timestamp}-{index}-{filename}
-- =============================================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'vehicle-images',
  'vehicle-images',
  true,
  10485760, -- 10 MB
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read
drop policy if exists "vehicle_images_public_read" on storage.objects;
create policy "vehicle_images_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'vehicle-images');

-- Authenticated / service uploads (signed upload + service role)
drop policy if exists "vehicle_images_service_insert" on storage.objects;
create policy "vehicle_images_service_insert"
  on storage.objects
  for insert
  to service_role
  with check (bucket_id = 'vehicle-images');

drop policy if exists "vehicle_images_service_update" on storage.objects;
create policy "vehicle_images_service_update"
  on storage.objects
  for update
  to service_role
  using (bucket_id = 'vehicle-images')
  with check (bucket_id = 'vehicle-images');

drop policy if exists "vehicle_images_service_delete" on storage.objects;
create policy "vehicle_images_service_delete"
  on storage.objects
  for delete
  to service_role
  using (bucket_id = 'vehicle-images');

-- Allow signed uploads from anon/authenticated when using createSignedUploadUrl
drop policy if exists "vehicle_images_authenticated_insert" on storage.objects;
create policy "vehicle_images_authenticated_insert"
  on storage.objects
  for insert
  to authenticated, anon
  with check (bucket_id = 'vehicle-images');

-- =============================================================================
-- Done.
-- After running: wait a few seconds for PostgREST schema cache, then retry publish.
-- Note: WhatsApp assignment continues to use RPC assign_next_sales_agent +
-- sales_assignments (already present). Do not drop those objects.
-- =============================================================================
