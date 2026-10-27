begin;

-- A canonical revision belongs to its tenant as well as to the user who
-- created it. The application server sets this transaction-local value only
-- after provider introspection and an exact membership RPC match.
create or replace function public.estimate_revision_visible_v1(p_revision_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.estimate_revision revision
    where revision.id = p_revision_id
      and (
        revision.owner_user_id = auth.uid()
        or public.rls_current_user_company_member_v1(revision.organization_id)
        or revision.organization_id = nullif(
          current_setting('request.estimate_tenant_id_r541', true),
          ''
        )::uuid
      )
  );
$$;

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
  if p_operation='recalculate' and not exists(
    select 1 from public.estimate_revision revision
    where revision.id=p_parent_revision_id
      and revision.release_id=p_release_id
      and revision.organization_id=p_test_organization_id
      and revision.catalog_id=p_catalog_id
  ) then
    raise exception using errcode='22023',message='cumulative recalculate parent tenant mismatch';
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

revoke all on function public.estimate_revision_visible_v1(uuid) from public;
revoke all on function public.estimate_create_cumulative_admission_job_r54(uuid,text,uuid,uuid,text,text,text,uuid,jsonb) from public;
grant execute on function public.estimate_create_cumulative_admission_job_r54(uuid,text,uuid,uuid,text,text,text,uuid,jsonb) to service_role;

comment on function public.estimate_revision_visible_v1(uuid) is
  'Owner, canonical company membership, or provider-verified request tenant visibility for immutable canonical revisions.';
comment on function public.estimate_create_cumulative_admission_job_r54(uuid,text,uuid,uuid,text,text,text,uuid,jsonb) is
  'Creates an isolated prepared-release job; immutable parent revisions are shared only inside the exact tenant.';

commit;
