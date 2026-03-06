-- Contractor screen performance indexes
-- Safe for repeated runs; each index is created only when corresponding columns exist.

do $$
begin
  -- subcontracts: frequent filter by status + sort by created_at desc
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'subcontracts' and column_name = 'status'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'subcontracts' and column_name = 'created_at'
  ) then
    execute 'create index if not exists idx_subcontracts_status_created_at on public.subcontracts (status, created_at desc)';
  end if;

  -- requests: request scope resolution by subcontract/contractor job
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'requests' and column_name = 'subcontract_id'
  ) then
    execute 'create index if not exists idx_requests_subcontract_id on public.requests (subcontract_id)';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'requests' and column_name = 'contractor_job_id'
  ) then
    execute 'create index if not exists idx_requests_contractor_job_id on public.requests (contractor_job_id)';
  end if;

  -- work logs: fetch by progress_id and order by created_at
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'work_progress_log' and column_name = 'progress_id'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'work_progress_log' and column_name = 'created_at'
  ) then
    execute 'create index if not exists idx_work_progress_log_progress_created on public.work_progress_log (progress_id, created_at)';
  end if;

  -- work log materials: join/filter by log_id
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'work_progress_log_materials' and column_name = 'log_id'
  ) then
    execute 'create index if not exists idx_work_progress_log_materials_log_id on public.work_progress_log_materials (log_id)';
  end if;

  -- purchase/request linkage for request_id backfill
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'purchase_items' and column_name = 'request_item_id'
  ) then
    execute 'create index if not exists idx_purchase_items_request_item_id on public.purchase_items (request_item_id)';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'request_items' and column_name = 'request_id'
  ) then
    execute 'create index if not exists idx_request_items_request_id on public.request_items (request_id)';
  end if;
end $$;
