begin;

-- R4 separates automated software/content admission from the optional licensed
-- professional sign-off overlay. Existing R3 authorization, acceptance,
-- immutability and hash-drift functions remain intact and continue to report
-- the professional overlay truthfully; this migration creates no acceptance.
create or replace function public.estimate_content_passport_software_ready_r4(
  p_release_id uuid,
  p_catalog_id text,
  p_tenant_id uuid
)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select p_tenant_id is not null and exists(
    select 1
    from public.estimate_cumulative_manifest_entry manifest
    join public.estimate_definition_version definition
      on definition.id=manifest.definition_version_id
    join public.estimate_content_passport_r3 passport
      on passport.definition_version_id=definition.id
      and passport.release_id=manifest.release_id
      and passport.catalog_id=manifest.catalog_id
    where manifest.release_id=p_release_id
      and manifest.catalog_id=p_catalog_id
      and manifest.baseline_ready
      and manifest.scenario_ready
      and definition.content_status in ('CANDIDATE_READY','PRODUCTION')
      and definition.content_gate_status='GREEN'
      and passport.decision->>'allowed'='true'
      and passport.decision->>'status'='GREEN'
      and passport.parameter_count=(
        select count(*)::integer
        from public.estimate_parameter_definition parameter
        where parameter.definition_version_id=definition.id
      )
      and passport.formula_count=(
        select count(*)::integer
        from public.estimate_formula_graph formula
        where formula.definition_version_id=definition.id
      )
      and passport.resource_count=(
        select count(*)::integer
        from public.estimate_resource_spec resource
        where resource.definition_version_id=definition.id
      )
  );
$$;

revoke all on function public.estimate_content_passport_software_ready_r4(uuid, text, uuid)
  from public,anon,authenticated,service_role;

-- Compatibility entry point used by the current writer/runtime triggers. The
-- professional R3 acceptance predicates are intentionally not changed.
create or replace function public.estimate_content_passport_exact_r3(
  p_release_id uuid,
  p_catalog_id text,
  p_tenant_id uuid
)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select public.estimate_content_passport_software_ready_r4(
    p_release_id,p_catalog_id,p_tenant_id
  );
$$;

create or replace function public.estimate_enforce_content_gate_promotion_r3()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_passport public.estimate_content_passport_r3%rowtype;
begin
  if new.content_gate_status<>'GREEN' then return new; end if;
  if new.content_status not in ('CANDIDATE_READY','PRODUCTION') then
    raise exception using errcode='55000',message='ESTIMATE_CONTENT_R4_GREEN_STATUS_INVALID';
  end if;
  select * into v_passport
  from public.estimate_content_passport_r3 passport
  where passport.definition_version_id=new.id
    and passport.release_id=new.release_id
    and passport.catalog_id=new.catalog_id;
  if v_passport.definition_version_id is null then
    raise exception using errcode='55000',message='ESTIMATE_CONTENT_R4_PASSPORT_MISSING';
  end if;
  if v_passport.parameter_count<>(
      select count(*)::integer
      from public.estimate_parameter_definition parameter
      where parameter.definition_version_id=new.id
    ) or v_passport.formula_count<>(
      select count(*)::integer
      from public.estimate_formula_graph formula
      where formula.definition_version_id=new.id
    ) or v_passport.resource_count<>(
      select count(*)::integer
      from public.estimate_resource_spec resource
      where resource.definition_version_id=new.id
    ) then
    raise exception using errcode='55000',message='ESTIMATE_CONTENT_R4_PASSPORT_COUNT_DRIFT';
  end if;
  return new;
end;
$$;

comment on function public.estimate_content_passport_software_ready_r4(uuid, text, uuid) is
  'R4 automated software/content admission. Licensed professional sign-off remains a separate immutable R3 overlay.';

commit;
