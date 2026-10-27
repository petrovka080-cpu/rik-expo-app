-- S25: expose only semantically compatible known KGS prices to the canonical
-- strip-foundation owner. Rows without an exact compatibility mapping stay
-- unpriced; this migration neither manufactures zeroes nor overwrites manual
-- prices supplied in a compile/recalculation request.

begin;

do $$
declare
  v_contract constant text := 'rik-expo-app.s25.strip-foundation-compatible-known-prices.v1';
  v_source_route public.estimate_price_route%rowtype;
  v_source_snapshot public.estimate_price_snapshot%rowtype;
  v_target_route public.estimate_price_route%rowtype;
  v_target_snapshot public.estimate_price_snapshot%rowtype;
  v_source_definition_id uuid;
  v_target_definition_id uuid;
  v_target_route_key constant text := 's25:canonical-strip-foundation:compatible-r58-kgs';
  v_target_snapshot_key text;
  v_payload_sha256 text;
  v_item_count integer;
  v_binding_count integer;
begin
  select route.* into v_source_route
  from public.estimate_price_route route
  where route.route_key='r555-final-r58-supplement-6c49f066b3b8:price-route'
    and route.currency_code='KGS'
    and route.active;

  -- Environments without this governed source retain honest NULL prices.
  if not found then
    raise notice '%: compatible source route is unavailable; no bindings added', v_contract;
    return;
  end if;

  select manifest.definition_version_id into strict v_source_definition_id
  from public.estimate_cumulative_manifest_entry manifest
  join public.estimate_definition_release release on release.id=manifest.release_id
  where manifest.catalog_id='r58-real:monolithic-reinforced-concrete'
    and release.status in ('active','prepared')
  order by (release.status='active') desc,release.created_at desc,release.id
  limit 1;

  select manifest.definition_version_id into strict v_target_definition_id
  from public.estimate_cumulative_manifest_entry manifest
  join public.estimate_definition_release release on release.id=manifest.release_id
  where manifest.catalog_id='canonical-work:expanded:strip_foundation'
    and release.status in ('active','prepared')
  order by (release.status='active') desc,release.created_at desc,release.id
  limit 1;

  select snapshot.* into v_source_snapshot
  from public.estimate_price_snapshot snapshot
  where snapshot.route_id=v_source_route.id
    and snapshot.currency_code='KGS'
    and snapshot.captured_at<=now()
    and (snapshot.valid_until is null or snapshot.valid_until>=now())
  order by snapshot.captured_at desc,snapshot.id
  limit 1;

  if not found then
    raise notice '%: compatible source snapshot is unavailable; no bindings added', v_contract;
    return;
  end if;

  v_target_snapshot_key := v_target_route_key||':'||v_source_snapshot.id::text;
  v_payload_sha256 := encode(extensions.digest(convert_to(
    v_contract||':'||v_source_snapshot.payload_sha256||':'||v_target_snapshot_key,
    'UTF8'
  ),'sha256'),'hex');

  insert into public.estimate_price_route(
    route_key,currency_code,region_code,priority,source_kind,metadata,active
  ) values(
    v_target_route_key,'KGS',v_source_route.region_code,10,'catalog',
    jsonb_build_object(
      'contract',v_contract,
      'compatibility','EXACT_ROW_AND_UNIT_MAP',
      'sourceRouteId',v_source_route.id,
      'sourceSnapshotId',v_source_snapshot.id,
      'sourceMetadata',v_source_route.metadata,
      'unknownRowsRemainUnpriced',true,
      'manualPriceOverridePreserved',true
    ),true
  ) on conflict(route_key) do nothing;

  select route.* into strict v_target_route
  from public.estimate_price_route route
  where route.route_key=v_target_route_key;
  if v_target_route.currency_code<>'KGS' or not v_target_route.active then
    raise exception '%: target route drift',v_contract;
  end if;

  insert into public.estimate_price_snapshot(
    route_id,snapshot_key,captured_at,valid_until,currency_code,payload_sha256,source_metadata
  ) values(
    v_target_route.id,v_target_snapshot_key,v_source_snapshot.captured_at,
    v_source_snapshot.valid_until,'KGS',v_payload_sha256,
    jsonb_build_object(
      'contract',v_contract,
      'derivedWithoutPriceMutation',true,
      'sourceRouteId',v_source_route.id,
      'sourceSnapshotId',v_source_snapshot.id,
      'sourcePayloadSha256',v_source_snapshot.payload_sha256,
      'compatibilityMapVersion','strip-foundation-r58.v1'
    )
  ) on conflict(snapshot_key) do nothing;

  select snapshot.* into strict v_target_snapshot
  from public.estimate_price_snapshot snapshot
  where snapshot.snapshot_key=v_target_snapshot_key;
  if v_target_snapshot.route_id<>v_target_route.id
    or v_target_snapshot.currency_code<>'KGS'
    or v_target_snapshot.payload_sha256<>v_payload_sha256 then
    raise exception '%: target snapshot drift',v_contract;
  end if;

  with compatibility(target_row_id,source_row_id) as (values
    ('main_concrete','r58-real:monolithic-reinforced-concrete:r4:concrete'),
    ('reinforcement','r58-real:monolithic-reinforced-concrete:r4:rebar'),
    ('binding_wire','r58-real:monolithic-reinforced-concrete:r4:tie_wire'),
    ('formwork_system','r58-real:monolithic-reinforced-concrete:r4:formwork'),
    ('reinforcement_install','r58-real:monolithic-reinforced-concrete:r4:rebar_labor')
  ), target_owner as (
    select distinct on (compatibility.target_row_id)
      compatibility.target_row_id,compatibility.source_row_id,
      target.cost_owner_id target_price_key,target.unit_id
    from compatibility
    join public.estimate_resource_spec target
      on target.definition_version_id=v_target_definition_id
      and target.row_id=compatibility.target_row_id
    where nullif(trim(target.cost_owner_id),'') is not null
    order by compatibility.target_row_id,target.id
  ), source_price as (
    select distinct on (target_owner.target_row_id)
      target_owner.target_row_id,target_owner.target_price_key,target_owner.unit_id,
      item.unit_price,item.currency_code,source.id source_resource_id,
      source.row_id source_row_id,binding.price_key source_price_key
    from target_owner
    join public.estimate_resource_spec source
      on source.definition_version_id=v_source_definition_id
      and source.row_id=target_owner.source_row_id
    join public.estimate_resource_price_route_binding binding
      on binding.resource_spec_id=source.id and binding.route_id=v_source_route.id
    join public.estimate_price_snapshot_item item
      on item.snapshot_id=v_source_snapshot.id
      and item.price_key=binding.price_key
      and item.unit_id=target_owner.unit_id
      and item.currency_code='KGS'
    order by target_owner.target_row_id,binding.priority,source.id
  )
  insert into public.estimate_price_snapshot_item(
    snapshot_id,price_key,unit_id,unit_price,currency_code,source_row
  )
  select v_target_snapshot.id,source_price.target_price_key,source_price.unit_id,
    source_price.unit_price,source_price.currency_code,
    jsonb_build_object(
      'contract',v_contract,
      'targetRowId',source_price.target_row_id,
      'sourceRowId',source_price.source_row_id,
      'sourceResourceId',source_price.source_resource_id,
      'sourcePriceKey',source_price.source_price_key,
      'sourceSnapshotId',v_source_snapshot.id,
      'semanticCompatibility','EXACT_ROW_AND_UNIT_MAP'
    )
  from source_price
  on conflict(snapshot_id,price_key,unit_id) do nothing;

  select count(*)::integer into v_item_count
  from public.estimate_price_snapshot_item item
  where item.snapshot_id=v_target_snapshot.id;
  if v_item_count<>5 then
    raise exception '%: expected 5 compatible price items, found %',v_contract,v_item_count;
  end if;

  with target_rows(row_id) as (values
    ('main_concrete'),('reinforcement'),('binding_wire'),('formwork_system'),('reinforcement_install')
  )
  insert into public.estimate_resource_price_route_binding(
    resource_spec_id,route_id,price_key,priority
  )
  select resource.id,v_target_route.id,resource.cost_owner_id,10
  from public.estimate_resource_spec resource
  join target_rows on target_rows.row_id=resource.row_id
  where resource.definition_version_id=v_target_definition_id
    and nullif(trim(resource.cost_owner_id),'') is not null
  on conflict(resource_spec_id,route_id) do nothing;

  select count(*)::integer into v_binding_count
  from public.estimate_resource_price_route_binding binding
  join public.estimate_resource_spec resource on resource.id=binding.resource_spec_id
  where binding.route_id=v_target_route.id
    and resource.definition_version_id=v_target_definition_id
    and resource.row_id in (
      'main_concrete','reinforcement','binding_wire','formwork_system','reinforcement_install'
    );
  if v_binding_count<5 then
    raise exception '%: compatible target bindings incomplete, found %',v_contract,v_binding_count;
  end if;
end;
$$;

commit;
