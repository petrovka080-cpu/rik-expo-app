begin;

-- V1/V2 remain unchanged for existing workers. No price, tag or snapshot is
-- rewritten. Machine price evidence and a scope come only from the price source's explicit source_row,
-- never from the consuming definition or its current commercial selection.
create or replace function public.estimate_resolve_compile_price_items_v3(
  p_definition_version_id uuid,
  p_snapshot_ids uuid[]
)
returns table(
  snapshot_id uuid,
  price_key text,
  unit_id text,
  unit_price numeric,
  currency_code text,
  route_id uuid,
  cost_scope_id text,
  machine_hour_price_coverage_v1 jsonb
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
  with eligible_prices as (
    select
      item.snapshot_id,
      coalesce(nullif(trim(resource.cost_owner_id),''),binding.price_key) price_key,
      item.unit_id,
      item.unit_price,
      item.currency_code,
      snapshot.route_id,
      case when jsonb_typeof(item.source_row->'cost_scope_id')='string'
        and length(btrim(item.source_row->>'cost_scope_id'))>0
        then item.source_row->>'cost_scope_id' else null end cost_scope_id,
      item.source_row->'machine_hour_price_coverage_v1' machine_hour_price_coverage_v1,
      binding.priority binding_priority,
      route.priority route_priority,
      snapshot.captured_at snapshot_captured_at
    from public.estimate_resource_spec resource
    join public.estimate_resource_price_route_binding binding
      on binding.resource_spec_id=resource.id
    join public.estimate_price_snapshot snapshot
      on snapshot.id=any(p_snapshot_ids)
      and snapshot.route_id=binding.route_id
      and snapshot.captured_at<=now()
    join public.estimate_price_snapshot_item item
      on item.snapshot_id=snapshot.id
      and item.price_key=coalesce(nullif(trim(resource.cost_owner_id),''),binding.price_key)
      and item.unit_id=resource.unit_id
    join public.estimate_price_route route on route.id=snapshot.route_id
    where resource.definition_version_id=p_definition_version_id
  ), ranked_prices as (
    select distinct on (candidate.price_key,candidate.unit_id,candidate.cost_scope_id)
      candidate.*
    from eligible_prices candidate
    order by candidate.price_key,candidate.unit_id,candidate.cost_scope_id,
      candidate.binding_priority,candidate.route_priority,
      candidate.snapshot_captured_at desc,candidate.snapshot_id
  )
  select price.snapshot_id,price.price_key,price.unit_id,price.unit_price,
    price.currency_code,price.route_id,price.cost_scope_id,price.machine_hour_price_coverage_v1
  from ranked_prices price
  order by price.price_key,price.unit_id,price.binding_priority,price.route_priority,
    price.snapshot_captured_at desc,price.snapshot_id;
end;
$$;

revoke all on function public.estimate_resolve_compile_price_items_v3(uuid,uuid[]) from public;
revoke all on function public.estimate_resolve_compile_price_items_v3(uuid,uuid[]) from authenticated;
grant execute on function public.estimate_resolve_compile_price_items_v3(uuid,uuid[]) to service_role;

commit;
