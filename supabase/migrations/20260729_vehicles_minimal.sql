-- =============================================================================
-- FC Auto Export — MINIMAL schema for vehicle publishing only
-- Safe for existing Supabase projects (sales_* tables untouched).
-- Run in Supabase SQL Editor. Do not re-run the full complete_schema.sql.
-- =============================================================================

create extension if not exists "pgcrypto";

-- =============================================================================
-- 1) public.vehicles
-- Columns match src/lib/supabase/vehicle-queries.ts
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

-- Required indexes (list ordered by updated_at desc in app)
create index if not exists vehicles_updated_at_idx
  on public.vehicles (updated_at desc);

create index if not exists vehicles_status_idx
  on public.vehicles (status);

create index if not exists vehicles_featured_idx
  on public.vehicles (featured);

-- =============================================================================
-- 2) updated_at trigger (vehicles-scoped function — does not replace globals)
-- =============================================================================

create or replace function public.set_vehicles_updated_at()
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
  for each row
  execute function public.set_vehicles_updated_at();

-- =============================================================================
-- 3) RLS on vehicles
-- App writes with service_role. Anon/authenticated: SELECT listed cars only.
-- =============================================================================

alter table public.vehicles enable row level security;

drop policy if exists "service_role_all_vehicles" on public.vehicles;
create policy "service_role_all_vehicles" on public.vehicles
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "public_read_listed_vehicles" on public.vehicles;
create policy "public_read_listed_vehicles" on public.vehicles
  for select
  to anon, authenticated
  using (status = '在售');

-- No anon/authenticated INSERT / UPDATE / DELETE policies on vehicles.

-- =============================================================================
-- 4) Storage bucket: vehicle-images
-- App path: vehicles/{vehicleId}/{timestamp}-{index}-{filename}
-- Upload flow: server createSignedUploadUrl (service_role) → client PUT
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

-- Public read (bucket is public; getPublicUrl)
drop policy if exists "vehicle_images_public_read" on storage.objects;
create policy "vehicle_images_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'vehicle-images');

-- Service role manages objects (signed URL creation + admin ops)
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

-- Signed upload PUT from the browser (token from createSignedUploadUrl).
-- Scoped to this bucket only; no open write on public.vehicles.
drop policy if exists "vehicle_images_signed_upload_insert" on storage.objects;
create policy "vehicle_images_signed_upload_insert"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'vehicle-images');

-- =============================================================================
-- Done. Wait a few seconds for PostgREST schema cache, then retry publish.
-- Does NOT touch: sales_*, inquiries, vehicle_images, or other tables.
-- =============================================================================
