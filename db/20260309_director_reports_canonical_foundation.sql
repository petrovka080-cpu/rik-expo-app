-- Director reports canonical aggregate foundation (Phase P1)
-- Safe to apply independently. Runtime usage is feature-flagged on client.

begin;

-- 1) Canonical low-level fact view (issue-item grain)
create or replace view public.v_director_report_issue_item_facts_v1 as
select
  wi.id::text as issue_id,
  wi.iss_date::timestamptz as iss_date,
  coalesce(nullif(trim(wi.object_name), ''), 'Без объекта') as object_name,
  coalesce(nullif(trim(wi.work_name), ''), 'Без вида работ') as work_name,
  wii.request_item_id::text as request_item_id,
  upper(coalesce(nullif(trim(wii.rik_code), ''), '—')) as rik_code,
  coalesce(nullif(trim(wii.uom_id), ''), '') as uom,
  coalesce(wii.qty, 0)::numeric as qty,
  case when coalesce(nullif(trim(wii.request_item_id::text), ''), '') = '' then true else false end as is_without_request
from public.warehouse_issue_items wii
join public.warehouse_issues wi on wi.id = wii.issue_id
where wi.status = 'Подтверждено';

comment on view public.v_director_report_issue_item_facts_v1 is
'Canonical director report facts at issue-item grain';

-- 2) Canonical daily aggregate view (works + materials from one source)
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
  count(distinct b.issue_id)::bigint as docs_total
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
  count(distinct b.issue_id)::bigint as docs_total
from base b
group by b.day_date, b.object_name, b.work_name;

comment on view public.v_director_report_fact_daily_v1 is
'Canonical daily aggregates for director materials/works report';

-- 3) Materials RPC facade (canonical shape, UI-friendly)
create or replace function public.director_report_fetch_materials_v1(
  p_from date default null,
  p_to date default null,
  p_object_name text default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with d as (
  select *
  from public.v_director_report_fact_daily_v1 x
  where x.mode = 'materials'
    and (p_from is null or x.day_date >= p_from)
    and (p_to is null or x.day_date <= p_to)
    and (p_object_name is null or x.object_name = p_object_name)
),
rows as (
  select
    d.group_key as rik_code,
    d.group_name as name_human_ru,
    max(d.uom) as uom,
    coalesce(sum(d.qty_total), 0)::numeric as qty_total,
    coalesce(sum(d.docs_total), 0)::bigint as docs_cnt,
    coalesce(sum(d.positions_free), 0)::bigint as qty_free,
    coalesce(sum(d.positions_free), 0)::bigint as docs_free
  from d
  group by d.group_key, d.group_name
),
kpi as (
  select
    coalesce(sum(d.docs_total), 0)::bigint as issues_total,
    coalesce(sum(d.positions_total), 0)::bigint as items_total,
    coalesce(sum(d.positions_free), 0)::bigint as items_free
  from d
),
objects as (
  select distinct d.object_name
  from d
)
select jsonb_build_object(
  'meta', jsonb_build_object(
    'from', coalesce(p_from::text, ''),
    'to', coalesce(p_to::text, ''),
    'object_name', p_object_name
  ),
  'kpi', jsonb_build_object(
    'issues_total', (select issues_total from kpi),
    'issues_no_obj', 0,
    'items_total', (select items_total from kpi),
    'items_free', (select items_free from kpi)
  ),
  'rows', coalesce((
    select jsonb_agg(jsonb_build_object(
      'rik_code', r.rik_code,
      'name_human_ru', r.name_human_ru,
      'uom', r.uom,
      'qty_total', r.qty_total,
      'docs_cnt', r.docs_cnt,
      'qty_free', r.qty_free,
      'docs_free', r.docs_free
    ) order by r.qty_total desc)
    from rows r
  ), '[]'::jsonb),
  'report_options', jsonb_build_object(
    'objects', coalesce((select jsonb_agg(o.object_name order by o.object_name) from objects o), '[]'::jsonb),
    'objectIdByName', '{}'::jsonb
  )
);
$$;

comment on function public.director_report_fetch_materials_v1(date, date, text) is
'Canonical materials payload for director reports';

-- 4) Works RPC facade (first-stage metrics + optional cost placeholders)
create or replace function public.director_report_fetch_works_v1(
  p_from date default null,
  p_to date default null,
  p_object_name text default null,
  p_include_costs boolean default false
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with d as (
  select *
  from public.v_director_report_fact_daily_v1 x
  where x.mode = 'works'
    and (p_from is null or x.day_date >= p_from)
    and (p_to is null or x.day_date <= p_to)
    and (p_object_name is null or x.object_name = p_object_name)
),
works as (
  select
    d.group_key as work_type_name,
    coalesce(sum(d.positions_total), 0)::bigint as total_positions,
    coalesce(sum(d.positions_req), 0)::bigint as req_positions,
    coalesce(sum(d.positions_free), 0)::bigint as free_positions,
    coalesce(sum(d.qty_total), 0)::numeric as total_qty,
    coalesce(sum(d.docs_total), 0)::bigint as total_docs
  from d
  group by d.group_key
),
summary as (
  select
    coalesce(sum(w.total_qty), 0)::numeric as total_qty,
    coalesce(sum(w.total_docs), 0)::bigint as total_docs,
    coalesce(sum(w.total_positions), 0)::bigint as total_positions,
    coalesce(sum(w.free_positions), 0)::bigint as total_free_positions
  from works w
)
select jsonb_build_object(
  'summary', jsonb_build_object(
    'total_qty', (select total_qty from summary),
    'total_docs', (select total_docs from summary),
    'total_positions', (select total_positions from summary),
    'pct_without_work', 0,
    'pct_without_level', 0,
    'pct_without_request',
      case when (select total_positions from summary) > 0
           then round(((select total_free_positions from summary)::numeric * 100.0) / (select total_positions from summary), 2)
           else 0 end,
    'issue_cost_total', case when p_include_costs then 0 else 0 end,
    'purchase_cost_total', case when p_include_costs then 0 else 0 end,
    'issue_to_purchase_pct', 0,
    'unpriced_issue_pct', 0
  ),
  'works', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', w.work_type_name,
      'work_type_name', w.work_type_name,
      'total_qty', w.total_qty,
      'total_docs', w.total_docs,
      'total_positions', w.total_positions,
      'share_total_pct',
        case when (select total_qty from summary) > 0
             then round((w.total_qty * 100.0) / (select total_qty from summary), 2)
             else 0 end,
      'req_positions', w.req_positions,
      'free_positions', w.free_positions,
      'levels', '[]'::jsonb
    ) order by w.total_positions desc)
    from works w
  ), '[]'::jsonb)
);
$$;

comment on function public.director_report_fetch_works_v1(date, date, text, boolean) is
'Canonical works payload for director reports';

commit;

