-- Persist the admitted trip count as definition-owned derived provenance.
-- Existing sole writer only; no helper/table/API or definition republish.
-- Full pre/postimage pins use LF normalization and remove boundary LF only.
begin;
do $migration$
declare
  v_signature regprocedure:='public.estimate_commit_compile_job_v1(uuid,text,jsonb,jsonb)'::regprocedure;
  v_original text;
  v_normalized text;
  v_patched text;
  v_preimage_md5 constant text:='7e4efbc18d0797a18ca3fafbfa9f880d';
  v_postimage_md5 constant text:='84f1149126c0f76cde638e8c5dc46c77';
  v_decl_old constant text:=$d16_decl_old$  v_amendment_contract jsonb;$d16_decl_old$;
  v_decl_new constant text:=$d16_decl_new$  v_amendment_contract jsonb;
  -- D16_SELECTED_DELIVERY_PROVENANCE_V1: consistency, not admission attestation.
  v_delivery_provenance_ok boolean := false;
  v_delivery_signal boolean := false;
  v_delivery_resource public.estimate_resource_spec%rowtype;
  v_delivery_parameter public.estimate_parameter_definition%rowtype;
  v_delivery_parent public.estimate_revision%rowtype;
  v_delivery_parent_row public.estimate_revision_row%rowtype;
  v_delivery_parent_resource public.estimate_resource_spec%rowtype;
  v_delivery_request jsonb;
  v_delivery_receipt jsonb;
  v_delivery_command jsonb;
  v_delivery_fence jsonb;
  v_delivery_prior jsonb;
  v_delivery_row jsonb;
  v_delivery_witness jsonb;
  v_delivery_norm jsonb;
  v_delivery_count numeric;
  v_delivery_n integer;
  v_delivery_key text;
