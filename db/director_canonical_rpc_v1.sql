-- Director canonical RPC deployment bundle v1
-- Additive only: creates/updates canonical RPC functions used by runtime gateway.
-- No DROP statements. No legacy path changes.

begin;

-- Materials (runtime-compatible signature)
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
    coalesce(sum(d.positions_free), 0)::bigint as qty_without_request,
    coalesce(sum(d.positions_free), 0)::bigint as docs_without_request
  from d
  group by d.group_key, d.group_name
),
kpi as (
  select
    coalesce(sum(d.docs_total), 0)::bigint as issues_total,
    coalesce(sum(d.positions_total), 0)::bigint as items_total,
    coalesce(sum(d.positions_free), 0)::bigint as items_without_request
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
    'issues_without_object', 0,
    'items_total', (select items_total from kpi),
    'items_without_request', (select items_without_request from kpi)
  ),
  'rows', coalesce((
    select jsonb_agg(jsonb_build_object(
      'rik_code', r.rik_code,
      'name_human_ru', r.name_human_ru,
      'uom', r.uom,
      'qty_total', r.qty_total,
      'docs_cnt', r.docs_cnt,
      'qty_without_request', r.qty_without_request,
      'docs_without_request', r.docs_without_request
    ) order by r.qty_total desc)
    from rows r
  ), '[]'::jsonb),
  'report_options', jsonb_build_object(
    'objects', coalesce((select jsonb_agg(o.object_name order by o.object_name) from objects o), '[]'::jsonb),
    'objectIdByName', '{}'::jsonb
  )
);
$$;

-- Works (runtime-compatible signature)
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

-- Summary (runtime-compatible signature)
create or replace function public.director_report_fetch_summary_v1(
  p_from date default null,
  p_to date default null,
  p_object_name text default null,
  p_mode text default null
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
  where (p_mode is null or x.mode = p_mode)
    and (p_from is null or x.day_date >= p_from)
    and (p_to is null or x.day_date <= p_to)
    and (p_object_name is null or x.object_name = p_object_name)
)
select jsonb_build_object(
  'issue_cost_total', 0,
  'purchase_cost_total', 0,
  'unevaluated_ratio', 0,
  'base_ready', true
)
from d
limit 1;
$$;

commit;

