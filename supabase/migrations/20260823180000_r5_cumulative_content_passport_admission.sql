begin;

-- A cumulative manifest intentionally points at immutable definition versions
-- imported from predecessor releases. The content passport belongs to that
-- immutable definition version and therefore keeps the definition's release
-- identity; it must not be relabelled as a passport of every successor.
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
      and passport.release_id=definition.release_id
      and passport.catalog_id=definition.catalog_id
    where manifest.release_id=p_release_id
      and manifest.catalog_id=p_catalog_id
      and definition.catalog_id=manifest.catalog_id
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

comment on function public.estimate_content_passport_software_ready_r4(uuid, text, uuid) is
  'R5 cumulative software/content admission: successor manifest identity plus exact immutable definition-owned passport and persisted counts.';

commit;
