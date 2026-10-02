-- S27.3: a member of the revision tenant may explicitly migrate an immutable
-- historical revision to a descendant prepared release. Tenant and catalog
-- boundaries remain unchanged; the parent is never mutated.

begin;

create or replace function public.estimate_valid_release_migration_v1(
  p_contract jsonb,
  p_from_release_id uuid,
  p_to_release_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with recursive lineage(id, parent_release_id, path, depth) as (
    select release.id, release.parent_release_id, array[release.id], 0
    from public.estimate_definition_release release
    where release.id = p_to_release_id
    union all
    select parent.id, parent.parent_release_id, lineage.path || parent.id, lineage.depth + 1
    from public.estimate_definition_release parent
    join lineage on parent.id = lineage.parent_release_id
    where lineage.depth < 255
      and not parent.id = any(lineage.path)
  )
  select coalesce(
    p_from_release_id is not null
    and p_to_release_id is not null
    and p_from_release_id <> p_to_release_id
    and p_contract = jsonb_build_object(
      'contractVersion', 'canonical_revision_release_migration.r2',
      'acknowledged', true,
      'fromReleaseId', p_from_release_id::text,
      'toReleaseId', p_to_release_id::text
    )
    and exists(select 1 from lineage where id = p_from_release_id),
    false
  );
$$;

revoke all on function public.estimate_valid_release_migration_v1(jsonb,uuid,uuid) from public;
grant execute on function public.estimate_valid_release_migration_v1(jsonb,uuid,uuid) to service_role;

comment on function public.estimate_valid_release_migration_v1(jsonb,uuid,uuid) is
  'Validates the exact R2 migration acknowledgement and proves that the source release is an ancestor of the target release.';

create or replace function public.estimate_create_cumulative_admission_job_r54(
  p_release_id uuid,
  p_admission_run_id text,
  p_test_owner_user_id uuid,
  p_test_organization_id uuid,
  p_idempotency_key text,
  p_operation text,
  p_catalog_id text,
  p_parent_revision_id uuid,
  p_input_payload jsonb
)
returns table(job_id uuid,job_status text,created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.estimate_compile_job%rowtype;
  v_parent public.estimate_revision%rowtype;
  v_payload jsonb;
begin
  if current_user not in ('postgres','service_role') then
    raise exception using errcode='42501',message='service role required';
  end if;
  if nullif(trim(p_admission_run_id),'') is null or length(p_admission_run_id)>200
    or p_test_owner_user_id is null or p_test_organization_id is null
    or nullif(trim(p_idempotency_key),'') is null or length(p_idempotency_key)>200
    or p_operation not in ('compile','recalculate')
    or jsonb_typeof(p_input_payload)<>'object'
    or jsonb_typeof(p_input_payload->'parameters')<>'object'
    or not exists(select 1 from public.estimate_definition_release release where release.id=p_release_id and release.status='prepared')
    or exists(select 1 from public.estimate_definition_release_admission_seal admission where admission.release_id=p_release_id)
    or not exists(
      select 1 from public.estimate_cumulative_manifest_entry manifest
      where manifest.release_id=p_release_id and manifest.catalog_id=p_catalog_id
        and manifest.baseline_ready and manifest.scenario_ready
    ) then
    raise exception using errcode='22023',message='invalid cumulative release admission request';
  end if;
  if p_operation='compile' and p_parent_revision_id is not null then
    raise exception using errcode='22023',message='cumulative compile cannot have a parent';
  end if;
  if p_operation='compile' and p_input_payload?'releaseMigration' then
    raise exception using errcode='22023',message='release migration contract is not applicable';
  end if;
  if p_operation='recalculate' then
    select * into v_parent
    from public.estimate_revision revision
    where revision.id=p_parent_revision_id;
    if v_parent.id is null
      or v_parent.status<>'ready'
      or v_parent.catalog_id<>p_catalog_id
      or v_parent.organization_id is distinct from p_test_organization_id then
      raise exception using errcode='22023',message='cumulative recalculate parent tenant mismatch';
    end if;
    if v_parent.release_id<>p_release_id and not public.estimate_valid_release_migration_v1(
      p_input_payload->'releaseMigration',
      v_parent.release_id,
      p_release_id
    ) then
      raise exception using errcode='22023',message='explicit descendant release migration contract required';
    elsif v_parent.release_id=p_release_id and p_input_payload?'releaseMigration' then
      raise exception using errcode='22023',message='release migration contract is not applicable';
    end if;
  end if;
  v_payload := p_input_payload || jsonb_build_object(
    'releaseAdmission',true,
    'cumulativeManifest',true,
    'admissionRunId',trim(p_admission_run_id)
  );
  insert into public.estimate_compile_job(
    idempotency_key,organization_id,owner_user_id,operation,catalog_id,parent_revision_id,input_payload,target_release_id
  ) values(
    trim(p_idempotency_key),p_test_organization_id,p_test_owner_user_id,p_operation,p_catalog_id,
    p_parent_revision_id,v_payload,p_release_id
  ) on conflict(owner_user_id,idempotency_key) do nothing returning * into v_job;
  if v_job.id is null then
    select * into v_job from public.estimate_compile_job job
    where job.owner_user_id=p_test_owner_user_id and job.idempotency_key=trim(p_idempotency_key);
    if v_job.target_release_id<>p_release_id or v_job.operation<>p_operation
      or v_job.catalog_id<>p_catalog_id or v_job.parent_revision_id is distinct from p_parent_revision_id
      or v_job.organization_id<>p_test_organization_id or v_job.input_payload<>v_payload then
      raise exception using errcode='23505',message='cumulative admission idempotency conflict';
    end if;
    return query select v_job.id,v_job.status,false;
    return;
  end if;
  return query select v_job.id,v_job.status,true;
end;
$$;

revoke all on function public.estimate_create_cumulative_admission_job_r54(uuid,text,uuid,uuid,text,text,text,uuid,jsonb) from public;
grant execute on function public.estimate_create_cumulative_admission_job_r54(uuid,text,uuid,uuid,text,text,text,uuid,jsonb) to service_role;

comment on function public.estimate_create_cumulative_admission_job_r54(uuid,text,uuid,uuid,text,text,text,uuid,jsonb) is
  'Creates an isolated prepared-release job. Historical parents stay inside the exact tenant and catalog and require an explicit descendant release migration contract.';

do $migration$
declare
  v_signature regprocedure := 'public.estimate_commit_compile_job_v1(uuid,text,jsonb,jsonb)'::regprocedure;
  v_original text;
  v_patched text;
  v_old_guard text := E'or (\n        v_job.input_payload -> ''releaseMigration'' is null\n        and v_parent_revision.release_id <> v_job.target_release_id\n      )';
  v_new_guard text := $guard$or (
        v_parent_revision.release_id <> v_job.target_release_id
        and not public.estimate_valid_release_migration_v1(
          v_job.input_payload -> 'releaseMigration',
          v_parent_revision.release_id,
          v_job.target_release_id
        )
      )
      or (
        v_parent_revision.release_id = v_job.target_release_id
        and v_job.input_payload ? 'releaseMigration'
      )$guard$;
begin
  select pg_get_functiondef(v_signature) into strict v_original;
  if position(v_old_guard in v_original)=0 then
    raise exception using errcode='22023',message='S27.3 canonical writer predecessor guard mismatch';
  end if;
  v_patched := replace(v_original,v_old_guard,v_new_guard);
  if v_patched=v_original or position(v_old_guard in v_patched)<>0 then
    raise exception using errcode='22023',message='S27.3 canonical writer replacement was not exact';
  end if;
  execute v_patched;
end;
$migration$;

comment on function public.estimate_commit_compile_job_v1(uuid, text, jsonb, jsonb) is
  'S27.3 sole canonical revision writer. Same-tenant historical recalculation requires an explicit descendant release migration and leaves the immutable parent unchanged.';

revoke all on function public.estimate_commit_compile_job_v1(uuid, text, jsonb, jsonb) from public;
grant execute on function public.estimate_commit_compile_job_v1(uuid, text, jsonb, jsonb) to service_role;

commit;
