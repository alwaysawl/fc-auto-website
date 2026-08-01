-- =============================================================================
-- Transactional homepage rank assignment with automatic swap.
-- Run in Supabase SQL Editor after 20260801_vehicles_homepage_rank.sql.
-- =============================================================================

-- Free a rank slot before inserting a new vehicle (demotes current occupant).
create or replace function public.prepare_homepage_rank_slot(
  p_homepage_rank integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(87231411);

  if p_homepage_rank is null then
    return;
  end if;

  if p_homepage_rank not between 1 and 4 then
    raise exception 'INVALID_HOMEPAGE_RANK'
      using errcode = 'P0001';
  end if;

  update public.vehicles
  set homepage_rank = null,
      featured = false,
      updated_at = now()
  where homepage_rank = p_homepage_rank;
end;
$$;

grant execute on function public.prepare_homepage_rank_slot(integer) to service_role;

-- Atomically assign/clear homepage_rank on an existing vehicle, swapping if needed.
create or replace function public.assign_vehicle_homepage_rank(
  p_vehicle_id text,
  p_featured boolean,
  p_homepage_rank integer default null
)
returns public.vehicles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_rank integer;
  v_occupant_id text;
  v_desired integer;
  v_row public.vehicles;
begin
  -- Serialize concurrent admin rank edits
  perform pg_advisory_xact_lock(87231411);

  v_desired := p_homepage_rank;
  if not coalesce(p_featured, false) then
    v_desired := null;
  elsif v_desired is null or v_desired not between 1 and 4 then
    raise exception 'INVALID_HOMEPAGE_RANK'
      using errcode = 'P0001',
            hint = 'homepage_rank must be 1–4 when featured is true';
  end if;

  select homepage_rank
  into v_old_rank
  from public.vehicles
  where id = p_vehicle_id
  for update;

  if not found then
    raise exception 'VEHICLE_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  -- Clear recommendation
  if v_desired is null then
    update public.vehicles
    set featured = false,
        homepage_rank = null,
        updated_at = now()
    where id = p_vehicle_id
    returning * into v_row;
    return v_row;
  end if;

  -- Unchanged slot
  if v_old_rank is not distinct from v_desired then
    update public.vehicles
    set featured = true,
        homepage_rank = v_desired,
        updated_at = now()
    where id = p_vehicle_id
    returning * into v_row;
    return v_row;
  end if;

  select id
  into v_occupant_id
  from public.vehicles
  where homepage_rank = v_desired
    and id <> p_vehicle_id
  for update;

  if v_occupant_id is not null then
    -- Clear both ranks first so the unique index never fires mid-swap
    update public.vehicles
    set homepage_rank = null,
        updated_at = now()
    where id = p_vehicle_id;

    update public.vehicles
    set homepage_rank = null,
        updated_at = now()
    where id = v_occupant_id;

    update public.vehicles
    set homepage_rank = v_desired,
        featured = true,
        updated_at = now()
    where id = p_vehicle_id;

    if v_old_rank is not null then
      -- Classic swap: occupant receives the previous rank
      update public.vehicles
      set homepage_rank = v_old_rank,
          featured = true,
          updated_at = now()
      where id = v_occupant_id;
    else
      -- No previous rank to give back — demote former occupant
      update public.vehicles
      set homepage_rank = null,
          featured = false,
          updated_at = now()
      where id = v_occupant_id;
    end if;
  else
    update public.vehicles
    set homepage_rank = v_desired,
        featured = true,
        updated_at = now()
    where id = p_vehicle_id;
  end if;

  select * into v_row from public.vehicles where id = p_vehicle_id;
  return v_row;
end;
$$;

grant execute on function public.assign_vehicle_homepage_rank(text, boolean, integer)
  to service_role;

comment on function public.prepare_homepage_rank_slot(integer) is
  'Free a homepage_rank slot before inserting a new vehicle.';

comment on function public.assign_vehicle_homepage_rank(text, boolean, integer) is
  'Atomically assign homepage_rank 1–4 with automatic swap of the previous occupant.';
