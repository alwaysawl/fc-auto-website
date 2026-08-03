-- =============================================================================
-- Proforma Invoice management (admin-only).
-- Safe to re-run: IF NOT EXISTS / no DROP of existing business data.
-- Does not modify vehicles, inquiries, freight, sales_agents, or quote RR.
--
-- Privacy: customer, VIN, and bank/payment snapshots are admin-only via
-- service-role APIs. No public anon policies.
-- =============================================================================

-- Daily counter for readable invoice numbers: PI-YYYYMMDD-0001
create table if not exists public.proforma_invoice_number_counters (
  day_key    text primary key,
  last_seq   integer not null default 0,
  updated_at timestamptz not null default now()
);

create or replace function public.next_proforma_invoice_number()
returns text
language plpgsql
as $$
declare
  d text;
  n integer;
begin
  d := to_char((now() at time zone 'Asia/Shanghai'), 'YYYYMMDD');
  insert into public.proforma_invoice_number_counters (day_key, last_seq, updated_at)
  values (d, 1, now())
  on conflict (day_key) do update
    set last_seq = public.proforma_invoice_number_counters.last_seq + 1,
        updated_at = now()
  returning last_seq into n;
  return 'PI-' || d || '-' || lpad(n::text, 4, '0');
end;
$$;

-- Protected company + payment presets (single logical config row)
create table if not exists public.proforma_invoice_settings (
  id text primary key default 'default',
  company_name text not null default 'FC Auto Fengcheng Auto Trade Co., Ltd.',
  company_address text not null default 'FC Auto Fengcheng Automobile Trade Co., Ltd., 2nd Floor, Wenhai Automobile City, Wenhua North Road, Guicheng Street, Nanhai District, Foshan City, China',
  company_website text not null default 'fcautoexport.com',
  payment_accounts jsonb not null default '[]'::jsonb,
  default_terms jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint proforma_invoice_settings_id_check check (id = 'default')
);

insert into public.proforma_invoice_settings (id)
values ('default')
on conflict (id) do nothing;

create table if not exists public.proforma_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null,
  contract_number text,
  status text not null default 'draft',
  customer_name text not null,
  customer_company text,
  customer_country text,
  customer_address text,
  customer_whatsapp text,
  customer_email text,
  offer_date date not null default ((now() at time zone 'Asia/Shanghai')::date),
  validity_text text,
  destination_country text,
  destination_port text,
  salesperson_name text not null,
  salesperson_phone text not null,
  salesperson_email text not null,
  company_snapshot jsonb not null default '{}'::jsonb,
  payment_snapshot jsonb not null default '{}'::jsonb,
  vehicle_subtotal_usd numeric(14, 2) not null default 0,
  charges_total_usd numeric(14, 2) not null default 0,
  total_usd numeric(14, 2) not null default 0,
  deposit_usd numeric(14, 2) not null default 0,
  balance_usd numeric(14, 2) not null default 0,
  terms_snapshot jsonb not null default '[]'::jsonb,
  notes text,
  internal_notes text,
  pdf_storage_path text,
  pdf_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  issued_at timestamptz,
  archived_at timestamptz,
  constraint proforma_invoices_status_allowed check (
    status in ('draft', 'issued', 'paid_deposit', 'completed', 'cancelled')
  ),
  constraint proforma_invoices_deposit_nonneg check (deposit_usd >= 0),
  constraint proforma_invoices_totals_nonneg check (
    vehicle_subtotal_usd >= 0
    and charges_total_usd >= 0
    and total_usd >= 0
  )
);

create unique index if not exists proforma_invoices_invoice_number_uidx
  on public.proforma_invoices (invoice_number);

create index if not exists proforma_invoices_status_idx
  on public.proforma_invoices (status);

create index if not exists proforma_invoices_salesperson_idx
  on public.proforma_invoices (salesperson_name);

create index if not exists proforma_invoices_offer_date_idx
  on public.proforma_invoices (offer_date desc);

