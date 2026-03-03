-- db/20260302_requests_scoped_number.sql
-- Scoped request numbering for subcontract chains: REQ-XXXX/YYYY-1, -2, ...
-- Additive and backward-compatible.

begin;

alter table if exists public.requests
  add column if not exists request_no text null;

create index if not exists idx_requests_request_no
  on public.requests (request_no);

-- Backfill legacy linked requests with base display number when request_no is empty.
update public.requests
set request_no = display_no
where request_no is null
  and display_no is not null
  and coalesce(subcontract_id, contractor_job_id) is not null;

commit;

