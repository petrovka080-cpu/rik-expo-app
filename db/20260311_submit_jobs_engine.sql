-- Submit jobs engine extensions (additive, production-safe).

alter table public.submit_jobs
  add column if not exists started_at timestamptz,
  add column if not exists worker_id text,
  add column if not exists next_retry_at timestamptz,
  add column if not exists locked_until timestamptz;

create index if not exists submit_jobs_queue_idx
  on public.submit_jobs(status, job_type, next_retry_at, created_at);

create or replace function public.submit_jobs_claim(
  p_worker_id text,
  p_limit integer default 10,
  p_job_type text default null
)
returns setof public.submit_jobs
language sql
as $$
  with picked as (
    select id
    from public.submit_jobs
    where status = 'pending'
      and (next_retry_at is null or next_retry_at <= now())
      and (p_job_type is null or job_type = p_job_type)
    order by created_at
    limit greatest(coalesce(p_limit, 10), 1)
    for update skip locked
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

create or replace function public.submit_jobs_recover_stuck()
returns bigint
language sql
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
  select count(*)::bigint from moved;
$$;

create or replace function public.submit_jobs_mark_completed(p_job_id uuid)
returns void
language sql
as $$
  update public.submit_jobs
     set status = 'completed',
         processed_at = now(),
         locked_until = null,
         error = null
   where id = p_job_id;
$$;

create or replace function public.submit_jobs_mark_failed(
  p_job_id uuid,
  p_error text
)
returns table(retry_count integer, status text, next_retry_at timestamptz)
language plpgsql
as $$
declare
  v_retry integer;
  v_status text;
  v_next timestamptz;
begin
  select coalesce(sj.retry_count, 0) + 1
    into v_retry
  from public.submit_jobs sj
  where sj.id = p_job_id
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
   where id = p_job_id;

  return query
  select v_retry, v_status, v_next;
end;
$$;

create or replace function public.submit_jobs_metrics()
returns table(
  pending bigint,
  processing bigint,
  failed bigint,
  oldest_pending timestamptz
)
language sql
as $$
  select
    count(*) filter (where status = 'pending')::bigint as pending,
    count(*) filter (where status = 'processing')::bigint as processing,
    count(*) filter (where status = 'failed')::bigint as failed,
    min(created_at) filter (where status = 'pending') as oldest_pending
  from public.submit_jobs;
$$;
