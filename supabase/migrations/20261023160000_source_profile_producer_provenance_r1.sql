-- Bind the existing core source-profile producer to the existing writer.
-- No source-condition interpreter, calculation engine, new function or owner.
begin;
do $sp16_migration$
declare
  v_signature regprocedure := 'public.estimate_commit_compile_job_v1(uuid,text,jsonb,jsonb)'::regprocedure;
  v_original text;
  v_normalized text;
  v_patched text;
  v_decl_old constant text := $sp16_fragment$
begin
  if current_user$sp16_fragment$;
  v_decl_new constant text := $sp16_fragment$
  -- SOURCE_PROFILE_PRODUCER_V1: consistency binding of the sole core producer.
  v_source_definition public.estimate_definition_version%rowtype;
  v_source_selector public.estimate_parameter_definition%rowtype;
  v_source_from public.estimate_parameter_definition%rowtype;
  v_source_to public.estimate_parameter_definition%rowtype;
  v_source_metadata jsonb;
  v_source_receipt jsonb;
  v_source_profile jsonb;
  v_source_branch jsonb;
  v_source_copy jsonb;
  v_source_entry record;
  v_source_geometry jsonb;
  v_source_outputs jsonb;
  v_source_user jsonb;
  v_source_baseline jsonb;
  v_source_derived jsonb;
  v_source_raw jsonb;
  v_source_selector_id text;
  v_source_owned_ids text[] := '{}'::text[];
  v_source_output_ids text[] := '{}'::text[];
  v_source_geometry_ids text[] := '{}'::text[];
  v_source_provenance_ok boolean := false;
  v_source_signal boolean := false;
  v_source_count integer;
  v_source_nodes integer;
  v_source_depth integer;

