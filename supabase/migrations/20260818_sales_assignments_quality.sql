-- =============================================================================
-- WhatsApp lead quality flags on existing sales_assignments.
-- Additive only: no new tables, no DROP, no rewrite of analytics_events.
-- Does not replace assign_next_sales_agent (Shawn/Miles rotation unchanged).
-- Existing rows receive defaults (unknown / false) — no historical backfill.
-- =============================================================================

alter table public.sales_assignments
  add column if not exists customer_type text;

alter table public.sales_assignments
  add column if not exists lead_stage text;

alter table public.sales_assignments
  add column if not exists actual_contact boolean;

-- Defaults for existing and new rows (safe if columns already populated)
update public.sales_assignments
set customer_type = coalesce(nullif(customer_type, ''), 'unknown')
where customer_type is null or customer_type = '';

update public.sales_assignments
set lead_stage = coalesce(nullif(lead_stage, ''), 'unknown')
where lead_stage is null or lead_stage = '';

update public.sales_assignments
set actual_contact = coalesce(actual_contact, false)
where actual_contact is null;

alter table public.sales_assignments
  alter column customer_type set default 'unknown';

alter table public.sales_assignments
  alter column lead_stage set default 'unknown';

alter table public.sales_assignments
  alter column actual_contact set default false;

alter table public.sales_assignments
  alter column customer_type set not null;

alter table public.sales_assignments
  alter column lead_stage set not null;

alter table public.sales_assignments
  alter column actual_contact set not null;

alter table public.sales_assignments
  drop constraint if exists sales_assignments_customer_type_allowed;

alter table public.sales_assignments
  add constraint sales_assignments_customer_type_allowed
  check (customer_type in ('unknown', 'dealer', 'individual'));

alter table public.sales_assignments
  drop constraint if exists sales_assignments_lead_stage_allowed;

alter table public.sales_assignments
  add constraint sales_assignments_lead_stage_allowed
  check (lead_stage in ('unknown', 'contacted', 'interested', 'quoted', 'won', 'invalid'));

comment on column public.sales_assignments.customer_type is
  'Manual quality: unknown | dealer | individual';

comment on column public.sales_assignments.lead_stage is
  'Manual quality: unknown | contacted | interested | quoted | won | invalid';

comment on column public.sales_assignments.actual_contact is
  'True when a real WhatsApp conversation was confirmed. Default false.';