create index if not exists proforma_invoices_updated_at_idx
  on public.proforma_invoices (updated_at desc);

create index if not exists proforma_invoices_archived_at_idx
  on public.proforma_invoices (archived_at);

create index if not exists proforma_invoices_customer_name_idx
  on public.proforma_invoices (customer_name);

create index if not exists proforma_invoices_destination_country_idx
  on public.proforma_invoices (destination_country);

create table if not exists public.proforma_invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.proforma_invoices (id) on delete cascade,
  display_order integer not null default 0,
  vehicle_id text,
  brand text not null default '',
  model text not null default '',
  year text,
  colour text,
  vin text,
  unit_price_usd numeric(14, 2) not null default 0,
  quantity integer not null default 1,
  total_usd numeric(14, 2) not null default 0,
  note text,
  created_at timestamptz not null default now(),
  constraint proforma_invoice_items_qty_positive check (quantity > 0),
  constraint proforma_invoice_items_price_nonneg check (unit_price_usd >= 0),
  constraint proforma_invoice_items_total_nonneg check (total_usd >= 0)
);

create index if not exists proforma_invoice_items_invoice_id_idx
  on public.proforma_invoice_items (invoice_id, display_order);

create index if not exists proforma_invoice_items_vin_idx
  on public.proforma_invoice_items (vin);

create index if not exists proforma_invoice_items_brand_idx
  on public.proforma_invoice_items (brand);

create index if not exists proforma_invoice_items_model_idx
  on public.proforma_invoice_items (model);

create table if not exists public.proforma_invoice_charges (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.proforma_invoices (id) on delete cascade,
  display_order integer not null default 0,
  name_zh text not null default '',
  name_en text not null default '',
  amount_usd numeric(14, 2) not null default 0,
  note text,
  created_at timestamptz not null default now(),
  constraint proforma_invoice_charges_amount_nonneg check (amount_usd >= 0)
);

create index if not exists proforma_invoice_charges_invoice_id_idx
  on public.proforma_invoice_charges (invoice_id, display_order);

create table if not exists public.proforma_invoice_activities (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.proforma_invoices (id) on delete cascade,
  activity_type text not null,
  note text,
  old_value text,
  new_value text,
  actor_name text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint proforma_invoice_activities_type_allowed check (
    activity_type in (
      'created',
      'edited',
      'pdf_generated',
      'status_changed',
      'duplicated',
      'archived',
      'unarchived'
    )
  )
);

create index if not exists proforma_invoice_activities_invoice_id_idx
  on public.proforma_invoice_activities (invoice_id, created_at desc);

-- updated_at trigger (shared helper may already exist)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists proforma_invoices_set_updated_at on public.proforma_invoices;
create trigger proforma_invoices_set_updated_at
  before update on public.proforma_invoices
  for each row execute function public.set_updated_at();

drop trigger if exists proforma_invoice_settings_set_updated_at on public.proforma_invoice_settings;
create trigger proforma_invoice_settings_set_updated_at
  before update on public.proforma_invoice_settings
  for each row execute function public.set_updated_at();

alter table public.proforma_invoice_number_counters enable row level security;
alter table public.proforma_invoice_settings enable row level security;
alter table public.proforma_invoices enable row level security;
alter table public.proforma_invoice_items enable row level security;
alter table public.proforma_invoice_charges enable row level security;
alter table public.proforma_invoice_activities enable row level security;

-- No anon/authenticated policies: public cannot read or write.
-- Admin app uses service-role / secret key through Next.js APIs only.

comment on table public.proforma_invoices is
  'Admin proforma invoices. Customer, VIN, and payment snapshots are admin-only.';
comment on table public.proforma_invoice_settings is
  'Protected company and payment presets for proforma invoices.';
comment on table public.proforma_invoice_items is
  'Line items for proforma invoices. VIN is admin/PDF only.';
comment on table public.proforma_invoice_charges is
  'Other charges for proforma invoices.';
comment on table public.proforma_invoice_activities is
  'Internal activity timeline for proforma invoices. Admin-only.';