begin
  if current_user$sp16_fragment$;
  v_provenance_old constant text := $sp16_fragment$  if v_cumulative then
    if v_parameter_sources ->> 'approvedTemplateBaselineId'$sp16_fragment$;
  v_provenance_new constant text := $sp16_fragment$  -- SOURCE_PROFILE_PRODUCER_V1: WHEN is evaluated only by the existing core
  -- producer. This checks its immutable binding and identity-copy consistency;
  -- a receipt from this leased privileged worker is not a cryptographic proof.
  select * into v_source_definition from public.estimate_definition_version
  where id=v_definition_version_id and catalog_id=v_job.catalog_id;
  v_source_metadata:=v_source_definition.applicability -> 'sourceProfileSelectionV1';
  v_source_receipt:=v_parameter_sources -> 'sourceProfileProducerV1';
  v_source_signal:=coalesce(v_source_definition.applicability ? 'sourceProfileSelectionV1',false)
    or coalesce(v_parameter_sources ? 'sourceProfileProducerV1',false)
    or coalesce(v_job.input_payload ? 'sourceProfileProducerV1',false)
    or coalesce(v_job.input_payload -> 'parameterSources' ? 'sourceProfileProducerV1',false)
    or coalesce(v_job.input_payload -> 'parameters' ? 'sourceProfileProducerV1',false)
    or exists(select 1 from public.estimate_parameter_definition parameter
      where parameter.definition_version_id=v_definition_version_id
        and coalesce(parameter.truth_metadata -> 'provenance' ? 'source_geometry_copy_v1',false));
  if v_source_signal then
    if v_source_definition.id is null
      or jsonb_typeof(v_source_metadata) is distinct from 'object'
      or v_source_metadata ->> 'contract' is distinct from 'canonical-source-profile-selection/v1'
      or octet_length(v_source_metadata::text)>65536
      or coalesce(v_job.input_payload ? 'sourceProfileProducerV1',false)
      or coalesce(v_job.input_payload -> 'parameterSources' ? 'sourceProfileProducerV1',false)
      or coalesce(v_job.input_payload -> 'parameters' ? 'sourceProfileProducerV1',false) then
      raise exception using errcode='22023',message='source profile producer definition or raw receipt invalid';
    end if;
    if (select count(*) from jsonb_object_keys(v_source_metadata))<>4
      or not (v_source_metadata ?& array['contract','selectorParameterId','geometryParameterIds','profiles'])
      or jsonb_typeof(v_source_metadata -> 'selectorParameterId') is distinct from 'string'
      or (v_source_metadata ->> 'selectorParameterId') !~ '^[A-Za-z][A-Za-z0-9_.:-]{0,199}$'
      or jsonb_typeof(v_source_metadata -> 'geometryParameterIds') is distinct from 'array'
      or jsonb_typeof(v_source_metadata -> 'profiles') is distinct from 'array' then
      raise exception using errcode='22023',message='source profile producer metadata shape invalid';
    end if;
    if jsonb_array_length(v_source_metadata -> 'geometryParameterIds') not between 1 and 10
      or jsonb_array_length(v_source_metadata -> 'profiles') not between 1 and 64
      or exists(select 1 from jsonb_array_elements(v_source_metadata -> 'geometryParameterIds') id(value)
        where jsonb_typeof(id.value)<>'string' or (id.value #>> '{}') !~ '^[A-Za-z][A-Za-z0-9_.:-]{0,199}$') then
      raise exception using errcode='22023',message='source profile producer metadata bounds invalid';
    end if;
    select array_agg(value #>> '{}') into v_source_geometry_ids
    from jsonb_array_elements(v_source_metadata -> 'geometryParameterIds');
    if cardinality(v_source_geometry_ids)<>(select count(distinct id) from unnest(v_source_geometry_ids) id) then
      raise exception using errcode='22023',message='source profile producer geometry duplicate';
    end if;
    v_source_selector_id:=v_source_metadata ->> 'selectorParameterId';
    select * into v_source_selector from public.estimate_parameter_definition
    where definition_version_id=v_definition_version_id and parameter_id=v_source_selector_id;
    if v_source_selector.parameter_id is null or v_source_selector.value_type<>'enum'
      or v_source_selector.unit_id is not null or v_source_selector.default_value is not null
      or v_source_selector.truth_metadata ->> 'visibility_role' is distinct from 'INTERNAL_ONLY'
      or v_source_selector.truth_metadata ->> 'value_source_role' is distinct from 'SOURCE_BACKED_PRELIMINARY_PROFILE'
      or v_source_selector.truth_metadata #>> '{provenance,consumer_input_role_v1}' is distinct from 'APPLICATION_TECHNICAL'
      or jsonb_typeof(v_source_selector.constraints_json -> 'values') is distinct from 'array'
      or v_source_selector_id=any(v_source_geometry_ids) then
      raise exception using errcode='22023',message='source profile producer selector authority invalid';
    end if;
    if jsonb_array_length(v_source_selector.constraints_json -> 'values') not between 1 and 64 then
      raise exception using errcode='22023',message='source profile producer selector domain invalid';
    end if;
    for v_source_entry in select unnest(v_source_geometry_ids) id loop
      select * into v_source_from from public.estimate_parameter_definition
      where definition_version_id=v_definition_version_id and parameter_id=v_source_entry.id;
      if v_source_from.parameter_id is null or v_source_from.value_type not in ('decimal','integer')
        or v_source_from.unit_id is null or v_source_from.unit_id !~ '^[A-Za-z][A-Za-z0-9_.:-]{0,199}$'
        or v_source_from.truth_metadata ->> 'visibility_role' is distinct from 'USER_INPUT'
        or v_source_from.truth_metadata #>> '{provenance,consumer_input_role_v1}' is distinct from 'OBJECT_FACT' then
        raise exception using errcode='22023',message='source profile producer geometry schema invalid';
      end if;
    end loop;
    v_source_owned_ids:=array[v_source_selector_id];
    for v_source_branch in select value from jsonb_array_elements(v_source_metadata -> 'profiles') loop
      if jsonb_typeof(v_source_branch) is distinct from 'object' then
        raise exception using errcode='22023',message='source profile producer branch object invalid';
      end if;
      if (select count(*) from jsonb_object_keys(v_source_branch))<>4
        or not (v_source_branch ?& array['selectorValue','sources','when','geometryCopies'])
        or jsonb_typeof(v_source_branch -> 'selectorValue') is distinct from 'string'
        or length(v_source_branch ->> 'selectorValue') not between 1 and 1000
        or not ((v_source_selector.constraints_json -> 'values') @> jsonb_build_array(v_source_branch -> 'selectorValue'))
        or jsonb_typeof(v_source_branch -> 'when') is distinct from 'object'
        or jsonb_typeof(v_source_branch -> 'sources') is distinct from 'array'
        or jsonb_typeof(v_source_branch -> 'geometryCopies') is distinct from 'array' then
        raise exception using errcode='22023',message='source profile producer declared branch invalid';
      end if;
      if jsonb_array_length(v_source_branch -> 'sources') not between 1 and 16
        or jsonb_array_length(v_source_branch -> 'geometryCopies')>64 then
        raise exception using errcode='22023',message='source profile producer branch bounds invalid';
      end if;
      for v_source_copy in select value from jsonb_array_elements(v_source_branch -> 'geometryCopies') loop
        if jsonb_typeof(v_source_copy) is distinct from 'object' then
          raise exception using errcode='22023',message='source profile producer copy object invalid';
        end if;
        if (select count(*) from jsonb_object_keys(v_source_copy))<>2
          or not (v_source_copy ?& array['fromParameterId','toParameterId'])
          or jsonb_typeof(v_source_copy -> 'fromParameterId') is distinct from 'string'
          or jsonb_typeof(v_source_copy -> 'toParameterId') is distinct from 'string'
          or (v_source_copy ->> 'toParameterId') !~ '^[A-Za-z][A-Za-z0-9_.:-]{0,199}$'
          or not ((v_source_copy ->> 'fromParameterId')=any(v_source_geometry_ids))
          or (v_source_copy ->> 'toParameterId')=v_source_selector_id
          or (v_source_copy ->> 'toParameterId')=any(v_source_geometry_ids) then
          raise exception using errcode='22023',message='source profile producer copy binding invalid';
        end if;
        select * into v_source_from from public.estimate_parameter_definition
        where definition_version_id=v_definition_version_id and parameter_id=v_source_copy ->> 'fromParameterId';
        select * into v_source_to from public.estimate_parameter_definition
        where definition_version_id=v_definition_version_id and parameter_id=v_source_copy ->> 'toParameterId';
        if v_source_to.parameter_id is null or v_source_to.value_type is distinct from v_source_from.value_type
          or v_source_to.unit_id is distinct from v_source_from.unit_id or v_source_to.default_value is not null
          or v_source_to.truth_metadata ->> 'visibility_role' is distinct from 'INTERNAL_ONLY'
          or v_source_to.truth_metadata ->> 'value_source_role' is distinct from 'BACKEND_DERIVED'
          or v_source_to.truth_metadata #>> '{provenance,consumer_input_role_v1}' is distinct from 'APPLICATION_TECHNICAL'
          or (v_source_to.truth_metadata #> '{provenance,source_geometry_copy_v1}') is distinct from jsonb_build_object(
            'contract','canonical-source-geometry-copy/v1','fromParameterId',v_source_copy ->> 'fromParameterId','unitId',v_source_from.unit_id) then
          raise exception using errcode='22023',message='source profile producer copy schema or identity tag invalid';
        end if;
        v_source_owned_ids:=array_append(v_source_owned_ids,v_source_to.parameter_id);
      end loop;
      if jsonb_array_length(v_source_branch -> 'geometryCopies')<>(
        select count(distinct copy ->> 'toParameterId') from jsonb_array_elements(v_source_branch -> 'geometryCopies') copy) then
        raise exception using errcode='22023',message='source profile producer duplicate branch output';
      end if;
    end loop;
    if exists(select 1 from jsonb_array_elements(v_source_metadata -> 'profiles') profile
        cross join lateral jsonb_array_elements(profile -> 'geometryCopies') copy
        group by copy ->> 'toParameterId' having count(distinct copy ->> 'fromParameterId')>1)
      or exists(select 1 from jsonb_array_elements(v_source_metadata -> 'profiles') profile
        group by profile ->> 'selectorValue' having count(*)>1)
      or exists(select 1 from public.estimate_parameter_definition parameter
        where parameter.definition_version_id=v_definition_version_id
          and coalesce(parameter.truth_metadata -> 'provenance' ? 'source_geometry_copy_v1',false)
          and not (parameter.parameter_id=any(v_source_owned_ids))) then
      raise exception using errcode='22023',message='source profile producer union closure invalid';
    end if;
    select array_agg(distinct id) into v_source_owned_ids from unnest(v_source_owned_ids) id;
    v_source_raw:=coalesce(v_job.input_payload -> 'parameters','{}'::jsonb);
    v_source_user:=coalesce(v_parameter_sources -> 'userParameters','{}'::jsonb);
    v_source_baseline:=coalesce(v_parameter_sources -> 'baselineAssumptions','{}'::jsonb);
    v_source_derived:=coalesce(v_parameter_sources -> 'derivedParameters','{}'::jsonb);
    if jsonb_typeof(v_source_raw) is distinct from 'object'
      or jsonb_typeof(v_source_user) is distinct from 'object'
      or jsonb_typeof(v_source_baseline) is distinct from 'object'
      or jsonb_typeof(v_source_derived) is distinct from 'object'
      or v_source_raw ?| v_source_owned_ids or v_source_user ?| v_source_owned_ids
      or v_source_baseline ?| v_source_owned_ids then
      raise exception using errcode='22023',message='source profile producer owned input smuggling';
    end if;
    if not coalesce(v_parameter_sources ? 'sourceProfileProducerV1',false) then
      if v_resolved_parameters ?| v_source_owned_ids or v_source_derived ?| v_source_owned_ids then
        raise exception using errcode='22023',message='source profile producer receipt required for owned outputs';
      end if;
    else
      if jsonb_typeof(v_source_receipt) is distinct from 'object' then
        raise exception using errcode='22023',message='source profile producer receipt object invalid';
      end if;
      if octet_length(v_source_receipt::text)>131072
        or (select count(*) from jsonb_object_keys(v_source_receipt))<>7
        or not (v_source_receipt ?& array['contract','definitionVersionId','definitionSha256','metadata','selectorValue','geometry','outputs'])
        or v_source_receipt ->> 'contract' is distinct from 'canonical-source-profile-producer/v1'
        or v_source_receipt ->> 'definitionVersionId' is distinct from v_source_definition.id::text
        or v_source_receipt ->> 'definitionSha256' is distinct from v_source_definition.definition_sha256
        or v_source_receipt -> 'metadata' is distinct from v_source_metadata
        or jsonb_typeof(v_source_receipt -> 'selectorValue') is distinct from 'string'
        or jsonb_typeof(v_source_receipt -> 'geometry') is distinct from 'object'
        or jsonb_typeof(v_source_receipt -> 'outputs') is distinct from 'object' then
        raise exception using errcode='22023',message='source profile producer immutable receipt binding invalid';
      end if;
      v_source_geometry:=v_source_receipt -> 'geometry';v_source_outputs:=v_source_receipt -> 'outputs';
      if (select count(*) from jsonb_object_keys(v_source_geometry))>10
        or (select count(*) from jsonb_object_keys(v_source_outputs)) not between 1 and 65 then
        raise exception using errcode='22023',message='source profile producer output bounds invalid';
      end if;
      select count(*),jsonb_agg(value) -> 0 into v_source_count,v_source_profile
      from jsonb_array_elements(v_source_metadata -> 'profiles')
      where value -> 'selectorValue'=v_source_receipt -> 'selectorValue';
      if v_source_count<>1 then
        raise exception using errcode='22023',message='source profile producer selected branch invalid';
      end if;
      select array[v_source_selector_id]||coalesce(array_agg(value ->> 'toParameterId'),'{}'::text[])
        into v_source_output_ids from jsonb_array_elements(v_source_profile -> 'geometryCopies');
      if (select count(*) from jsonb_object_keys(v_source_outputs))<>cardinality(v_source_output_ids)
        or not (v_source_outputs ?& v_source_output_ids)
        or v_source_outputs -> v_source_selector_id is distinct from v_source_receipt -> 'selectorValue'
        or exists(select 1 from unnest(v_source_owned_ids) id where not (id=any(v_source_output_ids))
          and (v_resolved_parameters ? id or v_source_derived ? id)) then
        raise exception using errcode='22023',message='source profile producer exact selected output set invalid';
      end if;
      for v_source_entry in select key,value from jsonb_each(v_source_geometry) loop
        if not (v_source_entry.key=any(v_source_geometry_ids))
          or not (v_source_user ? v_source_entry.key) or not (v_resolved_parameters ? v_source_entry.key)
          or v_source_user -> v_source_entry.key is distinct from v_source_entry.value
          or v_resolved_parameters -> v_source_entry.key is distinct from v_source_entry.value
          or jsonb_typeof(v_source_entry.value) not in ('string','number')
          or length(v_source_entry.value #>> '{}') not between 1 and 128
          or (v_source_entry.value #>> '{}') !~ '^[+-]?[0-9]+([.][0-9]+)?$'
          or length(split_part(v_source_entry.value #>> '{}','.',2))>9 then
          raise exception using errcode='22023',message='source profile producer actual numeric geometry invalid';
        end if;
        select * into v_source_from from public.estimate_parameter_definition
        where definition_version_id=v_definition_version_id and parameter_id=v_source_entry.key;
        if v_source_from.value_type='integer' and (v_source_entry.value #>> '{}') !~ '^[+-]?[0-9]+$' then
          raise exception using errcode='22023',message='source profile producer actual integer geometry invalid';
        end if;
      end loop;
      if exists(select 1 from unnest(v_source_geometry_ids) id where v_source_user ? id
        and v_source_user -> id not in ('null'::jsonb,'""'::jsonb) and not (v_source_geometry ? id)) then
        raise exception using errcode='22023',message='source profile producer omitted actual geometry';
      end if;
      for v_source_copy in select value from jsonb_array_elements(v_source_profile -> 'geometryCopies') loop
        if not (v_source_geometry ? (v_source_copy ->> 'fromParameterId'))
          or v_source_outputs -> (v_source_copy ->> 'toParameterId') is distinct from
            v_source_geometry -> (v_source_copy ->> 'fromParameterId') then
          raise exception using errcode='22023',message='source profile producer identity copy value mismatch';
        end if;
      end loop;
      if exists(select 1 from jsonb_each(v_source_outputs) output(key,value)
        where not (v_source_derived ? output.key) or not (v_resolved_parameters ? output.key)
          or v_source_derived -> output.key is distinct from output.value
          or v_resolved_parameters -> output.key is distinct from output.value) then
        raise exception using errcode='22023',message='source profile producer output provenance mismatch';
      end if;
      v_source_provenance_ok:=true;
    end if;
    -- Bounded generic JSON traversal only; this does not interpret WHEN.
    with recursive walk(value,depth) as (
      select coalesce(v_source_receipt,v_source_metadata),0
      union all
      select child.value,walk.depth+1 from walk cross join lateral (
        select entry.value from jsonb_each(case when jsonb_typeof(walk.value)='object' then walk.value else '{}'::jsonb end) entry
        union all
        select entry.value from jsonb_array_elements(case when jsonb_typeof(walk.value)='array' then walk.value else '[]'::jsonb end) entry
      ) child where walk.depth<21
    ) select count(*),max(depth) into v_source_nodes,v_source_depth from walk;
    if v_source_nodes>8192 or v_source_depth>20 then
      raise exception using errcode='22023',message='source profile producer structural bounds exceeded';
    end if;
  end if;

  if v_cumulative then
    if v_parameter_sources ->> 'approvedTemplateBaselineId'$sp16_fragment$;
  v_derived_old constant text := $sp16_fragment$            or (derived.parameter_id='selected_delivery_admitted_trip_count'
              and v_delivery_provenance_ok is true))$sp16_fragment$;
  v_derived_new constant text := $sp16_fragment$            or (v_source_provenance_ok is true and derived.parameter_id=any(v_source_output_ids))
            or (derived.parameter_id='selected_delivery_admitted_trip_count'
              and v_delivery_provenance_ok is true))$sp16_fragment$;
  v_preimage_md5 constant text := 'e12865f429dd5508d2ad197fa8b75015';
  v_postimage_md5 constant text := '3d9e23c48ffec24ddbc04065bcfdcb10';
begin
  select pg_get_functiondef(v_signature) into strict v_original;
  v_normalized:=btrim(replace(v_original,E'\r\n',E'\n'),E'\n');
  if md5(v_normalized)=v_postimage_md5 then return; end if;
  if md5(v_normalized) is distinct from v_preimage_md5
    or position('SOURCE_PROFILE_PRODUCER_V1' in v_normalized)>0 then
    raise exception using errcode='22023',message='source profile writer preimage drift or partial installation';
  end if;
  if (length(v_normalized)-length(replace(v_normalized,v_decl_old,'')))/length(v_decl_old)<>1
    or (length(v_normalized)-length(replace(v_normalized,v_provenance_old,'')))/length(v_provenance_old)<>1
    or (length(v_normalized)-length(replace(v_normalized,v_derived_old,'')))/length(v_derived_old)<>1 then
    raise exception using errcode='22023',message='source profile writer fragments missing or ambiguous';
  end if;
  v_patched:=replace(replace(replace(v_normalized,v_decl_old,v_decl_new),v_provenance_old,v_provenance_new),v_derived_old,v_derived_new);
  if md5(v_patched) is distinct from v_postimage_md5 then
    raise exception using errcode='22023',message='source profile writer proposed postimage mismatch';
  end if;
  execute v_patched;
  if md5(btrim(replace(pg_get_functiondef(v_signature),E'\r\n',E'\n'),E'\n')) is distinct from v_postimage_md5 then
    raise exception using errcode='22023',message='source profile writer installed postimage mismatch';
  end if;
end;
$sp16_migration$;
commit;
