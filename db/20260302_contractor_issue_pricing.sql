-- db/20260302_contractor_issue_pricing.sql
-- Contractor/warehouse binding + strict issue pricing by REQ item.
-- Safe/idempotent migration: additive columns + view/rpc only.

begin;

-- 1) Canonical links (REQ <-> contractor_job, ISSUE <-> contractor_job).
alter table if exists public.requests
  add column if not exists contractor_job_id uuid null references public.subcontracts(id) on delete set null;

create index if not exists idx_requests_contractor_job_id
  on public.requests (contractor_job_id);

alter table if exists public.warehouse_issues
  add column if not exists contractor_job_id uuid null references public.subcontracts(id) on delete set null;

create index if not exists idx_wh_issues_contractor_job_id
  on public.warehouse_issues (contractor_job_id);

-- Keep issue.contractor_job_id hydrated from request when possible.
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

update public.warehouse_issues wi
set contractor_job_id = r.contractor_job_id
from public.requests r
where wi.request_id = r.id
  and wi.contractor_job_id is null
  and r.contractor_job_id is not null;

-- 2) Canonical req_item_id on issue lines (backward-compatible with request_item_id).
alter table if exists public.warehouse_issue_items
  add column if not exists req_item_id uuid null references public.request_items(id) on delete set null;

create index if not exists idx_wh_issue_items_req_item_id
  on public.warehouse_issue_items (req_item_id);

update public.warehouse_issue_items
set req_item_id = request_item_id
where req_item_id is null
  and request_item_id is not null;

create or replace function public.fn_wh_issue_item_sync_req_item_id()
returns trigger
language plpgsql
as $$
begin
  -- Keep both columns in sync while old logic still uses request_item_id.
  if new.req_item_id is null and new.request_item_id is not null then
    new.req_item_id := new.request_item_id;
  end if;
  if new.request_item_id is null and new.req_item_id is not null then
    new.request_item_id := new.req_item_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_wh_issue_item_sync_req_item_id on public.warehouse_issue_items;
create trigger trg_wh_issue_item_sync_req_item_id
before insert or update of req_item_id, request_item_id
on public.warehouse_issue_items
for each row
execute function public.fn_wh_issue_item_sync_req_item_id();

-- 3) Strictly priced issue lines by req_item_id (price from procurement tables).
create or replace view public.priced_issue_items_by_req as
with issue_lines as (
  select
    wi.id as issue_id,
    wii.id as issue_item_id,
    wi.contractor_job_id,
    coalesce(wii.req_item_id, wii.request_item_id) as req_item_id,
    coalesce(ri.request_id, wi.request_id) as req_id,
    upper(trim(coalesce(wii.rik_code::text, ''))) as sku,
    trim(coalesce(wii.uom_id::text, '')) as unit,
    coalesce(wii.qty, 0)::numeric as qty,
    coalesce(wi.iss_date, wi.date_issued, wi.created_at) as issued_at
  from public.warehouse_issues wi
  join public.warehouse_issue_items wii
    on wii.issue_id = wi.id
  left join public.request_items ri
    on ri.id = coalesce(wii.req_item_id, wii.request_item_id)
  where coalesce(lower(trim(wi.status)), 'подтверждено') in ('подтверждено', 'confirmed', 'done')
),
price_by_req as (
  select
    x.req_item_id,
    -- Strict bind to req_item_id; purchase_items is primary source, proposal_items fallback.
    coalesce(
      (
        select avg(pi.price)::numeric
        from public.purchase_items pi
        where pi.request_item_id = x.req_item_id
          and pi.price is not null
      ),
      (
        select avg(pp.price)::numeric
        from public.proposal_items pp
        where pp.request_item_id = x.req_item_id
          and pp.price is not null
      )
    ) as price
  from (
    select distinct il.req_item_id
    from issue_lines il
    where il.req_item_id is not null
  ) x
)
select
  il.issue_id,
  il.issue_item_id,
  il.contractor_job_id,
  il.req_id,
  il.req_item_id,
  il.sku as material_id,
  il.sku,
  coalesce(
    nullif(trim(cic.name_human_ru::text), ''),
    nullif(trim(ci.name_human_ru::text), ''),
    nullif(trim(ci.name_human::text), ''),
    nullif(trim(vrr.name_ru::text), ''),
    il.sku
  ) as title,
  il.unit,
  il.qty,
  pb.price,
  case when pb.price is null then null else il.qty * pb.price end as sum,
  il.issued_at
