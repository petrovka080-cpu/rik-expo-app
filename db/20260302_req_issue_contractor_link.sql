-- db/20260302_req_issue_contractor_link.sql
-- Phase 2: canonical link REQ -> contractor job -> warehouse issue
-- Safe migration: only additive, nullable columns, idempotent DDL.

begin;

-- 1) Request must be linkable to subcontract/job (contractor_job_id).
alter table if exists public.requests
  add column if not exists contractor_job_id uuid null references public.subcontracts(id) on delete set null;

create index if not exists idx_requests_contractor_job_id
  on public.requests (contractor_job_id);

-- 2) Warehouse issue keeps the same link for reliable filtering in contractor UI/PDF.
alter table if exists public.warehouse_issues
  add column if not exists contractor_job_id uuid null references public.subcontracts(id) on delete set null;

create index if not exists idx_wh_issues_contractor_job_id
  on public.warehouse_issues (contractor_job_id);

-- 3) Backfill existing issues from linked requests where possible.
update public.warehouse_issues wi
set contractor_job_id = r.contractor_job_id
from public.requests r
where wi.request_id = r.id
  and wi.contractor_job_id is null
  and r.contractor_job_id is not null;

-- 4) Keep the link in sync for all future issue inserts/updates.
create or replace function public.fn_wh_issue_fill_contractor_job_id()
returns trigger
language plpgsql
as $$
begin
  if new.contractor_job_id is null and new.request_id is not null then
    select r.contractor_job_id
      into new.contractor_job_id
    from public.requests r
    where r.id = new.request_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_wh_issue_fill_contractor_job_id on public.warehouse_issues;
create trigger trg_wh_issue_fill_contractor_job_id
before insert or update of request_id, contractor_job_id
on public.warehouse_issues
for each row
execute function public.fn_wh_issue_fill_contractor_job_id();

commit;

