begin;

-- Keep the existing raw `pdf` artifact immutable and internal. A separately
-- keyed professional artifact allows historical raw diagnostics to survive
-- without being overwritten while the product requests only the presentation
-- contract below.
alter table public.estimate_revision_artifact
  drop constraint if exists estimate_revision_artifact_artifact_kind_check;
alter table public.estimate_revision_artifact
  add constraint estimate_revision_artifact_artifact_kind_check
  check (artifact_kind in ('pdf', 'professional_pdf', 'procurement', 'xlsx', 'archive'));

alter table public.estimate_compile_job
  drop constraint if exists estimate_compile_job_operation_check;
alter table public.estimate_compile_job
  add constraint estimate_compile_job_operation_check
  check (operation in ('compile', 'recalculate', 'pdf', 'professional_pdf', 'procurement', 'legacy_revision_migration'));

create or replace function public.estimate_assign_compile_job_release_v2()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.operation in ('pdf', 'professional_pdf', 'procurement') then
    select r.release_id into new.target_release_id
    from public.estimate_revision r where r.id = new.parent_revision_id;
  elsif new.target_release_id is null then
    new.target_release_id := public.estimate_current_active_release_id_v2();
  end if;
  if new.target_release_id is null then
    raise exception using errcode = '55000', message = 'compile job target release is unavailable';
  end if;
  return new;
end;
$$;

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

  insert into public.estimate_compile_job (
    idempotency_key, organization_id, owner_user_id, operation, catalog_id,
    parent_revision_id, input_payload
  ) values (
    trim(p_idempotency_key), v_revision.organization_id, v_actor, p_artifact_kind,
    v_revision.catalog_id, p_revision_id,
    jsonb_build_object('revisionId', p_revision_id, 'artifactKind', p_artifact_kind)
  )
  on conflict (owner_user_id, idempotency_key) do nothing
  returning * into v_job;
  if v_job.id is null then
    select * into v_job from public.estimate_compile_job j
    where j.owner_user_id = v_actor and j.idempotency_key = trim(p_idempotency_key);
    if v_job.parent_revision_id is distinct from p_revision_id or v_job.operation <> p_artifact_kind then
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

create or replace function public.estimate_commit_artifact_job_v1(
  p_job_id uuid,
  p_worker_id text,
  p_artifact jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.estimate_compile_job%rowtype;
  v_artifact_id uuid;
begin
  if current_user not in ('postgres', 'service_role') then
    raise exception using errcode = '42501', message = 'worker role required';
  end if;
  if jsonb_typeof(p_artifact) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid artifact commit payload';
  end if;
  select * into v_job from public.estimate_compile_job where id = p_job_id for update;
  if v_job.id is null or v_job.operation not in ('pdf', 'professional_pdf', 'procurement') then
    raise exception using errcode = '22023', message = 'artifact job not found';
  end if;
  if v_job.status <> 'running' or v_job.lease_owner is distinct from trim(p_worker_id)
    or v_job.lease_expires_at <= now() then
    raise exception using errcode = '55000', message = 'artifact job lease is not owned by worker';
  end if;
  if p_artifact ->> 'kind' <> v_job.operation
    or p_artifact ->> 'sha256' !~ '^[0-9a-f]{64}$'
    or coalesce((p_artifact ->> 'byteSize')::bigint, -1) < 0
    or nullif(p_artifact ->> 'storageBucket', '') is null
    or nullif(p_artifact ->> 'storageKey', '') is null then
    raise exception using errcode = '22023', message = 'artifact result is incomplete';
  end if;

  update public.estimate_revision_artifact
  set status = 'ready', storage_bucket = p_artifact ->> 'storageBucket',
      storage_key = p_artifact ->> 'storageKey', content_type = p_artifact ->> 'contentType',
      byte_size = (p_artifact ->> 'byteSize')::bigint, sha256 = p_artifact ->> 'sha256',
      metadata = coalesce(p_artifact -> 'metadata', '{}'::jsonb), error_code = null,
      ready_at = now(), updated_at = now()
  where revision_id = v_job.parent_revision_id and artifact_kind = v_job.operation
  returning id into v_artifact_id;
  if v_artifact_id is null then
    raise exception using errcode = 'P0002', message = 'artifact record not found';
  end if;

  update public.estimate_compile_job
  set status = 'succeeded', stage = 'complete', progress = 100,
      completed_at = now(), updated_at = now(), lease_owner = null,
      lease_expires_at = null, error_code = null, error_detail = null
  where id = p_job_id;
  return v_artifact_id;
end;
$$;

create or replace function public.estimate_fail_compile_job_v2(
  p_job_id uuid,
  p_worker_id text,
  p_error_code text,
  p_error_detail jsonb,
  p_retryable boolean,
  p_retry_delay_seconds integer default 5
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.estimate_compile_job%rowtype;
  v_next_status text;
begin
  if current_user not in ('postgres', 'service_role') then
    raise exception using errcode = '42501', message = 'worker role required';
  end if;
  select * into v_job from public.estimate_compile_job where id = p_job_id for update;
  if v_job.status <> 'running' or v_job.lease_owner is distinct from trim(p_worker_id) then
    raise exception using errcode = '55000', message = 'compile job lease is not owned by worker';
  end if;
  v_next_status := case
    when p_retryable and v_job.attempt < v_job.max_attempts then 'retry_wait'
    else 'failed'
  end;
  update public.estimate_compile_job
  set status = v_next_status,
      stage = case when v_next_status = 'failed' then 'failed' else 'retry_wait' end,
      available_at = case when v_next_status = 'retry_wait'
        then now() + make_interval(secs => greatest(1, least(p_retry_delay_seconds, 3600))) else available_at end,
      error_code = left(coalesce(nullif(trim(p_error_code), ''), 'COMPILER_FAILED'), 100),
      error_detail = coalesce(p_error_detail, '{}'::jsonb),
      completed_at = case when v_next_status = 'failed' then now() else null end,
      lease_owner = null, lease_expires_at = null, updated_at = now()
  where id = p_job_id;
  if v_job.operation = 'legacy_revision_migration' then
    update public.estimate_legacy_revision_import
    set status = case when v_next_status = 'failed' then 'failed' else 'queued' end,
        completed_at = case when v_next_status = 'failed' then now() else null end
    where job_id = p_job_id;
  elsif v_job.operation in ('pdf', 'professional_pdf', 'procurement') then
    update public.estimate_revision_artifact
    set status = case when v_next_status = 'failed' then 'failed' else 'queued' end,
        error_code = left(coalesce(nullif(trim(p_error_code), ''), 'ARTIFACT_FAILED'), 100),
        updated_at = now()
    where revision_id = v_job.parent_revision_id and artifact_kind = v_job.operation;
  end if;
  return v_next_status;
end;
$$;

commit;
