-- R2 canonical-code ownership: one atomic revision writer for direct,
-- cumulative-manifest, admission, recalculation, and legacy-import jobs.

begin;

create or replace function public.estimate_commit_compile_job_v1(
  p_job_id uuid,
  p_worker_id text,
  p_revision jsonb,
  p_rows jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.estimate_compile_job%rowtype;
  v_parent_revision public.estimate_revision%rowtype;
  v_baseline public.estimate_approved_template_baseline%rowtype;
  v_cumulative boolean;
  v_definition_version_id uuid;
  v_approved_template_baseline_id uuid;
  v_revision_id uuid := gen_random_uuid();
  v_revision_number integer;
  v_row_count integer;
  v_projected_amount numeric;
  v_resolved_parameters jsonb;
  v_parameter_sources jsonb;
  v_baseline_assumptions jsonb;
  v_user_parameters jsonb;
  v_amendment_contract jsonb;
begin
  if current_user not in ('postgres', 'service_role') then
    raise exception using errcode = '42501', message = 'worker role required';
  end if;
  if jsonb_typeof(p_revision) <> 'object' or jsonb_typeof(p_rows) <> 'array' then
    raise exception using errcode = '22023', message = 'invalid compiler commit payload';
  end if;

  select * into v_job
  from public.estimate_compile_job
  where id = p_job_id
  for update;
  if v_job.id is null then
    raise exception using errcode = 'P0002', message = 'compile job not found';
  end if;
  if v_job.status <> 'running'
    or v_job.lease_owner is distinct from trim(p_worker_id)
    or v_job.lease_expires_at <= now() then
    raise exception using errcode = '55000', message = 'compile job lease is not owned by worker';
  end if;

  v_cumulative := coalesce(v_job.input_payload ->> 'cumulativeManifest', 'false') = 'true';
  if v_job.operation <> 'legacy_revision_migration' and (
    jsonb_typeof(p_revision -> 'resolvedParameters') <> 'object'
    or jsonb_typeof(p_revision -> 'parameterSources') <> 'object'
    or jsonb_typeof(p_revision #> '{parameterSources,identityContract}') <> 'object'
  ) then
    raise exception using errcode = '22023', message = 'canonical revision provenance is required';
  end if;

  if v_cumulative then
    select manifest.definition_version_id, manifest.approved_template_baseline_id
    into v_definition_version_id, v_approved_template_baseline_id
    from public.estimate_definition_release release
    join public.estimate_cumulative_manifest_entry manifest
      on manifest.release_id = release.id and manifest.catalog_id = v_job.catalog_id
    where release.id = v_job.target_release_id
      and (release.status = 'active'
        or (release.status = 'prepared' and v_job.input_payload ->> 'releaseAdmission' = 'true'))
      and manifest.baseline_ready and manifest.scenario_ready;
    if v_definition_version_id is null or v_approved_template_baseline_id is null then
      raise exception using errcode = '22023', message = 'ready cumulative definition/baseline not found';
    end if;

    select * into strict v_baseline
    from public.estimate_approved_template_baseline
    where id = v_approved_template_baseline_id
      and definition_version_id = v_definition_version_id
      and catalog_id = v_job.catalog_id;
    v_resolved_parameters := p_revision -> 'resolvedParameters';
    v_parameter_sources := p_revision -> 'parameterSources';
    v_baseline_assumptions := v_parameter_sources -> 'baselineAssumptions';
    v_user_parameters := v_parameter_sources -> 'userParameters';
    if v_parameter_sources ->> 'approvedTemplateBaselineId' <> v_baseline.id::text
      or jsonb_typeof(v_baseline_assumptions) <> 'object'
      or jsonb_typeof(v_user_parameters) <> 'object'
      or v_baseline_assumptions <> (v_baseline.input_values - (
        select coalesce(array_agg(parameter_id), '{}'::text[])
        from jsonb_object_keys(v_user_parameters) as keys(parameter_id)
      ))
      or v_resolved_parameters <> (v_baseline_assumptions || v_user_parameters) then
      raise exception using errcode = '22023', message = 'cumulative baseline/user parameter provenance mismatch';
    end if;
  else
    select version.id into v_definition_version_id
    from public.estimate_definition_release release
    join public.estimate_definition_version version
      on version.release_id = release.id and version.catalog_id = v_job.catalog_id
    where release.id = v_job.target_release_id
      and (release.status = 'active'
        or (release.status = 'prepared' and v_job.input_payload ->> 'releaseAdmission' = 'true'));
    if v_definition_version_id is null then
      raise exception using errcode = '22023', message = 'active definition not found';
    end if;
    v_resolved_parameters := case
      when v_job.operation = 'legacy_revision_migration'
        then coalesce(v_job.input_payload -> 'parameters', '{}'::jsonb)
      else p_revision -> 'resolvedParameters'
    end;
    v_parameter_sources := case
      when v_job.operation = 'legacy_revision_migration' then null
      else p_revision -> 'parameterSources'
    end;
  end if;

  v_row_count := jsonb_array_length(p_rows);
  if v_row_count <> coalesce((p_revision ->> 'rowCount')::integer, -1)
    or (v_cumulative and v_row_count < 1) then
    raise exception using errcode = '22023', message = 'revision row count mismatch';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_rows) row_projection(
      resource_spec_id uuid,
      ownership_status text,
      included_in_estimate boolean,
      included_in_procurement boolean,
      procurement_eligible boolean,
      legacy_row_payload jsonb,
      row_sha256 text
    )
    left join public.estimate_resource_spec resource
      on resource.id = row_projection.resource_spec_id
    where row_projection.ownership_status not in (
        'OWNED', 'OWNED_EXCLUDED', 'MANUAL_SERVER_OWNED',
        'MIGRATED_UNOWNED_EXCLUDED_FROM_TOTAL'
      )
      or row_projection.row_sha256 !~ '^[0-9a-f]{64}$'
      or (row_projection.included_in_procurement and (
        not row_projection.included_in_estimate or not row_projection.procurement_eligible
      ))
      or (row_projection.ownership_status = 'OWNED' and (
        resource.id is null
        or resource.definition_version_id <> v_definition_version_id
        or not row_projection.included_in_estimate
      ))
      or (row_projection.ownership_status = 'OWNED_EXCLUDED' and (
        resource.id is null
        or resource.definition_version_id <> v_definition_version_id
        or row_projection.included_in_estimate
      ))
      or (row_projection.ownership_status = 'MANUAL_SERVER_OWNED' and (
        row_projection.resource_spec_id is not null or row_projection.legacy_row_payload is null
      ))
      or (row_projection.ownership_status = 'MIGRATED_UNOWNED_EXCLUDED_FROM_TOTAL' and (
        v_cumulative
        or v_job.operation <> 'legacy_revision_migration'
        or row_projection.resource_spec_id is not null
        or row_projection.legacy_row_payload is null
        or row_projection.included_in_estimate
        or row_projection.included_in_procurement
      ))
  ) then
    raise exception using errcode = '22023', message = case
      when v_cumulative then 'cumulative revision row ownership projection is invalid'
      else 'revision row ownership projection is invalid'
    end;
  end if;

  select coalesce(sum(row_projection.amount) filter (where row_projection.included_in_estimate), 0)
  into v_projected_amount
  from jsonb_to_recordset(p_rows) row_projection(amount numeric, included_in_estimate boolean);
  if v_projected_amount is distinct from coalesce((p_revision -> 'totals' ->> 'amount')::numeric, 0) then
    raise exception using errcode = '22023', message = 'revision total does not match included rows';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_job.owner_user_id::text || ':' || v_job.catalog_id, 0)
  );
  if v_job.operation = 'recalculate' then
    select * into v_parent_revision
    from public.estimate_revision
    where id = v_job.parent_revision_id;
    if v_parent_revision.id is null
      or v_parent_revision.catalog_id <> v_job.catalog_id
      or v_parent_revision.owner_user_id <> v_job.owner_user_id
      or v_parent_revision.organization_id is distinct from v_job.organization_id
      or (
        v_job.input_payload -> 'releaseMigration' is null
        and v_parent_revision.release_id <> v_job.target_release_id
      ) then
      raise exception using errcode = '40001', message = 'optimistic revision parent mismatch';
    end if;
    -- R6 intentionally permits an immutable historical revision to be the
    -- parent of a new branch child. The advisory lock and max+1 allocation
    -- below still serialize the catalog's revision_number sequence.
    if v_job.input_payload -> 'releaseMigration' is not null and exists (
      select 1
      from public.estimate_revision revision
      where revision.owner_user_id = v_job.owner_user_id
        and revision.catalog_id = v_job.catalog_id
        and revision.parent_revision_id = v_parent_revision.id
        and revision.release_id = v_job.target_release_id
        and revision.status = 'ready'
    ) then
      raise exception using errcode = '40001', message = 'optimistic revision conflict: migration child already exists';
    end if;
  end if;
  select coalesce(max(revision.revision_number), 0) + 1
  into v_revision_number
  from public.estimate_revision revision
  where revision.owner_user_id = v_job.owner_user_id
    and revision.catalog_id = v_job.catalog_id;

  v_amendment_contract := jsonb_build_object(
    'rowOverrides', coalesce(v_job.input_payload -> 'rowOverrides', '{}'::jsonb),
    'customRows', coalesce(v_job.input_payload -> 'customRows', '[]'::jsonb),
    'releaseMigration', coalesce(v_job.input_payload -> 'releaseMigration', 'null'::jsonb)
  );
  if v_parameter_sources is not null then
    v_amendment_contract := v_amendment_contract || jsonb_build_object(
      'parameterSources', v_parameter_sources,
      'contractVersion', case
        when v_cumulative then 'ONE_MONOLITH_R58_CUMULATIVE_REVISION_V1'
        else 'ONE_CANONICAL_ESTIMATE_R2_REVISION_WRITER_V1'
      end
    );
  end if;

  insert into public.estimate_revision (
    id, parent_revision_id, organization_id, owner_user_id, release_id, catalog_id,
    revision_number, status, input_parameters, price_snapshot_ids, currency_code,
    totals, row_count, checksum_sha256, compiler_version, migration_source,
    amendment_contract
  ) values (
    v_revision_id, v_job.parent_revision_id, v_job.organization_id, v_job.owner_user_id,
    v_job.target_release_id, v_job.catalog_id, v_revision_number, 'ready',
    v_resolved_parameters,
    coalesce(array(
      select jsonb_array_elements_text(v_job.input_payload -> 'priceSnapshotIds')::uuid
    ), '{}'),
    p_revision ->> 'currencyCode', p_revision -> 'totals', v_row_count,
    p_revision ->> 'checksumSha256', p_revision ->> 'compilerVersion',
    nullif(p_revision -> 'migrationSource', 'null'::jsonb),
    v_amendment_contract
  );

  insert into public.estimate_revision_row (
    revision_id, row_id, ordinal, resource_spec_id, section, category, title_ru,
    unit_id, quantity, unit_price, amount, currency_code, procurement_eligible,
    calculation_trace, normative_trace, legacy_row_payload, row_sha256,
    ownership_status, included_in_estimate, included_in_procurement
  )
  select v_revision_id, row_projection.row_id, row_projection.ordinal,
    row_projection.resource_spec_id, row_projection.section, row_projection.category,
    row_projection.title_ru, row_projection.unit_id, row_projection.quantity,
    row_projection.unit_price, row_projection.amount, row_projection.currency_code,
    row_projection.procurement_eligible, row_projection.calculation_trace,
    row_projection.normative_trace, row_projection.legacy_row_payload,
    row_projection.row_sha256, row_projection.ownership_status,
    row_projection.included_in_estimate, row_projection.included_in_procurement
  from jsonb_to_recordset(p_rows) row_projection(
    row_id text, ordinal integer, resource_spec_id uuid, section text, category text,
    title_ru text, unit_id text, quantity numeric, unit_price numeric, amount numeric,
    currency_code text, procurement_eligible boolean, calculation_trace jsonb,
    normative_trace jsonb, legacy_row_payload jsonb, row_sha256 text,
    ownership_status text, included_in_estimate boolean, included_in_procurement boolean
  );

  insert into public.estimate_revision_row_price (
    revision_id, row_id, price_snapshot_id, route_id, unit_price, currency_code,
    resolution_trace
  )
  select v_revision_id, row_projection.row_id, row_projection.price_snapshot_id,
    row_projection.price_route_id, row_projection.unit_price,
    row_projection.currency_code, coalesce(row_projection.price_resolution_trace, '{}'::jsonb)
  from jsonb_to_recordset(p_rows) row_projection(
    row_id text, price_snapshot_id uuid, price_route_id uuid, unit_price numeric,
    currency_code text, price_resolution_trace jsonb
  )
  where row_projection.unit_price is not null;

  update public.estimate_compile_job
  set status = 'succeeded', stage = 'complete', progress = 100,
    result_revision_id = v_revision_id, completed_at = now(), updated_at = now(),
    lease_owner = null, lease_expires_at = null, error_code = null, error_detail = null
  where id = p_job_id;

  if v_job.operation = 'legacy_revision_migration' then
    update public.estimate_legacy_revision_import
    set status = 'succeeded', revision_id = v_revision_id, completed_at = now()
    where job_id = p_job_id;
  end if;
  return v_revision_id;
end;
$$;

comment on function public.estimate_commit_compile_job_v1(uuid, text, jsonb, jsonb) is
  'R2 sole canonical revision writer; preserves direct, cumulative, historical-child, admission, and legacy-import invariants.';

revoke all on function public.estimate_commit_compile_job_v1(uuid, text, jsonb, jsonb) from public;
grant execute on function public.estimate_commit_compile_job_v1(uuid, text, jsonb, jsonb) to service_role;

drop function if exists public.estimate_commit_cumulative_compile_job_r58(uuid, text, jsonb, jsonb);

commit;
