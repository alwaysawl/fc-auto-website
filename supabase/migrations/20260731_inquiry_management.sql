-- =============================================================================
-- Inquiry management CRM (admin-only).
-- Safe to re-run: IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / no DROP of data.
-- Does not modify sales_agents, sales_assignments, freight, or analytics tables.
--
-- Privacy: customer contact fields are admin-only via service-role APIs.
-- No passwords, secrets, payment cards, or VIN stored here.
-- =============================================================================

-- Daily counter for readable inquiry numbers: FC-YYYYMMDD-0001
create table if not exists public.inquiry_number_counters (
  day_key   text primary key,
  last_seq  integer not null default 0,
  updated_at timestamptz not null default now()
);

create or replace function public.next_inquiry_number()
returns text
language plpgsql
as $$
declare
  d text;
  n integer;
begin
  d := to_char((now() at time zone 'Asia/Shanghai'), 'YYYYMMDD');
  insert into public.inquiry_number_counters (day_key, last_seq, updated_at)
  values (d, 1, now())
  on conflict (day_key) do update
    set last_seq = public.inquiry_number_counters.last_seq + 1,
        updated_at = now()
  returning last_seq into n;
  return 'FC-' || d || '-' || lpad(n::text, 4, '0');
end;
$$;

-- Base table (skipped if a legacy inquiries table already exists)
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  inquiry_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- CRM columns (safe on both new and legacy thin tables)
alter table public.inquiries add column if not exists inquiry_number text;
alter table public.inquiries add column if not exists customer_name text;
alter table public.inquiries add column if not exists whatsapp_number text;
alter table public.inquiries add column if not exists email text;
alter table public.inquiries add column if not exists customer_country text;
alter table public.inquiries add column if not exists customer_city text;
alter table public.inquiries add column if not exists preferred_language text;
alter table public.inquiries add column if not exists source text;
alter table public.inquiries add column if not exists vehicle_id text;
alter table public.inquiries add column if not exists vehicle_title_snapshot text;
alter table public.inquiries add column if not exists requested_quantity integer;
alter table public.inquiries add column if not exists destination_country_id text;
alter table public.inquiries add column if not exists destination_port_id text;
alter table public.inquiries add column if not exists customer_budget_usd numeric;
alter table public.inquiries add column if not exists customer_message text;
alter table public.inquiries add column if not exists status text;
alter table public.inquiries add column if not exists priority text;
alter table public.inquiries add column if not exists intent_score integer;
alter table public.inquiries add column if not exists assigned_contact_name text;
alter table public.inquiries add column if not exists assigned_sales_agent_id uuid;
alter table public.inquiries add column if not exists next_follow_up_at timestamptz;
alter table public.inquiries add column if not exists last_contacted_at timestamptz;
alter table public.inquiries add column if not exists closed_at timestamptz;
alter table public.inquiries add column if not exists lost_reason text;
alter table public.inquiries add column if not exists internal_summary text;
alter table public.inquiries add column if not exists tags text[] not null default '{}'::text[];
alter table public.inquiries add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.inquiries add column if not exists archived_at timestamptz;
alter table public.inquiries add column if not exists whatsapp_normalized text;
alter table public.inquiries add column if not exists email_normalized text;

-- Backfill from legacy columns when present
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inquiries' and column_name = 'inquiry_id'
  ) then
    update public.inquiries
    set inquiry_number = coalesce(nullif(inquiry_number, ''), nullif(inquiry_id, ''), 'FC-LEGACY-' || id::text)
    where inquiry_number is null or inquiry_number = '';
  else
    update public.inquiries
    set inquiry_number = coalesce(nullif(inquiry_number, ''), 'FC-LEGACY-' || id::text)
    where inquiry_number is null or inquiry_number = '';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inquiries' and column_name = 'whatsapp'
  ) then
    update public.inquiries
    set whatsapp_number = coalesce(whatsapp_number, whatsapp)
    where whatsapp_number is null and whatsapp is not null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inquiries' and column_name = 'message'
  ) then
    update public.inquiries
    set customer_message = coalesce(customer_message, message)
    where customer_message is null and message is not null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inquiries' and column_name = 'assigned_to'
  ) then
    update public.inquiries
    set assigned_contact_name = coalesce(assigned_contact_name, assigned_to)
    where assigned_contact_name is null and assigned_to is not null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inquiries' and column_name = 'source_page'
  ) then
    update public.inquiries
    set source = coalesce(nullif(source, ''), nullif(source_page, ''), 'other')
    where source is null or source = '';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inquiries' and column_name = 'customer_title'
  ) then
    update public.inquiries
    set vehicle_title_snapshot = coalesce(vehicle_title_snapshot, vehicle_title)
    where vehicle_title_snapshot is null and vehicle_title is not null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inquiries' and column_name = 'customer_email'
  ) then
    update public.inquiries
    set email = coalesce(email, customer_email)
    where email is null and customer_email is not null;
  end if;
end $$;

update public.inquiries set source = coalesce(nullif(source, ''), 'manual') where source is null or source = '';
update public.inquiries set status = coalesce(nullif(status, ''), 'new') where status is null or status = '';
update public.inquiries set priority = coalesce(nullif(priority, ''), 'medium') where priority is null or priority = '';
update public.inquiries set intent_score = coalesce(intent_score, 0) where intent_score is null;

