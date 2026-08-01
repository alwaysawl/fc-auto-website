-- =============================================================================
-- Homepage featured reorder helpers (drag-and-drop admin UI).
-- Requires homepage_rank column + unique index from 20260801_vehicles_homepage_rank.sql.
-- Run in Supabase SQL Editor.
-- =============================================================================

create or replace function public.reorder_homepage_featured(
  p_ordered_ids text[]
)
returns setof public.vehicles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_len integer;
  v_i integer;
  v_id text;
begin
  perform pg_advisory_xact_lock(87231411);

  v_len := coalesce(array_length(p_ordered_ids, 1), 0);

  -- Clear ranks for currently featured vehicles to avoid unique conflicts
  update public.vehicles
  set homepage_rank = null,
      updated_at = now()
  where featured = true;

  if v_len = 0 then
    return query
      select * from public.vehicles
      where featured = true
      order by updated_at desc;
    return;
  end if;

  for v_i in 1 .. v_len loop
    v_id := p_ordered_ids[v_i];
    update public.vehicles
    set featured = true,
        homepage_rank = v_i,
        updated_at = now()
    where id = v_id;
  end loop;

  -- Any previously featured vehicle not in the new order stays featured only if
  -- still present in p_ordered_ids. Demote featured rows missing from the list.
  update public.vehicles
  set featured = false,
      homepage_rank = null,
      updated_at = now()
  where featured = true
    and not (id = any (p_ordered_ids));

  return query
    select *
    from public.vehicles
    where featured = true
    order by homepage_rank asc nulls last, updated_at desc;
end;
$$;

grant execute on function public.reorder_homepage_featured(text[]) to service_role;

create or replace function public.set_vehicle_homepage_featured(
  p_vehicle_id text,
  p_featured boolean
)
returns public.vehicles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next integer;
  v_row public.vehicles;
  v_ids text[];
begin
  perform pg_advisory_xact_lock(87231411);

  if not exists (select 1 from public.vehicles where id = p_vehicle_id) then
    raise exception 'VEHICLE_NOT_FOUND' using errcode = 'P0002';
  end if;

  if coalesce(p_featured, false) then
    select coalesce(max(homepage_rank), 0) + 1
    into v_next
    from public.vehicles
    where featured = true
      and homepage_rank is not null;

    update public.vehicles
    set featured = true,
        homepage_rank = v_next,
        updated_at = now()
    where id = p_vehicle_id
    returning * into v_row;

    return v_row;
  end if;

  -- Remove from homepage, then compact remaining ranks 1..n
  update public.vehicles
  set featured = false,
      homepage_rank = null,
      updated_at = now()
  where id = p_vehicle_id;

  select coalesce(array_agg(id order by homepage_rank asc nulls last, updated_at desc), '{}')
  into v_ids
  from public.vehicles
  where featured = true;

  update public.vehicles
  set homepage_rank = null,
      updated_at = now()
  where featured = true;

  if array_length(v_ids, 1) is not null then
    for v_next in 1 .. array_length(v_ids, 1) loop
      update public.vehicles
      set homepage_rank = v_next,
          updated_at = now()
      where id = v_ids[v_next];
    end loop;
  end if;

  select * into v_row from public.vehicles where id = p_vehicle_id;
  return v_row;
end;
$$;

grant execute on function public.set_vehicle_homepage_featured(text, boolean)
  to service_role;

comment on function public.reorder_homepage_featured(text[]) is
  'Atomically set homepage_rank 1..n from an ordered id list (drag-and-drop).';

comment on function public.set_vehicle_homepage_featured(text, boolean) is
  'Add or remove a vehicle from homepage featured and keep ranks unique.';
