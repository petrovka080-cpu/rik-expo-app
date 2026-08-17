-- P0 ONE MONOLITH R5.8: cumulative compiler commit with explicit baseline/user input provenance.
-- Direct-release workers continue to use estimate_commit_compile_job_v1 unchanged.

begin;

create or replace function public.estimate_create_compile_job_r58(
  p_idempotency_key text,
  p_operation text,
  p_catalog_id text,
  p_parent_revision_id uuid,
  p_organization_id uuid,
  p_input_payload jsonb
)
returns table(job_id uuid,job_status text,created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_job public.estimate_compile_job%rowtype;
  v_parent public.estimate_revision%rowtype;
  v_target_release_id uuid;
  v_release_migration jsonb;
  v_payload jsonb;
begin
  if v_actor is null then
    raise exception using errcode='28000',message='authentication required';
  end if;
  if nullif(trim(p_idempotency_key),'') is null or length(p_idempotency_key)>200
    or p_operation not in ('compile','recalculate')
    or jsonb_typeof(p_input_payload)<>'object'
    or jsonb_typeof(p_input_payload->'parameters')<>'object'
    or jsonb_typeof(p_input_payload->'priceSnapshotIds')<>'array'
    or jsonb_array_length(p_input_payload->'priceSnapshotIds')>64
    or octet_length(p_input_payload::text)>8388608 then
    raise exception using errcode='22023',message='invalid cumulative compile payload';
  end if;
  if p_organization_id is not null and not public.rls_current_user_company_member_v1(p_organization_id) then
    raise exception using errcode='42501',message='organization access denied';
  end if;
  if p_operation='compile' and p_parent_revision_id is not null then
    raise exception using errcode='22023',message='compile cannot have a parent revision';
  end if;
  if p_operation='compile' and (
    exists(select 1 from jsonb_object_keys(coalesce(p_input_payload->'rowOverrides','{}'::jsonb)))
    or coalesce(jsonb_array_length(coalesce(p_input_payload->'customRows','[]'::jsonb)),0)>0
  ) then
    raise exception using errcode='22023',message='row amendments require recalculate';
  end if;
  if p_operation='recalculate' then
    if p_parent_revision_id is null then
      raise exception using errcode='22023',message='recalculate requires a parent revision';
    end if;
    select * into v_parent from public.estimate_revision revision
    where revision.id=p_parent_revision_id and public.estimate_revision_visible_v1(revision.id);
    if v_parent.id is null then
      raise exception using errcode='42501',message='parent revision access denied';
    end if;
    if v_parent.status<>'ready' or v_parent.catalog_id<>p_catalog_id
      or v_parent.organization_id is distinct from p_organization_id then
      raise exception using errcode='22023',message='parent revision scope mismatch';
    end if;
  end if;
  select release.id into v_target_release_id
  from public.estimate_definition_release release where release.status='active';
  if v_target_release_id is null then
    raise exception using errcode='55000',message='active definition release is unavailable';
  end if;
  if not exists(
    select 1
    from public.estimate_work_identity identity
    join public.estimate_cumulative_manifest_entry manifest on manifest.catalog_id=identity.catalog_id
    where identity.catalog_id=p_catalog_id and identity.retired_at is null
      and manifest.release_id=v_target_release_id
      and manifest.baseline_ready and manifest.scenario_ready
  ) then
    raise exception using errcode='22023',message='cumulative catalog definition is not active';
  end if;
  if p_operation='recalculate' and v_parent.release_id<>v_target_release_id then
    v_release_migration := p_input_payload->'releaseMigration';
    if v_release_migration is null or jsonb_typeof(v_release_migration)<>'object'
      or v_release_migration->>'contractVersion'<>'canonical_revision_release_migration.r2'
      or v_release_migration->'acknowledged'<>'true'::jsonb
      or v_release_migration->>'fromReleaseId'<>v_parent.release_id::text
      or v_release_migration->>'toReleaseId'<>v_target_release_id::text then
      raise exception using errcode='22023',message='explicit revision release migration contract required';
    end if;
  elsif p_input_payload?'releaseMigration' then
    raise exception using errcode='22023',message='release migration contract is not applicable';
  end if;
  v_payload := p_input_payload||jsonb_build_object('cumulativeManifest',true);
  insert into public.estimate_compile_job(
    idempotency_key,organization_id,owner_user_id,operation,catalog_id,
    parent_revision_id,input_payload,target_release_id
  ) values(
    trim(p_idempotency_key),p_organization_id,v_actor,p_operation,p_catalog_id,
    p_parent_revision_id,v_payload,v_target_release_id
  ) on conflict(owner_user_id,idempotency_key) do nothing returning * into v_job;
  if v_job.id is null then
    select * into v_job from public.estimate_compile_job job
    where job.owner_user_id=v_actor and job.idempotency_key=trim(p_idempotency_key);
    if v_job.operation<>p_operation or v_job.catalog_id<>p_catalog_id
      or v_job.parent_revision_id is distinct from p_parent_revision_id
      or v_job.organization_id is distinct from p_organization_id
      or v_job.target_release_id<>v_target_release_id or v_job.input_payload<>v_payload then
      raise exception using errcode='23505',message='idempotency key conflicts with another request';
    end if;
    return query select v_job.id,v_job.status,false;
    return;
  end if;
  return query select v_job.id,v_job.status,true;
end;
$$;

create or replace function public.estimate_commit_cumulative_compile_job_r58(
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
  v_release_id uuid;
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
begin
  if current_user not in ('postgres','service_role') then
    raise exception using errcode='42501',message='worker role required';
  end if;
  if jsonb_typeof(p_revision)<>'object' or jsonb_typeof(p_rows)<>'array'
    or jsonb_typeof(p_revision->'resolvedParameters')<>'object'
    or jsonb_typeof(p_revision->'parameterSources')<>'object' then
    raise exception using errcode='22023',message='invalid cumulative compiler commit payload';
  end if;

  select * into v_job from public.estimate_compile_job where id=p_job_id for update;
  if v_job.id is null then
    raise exception using errcode='P0002',message='compile job not found';
  end if;
  if v_job.status<>'running' or v_job.lease_owner is distinct from trim(p_worker_id)
    or v_job.lease_expires_at<=now()
    or v_job.input_payload->>'cumulativeManifest'<>'true' then
    raise exception using errcode='55000',message='cumulative compile job lease is not owned by worker';
  end if;

  select release.id,manifest.definition_version_id,manifest.approved_template_baseline_id
  into v_release_id,v_definition_version_id,v_approved_template_baseline_id
  from public.estimate_definition_release release
  join public.estimate_cumulative_manifest_entry manifest
    on manifest.release_id=release.id and manifest.catalog_id=v_job.catalog_id
  where release.id=v_job.target_release_id
    and (release.status='active'
      or (release.status='prepared' and v_job.input_payload->>'releaseAdmission'='true'))
    and manifest.baseline_ready and manifest.scenario_ready;
  if v_definition_version_id is null or v_approved_template_baseline_id is null then
    raise exception using errcode='22023',message='ready cumulative definition/baseline not found';
  end if;

  select * into strict v_baseline
  from public.estimate_approved_template_baseline
  where id=v_approved_template_baseline_id
    and definition_version_id=v_definition_version_id
    and catalog_id=v_job.catalog_id;
  v_resolved_parameters := p_revision->'resolvedParameters';
  v_parameter_sources := p_revision->'parameterSources';
  v_baseline_assumptions := v_parameter_sources->'baselineAssumptions';
  v_user_parameters := v_parameter_sources->'userParameters';
  if v_parameter_sources->>'approvedTemplateBaselineId'<>v_baseline.id::text
    or jsonb_typeof(v_baseline_assumptions)<>'object'
    or jsonb_typeof(v_user_parameters)<>'object'
    or v_baseline_assumptions<>(v_baseline.input_values-(
      select coalesce(array_agg(parameter_id),'{}'::text[])
      from jsonb_object_keys(v_user_parameters) as keys(parameter_id)
    ))
    or v_resolved_parameters<>(v_baseline_assumptions||v_user_parameters) then
    raise exception using errcode='22023',message='cumulative baseline/user parameter provenance mismatch';
  end if;

  v_row_count := jsonb_array_length(p_rows);
  if v_row_count<>coalesce((p_revision->>'rowCount')::integer,-1) or v_row_count<1 then
    raise exception using errcode='22023',message='revision row count mismatch';
  end if;
  if exists(
    select 1
    from jsonb_to_recordset(p_rows) x(
      resource_spec_id uuid,ownership_status text,included_in_estimate boolean,
      included_in_procurement boolean,procurement_eligible boolean,legacy_row_payload jsonb,row_sha256 text
    )
    left join public.estimate_resource_spec resource on resource.id=x.resource_spec_id
    where x.ownership_status not in ('OWNED','OWNED_EXCLUDED','MANUAL_SERVER_OWNED')
      or x.row_sha256!~'^[0-9a-f]{64}$'
      or (x.included_in_procurement and (not x.included_in_estimate or not x.procurement_eligible))
      or (x.ownership_status='OWNED' and (
        resource.id is null or resource.definition_version_id<>v_definition_version_id or not x.included_in_estimate
      ))
      or (x.ownership_status='OWNED_EXCLUDED' and (
        resource.id is null or resource.definition_version_id<>v_definition_version_id or x.included_in_estimate
      ))
      or (x.ownership_status='MANUAL_SERVER_OWNED' and (
        x.resource_spec_id is not null or x.legacy_row_payload is null
      ))
  ) then
    raise exception using errcode='22023',message='cumulative revision row ownership projection is invalid';
  end if;

  select coalesce(sum(x.amount) filter(where x.included_in_estimate),0)
  into v_projected_amount
  from jsonb_to_recordset(p_rows) x(amount numeric,included_in_estimate boolean);
  if v_projected_amount is distinct from coalesce((p_revision->'totals'->>'amount')::numeric,0) then
    raise exception using errcode='22023',message='revision total does not match included rows';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_job.owner_user_id::text||':'||v_job.catalog_id,0));
  if v_job.operation='recalculate' then
    select * into v_parent_revision from public.estimate_revision where id=v_job.parent_revision_id;
    if v_parent_revision.id is null or v_parent_revision.release_id<>v_job.target_release_id
      or v_parent_revision.catalog_id<>v_job.catalog_id
      or v_parent_revision.owner_user_id<>v_job.owner_user_id
      or v_parent_revision.organization_id<>v_job.organization_id then
      raise exception using errcode='40001',message='cumulative optimistic revision parent mismatch';
    end if;
    if exists(
      select 1 from public.estimate_revision revision
      where revision.owner_user_id=v_job.owner_user_id and revision.catalog_id=v_job.catalog_id
        and revision.status='ready' and revision.revision_number>v_parent_revision.revision_number
    ) then
      raise exception using errcode='40001',message='cumulative optimistic revision parent is not latest';
    end if;
  end if;
  select coalesce(max(revision.revision_number),0)+1 into v_revision_number
  from public.estimate_revision revision
  where revision.owner_user_id=v_job.owner_user_id and revision.catalog_id=v_job.catalog_id;

  insert into public.estimate_revision(
    id,parent_revision_id,organization_id,owner_user_id,release_id,catalog_id,
    revision_number,status,input_parameters,price_snapshot_ids,currency_code,
    totals,row_count,checksum_sha256,compiler_version,migration_source,amendment_contract
  ) values(
    v_revision_id,v_job.parent_revision_id,v_job.organization_id,v_job.owner_user_id,
    v_job.target_release_id,v_job.catalog_id,v_revision_number,'ready',v_resolved_parameters,
    coalesce(array(select jsonb_array_elements_text(v_job.input_payload->'priceSnapshotIds')::uuid),'{}'),
    p_revision->>'currencyCode',p_revision->'totals',v_row_count,
    p_revision->>'checksumSha256',p_revision->>'compilerVersion',
    nullif(p_revision->'migrationSource','null'::jsonb),
    jsonb_build_object(
      'rowOverrides',coalesce(v_job.input_payload->'rowOverrides','{}'::jsonb),
      'customRows',coalesce(v_job.input_payload->'customRows','[]'::jsonb),
      'releaseMigration',coalesce(v_job.input_payload->'releaseMigration','null'::jsonb),
      'parameterSources',v_parameter_sources,
      'contractVersion','ONE_MONOLITH_R58_CUMULATIVE_REVISION_V1'
    )
  );

  insert into public.estimate_revision_row(
    revision_id,row_id,ordinal,resource_spec_id,section,category,title_ru,
    unit_id,quantity,unit_price,amount,currency_code,procurement_eligible,
    calculation_trace,normative_trace,legacy_row_payload,row_sha256,
    ownership_status,included_in_estimate,included_in_procurement
  )
  select v_revision_id,x.row_id,x.ordinal,x.resource_spec_id,x.section,x.category,
    x.title_ru,x.unit_id,x.quantity,x.unit_price,x.amount,x.currency_code,
    x.procurement_eligible,x.calculation_trace,x.normative_trace,x.legacy_row_payload,
    x.row_sha256,x.ownership_status,x.included_in_estimate,x.included_in_procurement
  from jsonb_to_recordset(p_rows) x(
    row_id text,ordinal integer,resource_spec_id uuid,section text,category text,
    title_ru text,unit_id text,quantity numeric,unit_price numeric,amount numeric,
    currency_code text,procurement_eligible boolean,calculation_trace jsonb,
    normative_trace jsonb,legacy_row_payload jsonb,row_sha256 text,
    ownership_status text,included_in_estimate boolean,included_in_procurement boolean
  );

  insert into public.estimate_revision_row_price(
    revision_id,row_id,price_snapshot_id,route_id,unit_price,currency_code,resolution_trace
  )
  select v_revision_id,x.row_id,x.price_snapshot_id,x.price_route_id,x.unit_price,
    x.currency_code,coalesce(x.price_resolution_trace,'{}'::jsonb)
  from jsonb_to_recordset(p_rows) x(
    row_id text,price_snapshot_id uuid,price_route_id uuid,unit_price numeric,
    currency_code text,price_resolution_trace jsonb
  ) where x.unit_price is not null;

  update public.estimate_compile_job
  set status='succeeded',stage='complete',progress=100,result_revision_id=v_revision_id,
    completed_at=now(),updated_at=now(),lease_owner=null,lease_expires_at=null,
    error_code=null,error_detail=null
  where id=p_job_id;
  return v_revision_id;
end;
$$;

revoke all on function public.estimate_create_compile_job_r58(text,text,text,uuid,uuid,jsonb) from public;
grant execute on function public.estimate_create_compile_job_r58(text,text,text,uuid,uuid,jsonb) to authenticated;
revoke all on function public.estimate_commit_cumulative_compile_job_r58(uuid,text,jsonb,jsonb) from public;
grant execute on function public.estimate_commit_cumulative_compile_job_r58(uuid,text,jsonb,jsonb) to service_role;

commit;
