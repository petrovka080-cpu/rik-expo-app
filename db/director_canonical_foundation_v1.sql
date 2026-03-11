-- Director canonical foundation v1 (dependency-first)
-- Apply BEFORE RPC bundle: db/director_canonical_rpc_v1.sql
-- Additive only: creates base canonical views required by Director RPCs.

begin;

-- 1) Canonical low-level fact view (issue-item grain)
create or replace view public.v_director_report_issue_item_facts_v1 as
select
  wi.id::text as issue_id,
  wi.iss_date::timestamptz as iss_date,
  coalesce(nullif(trim(wi.object_name), ''), 'Без объекта') as object_name,
  coalesce(
    nullif(trim(wi.work_name), ''),
    nullif(trim(req.system_code::text), ''),
    'Без вида работ'
  ) as work_name,
  wii.request_item_id::text as request_item_id,
  upper(coalesce(nullif(trim(wii.rik_code), ''), '—')) as rik_code,
  coalesce(nullif(trim(wii.uom_id), ''), '') as uom,
  coalesce(wii.qty, 0)::numeric as qty,
  case
    when coalesce(nullif(trim(wii.request_item_id::text), ''), '') = '' then true
    else false
  end as is_without_request
from public.warehouse_issue_items wii
join public.warehouse_issues wi
  on wi.id = wii.issue_id
left join public.request_items ri
  on ri.id::text = wii.request_item_id::text
left join public.requests req
  on req.id::text = coalesce(ri.request_id::text, wi.request_id::text)
where wi.status = 'Подтверждено';

comment on view public.v_director_report_issue_item_facts_v1 is
'Canonical director report facts at issue-item grain';

-- 2) Canonical daily aggregate view (materials + works)
create or replace view public.v_director_report_fact_daily_v1 as
with base as (
  select
    date_trunc('day', f.iss_date)::date as day_date,
    f.object_name,
    f.work_name,
    f.rik_code,
    f.uom,
    f.qty,
    f.issue_id,
    f.is_without_request
  from public.v_director_report_issue_item_facts_v1 f
)
select
  b.day_date,
  b.object_name,
  'materials'::text as mode,
  b.rik_code as group_key,
  b.rik_code as group_name,
  null::text as level_key,
  null::text as level_name,
  count(*)::bigint as positions_total,
  count(*) filter (where not b.is_without_request)::bigint as positions_req,
  count(*) filter (where b.is_without_request)::bigint as positions_free,
  coalesce(sum(b.qty), 0)::numeric as qty_total,
  count(distinct b.issue_id)::bigint as docs_total,
  max(b.uom)::text as uom
from base b
group by b.day_date, b.object_name, b.rik_code

union all

select
  b.day_date,
  b.object_name,
  'works'::text as mode,
  b.work_name as group_key,
  b.work_name as group_name,
  null::text as level_key,
  null::text as level_name,
  count(*)::bigint as positions_total,
  count(*) filter (where not b.is_without_request)::bigint as positions_req,
  count(*) filter (where b.is_without_request)::bigint as positions_free,
  coalesce(sum(b.qty), 0)::numeric as qty_total,
  count(distinct b.issue_id)::bigint as docs_total,
  null::text as uom
from base b
group by b.day_date, b.object_name, b.work_name;

comment on view public.v_director_report_fact_daily_v1 is
'Canonical daily aggregates for director materials/works reports';

commit;