-- Normalize legacy / free-text values before check constraints
update public.inquiries set status = 'new'
  where status not in (
    'new','pending_contact','contacted','interested','quoting',
    'waiting_customer','negotiating','won','lost','invalid'
  );

update public.inquiries set priority = 'medium'
  where priority not in ('high','medium','low');

update public.inquiries set source = case
  when source in (
    'whatsapp','vehicle_detail','cart','contact_page','quote_download',
    'facebook','instagram','tiktok','phone','offline','manual','other'
  ) then source
  when lower(source) like '%whatsapp%' then 'whatsapp'
  when lower(source) like '%vehicle%' then 'vehicle_detail'
  when lower(source) like '%cart%' then 'cart'
  when lower(source) like '%contact%' then 'contact_page'
  when lower(source) like '%quote%' then 'quote_download'
  when lower(source) like '%facebook%' then 'facebook'
  when lower(source) like '%instagram%' then 'instagram'
  when lower(source) like '%tiktok%' then 'tiktok'
  when lower(source) like '%phone%' or lower(source) like '%tel%' then 'phone'
  when lower(source) like '%manual%' then 'manual'
  else 'other'
end;

-- Drop conflicting check constraints if re-applied with new names
alter table public.inquiries drop constraint if exists inquiries_status_allowed;
alter table public.inquiries drop constraint if exists inquiries_priority_allowed;
alter table public.inquiries drop constraint if exists inquiries_source_allowed;
alter table public.inquiries drop constraint if exists inquiries_intent_score_range;
alter table public.inquiries drop constraint if exists inquiries_qty_nonneg;
alter table public.inquiries drop constraint if exists inquiries_budget_nonneg;

alter table public.inquiries
  add constraint inquiries_status_allowed check (
    status in (
      'new','pending_contact','contacted','interested','quoting',
      'waiting_customer','negotiating','won','lost','invalid'
    )
  );

alter table public.inquiries
  add constraint inquiries_priority_allowed check (
    priority in ('high','medium','low')
  );

alter table public.inquiries
  add constraint inquiries_source_allowed check (
    source in (
      'whatsapp','vehicle_detail','cart','contact_page','quote_download',
      'facebook','instagram','tiktok','phone','offline','manual','other'
    )
  );

alter table public.inquiries
  add constraint inquiries_intent_score_range check (
    intent_score >= 0 and intent_score <= 100
  );

alter table public.inquiries
  add constraint inquiries_qty_nonneg check (
    requested_quantity is null or requested_quantity >= 0
  );

alter table public.inquiries
  add constraint inquiries_budget_nonneg check (
    customer_budget_usd is null or customer_budget_usd >= 0
  );

create unique index if not exists inquiries_inquiry_number_uidx
  on public.inquiries (inquiry_number);

create index if not exists inquiries_status_idx
  on public.inquiries (status);

create index if not exists inquiries_priority_idx
  on public.inquiries (priority);

create index if not exists inquiries_assigned_contact_idx
  on public.inquiries (assigned_contact_name);

create index if not exists inquiries_next_follow_up_idx
  on public.inquiries (next_follow_up_at);

create index if not exists inquiries_created_at_idx
  on public.inquiries (created_at desc);

create index if not exists inquiries_updated_at_idx
  on public.inquiries (updated_at desc);

create index if not exists inquiries_vehicle_id_idx
  on public.inquiries (vehicle_id);

create index if not exists inquiries_archived_at_idx
  on public.inquiries (archived_at);

create index if not exists inquiries_whatsapp_normalized_idx
  on public.inquiries (whatsapp_normalized);

create index if not exists inquiries_email_normalized_idx
  on public.inquiries (email_normalized);

create index if not exists inquiries_source_idx
  on public.inquiries (source);

-- updated_at trigger (function may already exist from complete schema)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists inquiries_set_updated_at on public.inquiries;
create trigger inquiries_set_updated_at
  before update on public.inquiries
  for each row execute function public.set_updated_at();

-- Activity / follow-up timeline
create table if not exists public.inquiry_activities (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries (id) on delete cascade,
  activity_type text not null,
  note text,
  old_value text,
  new_value text,
  actor_name text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint inquiry_activities_type_allowed check (
    activity_type in (
      'inquiry_created',
      'note_added',
      'status_changed',
      'priority_changed',
      'assigned',
      'reassigned',
      'follow_up_scheduled',
      'contacted',
      'quotation_created',
      'quotation_downloaded',
      'marked_won',
      'marked_lost',
      'archived',
      'unarchived',
      'intent_changed',
      'updated'
    )
  )
);

create index if not exists inquiry_activities_inquiry_id_idx
  on public.inquiry_activities (inquiry_id, created_at desc);

create index if not exists inquiry_activities_created_at_idx
  on public.inquiry_activities (created_at desc);

alter table public.inquiries enable row level security;
alter table public.inquiry_activities enable row level security;
alter table public.inquiry_number_counters enable row level security;

-- No anon/authenticated policies: public cannot read or write.
-- Admin app uses service-role / secret key through Next.js APIs only.

comment on table public.inquiries is
  'Admin CRM inquiries. Contact fields are admin-only; no secrets or VIN.';
comment on table public.inquiry_activities is
  'Internal follow-up timeline for inquiries. Admin-only.';
