begin;

create table if not exists public.submit_jobs (
  id uuid primary key default gen_random_uuid(),
  client_request_id uuid null,
  job_type text not null,
  entity_type text null,
  entity_id uuid null,
  entity_key text null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  retry_count integer not null default 0,
  error text null,
  created_by uuid null default auth.uid(),
  created_at timestamptz not null default now(),
  started_at timestamptz null,
  worker_id text null,
  next_retry_at timestamptz null,
  locked_until timestamptz null,
  processed_at timestamptz null
);

comment on table public.submit_jobs is
  'Authenticated submit-intent queue boundary. Direct clients may enqueue and read back only their own jobs; worker state transitions stay behind security-definer RPCs.';

alter table public.submit_jobs
  add column if not exists entity_key text,
  add column if not exists started_at timestamptz,
  add column if not exists worker_id text,
  add column if not exists next_retry_at timestamptz,
  add column if not exists locked_until timestamptz,
  add column if not exists created_by uuid default auth.uid();

alter table public.submit_jobs
  alter column payload set default '{}'::jsonb,
  alter column status set default 'pending',
  alter column retry_count set default 0,
  alter column created_by set default auth.uid(),
  alter column created_at set default now();

create index if not exists ix_submit_jobs_status_created_at
  on public.submit_jobs(status, created_at);

create index if not exists ix_submit_jobs_job_type
  on public.submit_jobs(job_type);

create index if not exists submit_jobs_queue_idx
  on public.submit_jobs(status, job_type, next_retry_at, created_at);

create index if not exists submit_jobs_entity_idx
  on public.submit_jobs(entity_key, status, created_at);

create unique index if not exists ux_submit_jobs_client_request_id
  on public.submit_jobs(client_request_id)
  where client_request_id is not null;

alter table public.submit_jobs enable row level security;

revoke all on table public.submit_jobs from anon;
revoke all on table public.submit_jobs from authenticated;
grant select, insert on table public.submit_jobs to authenticated;

drop policy if exists submit_jobs_insert_authenticated on public.submit_jobs;
create policy submit_jobs_insert_authenticated
  on public.submit_jobs
  for insert
  to authenticated
  with check (
    auth.uid() is not null
    and created_by = auth.uid()
    and status = 'pending'
    and retry_count = 0
    and processed_at is null
    and started_at is null
    and worker_id is null
    and next_retry_at is null
    and locked_until is null
  );

drop policy if exists submit_jobs_select_own on public.submit_jobs;
create policy submit_jobs_select_own
  on public.submit_jobs
  for select
  to authenticated
  using (
    auth.uid() is not null
    and created_by = auth.uid()
  );

create or replace function public.submit_jobs_claim(
  p_worker text,
  p_limit integer default 10
)
returns setof public.submit_jobs
language sql
security definer
set search_path = ''
as $$
  with ranked as (
    select
      id,
      row_number() over (
        partition by coalesce(entity_key, id::text)
        order by created_at
      ) as rn
    from public.submit_jobs
    where status = 'pending'
      and (next_retry_at is null or next_retry_at <= now())
  ),
  picked as (
    select j.id
    from public.submit_jobs j
    join ranked r on r.id = j.id
    where r.rn = 1
    order by j.created_at
    limit greatest(coalesce(p_limit, 10), 1)
    for update of j skip locked
  )
  update public.submit_jobs j
     set status = 'processing',
         started_at = now(),
         worker_id = p_worker,
         locked_until = now() + interval '5 minutes'
  from picked
  where j.id = picked.id
  returning j.*;
$$;

