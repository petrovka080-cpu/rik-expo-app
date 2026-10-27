begin;

alter table public.media_upload_sessions
  add column if not exists updated_at timestamptz null,
  add column if not exists cleanup_enqueued_at timestamptz null,
  add column if not exists orphan_cleanup_reason text null;

alter table public.media_processing_jobs
  add column if not exists max_attempts integer not null default 5,
  add column if not exists next_run_at timestamptz not null default now(),
  add column if not exists locked_at timestamptz null,
  add column if not exists locked_by text null,
  add column if not exists last_error_code text null,
  add column if not exists dead_letter_reason text null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'media_processing_jobs_status_check_v2'
  ) then
    alter table public.media_processing_jobs
      add constraint media_processing_jobs_status_check_v2
      check (status in (
        'queued',
        'running',
        'retry_scheduled',
        'completed',
        'failed_retryable',
        'failed_final',
        'cancelled'
      )) not valid;
  end if;
end
$$;

alter table public.media_processing_jobs
  validate constraint media_processing_jobs_status_check_v2;

create table if not exists public.media_storage_cleanup_jobs (
  id uuid primary key default gen_random_uuid(),
  storage_bucket text not null,
  storage_key text not null,
  reason text not null check (reason in ('orphan_upload_object', 'expired_upload_session')),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'retry_scheduled', 'completed', 'failed_final', 'cancelled')),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  next_run_at timestamptz not null default now(),
  locked_at timestamptz null,
  locked_by text null,
  last_error_code text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz null,
  unique (storage_bucket, storage_key, reason)
);

alter table public.media_storage_cleanup_jobs enable row level security;

create index if not exists media_upload_sessions_expiry_idx
  on public.media_upload_sessions (status, expires_at, created_at)
  where status in ('created', 'uploading');

create index if not exists media_processing_jobs_ready_idx
  on public.media_processing_jobs (status, next_run_at, created_at)
  where status in ('queued', 'retry_scheduled');

create index if not exists media_processing_jobs_asset_status_idx
  on public.media_processing_jobs (media_asset_id, status, created_at desc);

create index if not exists media_storage_cleanup_jobs_ready_idx
  on public.media_storage_cleanup_jobs (status, next_run_at, created_at)
  where status in ('queued', 'retry_scheduled');

create index if not exists media_storage_cleanup_jobs_object_idx
  on public.media_storage_cleanup_jobs (storage_bucket, storage_key, status);

create index if not exists media_assets_unconfirmed_scan_idx
  on public.media_assets (org_id, created_at desc)
  where final_linked_by_human = false;

create index if not exists consumer_repair_request_pdfs_storage_idx
  on public.consumer_repair_request_pdfs (storage_bucket, storage_key);

create or replace function public.media_backend_expire_stale_upload_sessions(
  p_limit integer default 500,
  p_now timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 500), 1), 1000);
  v_count integer := 0;
begin
  with candidates as (
    select id
    from public.media_upload_sessions
    where status in ('created', 'uploading')
      and expires_at <= p_now
    order by expires_at asc, created_at asc
    for update skip locked
    limit v_limit
  ),
  updated as (
    update public.media_upload_sessions mus
    set status = 'expired',
        updated_at = p_now,
        orphan_cleanup_reason = 'expired_upload_session'
    from candidates c
    where mus.id = c.id
    returning mus.id
  )
  select count(*)::integer
  into v_count
  from updated;

  return jsonb_build_object(
    'expired_count', v_count,
    'limit', v_limit,
    'bounded', true,
    'skip_locked', true
  );
end
$$;

create or replace function public.media_backend_enqueue_orphan_storage_cleanup(
  p_limit integer default 500,
  p_older_than interval default interval '1 hour'
)
returns jsonb
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 500), 1), 1000);
  v_count integer := 0;
begin
  with orphan_objects as (
    select so.bucket_id, so.name
    from storage.objects so
    where so.bucket_id in ('private-media', 'client-visible-media', 'public-marketplace-media')
      and so.created_at <= now() - coalesce(p_older_than, interval '1 hour')
      and not exists (
        select 1
        from public.media_assets ma
        where ma.storage_bucket = so.bucket_id
          and ma.storage_key = so.name
      )
      and not exists (
        select 1
        from public.media_storage_cleanup_jobs mj
        where mj.storage_bucket = so.bucket_id
          and mj.storage_key = so.name
          and mj.reason = 'orphan_upload_object'
          and mj.status in ('queued', 'running', 'retry_scheduled')
      )
    order by so.created_at asc, so.name asc
    limit v_limit
  ),
  inserted as (
    insert into public.media_storage_cleanup_jobs (
      storage_bucket,
      storage_key,
      reason,
      status
    )
    select
      bucket_id,
      name,
      'orphan_upload_object',
      'queued'
    from orphan_objects
    on conflict (storage_bucket, storage_key, reason) do nothing
    returning id
  )
  select count(*)::integer
  into v_count
  from inserted;

  return jsonb_build_object(
    'cleanup_jobs_enqueued', v_count,
    'limit', v_limit,
    'bounded', true,
    'storage_delete_executed_in_db', false
  );
