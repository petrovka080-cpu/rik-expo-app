-- R4-A13.3: a preliminary estimate may preserve an unresolved primary measure.
-- The missing value remains explicit in preliminaryNeeds and is never replaced by 0/1.

begin;

alter table public.estimate_revision
  drop constraint if exists estimate_revision_r6_identity_shape_ck;

alter table public.estimate_revision
  add constraint estimate_revision_r6_identity_shape_ck check (
    revision_contract_version is null
    or (
      revision_contract_version in (
        'ONE_CANONICAL_ESTIMATE_R6_REVISION_IDENTITY_V1',
        'ONE_CANONICAL_ESTIMATE_R6_REVISION_IDENTITY_V2'
      )
      and nullif(trim(source_request_text), '') is not null
      and source_request_hash ~ '^[0-9a-f]{64}$'
      and nullif(trim(canonical_work_title_ru), '') is not null
      and nullif(trim(display_title_ru), '') is not null
      and nullif(trim(primary_measure_parameter_id), '') is not null
      and (
        revision_contract_version = 'ONE_CANONICAL_ESTIMATE_R6_REVISION_IDENTITY_V2'
        or nullif(trim(primary_measure_value), '') is not null
      )
      and jsonb_typeof(normalized_intent) = 'object'
      and definition_version_id is not null
      and nullif(trim(group_id), '') is not null
      and jsonb_typeof(user_input_snapshot) = 'object'
      and jsonb_typeof(accepted_baseline_snapshot) = 'object'
      and jsonb_typeof(assumption_snapshot) = 'object'
      and nullif(trim(formula_graph_version), '') is not null
    )
  );

create or replace function public.estimate_bind_revision_identity_r6()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_identity jsonb := new.amendment_contract #> '{parameterSources,identityContract}';
  v_preliminary_needs jsonb := coalesce(
    new.amendment_contract #> '{parameterSources,preliminaryNeeds}',
    '[]'::jsonb
  );
  v_parent public.estimate_revision%rowtype;
  v_definition_id uuid;
  v_definition_title text;
  v_definition_group text;
  v_contract_version text;
  v_primary_parameter_id text;
