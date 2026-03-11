-- Queue compaction and latency support (additive).

alter table public.submit_jobs
  add column if not exists entity_key text;

create index if not exists submit_jobs_entity_idx
  on public.submit_jobs(entity_key, status, created_at);

-- Replace claim function with entity compaction selection.
create or replace function public.submit_jobs_claim(
  p_worker_id text,
  p_limit integer default 10,
  p_job_type text default null
)
returns setof public.submit_jobs
language sql
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
