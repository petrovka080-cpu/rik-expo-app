-- Foundation queue table for submit-intent infrastructure.
-- Additive only: does not change existing submit/write flows.

create table if not exists public.submit_jobs (
  id uuid primary key default gen_random_uuid(),
  client_request_id uuid,
  job_type text not null,
  entity_type text,
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  retry_count integer not null default 0,
  error text,
  created_by uuid,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists ix_submit_jobs_status_created_at
  on public.submit_jobs(status, created_at);

create index if not exists ix_submit_jobs_job_type
  on public.submit_jobs(job_type);

create unique index if not exists ux_submit_jobs_client_request_id
  on public.submit_jobs(client_request_id)
  where client_request_id is not null;

-- Worker helper query (to use inside a worker transaction):
-- SELECT *
-- FROM public.submit_jobs
-- WHERE status = 'pending'
-- ORDER BY created_at
-- LIMIT 10
-- FOR UPDATE SKIP LOCKED;