begin
  if v_identity is null then
    return new;
  end if;
  v_contract_version := v_identity ->> 'contractVersion';
  v_primary_parameter_id := v_identity ->> 'primaryMeasureParameterId';
  if jsonb_typeof(v_identity) <> 'object'
    or v_contract_version not in (
      'ONE_CANONICAL_ESTIMATE_R6_REVISION_IDENTITY_V1',
      'ONE_CANONICAL_ESTIMATE_R6_REVISION_IDENTITY_V2'
    ) then
    raise exception using errcode = '22023', message = 'invalid R6 revision identity contract';
  end if;

  select candidate.definition_version_id,
    coalesce(nullif(trim(definition.passport ->> 'canonicalRuName'), ''), identity.title_ru),
    identity.domain
  into v_definition_id, v_definition_title, v_definition_group
  from (
    select direct.id definition_version_id, 0 priority
    from public.estimate_definition_version direct
    where direct.release_id = new.release_id and direct.catalog_id = new.catalog_id
    union all
    select manifest.definition_version_id, 1 priority
    from public.estimate_cumulative_manifest_entry manifest
    where manifest.release_id = new.release_id and manifest.catalog_id = new.catalog_id
  ) candidate
  join public.estimate_definition_version definition on definition.id = candidate.definition_version_id
  join public.estimate_work_identity identity on identity.catalog_id = definition.catalog_id
  order by candidate.priority
  limit 1;
  if v_definition_id is null
    or v_identity ->> 'definitionVersionId' <> v_definition_id::text
    or v_identity ->> 'canonicalWorkTitleRu' <> v_definition_title
    or v_identity ->> 'groupId' <> v_definition_group then
    raise exception using errcode = '22023', message = 'R6 revision identity does not match definition';
  end if;

  if new.input_parameters ? v_primary_parameter_id then
    if new.input_parameters ->> v_primary_parameter_id
      is distinct from v_identity ->> 'primaryMeasureValue' then
      raise exception using errcode = '22023', message = 'R6 primary measure does not match revision parameters';
    end if;
  elsif v_contract_version = 'ONE_CANONICAL_ESTIMATE_R6_REVISION_IDENTITY_V1'
    or nullif(v_identity ->> 'primaryMeasureValue', '') is not null
    or jsonb_typeof(v_preliminary_needs) <> 'array'
    or not exists (
      select 1
      from jsonb_array_elements(v_preliminary_needs) need
      cross join lateral jsonb_array_elements_text(
        coalesce(need -> 'missing_parameter_ids', '[]'::jsonb)
      ) missing(parameter_id)
      where missing.parameter_id = v_primary_parameter_id
    ) then
    raise exception using errcode = '22023', message = 'R6 unresolved primary measure lacks preliminary need ownership';
  end if;

  if encode(extensions.digest(convert_to(v_identity ->> 'sourceRequestText', 'UTF8'), 'sha256'), 'hex')
      is distinct from v_identity ->> 'sourceRequestHash' then
    raise exception using errcode = '22023', message = 'R6 source request hash mismatch';
  end if;
  if new.parent_revision_id is not null then
    select * into v_parent from public.estimate_revision where id = new.parent_revision_id;
    if v_parent.revision_contract_version in (
      'ONE_CANONICAL_ESTIMATE_R6_REVISION_IDENTITY_V1',
      'ONE_CANONICAL_ESTIMATE_R6_REVISION_IDENTITY_V2'
    ) then
      if v_identity ->> 'sourceRequestText' is distinct from v_parent.source_request_text
        or v_identity ->> 'sourceRequestHash' is distinct from v_parent.source_request_hash
        or v_primary_parameter_id is distinct from v_parent.primary_measure_parameter_id
        or v_contract_version is distinct from v_parent.revision_contract_version then
        raise exception using errcode = '22023', message = 'R6 child revision changed immutable source identity';
      end if;
    elsif v_parent.revision_contract_version is not null
      or coalesce((v_identity ->> 'legacyParentIdentityRecovery')::boolean, false) is not true
      or v_parent.owner_user_id is distinct from new.owner_user_id
      or v_parent.organization_id is distinct from new.organization_id
      or v_parent.release_id is distinct from new.release_id
      or v_parent.catalog_id is distinct from new.catalog_id then
      raise exception using errcode = '22023', message = 'R6 legacy parent identity recovery is invalid';
    end if;
  end if;

  new.source_request_text := v_identity ->> 'sourceRequestText';
  new.source_request_hash := v_identity ->> 'sourceRequestHash';
  new.canonical_work_title_ru := v_definition_title;
  new.display_title_ru := v_identity ->> 'displayTitleRu';
  new.primary_measure_parameter_id := v_primary_parameter_id;
  new.primary_measure_value := nullif(v_identity ->> 'primaryMeasureValue', '');
  new.primary_measure_unit_id := nullif(v_identity ->> 'primaryMeasureUnitId', '');
  new.normalized_intent := v_identity -> 'normalizedIntent';
  new.definition_version_id := v_definition_id;
  new.group_id := v_definition_group;
  new.search_release_id := nullif(v_identity ->> 'searchReleaseId', '')::uuid;
  new.user_input_snapshot := v_identity -> 'userInputSnapshot';
  new.accepted_baseline_snapshot := v_identity -> 'acceptedBaselineSnapshot';
  new.assumption_snapshot := v_identity -> 'assumptionSnapshot';
  new.formula_graph_version := v_identity ->> 'formulaGraphVersion';
  new.revision_contract_version := v_contract_version;
  return new;
end;
$$;

comment on function public.estimate_bind_revision_identity_r6() is
  'Binds resolved V1 and explicitly unresolved preliminary V2 identities to one immutable canonical revision lineage.';

commit;
