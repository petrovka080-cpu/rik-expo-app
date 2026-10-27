-- R4-A10: bind public revision identity to the immutable definition passport.

begin;

create or replace function public.estimate_bind_revision_identity_r6()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_identity jsonb := new.amendment_contract #> '{parameterSources,identityContract}';
  v_parent public.estimate_revision%rowtype;
  v_definition_id uuid;
  v_definition_title text;
  v_definition_group text;
begin
  if v_identity is null then
    return new;
  end if;
  if jsonb_typeof(v_identity) <> 'object'
    or v_identity ->> 'contractVersion' <> 'ONE_CANONICAL_ESTIMATE_R6_REVISION_IDENTITY_V1' then
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
  if not (new.input_parameters ? (v_identity ->> 'primaryMeasureParameterId'))
    or new.input_parameters ->> (v_identity ->> 'primaryMeasureParameterId')
      is distinct from v_identity ->> 'primaryMeasureValue' then
    raise exception using errcode = '22023', message = 'R6 primary measure does not match revision parameters';
  end if;
  if encode(extensions.digest(convert_to(v_identity ->> 'sourceRequestText', 'UTF8'), 'sha256'), 'hex')
      is distinct from v_identity ->> 'sourceRequestHash' then
    raise exception using errcode = '22023', message = 'R6 source request hash mismatch';
  end if;
  if new.parent_revision_id is not null then
    select * into v_parent from public.estimate_revision where id = new.parent_revision_id;
    if v_parent.revision_contract_version = 'ONE_CANONICAL_ESTIMATE_R6_REVISION_IDENTITY_V1' then
      if v_identity ->> 'sourceRequestText' is distinct from v_parent.source_request_text
        or v_identity ->> 'sourceRequestHash' is distinct from v_parent.source_request_hash
        or v_identity ->> 'primaryMeasureParameterId' is distinct from v_parent.primary_measure_parameter_id then
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
  new.primary_measure_parameter_id := v_identity ->> 'primaryMeasureParameterId';
  new.primary_measure_value := v_identity ->> 'primaryMeasureValue';
  new.primary_measure_unit_id := nullif(v_identity ->> 'primaryMeasureUnitId', '');
  new.normalized_intent := v_identity -> 'normalizedIntent';
  new.definition_version_id := v_definition_id;
  new.group_id := v_definition_group;
  new.search_release_id := nullif(v_identity ->> 'searchReleaseId', '')::uuid;
  new.user_input_snapshot := v_identity -> 'userInputSnapshot';
  new.accepted_baseline_snapshot := v_identity -> 'acceptedBaselineSnapshot';
  new.assumption_snapshot := v_identity -> 'assumptionSnapshot';
  new.formula_graph_version := v_identity ->> 'formulaGraphVersion';
  new.revision_contract_version := v_identity ->> 'contractVersion';
  return new;
end;
$$;

comment on function public.estimate_bind_revision_identity_r6() is
  'Binds revision identity to immutable definition passport canonicalRuName, with legacy work identity fallback.';

commit;