end
$$;

create or replace function public.media_backend_claim_storage_cleanup_jobs(
  p_limit integer default 100,
  p_worker_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 100), 1), 250);
  v_count integer := 0;
begin
  with candidates as (
    select id
    from public.media_storage_cleanup_jobs
    where status in ('queued', 'retry_scheduled')
      and next_run_at <= now()
      and attempts < max_attempts
    order by next_run_at asc, created_at asc
    for update skip locked
    limit v_limit
  ),
  claimed as (
    update public.media_storage_cleanup_jobs job
    set status = 'running',
        attempts = attempts + 1,
        locked_at = now(),
        locked_by = nullif(trim(coalesce(p_worker_id, '')), ''),
        updated_at = now()
    from candidates c
    where job.id = c.id
    returning job.id
  )
  select count(*)::integer
  into v_count
  from claimed;

  return jsonb_build_object(
    'claimed_count', v_count,
    'limit', v_limit,
    'bounded', true,
    'skip_locked', true
  );
end
$$;

create or replace function public.media_backend_record_storage_cleanup_result(
  p_job_id uuid,
  p_deleted boolean,
  p_error_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.media_storage_cleanup_jobs%rowtype;
  v_status text;
  v_delay_minutes integer;
begin
  select *
  into v_job
  from public.media_storage_cleanup_jobs
  where id = p_job_id
  for update;

  if not found then
    raise exception 'media_backend_record_storage_cleanup_result: cleanup job not found'
      using errcode = 'P0001';
  end if;

  if coalesce(p_deleted, false) then
    update public.media_storage_cleanup_jobs
    set status = 'completed',
        locked_at = null,
        updated_at = now(),
        last_error_code = null
    where id = p_job_id;

    return jsonb_build_object('status', 'completed', 'retry_scheduled', false);
  end if;

  if v_job.attempts >= v_job.max_attempts then
    v_status := 'failed_final';
    v_delay_minutes := 0;
  else
    v_status := 'retry_scheduled';
    v_delay_minutes := least(60, greatest(1, power(2, greatest(v_job.attempts, 1))::integer));
  end if;

  update public.media_storage_cleanup_jobs
  set status = v_status,
      next_run_at = case
        when v_status = 'retry_scheduled' then now() + make_interval(mins => v_delay_minutes)
        else next_run_at
      end,
      locked_at = null,
      updated_at = now(),
      last_error_code = nullif(trim(coalesce(p_error_code, '')), '')
  where id = p_job_id;

  return jsonb_build_object(
    'status', v_status,
    'retry_scheduled', v_status = 'retry_scheduled',
    'delay_minutes', v_delay_minutes
  );
end
$$;

create or replace function public.media_backend_claim_processing_jobs(
  p_limit integer default 100,
  p_worker_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 100), 1), 250);
  v_count integer := 0;
begin
  with candidates as (
    select id
    from public.media_processing_jobs
    where status in ('queued', 'retry_scheduled')
      and next_run_at <= now()
      and attempts < max_attempts
    order by next_run_at asc, created_at asc
    for update skip locked
    limit v_limit
  ),
  claimed as (
    update public.media_processing_jobs job
    set status = 'running',
        attempts = attempts + 1,
        locked_at = now(),
        locked_by = nullif(trim(coalesce(p_worker_id, '')), ''),
        updated_at = now()
    from candidates c
    where job.id = c.id
    returning job.id
  )
  select count(*)::integer
  into v_count
  from claimed;

  return jsonb_build_object(
    'claimed_count', v_count,
    'limit', v_limit,
    'bounded', true,
    'skip_locked', true
  );
end
$$;

