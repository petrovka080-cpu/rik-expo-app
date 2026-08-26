-- R3 content admission must remain fail-closed at every persistence boundary.
-- This is forward-only: no release is activated and no historical row changes.

begin;

create or replace function public.estimate_content_passport_exact_r3(
  p_release_id uuid,
  p_catalog_id text
)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists(
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
        select count(*)::integer from public.estimate_parameter_definition parameter
        where parameter.definition_version_id=definition.id
      )
      and passport.formula_count=(
        select count(*)::integer from public.estimate_formula_graph formula
        where formula.definition_version_id=definition.id
      )
      and passport.resource_count=(
        select count(*)::integer from public.estimate_resource_spec resource
        where resource.definition_version_id=definition.id
      )
  );
$$;

create or replace function public.estimate_enforce_job_content_passport_r3()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_release_id uuid;
begin
  if new.operation not in (
    'compile','recalculate','legacy_revision_migration','pdf','professional_pdf','procurement'
  ) then
    return new;
  end if;
  if new.operation in ('pdf','professional_pdf','procurement') then
    select revision.release_id into v_release_id
    from public.estimate_revision revision where revision.id=new.parent_revision_id;
  else
    v_release_id := new.target_release_id;
    if v_release_id is null then
      select release.id into v_release_id
      from public.estimate_definition_release release
      where release.status='active'
      order by release.activated_at desc nulls last,release.created_at desc
      limit 1;
    end if;
  end if;
  if v_release_id is null
    or not public.estimate_content_passport_exact_r3(v_release_id,new.catalog_id) then
    raise exception using errcode='55000',message='ESTIMATE_CONTENT_R3_RUNTIME_PASSPORT_BLOCKED';
  end if;
  return new;
end;
$$;

drop trigger if exists estimate_compile_job_content_passport_r3_trg
  on public.estimate_compile_job;
create trigger estimate_compile_job_content_passport_r3_trg
before insert on public.estimate_compile_job
for each row execute function public.estimate_enforce_job_content_passport_r3();

create or replace function public.estimate_enforce_revision_content_passport_r3()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if not public.estimate_content_passport_exact_r3(new.release_id,new.catalog_id) then
    raise exception using errcode='55000',message='ESTIMATE_CONTENT_R3_REVISION_PERSISTENCE_BLOCKED';
  end if;
  return new;
end;
$$;

drop trigger if exists estimate_revision_content_passport_r3_trg
  on public.estimate_revision;
create trigger estimate_revision_content_passport_r3_trg
before insert on public.estimate_revision
for each row execute function public.estimate_enforce_revision_content_passport_r3();

create or replace function public.estimate_enforce_artifact_content_passport_r3()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_revision public.estimate_revision%rowtype;
begin
  select * into v_revision
  from public.estimate_revision revision where revision.id=new.revision_id;
  if v_revision.id is null
    or not public.estimate_content_passport_exact_r3(v_revision.release_id,v_revision.catalog_id) then
    raise exception using errcode='55000',message='ESTIMATE_CONTENT_R3_ARTIFACT_PERSISTENCE_BLOCKED';
  end if;
  return new;
end;
$$;

drop trigger if exists estimate_revision_artifact_content_passport_r3_trg
  on public.estimate_revision_artifact;
create trigger estimate_revision_artifact_content_passport_r3_trg
before insert or update on public.estimate_revision_artifact
for each row execute function public.estimate_enforce_artifact_content_passport_r3();

-- The canonical server puts an exact prepared-release capability into a
-- transaction-local setting. The database function copies it into the job so
-- the existing admission trigger can verify it before the artifact is queued.
create or replace function public.estimate_create_artifact_job_v1(
  p_idempotency_key text,
  p_revision_id uuid,
  p_artifact_kind text
)
returns table(job_id uuid, artifact_id uuid, job_status text, artifact_status text, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_revision public.estimate_revision%rowtype;
  v_job public.estimate_compile_job%rowtype;
  v_artifact public.estimate_revision_artifact%rowtype;
  v_estimate_admission jsonb;
  v_input_payload jsonb;
begin
  if v_actor is null then raise exception using errcode = '28000', message = 'authentication required'; end if;
  if nullif(trim(p_idempotency_key), '') is null or length(p_idempotency_key) > 200
    or p_artifact_kind not in ('pdf', 'professional_pdf', 'procurement') then
    raise exception using errcode = '22023', message = 'invalid artifact request';
  end if;
  select * into v_revision from public.estimate_revision r
  where r.id = p_revision_id and public.estimate_revision_visible_v1(r.id);
  if v_revision.id is null then raise exception using errcode = '42501', message = 'revision access denied'; end if;

  select * into v_artifact from public.estimate_revision_artifact a
  where a.revision_id = p_revision_id and a.artifact_kind = p_artifact_kind;
  if v_artifact.id is not null and v_artifact.status = 'ready' then
    return query select null::uuid, v_artifact.id, 'succeeded'::text, v_artifact.status, false;
    return;
  end if;

  begin
    v_estimate_admission := nullif(current_setting('request.estimate_admission_r3',true),'')::jsonb;
  exception when others then
    v_estimate_admission := null;
  end;
  v_input_payload := jsonb_build_object(
    'revisionId',p_revision_id,
    'artifactKind',p_artifact_kind
  ) || case
    when jsonb_typeof(v_estimate_admission)='object'
      then jsonb_build_object('estimateAdmission',v_estimate_admission)
    else '{}'::jsonb
  end;

  insert into public.estimate_compile_job (
    idempotency_key, organization_id, owner_user_id, operation, catalog_id,
    parent_revision_id, input_payload
  ) values (
    trim(p_idempotency_key), v_revision.organization_id, v_actor, p_artifact_kind,
    v_revision.catalog_id, p_revision_id, v_input_payload
  )
  on conflict (owner_user_id, idempotency_key) do nothing
  returning * into v_job;
  if v_job.id is null then
    select * into v_job from public.estimate_compile_job j
    where j.owner_user_id = v_actor and j.idempotency_key = trim(p_idempotency_key);
    if v_job.parent_revision_id is distinct from p_revision_id
      or v_job.operation <> p_artifact_kind
      or v_job.input_payload <> v_input_payload then
      raise exception using errcode = '23505', message = 'idempotency key conflicts with another request';
    end if;
  end if;

  insert into public.estimate_revision_artifact (revision_id, artifact_kind, status, metadata)
  values (p_revision_id, p_artifact_kind, 'queued', jsonb_build_object('jobId', v_job.id))
  on conflict (revision_id, artifact_kind) do update
  set status = case when public.estimate_revision_artifact.status = 'ready' then 'ready' else 'queued' end,
      error_code = null, updated_at = now(),
      metadata = public.estimate_revision_artifact.metadata || jsonb_build_object('jobId', v_job.id)
  returning * into v_artifact;
  return query select v_job.id, v_artifact.id, v_job.status, v_artifact.status, true;
end;
$$;

revoke all on function public.estimate_content_passport_exact_r3(uuid,text) from public,anon,authenticated;
revoke all on function public.estimate_enforce_job_content_passport_r3() from public,anon,authenticated;
revoke all on function public.estimate_enforce_revision_content_passport_r3() from public,anon,authenticated;
revoke all on function public.estimate_enforce_artifact_content_passport_r3() from public,anon,authenticated;

comment on function public.estimate_content_passport_exact_r3(uuid,text) is
  'Exact R3 Content Passport assertion used before compile, revision persistence and artifact persistence.';

commit;
