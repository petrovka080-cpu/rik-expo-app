-- db/20260302_requests_subcontract_link.sql
-- Canonical REQ -> subcontract link for contractor flows.
-- Additive/backward-compatible migration.

begin;

alter table if exists public.requests
  add column if not exists subcontract_id uuid null references public.subcontracts(id) on delete set null;

create index if not exists idx_requests_subcontract_id
  on public.requests (subcontract_id);

-- Backfill both directions so legacy contractor_job_id continues to work.
update public.requests
set subcontract_id = contractor_job_id
where subcontract_id is null
  and contractor_job_id is not null;

update public.requests
set contractor_job_id = subcontract_id
where contractor_job_id is null
  and subcontract_id is not null;

create or replace function public.fn_requests_sync_subcontract_link()
returns trigger
language plpgsql
as $$
begin
  if new.subcontract_id is null and new.contractor_job_id is not null then
    new.subcontract_id := new.contractor_job_id;
  end if;
  if new.contractor_job_id is null and new.subcontract_id is not null then
    new.contractor_job_id := new.subcontract_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_requests_sync_subcontract_link on public.requests;
create trigger trg_requests_sync_subcontract_link
before insert or update of subcontract_id, contractor_job_id
on public.requests
for each row
execute function public.fn_requests_sync_subcontract_link();

-- Request ids for contractor job.
create or replace function public.rpc_contractor_req_ids(
  p_subcontract_id uuid
)
returns table(
  request_id uuid,
  display_no text,
  object_name text,
  level_code text,
  system_code text,
  status text
)
language sql
stable
as $$
  select
    r.id as request_id,
    r.display_no,
    coalesce(nullif(trim(r.object_name), ''), nullif(trim(r.object_type_code), '')) as object_name,
    r.level_code,
    r.system_code,
    r.status
  from public.requests r
  where coalesce(r.subcontract_id, r.contractor_job_id) = p_subcontract_id
  order by coalesce(r.submitted_at, r.created_at) desc nulls last, r.id desc;
$$;

-- Issued lines by subcontract via linked request ids, with strict req-item pricing.
create or replace function public.rpc_contractor_issued_today(
  p_subcontract_id uuid,
  p_date_from timestamptz,
  p_date_to timestamptz
)
returns table(
  request_id uuid,
  req_no text,
  issue_id uuid,
  issue_no text,
  issue_item_id uuid,
  req_item_id uuid,
  sku text,
  material text,
  uom text,
  qty_limit numeric,
  qty_issued numeric,
  qty_left numeric,
  price numeric,
  sum numeric,
  issued_at timestamptz
)
language sql
stable
as $$
  with reqs as (
    select r.id, r.display_no
    from public.requests r
    where coalesce(r.subcontract_id, r.contractor_job_id) = p_subcontract_id
  )
  select
    v.req_id as request_id,
    rq.display_no as req_no,
    v.issue_id,
    coalesce(
      nullif(trim(wi.issue_no::text), ''),
      nullif(trim(wi.base_no::text), ''),
      'ISSUE-' || wi.id::text
    ) as issue_no,
    v.issue_item_id,
    v.req_item_id,
    coalesce(nullif(trim(v.sku), ''), nullif(trim(v.material_id), '')) as sku,
    v.title as material,
    v.unit as uom,
    ri.qty as qty_limit,
    v.qty as qty_issued,
    case when ri.qty is null then null else greatest(ri.qty - v.qty, 0) end as qty_left,
    v.price,
    v.sum,
    v.issued_at
  from public.priced_issue_items_by_req v
  join reqs rq
    on rq.id = v.req_id
  left join public.warehouse_issues wi
    on wi.id = v.issue_id
  left join public.request_items ri
    on ri.id = v.req_item_id
  where (p_date_from is null or v.issued_at >= p_date_from)
    and (p_date_to is null or v.issued_at < p_date_to)
  order by v.issued_at desc, v.issue_id desc, v.issue_item_id desc;
$$;

commit;