$d16_decl_new$;
  v_provenance_old constant text:=$d16_prov_old$    if v_parameter_sources ->> 'approvedTemplateBaselineId' <> v_baseline.id::text
      or jsonb_typeof(v_baseline_assumptions) <> 'object'
      or jsonb_typeof(v_user_parameters) <> 'object'
      or v_baseline_assumptions <> (coalesce((
        select jsonb_object_agg(entry.key, entry.value)
        from jsonb_each(v_baseline.input_values) entry(key, value)
        where upper(coalesce(v_baseline.input_classification ->> entry.key, '')) not in (
          'FIXTURE_ONLY', 'VALIDATION_FIXTURE', 'TEST_ONLY'
        )
      ), '{}'::jsonb) - (
        select coalesce(array_agg(parameter_id), '{}'::text[])
        from jsonb_object_keys(v_user_parameters) as keys(parameter_id)
      ))
      or v_resolved_parameters <> (v_baseline_assumptions || v_user_parameters || coalesce(v_parameter_sources -> 'derivedParameters','{}'::jsonb))
      or jsonb_typeof(coalesce(v_parameter_sources -> 'derivedParameters','{}'::jsonb)) <> 'object'
      or exists (
        select 1 from jsonb_object_keys(coalesce(v_parameter_sources -> 'derivedParameters','{}'::jsonb)) derived(parameter_id)
        left join public.estimate_parameter_definition parameter
          on parameter.definition_version_id=v_definition_version_id and parameter.parameter_id=derived.parameter_id
        where parameter.parameter_id is null
          or v_user_parameters ? derived.parameter_id
          or v_baseline_assumptions ? derived.parameter_id
          or not (parameter.truth_metadata ? 'effective_resource_quantity_v1'
            or parameter.truth_metadata ? 'derived_exact_lookup_v1'
            or parameter.truth_metadata ? 'preliminary_value_formula_v1')
      ) then
      raise exception using errcode = '22023', message = 'cumulative baseline/user parameter provenance mismatch';
    end if;$d16_prov_old$;
  v_anchor_old constant text:=$d16_anchor_old$  v_row_count := jsonb_array_length(p_rows);$d16_anchor_old$;
  v_anchor_new constant text:=$d16_anchor_new$
  -- Independent delivery signal detection: omission of derivedParameters cannot
  -- bypass receipt validation. The parent-only EXISTS is diagnostic, never an
  -- authorization grant; admission below requires owner AND null-safe tenant.
  select * into v_delivery_resource from public.estimate_resource_spec
  where definition_version_id=v_definition_version_id
    and row_id='delivery:selected-material:ford-transit-v363';
  v_delivery_signal :=
    coalesce(v_job.input_payload ? 'selectedMaterialDeliveryV1',false)
    or coalesce(p_revision #> '{parameterSources}' ? 'selectedMaterialDeliveryV1',false)
    or coalesce(v_resolved_parameters ? 'selected_delivery_admitted_trip_count',false)
    or coalesce(p_revision #> '{parameterSources,derivedParameters}' ? 'selected_delivery_admitted_trip_count',false)
    or coalesce(p_revision #> '{parameterSources,userParameters}' ? 'selected_delivery_admitted_trip_count',false)
    or coalesce(p_revision #> '{parameterSources,baselineAssumptions}' ? 'selected_delivery_admitted_trip_count',false)
    or coalesce(v_job.input_payload -> 'parameters' ? 'selected_delivery_admitted_trip_count',false)
    or coalesce(v_resolved_parameters ->> 'selected_delivery_selection'='SEPARATE_CONFIRMED',false)
    or coalesce(v_job.input_payload #>> '{parameters,selected_delivery_selection}'='SEPARATE_CONFIRMED',false)
    or (v_cumulative is true and coalesce(v_baseline.input_values ? 'selected_delivery_admitted_trip_count',false)
      and upper(coalesce(v_baseline.input_classification ->> 'selected_delivery_admitted_trip_count',''))
        not in ('FIXTURE_ONLY','VALIDATION_FIXTURE','TEST_ONLY'))
    or exists (select 1 from jsonb_array_elements(
      case when jsonb_typeof(p_rows)='array' then p_rows else '[]'::jsonb end) projected(value)
      where value ->> 'row_id'='delivery:selected-material:ford-transit-v363'
        or value ->> 'resource_spec_id'=v_delivery_resource.id::text
        or exists (select 1 from public.estimate_resource_spec signalled
          where signalled.id::text=value ->> 'resource_spec_id'
            and signalled.row_id='delivery:selected-material:ford-transit-v363'))
    or (v_delivery_resource.id is not null and exists (
      select 1 from public.estimate_revision parent_signal
      where parent_signal.id=v_job.parent_revision_id and parent_signal.catalog_id=v_job.catalog_id
        and (coalesce(parent_signal.amendment_contract #> '{parameterSources}' ? 'selectedMaterialDeliveryV1',false)
          or coalesce(parent_signal.input_parameters ->> 'selected_delivery_selection'='SEPARATE_CONFIRMED',false)
          or coalesce(parent_signal.input_parameters ? 'selected_delivery_admitted_trip_count',false)
          or exists (select 1 from public.estimate_revision_row saved
            where saved.revision_id=parent_signal.id and saved.row_id='delivery:selected-material:ford-transit-v363'))));

  if v_delivery_signal is true then
    if v_cumulative is not true or v_job.operation is distinct from 'recalculate'
      or v_job.parent_revision_id is null
      or v_job.status is distinct from 'running'
      or v_job.lease_owner is distinct from trim(p_worker_id)
      or v_job.lease_expires_at is null or v_job.lease_expires_at<=now()
      or jsonb_typeof(p_revision) is distinct from 'object'
      or jsonb_typeof(p_rows) is distinct from 'array'
      or jsonb_typeof(v_resolved_parameters) is distinct from 'object'
      or jsonb_typeof(v_parameter_sources) is distinct from 'object'
      or jsonb_typeof(v_user_parameters) is distinct from 'object'
      or jsonb_typeof(v_baseline_assumptions) is distinct from 'object'
      or jsonb_typeof(v_parameter_sources -> 'derivedParameters') is distinct from 'object'
      or jsonb_typeof(v_job.input_payload -> 'parameters') is distinct from 'object'
      or coalesce(v_job.input_payload -> 'parameters' ? 'selected_delivery_admitted_trip_count',false)
      or coalesce(v_user_parameters ? 'selected_delivery_admitted_trip_count',false)
      or coalesce(v_baseline_assumptions ? 'selected_delivery_admitted_trip_count',false)
      or jsonb_typeof(v_parameter_sources -> 'parentRevisionId') is distinct from 'string'
      or v_parameter_sources ->> 'parentRevisionId' is distinct from v_job.parent_revision_id::text then
      raise exception using errcode='22023',message='selected delivery job/provenance context invalid';
    end if;
    v_delivery_request:=v_job.input_payload -> 'selectedMaterialDeliveryV1';
    v_delivery_receipt:=v_parameter_sources -> 'selectedMaterialDeliveryV1';
    if jsonb_typeof(v_delivery_request) is distinct from 'object'
      or jsonb_typeof(v_delivery_receipt) is distinct from 'object'
      or v_delivery_request ->> 'contractVersion' is distinct from 'canonical-selected-material-delivery-request/v1'
      or v_delivery_receipt ->> 'contractVersion' is distinct from 'canonical-selected-material-delivery-receipt/v1'
      or jsonb_typeof(v_delivery_request -> 'command') is distinct from 'object'
      or jsonb_typeof(v_delivery_request -> 'readFence') is distinct from 'object'
      or jsonb_typeof(v_delivery_receipt -> 'command') is distinct from 'object'
      or jsonb_typeof(v_delivery_receipt -> 'sourceReadFence') is distinct from 'object'
      or v_delivery_receipt -> 'command' is distinct from v_delivery_request -> 'command'
      or v_delivery_receipt -> 'sourceReadFence' is distinct from v_delivery_request -> 'readFence' then
      raise exception using errcode='22023',message='selected delivery request/receipt/frozen command mismatch';
    end if;
    v_delivery_command:=v_delivery_request -> 'command';
    v_delivery_fence:=v_delivery_request -> 'readFence';
    if v_delivery_command ->> 'contractVersion' is distinct from 'canonical-selected-material-delivery-command/v1'
      or v_delivery_command -> 'separatePaymentConfirmed' is distinct from 'true'::jsonb
      or jsonb_typeof(v_delivery_command -> 'consignmentId') is distinct from 'string'
      or jsonb_typeof(v_delivery_command -> 'documentReference') is distinct from 'string'
      or nullif(btrim(v_delivery_command ->> 'consignmentId'),'') is null
      or nullif(btrim(v_delivery_command ->> 'documentReference'),'') is null
      or v_delivery_fence ->> 'contractVersion' is distinct from 'canonical-selected-delivery-read-fence/v1'
      or jsonb_typeof(v_delivery_fence -> 'parentRevisionId') is distinct from 'string'
      or v_delivery_fence ->> 'parentRevisionId' is distinct from v_job.parent_revision_id::text
      or jsonb_typeof(v_delivery_fence -> 'parentChecksumSha256') is distinct from 'string'
      or jsonb_typeof(v_delivery_fence -> 'readSetSha256') is distinct from 'string'
      or coalesce(v_delivery_fence ->> 'parentChecksumSha256' ~ '^[0-9a-f]{64}$',false) is not true
      or coalesce(v_delivery_fence ->> 'readSetSha256' ~ '^[0-9a-f]{64}$',false) is not true then
      raise exception using errcode='22023',message='selected delivery command/fence invalid';
    end if;
    select * into v_delivery_parent from public.estimate_revision
    where id=v_job.parent_revision_id and catalog_id=v_job.catalog_id
      and owner_user_id=v_job.owner_user_id and organization_id is not distinct from v_job.organization_id;
    if v_delivery_parent.id is null or v_delivery_parent.status is distinct from 'ready'
      or v_delivery_parent.checksum_sha256 is distinct from v_delivery_fence ->> 'parentChecksumSha256' then
      raise exception using errcode='22023',message='selected delivery exact parent scope/checksum mismatch';
    end if;
    select * into v_delivery_parameter from public.estimate_parameter_definition
    where definition_version_id=v_definition_version_id and parameter_id='selected_delivery_admitted_trip_count';
    if v_delivery_parameter.parameter_id is null or v_delivery_parameter.value_type is distinct from 'integer'
      or v_delivery_parameter.unit_id is distinct from 'trip'
      or v_delivery_parameter.truth_metadata ->> 'contract' is distinct from 'rik-expo-app.selected-material-delivery-forward.r1'
      or v_delivery_parameter.truth_metadata ->> 'visibility_role' is distinct from 'INTERNAL_ONLY'
      or v_delivery_parameter.truth_metadata ->> 'value_source_role' is distinct from 'BACKEND_DERIVED'
      or v_delivery_resource.id is null or v_delivery_resource.unit_id is distinct from 'trip'
      or v_delivery_resource.cost_owner_id is distinct from 'delivery:selected-material:ford-transit-v363'
      or v_delivery_resource.procurement_eligible is distinct from false
      or v_delivery_resource.resource_graph ->> 'costTreatment' is distinct from 'OWN_COST'
      or v_delivery_resource.resource_graph #>> '{selectedMaterialDeliveryR1,contractVersion}' is distinct from 'canonical-selected-material-delivery-resource/v1'
      or v_delivery_resource.resource_graph #> '{selectedMaterialDeliveryR1,serverAdmissionRequired}' is distinct from 'true'::jsonb
      or v_delivery_resource.resource_graph #>> '{selectedMaterialDeliveryR1,quantityParameterId}' is distinct from 'selected_delivery_admitted_trip_count'
      or v_delivery_resource.source_metadata ->> 'contract' is distinct from 'rik-expo-app.selected-material-delivery-forward.r1'
      or v_delivery_resource.source_metadata -> 'automaticGenericPriceInheritanceAllowed' is distinct from 'false'::jsonb
      or not exists (select 1 from public.estimate_formula_graph formula
        where formula.definition_version_id=v_definition_version_id and formula.formula_id=v_delivery_resource.formula_id
          and formula.output_unit_id='trip' and formula.input_parameter_ids=array['selected_delivery_admitted_trip_count']::text[])
      or exists (select 1 from public.estimate_resource_price_route_binding binding where binding.resource_spec_id=v_delivery_resource.id)
      or jsonb_typeof(v_delivery_resource.source_metadata -> 'normativeTrace') is distinct from 'array' then
      raise exception using errcode='22023',message='selected delivery definition-owned metadata invalid';
    end if;
    select count(*),min(value::text)::jsonb into v_delivery_n,v_delivery_norm
    from jsonb_array_elements(v_delivery_resource.source_metadata -> 'normativeTrace') trace(value)
    where value ->> 'source_id'='src_professional_norm_pack_delivery_ford_transit_v363_max_payload_trip_per_kg_v1'
      and value ->> 'norm_id'='delivery_ford_transit_v363_max_payload_trip_per_kg_v1';
    if v_delivery_n<>1 or jsonb_typeof(v_delivery_norm -> 'source_definition_hash') is distinct from 'string'
      or nullif(v_delivery_norm ->> 'source_definition_hash','') is null then
      raise exception using errcode='22023',message='selected delivery definition norm identity invalid';
    end if;
    if (v_resolved_parameters ? 'selected_delivery_admitted_trip_count') is not true
      or (v_parameter_sources -> 'derivedParameters' ? 'selected_delivery_admitted_trip_count') is not true
      or v_resolved_parameters -> 'selected_delivery_admitted_trip_count' is distinct from
        v_parameter_sources #> '{derivedParameters,selected_delivery_admitted_trip_count}'
      or coalesce(jsonb_typeof(v_resolved_parameters -> 'selected_delivery_admitted_trip_count') in ('string','number'),false) is not true
      or coalesce(length(v_resolved_parameters ->> 'selected_delivery_admitted_trip_count') between 1 and 64,false) is not true
      or coalesce(v_resolved_parameters ->> 'selected_delivery_admitted_trip_count' ~ '^[0-9]+([.][0-9]+)?$',false) is not true then
      raise exception using errcode='22023',message='selected delivery derived count invalid';
    end if;
    v_delivery_count:=(v_resolved_parameters ->> 'selected_delivery_admitted_trip_count')::numeric;
    if v_delivery_count<=0 or v_delivery_count>9007199254740991 or trunc(v_delivery_count)<>v_delivery_count
      or v_resolved_parameters ->> 'selected_delivery_selection' is distinct from 'SEPARATE_CONFIRMED'
      or v_resolved_parameters ->> 'selected_delivery_consignment_id' is distinct from v_delivery_command ->> 'consignmentId'
      or v_resolved_parameters ->> 'selected_delivery_document_reference' is distinct from v_delivery_command ->> 'documentReference'
      or v_delivery_receipt ->> 'consignmentId' is distinct from v_delivery_command ->> 'consignmentId'
      or v_delivery_receipt ->> 'documentReference' is distinct from v_delivery_command ->> 'documentReference'
      or v_delivery_receipt ->> 'transportRowId' is distinct from 'delivery:selected-material:ford-transit-v363'
      or v_delivery_receipt ->> 'savedDefinitionId' is distinct from v_definition_version_id::text
      or v_delivery_receipt -> 'globalConsignmentPaymentUniquenessProven' is distinct from 'false'::jsonb
      or jsonb_typeof(v_delivery_receipt -> 'ownerKey') is distinct from 'string'
      or coalesce(v_delivery_receipt ->> 'ownerKey' ~ '^selected-material-delivery:eh_[0-9a-f]{16}$',false) is not true
      or jsonb_typeof(v_delivery_receipt -> 'orderBasisSha256') is distinct from 'string'
      or coalesce(v_delivery_receipt ->> 'orderBasisSha256' ~ '^eh_[0-9a-f]{16}$',false) is not true
      or jsonb_typeof(v_delivery_receipt -> 'originRevisionId') is distinct from 'string'
      or coalesce(v_delivery_receipt ->> 'originRevisionId' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',false) is not true then
      raise exception using errcode='22023',message='selected delivery receipt context invalid';
    end if;
    foreach v_delivery_key in array array['originChecksumSha256','savedRowSha256','savedPriceBindingSha256'] loop
      if jsonb_typeof(v_delivery_receipt -> v_delivery_key) is distinct from 'string'
        or coalesce(v_delivery_receipt ->> v_delivery_key ~ '^[0-9a-f]{64}$',false) is not true then
        raise exception using errcode='22023',message='selected delivery receipt digest missing';
      end if;
    end loop;
    if jsonb_typeof(v_delivery_receipt -> 'shipmentWitness') is distinct from 'object'
      or v_delivery_receipt #>> '{shipmentWitness,version}' is distinct from 'selected-material-delivery-shipment/r1'
      or jsonb_typeof(v_delivery_receipt #> '{shipmentWitness,canonicalFacts}') is distinct from 'string' then
      raise exception using errcode='22023',message='selected delivery witness required';
    end if;
    begin
      v_delivery_witness:=(v_delivery_receipt #>> '{shipmentWitness,canonicalFacts}')::jsonb;
    exception when invalid_text_representation then
      raise exception using errcode='22023',message='selected delivery witness JSON invalid';
    end;
    if jsonb_typeof(v_delivery_witness) is distinct from 'object'
      or jsonb_typeof(v_delivery_witness -> 'facts') is distinct from 'object'
      or jsonb_typeof(v_delivery_witness -> 'resolution') is distinct from 'object'
      or v_delivery_witness ->> 'revisionId' is distinct from v_delivery_receipt ->> 'originRevisionId'
      or v_delivery_witness ->> 'consignmentId' is distinct from v_delivery_receipt ->> 'consignmentId'
      or v_delivery_witness ->> 'documentReference' is distinct from v_delivery_receipt ->> 'documentReference'
      or v_delivery_witness ->> 'orderBasisSha256' is distinct from v_delivery_receipt ->> 'orderBasisSha256'
      or v_delivery_witness #>> '{resolution,source_id}' is distinct from v_delivery_norm ->> 'source_id'
      or v_delivery_witness #>> '{resolution,norm_id}' is distinct from v_delivery_norm ->> 'norm_id'
      or v_delivery_witness #>> '{resolution,source_definition_hash}' is distinct from v_delivery_norm ->> 'source_definition_hash'
      or v_delivery_witness #>> '{resolution,source_document_version}' is distinct from v_delivery_norm ->> 'source_document_version'
      or v_delivery_witness #>> '{resolution,applicability_version}' is distinct from 'professional-physical-norm-applicability:v1'
      or jsonb_typeof(v_delivery_witness #> '{resolution,tripCount}') is distinct from 'string'
      or coalesce(length(v_delivery_witness #>> '{resolution,tripCount}') between 1 and 64,false) is not true
      or coalesce(v_delivery_witness #>> '{resolution,tripCount}' ~ '^[0-9]+([.][0-9]+)?$',false) is not true then
      raise exception using errcode='22023',message='selected delivery witness binding invalid';
    end if;
    if (v_delivery_witness #>> '{resolution,tripCount}')::numeric is distinct from v_delivery_count then
      raise exception using errcode='22023',message='selected delivery witness count mismatch';
    end if;
    select count(*),(jsonb_agg(value))->0 into v_delivery_n,v_delivery_row
    from jsonb_array_elements(p_rows) projected(value)
    where value ->> 'row_id'='delivery:selected-material:ford-transit-v363'
      or value ->> 'resource_spec_id'=v_delivery_resource.id::text;
    if v_delivery_n<>1 or jsonb_typeof(v_delivery_row) is distinct from 'object'
      or v_delivery_row ->> 'row_id' is distinct from 'delivery:selected-material:ford-transit-v363'
      or v_delivery_row ->> 'resource_spec_id' is distinct from v_delivery_resource.id::text
      or v_delivery_row ->> 'unit_id' is distinct from 'trip'
      or v_delivery_row -> 'included_in_procurement' is distinct from 'false'::jsonb
      or v_delivery_row -> 'procurement_eligible' is distinct from 'false'::jsonb
      or ((v_delivery_row ->> 'ownership_status'='OWNED' and v_delivery_row -> 'included_in_estimate'='true'::jsonb)
        or (v_delivery_row ->> 'ownership_status'='OWNED_EXCLUDED' and v_delivery_row -> 'included_in_estimate'='false'::jsonb)) is not true
      or v_delivery_receipt ->> 'savedRowSha256' is distinct from v_delivery_row ->> 'row_sha256'
      or v_delivery_receipt -> 'savedExcluded' is distinct from to_jsonb(v_delivery_row -> 'included_in_estimate'='false'::jsonb)
      or coalesce(jsonb_typeof(v_delivery_row -> 'quantity') in ('string','number'),false) is not true
      or coalesce(length(v_delivery_row ->> 'quantity') between 1 and 64,false) is not true
      or coalesce(v_delivery_row ->> 'quantity' ~ '^[0-9]+([.][0-9]+)?$',false) is not true
      or jsonb_typeof(v_delivery_row -> 'normative_trace') is distinct from 'array'
      or v_delivery_row ->> 'price_snapshot_id' is not null or v_delivery_row ->> 'price_route_id' is not null then
      raise exception using errcode='22023',message='selected delivery final row binding invalid';
    end if;
    if (v_delivery_row ->> 'quantity')::numeric is distinct from v_delivery_count
      or not exists (select 1 from jsonb_array_elements(v_delivery_row -> 'normative_trace') trace(value)
        where value ->> 'source_id'=v_delivery_norm ->> 'source_id'
          and value ->> 'norm_id'=v_delivery_norm ->> 'norm_id'
          and value ->> 'source_definition_hash'=v_delivery_norm ->> 'source_definition_hash') then
      raise exception using errcode='22023',message='selected delivery final quantity/norm mismatch';
    end if;

    v_delivery_prior:=v_delivery_parent.amendment_contract #> '{parameterSources,selectedMaterialDeliveryV1}';
    if v_delivery_prior is null then
      if v_delivery_receipt ->> 'originRevisionId' is distinct from v_delivery_parent.id::text
        or v_delivery_receipt ->> 'originChecksumSha256' is distinct from v_delivery_parent.checksum_sha256
        or coalesce(v_delivery_parent.input_parameters ? 'selected_delivery_admitted_trip_count',false)
        or coalesce(v_delivery_parent.input_parameters ->> 'selected_delivery_selection'='SEPARATE_CONFIRMED',false)
        or exists (select 1 from public.estimate_revision_row prior_row
          left join public.estimate_resource_spec prior_resource on prior_resource.id=prior_row.resource_spec_id
          where prior_row.revision_id=v_delivery_parent.id
            and (prior_row.row_id='delivery:selected-material:ford-transit-v363'
              or prior_resource.row_id='delivery:selected-material:ford-transit-v363')) then
        raise exception using errcode='22023',message='selected delivery first origin already owns delivery';
      end if;
    else
      if jsonb_typeof(v_delivery_prior) is distinct from 'object'
        or v_delivery_prior ->> 'contractVersion' is distinct from 'canonical-selected-material-delivery-receipt/v1'
        or v_delivery_prior ->> 'transportRowId' is distinct from 'delivery:selected-material:ford-transit-v363'
        or v_delivery_prior ->> 'savedDefinitionId' is distinct from v_delivery_parent.definition_version_id::text
        or v_delivery_prior -> 'globalConsignmentPaymentUniquenessProven' is distinct from 'false'::jsonb
        or v_delivery_prior ->> 'originRevisionId' is distinct from v_delivery_receipt ->> 'originRevisionId'
        or v_delivery_prior ->> 'originChecksumSha256' is distinct from v_delivery_receipt ->> 'originChecksumSha256'
        or v_delivery_prior ->> 'ownerKey' is distinct from v_delivery_receipt ->> 'ownerKey'
        or v_delivery_prior ->> 'orderBasisSha256' is distinct from v_delivery_receipt ->> 'orderBasisSha256'
        or v_delivery_prior -> 'shipmentWitness' is distinct from v_delivery_receipt -> 'shipmentWitness'
        or v_delivery_prior ->> 'savedPriceBindingSha256' is distinct from v_delivery_receipt ->> 'savedPriceBindingSha256'
        or v_delivery_prior ->> 'consignmentId' is distinct from v_delivery_receipt ->> 'consignmentId'
        or v_delivery_prior ->> 'documentReference' is distinct from v_delivery_receipt ->> 'documentReference'
        or v_delivery_parent.input_parameters ->> 'selected_delivery_selection' is distinct from 'SEPARATE_CONFIRMED'
        or v_delivery_parent.input_parameters ->> 'selected_delivery_consignment_id' is distinct from v_delivery_prior ->> 'consignmentId'
        or v_delivery_parent.input_parameters ->> 'selected_delivery_document_reference' is distinct from v_delivery_prior ->> 'documentReference' then
        raise exception using errcode='22023',message='selected delivery immutable reuse receipt changed';
      end if;
      select * into v_delivery_parent_resource from public.estimate_resource_spec
      where definition_version_id=v_delivery_parent.definition_version_id and row_id='delivery:selected-material:ford-transit-v363';
      select count(*) into v_delivery_n from public.estimate_revision_row prior_row
      where prior_row.revision_id=v_delivery_parent.id
        and (prior_row.row_id='delivery:selected-material:ford-transit-v363' or prior_row.resource_spec_id=v_delivery_parent_resource.id);
      select * into v_delivery_parent_row from public.estimate_revision_row
      where revision_id=v_delivery_parent.id and row_id='delivery:selected-material:ford-transit-v363';
      if v_delivery_n<>1 or v_delivery_parent_resource.id is null or v_delivery_parent_row.row_id is null
        or v_delivery_parent_row.resource_spec_id is distinct from v_delivery_parent_resource.id
        or v_delivery_parent_resource.unit_id is distinct from 'trip'
        or v_delivery_parent_resource.cost_owner_id is distinct from v_delivery_resource.cost_owner_id
        or v_delivery_parent_resource.resource_graph ->> 'costTreatment' is distinct from 'OWN_COST'
        or v_delivery_parent_row.row_sha256 is distinct from v_delivery_prior ->> 'savedRowSha256'
        or v_delivery_parent_row.unit_id is distinct from 'trip'
        or v_delivery_parent_row.quantity is distinct from v_delivery_count
        or v_delivery_parent_row.procurement_eligible is distinct from false
        or v_delivery_parent_row.included_in_procurement is distinct from false
        or ((v_delivery_parent_row.ownership_status='OWNED' and v_delivery_parent_row.included_in_estimate is true)
          or (v_delivery_parent_row.ownership_status='OWNED_EXCLUDED' and v_delivery_parent_row.included_in_estimate is false)) is not true
        or v_delivery_prior -> 'savedExcluded' is distinct from to_jsonb(v_delivery_parent_row.included_in_estimate is false)
        or not exists (select 1 from jsonb_array_elements(v_delivery_parent_row.normative_trace) trace(value)
          where value ->> 'source_id'=v_delivery_norm ->> 'source_id' and value ->> 'norm_id'=v_delivery_norm ->> 'norm_id'
            and value ->> 'source_definition_hash'=v_delivery_norm ->> 'source_definition_hash')
        or exists (select 1 from public.estimate_resource_price_route_binding binding where binding.resource_spec_id=v_delivery_parent_resource.id) then
        raise exception using errcode='22023',message='selected delivery persisted reuse owner invalid';
      end if;
      if not exists (select 1 from public.estimate_revision origin
        where origin.id::text=v_delivery_receipt ->> 'originRevisionId'
          and origin.checksum_sha256=v_delivery_receipt ->> 'originChecksumSha256'
          and origin.catalog_id=v_job.catalog_id and origin.owner_user_id=v_job.owner_user_id
          and origin.organization_id is not distinct from v_job.organization_id) then
        raise exception using errcode='22023',message='selected delivery immutable origin missing from exact scope';
      end if;
    end if;
    -- Admission owns physical applicability, exact readset, ancestry and fresh
    -- binding fingerprints. Equal digest/row fields here are consistency only.
    v_delivery_provenance_ok:=true;
  end if;

  if v_cumulative then
    if v_parameter_sources ->> 'approvedTemplateBaselineId' <> v_baseline.id::text
      or jsonb_typeof(v_baseline_assumptions) <> 'object'
      or jsonb_typeof(v_user_parameters) <> 'object'
      or v_baseline_assumptions <> (coalesce((
        select jsonb_object_agg(entry.key, entry.value)
        from jsonb_each(v_baseline.input_values) entry(key, value)
        where upper(coalesce(v_baseline.input_classification ->> entry.key, '')) not in (
          'FIXTURE_ONLY', 'VALIDATION_FIXTURE', 'TEST_ONLY'
        )
      ), '{}'::jsonb) - (
        select coalesce(array_agg(parameter_id), '{}'::text[])
        from jsonb_object_keys(v_user_parameters) as keys(parameter_id)
      ))
      or v_resolved_parameters <> (v_baseline_assumptions || v_user_parameters || coalesce(v_parameter_sources -> 'derivedParameters','{}'::jsonb))
      or jsonb_typeof(coalesce(v_parameter_sources -> 'derivedParameters','{}'::jsonb)) <> 'object'
      or exists (
        select 1 from jsonb_object_keys(coalesce(v_parameter_sources -> 'derivedParameters','{}'::jsonb)) derived(parameter_id)
        left join public.estimate_parameter_definition parameter
          on parameter.definition_version_id=v_definition_version_id and parameter.parameter_id=derived.parameter_id
        where parameter.parameter_id is null
          or v_user_parameters ? derived.parameter_id
          or v_baseline_assumptions ? derived.parameter_id
          or not (parameter.truth_metadata ? 'effective_resource_quantity_v1'
            or parameter.truth_metadata ? 'derived_exact_lookup_v1'
            or parameter.truth_metadata ? 'preliminary_value_formula_v1'
            or (derived.parameter_id='selected_delivery_admitted_trip_count'
              and v_delivery_provenance_ok is true))
      ) then
      raise exception using errcode = '22023', message = 'cumulative baseline/user parameter provenance mismatch';
    end if;
  end if;

  v_row_count := jsonb_array_length(p_rows);$d16_anchor_new$;
begin
  select pg_get_functiondef(v_signature) into strict v_original;
  v_normalized:=btrim(replace(v_original,E'\r\n',E'\n'),E'\n');
  if md5(v_normalized)=v_postimage_md5 then return; end if;
  if md5(v_normalized) is distinct from v_preimage_md5
    or position('D16_SELECTED_DELIVERY_PROVENANCE_V1' in v_normalized)>0 then
    raise exception using errcode='22023',message='D16 writer preimage drift or partial installation';
  end if;
  if (length(v_normalized)-length(replace(v_normalized,v_decl_old,'')))/length(v_decl_old)<>1
    or (length(v_normalized)-length(replace(v_normalized,v_provenance_old,'')))/length(v_provenance_old)<>1
    or (length(v_normalized)-length(replace(v_normalized,v_anchor_old,'')))/length(v_anchor_old)<>1 then
    raise exception using errcode='22023',message='D16 writer exact fragments missing/ambiguous';
  end if;
  v_patched:=replace(replace(replace(v_normalized,v_decl_old,v_decl_new),v_provenance_old,''),v_anchor_old,v_anchor_new);
  if md5(v_patched) is distinct from v_postimage_md5 then
    raise exception using errcode='22023',message='D16 writer proposed postimage mismatch';
  end if;
  execute v_patched;
  if md5(btrim(replace(pg_get_functiondef(v_signature),E'\r\n',E'\n'),E'\n')) is distinct from v_postimage_md5 then
    raise exception using errcode='22023',message='D16 writer installed postimage mismatch';
  end if;
end;
$migration$;
commit;