create or replace function public.media_backend_record_processing_job_result(
  p_job_id uuid,
  p_completed boolean,
  p_error_code text default null,
  p_error_ru text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.media_processing_jobs%rowtype;
  v_status text;
  v_delay_minutes integer;
begin
  select *
  into v_job
  from public.media_processing_jobs
  where id = p_job_id
  for update;

  if not found then
    raise exception 'media_backend_record_processing_job_result: processing job not found'
      using errcode = 'P0001';
  end if;

  if coalesce(p_completed, false) then
    update public.media_processing_jobs
    set status = 'completed',
        locked_at = null,
        updated_at = now(),
        last_error_code = null,
        error_ru = null
    where id = p_job_id;

    return jsonb_build_object('status', 'completed', 'retry_scheduled', false);
  end if;

  if v_job.attempts >= v_job.max_attempts then
    v_status := 'failed_final';
    v_delay_minutes := 0;
  else
    v_status := 'retry_scheduled';
    v_delay_minutes := least(60, greatest(1, power(2, greatest(v_job.attempts, 1))::integer));
  end if;

  update public.media_processing_jobs
  set status = v_status,
      next_run_at = case
        when v_status = 'retry_scheduled' then now() + make_interval(mins => v_delay_minutes)
        else next_run_at
      end,
      locked_at = null,
      updated_at = now(),
      last_error_code = nullif(trim(coalesce(p_error_code, '')), ''),
      error_ru = nullif(trim(coalesce(p_error_ru, '')), ''),
      dead_letter_reason = case
        when v_status = 'failed_final' then nullif(trim(coalesce(p_error_code, p_error_ru, 'failed_final')), '')
        else dead_letter_reason
      end
  where id = p_job_id;

  return jsonb_build_object(
    'status', v_status,
    'retry_scheduled', v_status = 'retry_scheduled',
    'delay_minutes', v_delay_minutes
  );
end
$$;

create or replace function public.media_storage_100k_backpressure_proof_v1()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'media_upload_sessions_expiry_idx', to_regclass('public.media_upload_sessions_expiry_idx') is not null,
    'media_processing_jobs_ready_idx', to_regclass('public.media_processing_jobs_ready_idx') is not null,
    'media_storage_cleanup_jobs_ready_idx', to_regclass('public.media_storage_cleanup_jobs_ready_idx') is not null,
    'media_storage_cleanup_jobs_object_idx', to_regclass('public.media_storage_cleanup_jobs_object_idx') is not null,
    'consumer_repair_request_pdfs_storage_idx', to_regclass('public.consumer_repair_request_pdfs_storage_idx') is not null,
    'bounded_expiry_function', to_regprocedure('public.media_backend_expire_stale_upload_sessions(integer,timestamptz)') is not null,
    'bounded_orphan_enqueue_function', to_regprocedure('public.media_backend_enqueue_orphan_storage_cleanup(integer,interval)') is not null,
    'bounded_cleanup_claim_function', to_regprocedure('public.media_backend_claim_storage_cleanup_jobs(integer,text)') is not null,
    'bounded_processing_claim_function', to_regprocedure('public.media_backend_claim_processing_jobs(integer,text)') is not null,
    'retry_result_functions', (
      to_regprocedure('public.media_backend_record_storage_cleanup_result(uuid,boolean,text)') is not null
      and to_regprocedure('public.media_backend_record_processing_job_result(uuid,boolean,text,text)') is not null
    ),
    'storage_delete_executed_in_db', false
  );
$$;

revoke all on function public.media_backend_expire_stale_upload_sessions(integer, timestamptz) from public, anon, authenticated;
revoke all on function public.media_backend_enqueue_orphan_storage_cleanup(integer, interval) from public, anon, authenticated;
revoke all on function public.media_backend_claim_storage_cleanup_jobs(integer, text) from public, anon, authenticated;
revoke all on function public.media_backend_record_storage_cleanup_result(uuid, boolean, text) from public, anon, authenticated;
revoke all on function public.media_backend_claim_processing_jobs(integer, text) from public, anon, authenticated;
revoke all on function public.media_backend_record_processing_job_result(uuid, boolean, text, text) from public, anon, authenticated;
revoke all on function public.media_storage_100k_backpressure_proof_v1() from public, anon;
grant execute on function public.media_storage_100k_backpressure_proof_v1() to authenticated;

comment on table public.media_storage_cleanup_jobs is
'S_MEDIA_STORAGE_100K cleanup queue for orphan storage objects. Database enqueues bounded cleanup work; storage deletion remains a backend storage-transport action, never a screen-side mutation.';

comment on function public.media_backend_expire_stale_upload_sessions(integer, timestamptz) is
'S_MEDIA_STORAGE_100K bounded stale upload-session expiry using indexed order and skip locked.';

comment on function public.media_backend_enqueue_orphan_storage_cleanup(integer, interval) is
'S_MEDIA_STORAGE_100K bounded orphan storage-object detection; enqueues cleanup jobs and does not delete storage objects in SQL.';

comment on function public.media_backend_claim_storage_cleanup_jobs(integer, text) is
'S_MEDIA_STORAGE_100K bounded cleanup job claim path with backpressure, attempts, retry scheduling, and skip locked.';

comment on function public.media_backend_claim_processing_jobs(integer, text) is
'S_MEDIA_STORAGE_100K bounded media processing job claim path with backpressure, attempts, retry scheduling, and skip locked.';

commit;