from issue_lines il
left join price_by_req pb
  on pb.req_item_id = il.req_item_id
left join public.catalog_items_canon cic
  on upper(trim(cic.code::text)) = il.sku
left join public.catalog_items ci
  on upper(trim(ci.rik_code::text)) = il.sku
left join public.v_rik_names_ru vrr
  on upper(trim(vrr.code::text)) = il.sku;

comment on view public.priced_issue_items_by_req is
'Warehouse issue lines priced strictly by req_item_id; price from purchase_items/proposal_items by request_item_id.';

-- 4) Contractor RPC: issued lines in period from the same priced source.
create or replace function public.contractor_fetch_issued_today(
  p_contractor_job_id uuid,
  p_date_from timestamptz,
  p_date_to timestamptz
)
returns table(
  issue_id uuid,
  issue_item_id uuid,
  contractor_job_id uuid,
  req_id uuid,
  req_item_id uuid,
  material_id text,
  sku text,
  title text,
  unit text,
  qty numeric,
  price numeric,
  sum numeric,
  issued_at timestamptz
)
language sql
stable
as $$
  select
    v.issue_id,
    v.issue_item_id,
    v.contractor_job_id,
    v.req_id,
    v.req_item_id,
    v.material_id,
    v.sku,
    v.title,
    v.unit,
    v.qty,
    v.price,
    v.sum,
    v.issued_at
  from public.priced_issue_items_by_req v
  where (p_contractor_job_id is null or v.contractor_job_id = p_contractor_job_id)
    and (p_date_from is null or v.issued_at >= p_date_from)
    and (p_date_to is null or v.issued_at < p_date_to)
  order by v.issued_at desc, v.issue_id desc, v.issue_item_id desc;
$$;

-- 5) Contractor RPC: readonly contract header like director card.
create or replace function public.contractor_job_header(
  p_contractor_job_id uuid
)
returns table(
  contractor_job_id uuid,
  contractor_org text,
  contractor_inn text,
  contractor_rep text,
  contractor_phone text,
  contract_number text,
  contract_date date,
  object_id text,
  object_name text,
  zone text,
  level_name text,
  work_kind text,
  work_name text,
  plan_qty numeric,
  unit text,
  date_start date,
  date_end date,
  unit_price numeric,
  total numeric,
  status text
)
language sql
stable
as $$
  with base as (
    select s.*
    from public.subcontracts s
    where s.id = p_contractor_job_id
    limit 1
  ),
  req_latest as (
    select
      r.id,
      r.object_id,
      r.object_name,
      r.level_name,
      r.level_code,
      r.system_name,
      r.system_code
    from public.requests r
    where r.contractor_job_id = p_contractor_job_id
    order by r.created_at desc
    limit 1
  )
  select
    b.id as contractor_job_id,
    nullif(trim(b.contractor_org), '') as contractor_org,
    nullif(trim(to_jsonb(b)->>'contractor_inn'), '') as contractor_inn,
    nullif(trim(b.contractor_rep), '') as contractor_rep,
    nullif(trim(b.contractor_phone), '') as contractor_phone,
    nullif(trim(b.contract_number), '') as contract_number,
    b.contract_date,
    nullif(trim(coalesce(req_latest.object_id::text, '')), '') as object_id,
    coalesce(
      nullif(trim(b.object_name), ''),
      nullif(trim(req_latest.object_name), '')
    ) as object_name,
    nullif(trim(b.work_zone), '') as zone,
    coalesce(
      nullif(trim(req_latest.level_name), ''),
      nullif(trim(req_latest.level_code), '')
    ) as level_name,
    nullif(trim(b.work_type), '') as work_kind,
    coalesce(
      nullif(trim(b.work_type), ''),
      nullif(trim(req_latest.system_name), ''),
      nullif(trim(req_latest.system_code), '')
    ) as work_name,
    b.qty_planned as plan_qty,
    nullif(trim(b.uom), '') as unit,
    b.date_start,
    b.date_end,
    b.price_per_unit as unit_price,
    b.total_price as total,
    b.status
  from base b
  left join req_latest on true;
$$;

commit;
