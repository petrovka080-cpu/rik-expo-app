-- S25/S26: resolve every current compatible governed price snapshot when the
-- caller did not explicitly select a price source. A locally reviewed release
-- intentionally remains prepared until a separate activation decision, so a
-- ready manifest is eligible in either active or prepared state. Unknown prices
-- stay NULL; this function never manufactures a rate and never replaces a
-- supplied list.

begin;

create or replace function public.estimate_resolve_default_price_snapshot_ids_v1(
  p_catalog_id text,
  p_currency_code text,
  p_release_id uuid
)
returns table(snapshot_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception using errcode='28000',message='authentication required';
  end if;
  if nullif(trim(p_catalog_id),'') is null
    or p_currency_code !~ '^[A-Z]{3}$'
    or p_release_id is null then
    raise exception using errcode='22023',message='invalid price snapshot resolution scope';
  end if;
  if not exists(
    select 1
    from public.estimate_definition_release release
    join public.estimate_cumulative_manifest_entry manifest
      on manifest.release_id=release.id
    where release.id=p_release_id
      and release.status in ('active','prepared')
      and manifest.catalog_id=p_catalog_id
      and manifest.baseline_ready
      and manifest.scenario_ready
  ) then
    raise exception using errcode='22023',message='ready catalog definition is unavailable';
  end if;

  return query
  select selected.snapshot_id
  from (
    select distinct on (route.id)
      snapshot.id snapshot_id,
      route.priority route_priority,
      min(binding.priority) over (partition by route.id) binding_priority,
      route.route_key,
      snapshot.captured_at
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_resource_spec resource
      on resource.definition_version_id=manifest.definition_version_id
    join public.estimate_resource_price_route_binding binding
      on binding.resource_spec_id=resource.id
    join public.estimate_price_route route
      on route.id=binding.route_id
      and route.active
      and route.currency_code=p_currency_code
    join public.estimate_price_snapshot snapshot
      on snapshot.route_id=route.id
      and snapshot.currency_code=p_currency_code
      and snapshot.captured_at<=now()
      and (snapshot.valid_until is null or snapshot.valid_until>=now())
    where manifest.release_id=p_release_id
      and manifest.catalog_id=p_catalog_id
      and manifest.baseline_ready
      and manifest.scenario_ready
    order by route.id,binding.priority,route.priority,
      snapshot.captured_at desc,snapshot.id
  ) selected
  order by selected.binding_priority,selected.route_priority,
    selected.route_key,selected.captured_at desc,selected.snapshot_id
  limit 64;
end;
$$;

revoke all on function public.estimate_resolve_default_price_snapshot_ids_v1(text,text,uuid) from public;
grant execute on function public.estimate_resolve_default_price_snapshot_ids_v1(text,text,uuid) to authenticated;

-- The compiler needs only price rows reachable from the selected definition.
-- Resolve the latest row per effective price key/unit in SQL so a fixed global
-- LIMIT cannot silently drop a known price when snapshots contain large catalogs.
create or replace function public.estimate_resolve_compile_price_items_v1(
  p_definition_version_id uuid,
  p_snapshot_ids uuid[]
)
returns table(
  snapshot_id uuid,
  price_key text,
  unit_id text,
  unit_price numeric,
  currency_code text,
  route_id uuid
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_definition_version_id is null
    or p_snapshot_ids is null
    or cardinality(p_snapshot_ids)>64 then
    raise exception using errcode='22023',message='invalid compile price lookup scope';
  end if;

  return query
  select distinct on (
    coalesce(nullif(trim(resource.cost_owner_id),''),binding.price_key),
    resource.unit_id
  )
    item.snapshot_id,
    coalesce(nullif(trim(resource.cost_owner_id),''),binding.price_key) price_key,
    item.unit_id,
    item.unit_price,
    item.currency_code,
    snapshot.route_id
  from public.estimate_resource_spec resource
  join public.estimate_resource_price_route_binding binding
    on binding.resource_spec_id=resource.id
  join public.estimate_price_snapshot snapshot
    on snapshot.id=any(p_snapshot_ids)
    and snapshot.route_id=binding.route_id
  join public.estimate_price_snapshot_item item
    on item.snapshot_id=snapshot.id
    and item.price_key=coalesce(nullif(trim(resource.cost_owner_id),''),binding.price_key)
    and item.unit_id=resource.unit_id
  join public.estimate_price_route route on route.id=snapshot.route_id
  where resource.definition_version_id=p_definition_version_id
  order by
    coalesce(nullif(trim(resource.cost_owner_id),''),binding.price_key),
    resource.unit_id,
    binding.priority,
    route.priority,
    snapshot.captured_at desc,
    snapshot.id;
end;
$$;

revoke all on function public.estimate_resolve_compile_price_items_v1(uuid,uuid[]) from public;
revoke all on function public.estimate_resolve_compile_price_items_v1(uuid,uuid[]) from authenticated;
grant execute on function public.estimate_resolve_compile_price_items_v1(uuid,uuid[]) to service_role;

commit;