create or replace function public.submit_jobs_claim(
  p_worker_id text,
  p_limit integer default 10,
  p_job_type text default null
)
returns setof public.submit_jobs
language sql
security definer
set search_path = ''
as $$
  with ranked as (
    select
      id,
      row_number() over (
        partition by coalesce(entity_key, id::text)
        order by created_at
      ) as rn
    from public.submit_jobs
    where status = 'pending'
      and (next_retry_at is null or next_retry_at <= now())
      and (p_job_type is null or job_type = p_job_type)
  ),
  picked as (
    select j.id
    from public.submit_jobs j
    join ranked r on r.id = j.id
    where r.rn = 1
    order by j.created_at
    limit greatest(coalesce(p_limit, 10), 1)
    for update of j skip locked
  )
  update public.submit_jobs j
     set status = 'processing',
         started_at = now(),
         worker_id = p_worker_id,
         locked_until = now() + interval '5 minutes'
  from picked
  where j.id = picked.id
  returning j.*;
$$;

drop function if exists public.submit_jobs_recover_stuck();
create or replace function public.submit_jobs_recover_stuck()
returns bigint
language sql
security definer
set search_path = ''
as $$
  with moved as (
    update public.submit_jobs
       set status = 'pending',
           worker_id = null,
           locked_until = null
     where status = 'processing'
       and locked_until is not null
       and locked_until < now()
    returning 1
  )
  select count(*)::bigint
  from moved;
$$;

create or replace function public.submit_jobs_mark_completed(
  p_id uuid
)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.submit_jobs
     set status = 'completed',
         processed_at = now(),
         locked_until = null,
         error = null
   where id = p_id;
$$;

drop function if exists public.submit_jobs_mark_failed(uuid, text);
create or replace function public.submit_jobs_mark_failed(
  p_id uuid,
  p_error text
)
returns table(
  retry_count integer,
  status text,
  next_retry_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_retry integer;
  v_status text;
  v_next timestamptz;
begin
  select coalesce(sj.retry_count, 0) + 1
    into v_retry
  from public.submit_jobs sj
  where sj.id = p_id
  for update;

  if v_retry is null then
    return;
  end if;

  if v_retry >= 5 then
    v_status := 'failed';
    v_next := null;
  elsif v_retry = 1 then
    v_status := 'pending';
    v_next := now() + interval '30 seconds';
  elsif v_retry = 2 then
    v_status := 'pending';
    v_next := now() + interval '2 minutes';
  elsif v_retry = 3 then
    v_status := 'pending';
    v_next := now() + interval '5 minutes';
  else
    v_status := 'pending';
    v_next := now() + interval '10 minutes';
  end if;

  update public.submit_jobs
     set retry_count = v_retry,
         status = v_status,
         next_retry_at = v_next,
         error = left(coalesce(p_error, 'job failed'), 2000),
         worker_id = null,
         locked_until = null
   where id = p_id;

  return query
  select v_retry, v_status, v_next;
end;
$$;

drop function if exists public.submit_jobs_metrics();
create or replace function public.submit_jobs_metrics()
returns table(
  pending bigint,
  processing bigint,
  failed bigint,
  oldest_pending timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select
    count(*) filter (where status = 'pending')::bigint as pending,
    count(*) filter (where status = 'processing')::bigint as processing,
    count(*) filter (where status = 'failed')::bigint as failed,
    min(created_at) filter (where status = 'pending') as oldest_pending
  from public.submit_jobs;
$$;

revoke all on function public.submit_jobs_claim(text, integer) from public, anon;
grant execute on function public.submit_jobs_claim(text, integer) to authenticated, service_role;

revoke all on function public.submit_jobs_claim(text, integer, text) from public, anon;
grant execute on function public.submit_jobs_claim(text, integer, text) to authenticated, service_role;

revoke all on function public.submit_jobs_recover_stuck() from public, anon;
grant execute on function public.submit_jobs_recover_stuck() to authenticated, service_role;

revoke all on function public.submit_jobs_mark_completed(uuid) from public, anon;
grant execute on function public.submit_jobs_mark_completed(uuid) to authenticated, service_role;

revoke all on function public.submit_jobs_mark_failed(uuid, text) from public, anon;
grant execute on function public.submit_jobs_mark_failed(uuid, text) to authenticated, service_role;

revoke all on function public.submit_jobs_metrics() from public, anon;
grant execute on function public.submit_jobs_metrics() to authenticated, service_role;

commit;
