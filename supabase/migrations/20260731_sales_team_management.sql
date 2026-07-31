-- =============================================================================
-- Sales team (shareholder) management fields.
-- Safe to re-run. No DROP of assignment tables. No DELETE of history.
-- Does not invent Shawn/Miles rows if they already exist.
-- =============================================================================

alter table public.sales_agents
  add column if not exists availability_status text;

alter table public.sales_agents
  add column if not exists display_name text;

alter table public.sales_agents
  add column if not exists whatsapp_label text;

alter table public.sales_agents
  add column if not exists qr_path text;

alter table public.sales_agents
  add column if not exists updated_at timestamptz;

-- Backfill defaults for existing agents (no fake phone numbers)
update public.sales_agents
set availability_status = coalesce(nullif(availability_status, ''), 'active')
where availability_status is null or availability_status = '';

update public.sales_agents
set display_name = coalesce(
  nullif(display_name, ''),
  case
    when name = 'Shawn' then 'Shawn | FC Auto Export'
    when name = 'Miles' then 'Miles | FC Auto Export'
    else name || ' | FC Auto Export'
  end
)
where display_name is null or display_name = '';

update public.sales_agents
set whatsapp_label = coalesce(nullif(whatsapp_label, ''), whatsapp_number)
where whatsapp_label is null or whatsapp_label = '';

update public.sales_agents
set qr_path = coalesce(
  nullif(qr_path, ''),
  case
    when name = 'Shawn' then '/contacts/shawn-whatsapp.png'
    when name = 'Miles' then '/contacts/miles-whatsapp.png'
    else null
  end
)
where qr_path is null or qr_path = '';

update public.sales_agents
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

alter table public.sales_agents drop constraint if exists sales_agents_availability_allowed;
alter table public.sales_agents
  add constraint sales_agents_availability_allowed check (
    availability_status in ('active', 'paused', 'existing_only')
  );

create index if not exists sales_agents_availability_idx
  on public.sales_agents (availability_status, display_order);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sales_agents_set_updated_at on public.sales_agents;
create trigger sales_agents_set_updated_at
  before update on public.sales_agents
  for each row execute function public.set_updated_at();

-- Ensure RPC respects availability_status for NEW automatic assignments.
-- Keeps sales_router_state rotation; only active shareholders receive new leads.
-- If function signature differs in production, CREATE OR REPLACE matches this arity.
create or replace function public.assign_next_sales_agent(
  p_source_page text default null,
  p_page_url text default null,
  p_vehicle_title text default null,
  p_vehicle_year text default null,
  p_stock_number text default null,
  p_user_agent text default null
)
returns table (
  inquiry_id text,
  agent_name text,
  agent_role text,
  whatsapp_number text
)
language plpgsql
security definer
as $$
declare
  v_last integer;
  v_agent public.sales_agents%rowtype;
  v_inquiry_id text;
begin
  perform pg_advisory_xact_lock(87231401);

  select last_display_order into v_last
  from public.sales_router_state
  where id = 1
  for update;

  if v_last is null then
    insert into public.sales_router_state (id, last_display_order, updated_at)
    values (1, 0, now())
    on conflict (id) do nothing;
    v_last := 0;
  end if;

  select *
  into v_agent
  from public.sales_agents
  where coalesce(is_active, true) = true
    and coalesce(availability_status, 'active') = 'active'
    and display_order > coalesce(v_last, 0)
  order by display_order asc
  limit 1;

  if not found then
    select *
    into v_agent
    from public.sales_agents
    where coalesce(is_active, true) = true
      and coalesce(availability_status, 'active') = 'active'
    order by display_order asc
    limit 1;
  end if;

  if not found then
    raise exception 'NO_ACTIVE_SALES_AGENT';
  end if;

  update public.sales_router_state
  set last_display_order = v_agent.display_order,
      updated_at = now()
  where id = 1;

  v_inquiry_id :=
    'FC' || to_char((now() at time zone 'Asia/Shanghai'), 'YYYYMMDDHH24MISS') ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));

  insert into public.sales_assignments (
    inquiry_id,
    sales_agent_id,
    sales_agent_name,
    whatsapp_number,
    source_page,
    page_url,
    vehicle_title,
    vehicle_year,
    stock_number
  ) values (
    v_inquiry_id,
    v_agent.id,
    v_agent.name,
    v_agent.whatsapp_number,
    p_source_page,
    p_page_url,
    p_vehicle_title,
    p_vehicle_year,
    p_stock_number
  );

  inquiry_id := v_inquiry_id;
  agent_name := v_agent.name;
  agent_role := coalesce(v_agent.role, '销售联系人');
  whatsapp_number := v_agent.whatsapp_number;
  return next;
end;
$$;

comment on column public.sales_agents.availability_status is
  'active | paused | existing_only — controls new auto assignment only';
comment on column public.sales_agents.display_name is
  'Brand-facing display name, e.g. Shawn | FC Auto Export';
