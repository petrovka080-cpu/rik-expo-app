-- Director Canonical Reports SQL Blueprint v2 (REMEDIATION DRAFT)
-- -----------------------------------------------------------------------------
-- Purpose: close P0/P1 gaps from semantics review without runtime cutover.
-- Key fixes:
--   P0-1 RPC contract parity: JSON payload shape aligned to runtime expectations.
--   P0-2 unevaluated_ratio parity: unpriced issue positions / priced-base positions.
--   P1-1 company anchor: company_id resolved from issue-header first, then request.
--   P1-2 grain parity: works payload restored as nested work->level->materials.
--   P1-3 deterministic joins: reference/name sources pre-deduplicated by code.
--
-- IMPORTANT:
--   - Draft blueprint only; do not switch runtime path in this task.
--   - Preserve business semantics; do not "optimize" formulas silently.
-- -----------------------------------------------------------------------------

begin;

-- -----------------------------------------------------------------------------
-- A) Deterministic reference/name layers (dedup per code)
-- -----------------------------------------------------------------------------
create or replace view public.v_ref_systems_one_v1 as
select distinct on (s.code)
  s.code,
  coalesce(nullif(trim(s.name_human_ru::text), ''), nullif(trim(s.display_name::text), ''), nullif(trim(s.alias_ru::text), ''), nullif(trim(s.name::text), ''), s.code) as name_human_ru
from public.ref_systems s
where s.code is not null
order by s.code;

create or replace view public.v_ref_levels_one_v1 as
select distinct on (l.code)
  l.code,
  coalesce(nullif(trim(l.name_human_ru::text), ''), nullif(trim(l.display_name::text), ''), nullif(trim(l.name::text), ''), l.code) as name_human_ru
from public.ref_levels l
where l.code is not null
order by l.code;

create or replace view public.v_ref_zones_one_v1 as
select distinct on (z.code)
  z.code,
  coalesce(nullif(trim(z.name_human_ru::text), ''), nullif(trim(z.display_name::text), ''), nullif(trim(z.name::text), ''), z.code) as name_human_ru
from public.ref_zones z
where z.code is not null
order by z.code;

create or replace view public.v_rik_name_one_v1 as
with src as (
  select upper(trim(coalesce(v.code::text, ''))) as code, nullif(trim(v.name_ru::text), '') as name_ru, 10 as prio
  from public.v_rik_names_ru v
  union all
  select upper(trim(coalesce(o.code::text, ''))) as code, nullif(trim(o.name_ru::text), '') as name_ru, 1 as prio
  from public.catalog_name_overrides o
),
ranked as (
  select s.code, s.name_ru, s.prio,
         row_number() over (partition by s.code order by s.prio asc) as rn
  from src s
  where s.code <> '' and s.name_ru is not null
)
select r.code, r.name_ru
from ranked r
where r.rn = 1;

create or replace view public.v_catalog_item_one_v1 as
select distinct on (upper(trim(coalesce(ci.rik_code::text, ''))))
  upper(trim(coalesce(ci.rik_code::text, ''))) as rik_code,
  nullif(trim(ci.name_human_ru::text), '') as name_human_ru,
  nullif(trim(ci.group_name::text), '') as group_name,
  nullif(trim(ci.category_name::text), '') as category_name
from public.catalog_items ci
where trim(coalesce(ci.rik_code::text, '')) <> ''
order by upper(trim(coalesce(ci.rik_code::text, '')));

-- -----------------------------------------------------------------------------
-- B) Price layers aligned with runtime semantics
-- -----------------------------------------------------------------------------
create or replace view public.v_director_price_by_request_item_v2 as
with agg as (
  select
    pi.request_item_id::uuid as request_item_id,
    sum(coalesce(pi.price, 0)::numeric * greatest(coalesce(pi.qty, 0)::numeric, 1)) as wsum,
    sum(greatest(coalesce(pi.qty, 0)::numeric, 1)) as wqty
  from public.proposal_items pi
  where pi.request_item_id is not null
  group by pi.request_item_id
)
select
  a.request_item_id,
  case when a.wqty > 0 then a.wsum / a.wqty else 0::numeric end as unit_price
from agg a;

create or replace view public.v_director_price_by_code_v2 as
with agg as (
  select
    upper(trim(coalesce(pi.rik_code, ''))) as rik_code,
    sum(coalesce(pi.price, 0)::numeric * greatest(coalesce(pi.qty, 0)::numeric, 1)) as wsum,
    sum(greatest(coalesce(pi.qty, 0)::numeric, 1)) as wqty
  from public.proposal_items pi
  where trim(coalesce(pi.rik_code, '')) <> ''
  group by upper(trim(coalesce(pi.rik_code, '')))
)
select
  a.rik_code,
  case when a.wqty > 0 then a.wsum / a.wqty else 0::numeric end as unit_price
from agg a;

-- -----------------------------------------------------------------------------
-- C) Canonical base facts: works (flat fact grain = issue_item)
-- -----------------------------------------------------------------------------
create or replace view public.v_director_work_facts_base as
with src as (
  select
    -- P1-1: company anchor prefers issue-header company, then request company.
    coalesce(wi.company_id, req.company_id)::uuid as company_id,
    coalesce(wi.iss_date::date, req.created_at::date, current_date) as fact_date,

    req.object_id::uuid as object_id,
    coalesce(
      nullif(trim(req.object_name::text), ''),
      nullif(trim(wi.object_name::text), ''),
      nullif(trim(req.object::text), ''),
      'Без объекта'
    )::text as object_name,

    req.system_code::text as system_code,
    rs.name_human_ru::text as system_name,

    req.level_code::text as level_code,
    rl.name_human_ru::text as level_name,

    req.zone_code::text as zone_code,
    rz.name_human_ru::text as zone_name,

    coalesce(
      nullif(trim(ri.work_type_code::text), ''),
      nullif(trim(req.work_type_code::text), '')
    )::text as work_type_code,

    coalesce(
      nullif(trim(wi.work_name::text), ''),
      rs.name_human_ru,
      nullif(trim(req.system_code::text), ''),
      'Без вида работ'
    )::text as work_type_name,

    coalesce(
      nullif(trim(ri.work_type_code::text), ''),
      nullif(trim(req.work_type_code::text), ''),
      nullif(trim(wi.work_name::text), ''),
      nullif(trim(req.system_code::text), ''),
      'unknown'
    )::text as discipline_key,

    coalesce(
      nullif(trim(wi.work_name::text), ''),
      rs.name_human_ru,
      nullif(trim(req.system_code::text), ''),
      'Не определено'
    )::text as discipline_name,

    req.id::uuid as request_id,
    ri.id::uuid as request_item_id,
    wii.id::uuid as issue_item_id,

    null::uuid as material_id,
    upper(trim(coalesce(wii.rik_code::text, '')))::text as material_code,
    coalesce(rn.name_ru, ci.name_human_ru, upper(trim(coalesce(wii.rik_code::text, ''))))::text as material_name,

    coalesce(wii.qty, 0)::numeric as qty,
    coalesce(nullif(trim(wii.uom_id::text), ''), '')::text as uom,

    (wii.request_item_id is not null) as is_requested,
    (wii.request_item_id is null) as is_free,

    coalesce(
      coalesce(pri.unit_price, prc.unit_price, 0)::numeric * coalesce(wii.qty, 0)::numeric,
      0::numeric
    ) as issue_cost,

    -- Keep conservative works purchase branch as in current runtime.
    0::numeric as purchase_cost
  from public.warehouse_issue_items wii
  join public.warehouse_issues wi
    on wi.id = wii.issue_id
  left join public.request_items ri
    on ri.id = wii.request_item_id
  left join public.requests req
    on req.id = coalesce(ri.request_id, wi.request_id)
  left join public.v_ref_systems_one_v1 rs
    on rs.code = req.system_code
  left join public.v_ref_levels_one_v1 rl
    on rl.code = req.level_code
  left join public.v_ref_zones_one_v1 rz
    on rz.code = req.zone_code
  left join public.v_rik_name_one_v1 rn
    on rn.code = upper(trim(coalesce(wii.rik_code::text, '')))
  left join public.v_catalog_item_one_v1 ci
    on ci.rik_code = upper(trim(coalesce(wii.rik_code::text, '')))
  left join public.v_director_price_by_request_item_v2 pri
    on pri.request_item_id = ri.id
  left join public.v_director_price_by_code_v2 prc
    on prc.rik_code = upper(trim(coalesce(wii.rik_code::text, '')))
  where wi.status = 'Подтверждено'
)
select *
from src
where company_id is not null;

comment on view public.v_director_work_facts_base is
'Director works canonical facts (issue_item grain). Includes free/unlinked rows when issue has company scope.';

-- -----------------------------------------------------------------------------
-- D) Canonical base facts: materials (flat fact grain = issue_item)
-- -----------------------------------------------------------------------------
create or replace view public.v_director_material_facts_base as
with src as (
  select
    coalesce(wi.company_id, req.company_id)::uuid as company_id,
    coalesce(wi.iss_date::date, req.created_at::date, current_date) as fact_date,

    req.object_id::uuid as object_id,
    coalesce(
      nullif(trim(req.object_name::text), ''),
      nullif(trim(wi.object_name::text), ''),
      nullif(trim(req.object::text), ''),
      'Без объекта'
    )::text as object_name,

    null::uuid as material_id,
    upper(trim(coalesce(wii.rik_code::text, '')))::text as material_code,
    coalesce(rn.name_ru, ci.name_human_ru, upper(trim(coalesce(wii.rik_code::text, ''))))::text as material_name,
    coalesce(ci.group_name, ci.category_name, 'Прочее')::text as material_group,
    coalesce(nullif(trim(wii.uom_id::text), ''), '')::text as uom,

    coalesce(wii.qty, 0)::numeric as issued_qty,
    coalesce(ri.purchase_qty, ri.qty, 0)::numeric as purchased_qty,
    0::numeric as stock_qty,

    coalesce(
      coalesce(pri.unit_price, prc.unit_price, 0)::numeric * coalesce(wii.qty, 0)::numeric,
      0::numeric
    ) as issue_cost,
    0::numeric as purchase_cost,

    req.id::uuid as request_id,
    wii.id::uuid as issue_item_id,
    (wii.request_item_id is not null) as is_requested,
    (wii.request_item_id is null) as is_free
  from public.warehouse_issue_items wii
  join public.warehouse_issues wi
    on wi.id = wii.issue_id
  left join public.request_items ri
    on ri.id = wii.request_item_id
  left join public.requests req
    on req.id = coalesce(ri.request_id, wi.request_id)
  left join public.v_rik_name_one_v1 rn
    on rn.code = upper(trim(coalesce(wii.rik_code::text, '')))
  left join public.v_catalog_item_one_v1 ci
    on ci.rik_code = upper(trim(coalesce(wii.rik_code::text, '')))
  left join public.v_director_price_by_request_item_v2 pri
    on pri.request_item_id = ri.id
  left join public.v_director_price_by_code_v2 prc
    on prc.rik_code = upper(trim(coalesce(wii.rik_code::text, '')))
  where wi.status = 'Подтверждено'
)
select *
from src
where company_id is not null;

comment on view public.v_director_material_facts_base is
'Director materials canonical facts (issue_item grain). stock_qty is provisional until approved stock source.';

-- -----------------------------------------------------------------------------
-- E) RPC: Works (JSON payload contract parity)
-- Returns: table(payload jsonb) with DirectorDisciplinePayload shape.
-- -----------------------------------------------------------------------------
create or replace function public.director_report_fetch_works_v1(
  p_company_id uuid,
  p_from date,
  p_to date,
  p_object_id uuid default null,
  p_object_name text default null,
  p_include_costs boolean default true,
  p_group_by text default 'discipline',
  p_mode text default null
)
returns table (payload jsonb)
language sql
stable
security definer
set search_path = public
as $$
with filtered as (
  select *
  from public.v_director_work_facts_base v
  where v.company_id = p_company_id
    and v.fact_date between p_from and p_to
    and (
      (p_object_id is not null and v.object_id = p_object_id)
      or
      (p_object_id is null and p_object_name is not null and lower(v.object_name) = lower(p_object_name))
      or
      (p_object_id is null and p_object_name is null)
    )
),
base as (
  select
    coalesce(v.work_type_name, 'Без вида работ') as work_name,
    coalesce(v.level_name, 'Без этажа') as level_name,
    coalesce(v.material_name, v.material_code, '—') as material_name,
    coalesce(v.material_code, '—') as rik_code,
    coalesce(v.uom, '') as uom,
    coalesce(v.qty, 0)::numeric as qty,
    coalesce(v.issue_cost, 0)::numeric as issue_cost,
    coalesce(v.purchase_cost, 0)::numeric as purchase_cost,
    v.is_requested,
    v.is_free,
    v.issue_item_id::text as issue_item_id,
    -- P0-2 formula base: issue position requires qty > 0 and non-empty code.
    (coalesce(v.qty, 0) > 0 and coalesce(nullif(trim(v.material_code), ''), '') <> '') as is_priced_base_position,
    (coalesce(v.qty, 0) > 0 and coalesce(nullif(trim(v.material_code), ''), '') <> '' and coalesce(v.issue_cost, 0) <= 0) as is_unpriced_position
  from filtered v
),
mat as (
  select
    b.work_name,
    b.level_name,
    b.material_name,
    b.rik_code,
    b.uom,
    sum(b.qty)::numeric as qty_sum,
    count(distinct b.issue_item_id)::int as docs_count,
    sum(b.issue_cost)::numeric as amount_sum
  from base b
  group by b.work_name, b.level_name, b.material_name, b.rik_code, b.uom
),
lvl as (
  select
    b.work_name,
    b.level_name,
    sum(b.qty)::numeric as total_qty,
    count(distinct b.issue_item_id)::int as total_docs,
    count(*)::int as total_positions,
    count(*) filter (where b.is_requested)::int as req_positions,
    count(*) filter (where b.is_free)::int as free_positions
  from base b
  group by b.work_name, b.level_name
),
wrk as (
  select
    b.work_name,
    sum(b.qty)::numeric as total_qty,
    count(distinct b.issue_item_id)::int as total_docs,
    count(*)::int as total_positions,
    count(*) filter (where b.is_requested)::int as req_positions,
    count(*) filter (where b.is_free)::int as free_positions
  from base b
  group by b.work_name
),
summary as (
  select
    coalesce(sum(b.qty), 0)::numeric as total_qty,
    count(distinct b.issue_item_id)::int as total_docs,
    count(*)::int as total_positions,
    coalesce(sum(b.issue_cost), 0)::numeric as issue_cost_total,
    coalesce(sum(b.purchase_cost), 0)::numeric as purchase_cost_total,
    count(*) filter (where b.is_priced_base_position)::numeric as priced_base_count,
    count(*) filter (where b.is_unpriced_position)::numeric as unpriced_count,
    count(*) filter (where b.is_free)::numeric as free_count
  from base b
)
select jsonb_build_object(
  'summary', jsonb_build_object(
    'total_qty', coalesce((select s.total_qty from summary s), 0),
    'total_docs', coalesce((select s.total_docs from summary s), 0),
    'total_positions', coalesce((select s.total_positions from summary s), 0),
    'pct_without_work', 0,
    'pct_without_level', 0,
    'pct_without_request',
      case when coalesce((select s.total_positions from summary s), 0) > 0
           then round((coalesce((select s.free_count from summary s), 0) * 100.0) / (select s.total_positions from summary s), 2)
           else 0 end,
    'issue_cost_total', case when p_include_costs then coalesce((select s.issue_cost_total from summary s), 0) else 0 end,
    'purchase_cost_total', case when p_include_costs then coalesce((select s.purchase_cost_total from summary s), 0) else 0 end,
    'issue_to_purchase_pct',
      case when p_include_costs and coalesce((select s.purchase_cost_total from summary s), 0) > 0
           then round((coalesce((select s.issue_cost_total from summary s), 0) * 100.0) / (select s.purchase_cost_total from summary s), 2)
           else 0 end,
    -- P0-2: exact runtime-style base = priced positions only.
    'unpriced_issue_pct',
      case when coalesce((select s.priced_base_count from summary s), 0) > 0
           then round((coalesce((select s.unpriced_count from summary s), 0) * 100.0) / (select s.priced_base_count from summary s), 2)
           else 0 end
  ),
  'works', coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', w.work_name,
        'work_type_name', w.work_name,
        'total_qty', w.total_qty,
        'total_docs', w.total_docs,
        'total_positions', w.total_positions,
        'share_total_pct',
          case when coalesce((select s.total_qty from summary s), 0) > 0
               then round((w.total_qty * 100.0) / (select s.total_qty from summary s), 2)
               else 0 end,
        'req_positions', w.req_positions,
        'free_positions', w.free_positions,
        'levels', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', (w.work_name || '::' || l.level_name),
              'level_name', l.level_name,
              'total_qty', l.total_qty,
              'total_docs', l.total_docs,
              'total_positions', l.total_positions,
              'share_in_work_pct',
                case when w.total_qty > 0 then round((l.total_qty * 100.0) / w.total_qty, 2) else 0 end,
              'req_positions', l.req_positions,
              'free_positions', l.free_positions,
              'materials', coalesce((
                select jsonb_agg(
                  jsonb_build_object(
                    'material_name', m.material_name,
                    'rik_code', m.rik_code,
                    'uom', m.uom,
                    'qty_sum', m.qty_sum,
                    'docs_count', m.docs_count,
                    'unit_price', case when m.qty_sum > 0 then m.amount_sum / m.qty_sum else 0 end,
                    'amount_sum', m.amount_sum
                  )
                  order by m.amount_sum desc, m.qty_sum desc
                )
                from mat m
                where m.work_name = l.work_name and m.level_name = l.level_name
              ), '[]'::jsonb)
            )
            order by l.total_qty desc
          )
          from lvl l
          where l.work_name = w.work_name
        ), '[]'::jsonb)
      )
      order by w.total_qty desc
    )
    from wrk w
  ), '[]'::jsonb)
) as payload;
$$;

comment on function public.director_report_fetch_works_v1(uuid, date, date, uuid, text, boolean, text, text) is
'JSON contract parity for Director works report. unevaluated ratio = unpriced priced-base positions / priced-base positions.';

-- -----------------------------------------------------------------------------
-- F) RPC: Materials (JSON payload contract parity)
-- Returns: table(payload jsonb) with DirectorReportPayload shape.
-- -----------------------------------------------------------------------------
create or replace function public.director_report_fetch_materials_v1(
  p_company_id uuid,
  p_from date,
  p_to date,
  p_object_id uuid default null,
  p_object_name text default null,
  p_include_costs boolean default true,
  p_group_by text default 'material_group',
  p_mode text default null
)
returns table (payload jsonb)
language sql
stable
security definer
set search_path = public
as $$
with filtered as (
  select *
  from public.v_director_material_facts_base v
  where v.company_id = p_company_id
    and v.fact_date between p_from and p_to
    and (
      (p_object_id is not null and v.object_id = p_object_id)
      or
      (p_object_id is null and p_object_name is not null and lower(v.object_name) = lower(p_object_name))
      or
      (p_object_id is null and p_object_name is null)
    )
),
rows as (
  select
    f.material_code as rik_code,
    coalesce(f.material_name, f.material_code, '—') as name_human_ru,
    max(f.uom) as uom,
    coalesce(sum(f.issued_qty), 0)::numeric as qty_total,
    count(distinct f.issue_item_id)::int as docs_cnt,
    coalesce(sum(case when f.is_free then f.issued_qty else 0 end), 0)::numeric as qty_without_request,
    count(distinct case when f.is_free then f.issue_item_id else null end)::int as docs_without_request
  from filtered f
  group by f.material_code, coalesce(f.material_name, f.material_code, '—')
),
kpi as (
  select
    count(distinct f.issue_item_id)::int as items_total,
    count(distinct case when f.is_free then f.issue_item_id else null end)::int as items_without_request,
    count(distinct f.object_name)::int as objects_total
  from filtered f
),
objects as (
  select
    f.object_name,
    min(f.object_id)::text as object_id
  from filtered f
  group by f.object_name
)
select jsonb_build_object(
  'meta', jsonb_build_object(
    'from', p_from::text,
    'to', p_to::text,
    'object_name', p_object_name
  ),
  'kpi', jsonb_build_object(
    'issues_total', coalesce((select count(distinct f.issue_item_id)::int from filtered f), 0),
    'issues_without_object', 0,
    'items_total', coalesce((select k.items_total from kpi k), 0),
    'items_without_request', coalesce((select k.items_without_request from kpi k), 0)
  ),
  'rows', coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'rik_code', r.rik_code,
        'name_human_ru', r.name_human_ru,
        'uom', r.uom,
        'qty_total', r.qty_total,
        'docs_cnt', r.docs_cnt,
        'qty_without_request', r.qty_without_request,
        'docs_without_request', r.docs_without_request
      )
      order by r.qty_total desc
    )
    from rows r
  ), '[]'::jsonb),
  'report_options', jsonb_build_object(
    'objects', coalesce((select jsonb_agg(o.object_name order by o.object_name) from objects o), '[]'::jsonb),
    'objectIdByName', coalesce((
      select jsonb_object_agg(o.object_name, o.object_id)
      from objects o
    ), '{}'::jsonb)
  )
) as payload;
$$;

comment on function public.director_report_fetch_materials_v1(uuid, date, date, uuid, text, boolean, text, text) is
'JSON contract parity for Director materials report.';

-- -----------------------------------------------------------------------------
-- G) RPC: Summary (JSON payload)
-- -----------------------------------------------------------------------------
create or replace function public.director_report_fetch_summary_v1(
  p_company_id uuid,
  p_from date,
  p_to date,
  p_object_id uuid default null,
  p_object_name text default null,
  p_mode text default null
)
returns table (payload jsonb)
language sql
stable
security definer
set search_path = public
as $$
with filtered as (
  select *
  from public.v_director_work_facts_base v
  where v.company_id = p_company_id
    and v.fact_date between p_from and p_to
    and (
      (p_object_id is not null and v.object_id = p_object_id)
      or
      (p_object_id is null and p_object_name is not null and lower(v.object_name) = lower(p_object_name))
      or
      (p_object_id is null and p_object_name is null)
    )
),
agg as (
  select
    coalesce(sum(v.issue_cost), 0)::numeric as issue_cost_total,
    coalesce(sum(v.purchase_cost), 0)::numeric as purchase_cost_total,
    count(*) filter (where coalesce(v.qty, 0) > 0 and coalesce(nullif(trim(v.material_code), ''), '') <> '')::numeric as priced_base_count,
    count(*) filter (where coalesce(v.qty, 0) > 0 and coalesce(nullif(trim(v.material_code), ''), '') <> '' and coalesce(v.issue_cost, 0) <= 0)::numeric as unpriced_count
  from filtered v
)
select jsonb_build_object(
  'issue_cost_total', coalesce((select a.issue_cost_total from agg a), 0),
  'purchase_cost_total', coalesce((select a.purchase_cost_total from agg a), 0),
  'unevaluated_ratio',
    case when coalesce((select a.priced_base_count from agg a), 0) > 0
         then round(coalesce((select a.unpriced_count from agg a), 0) / (select a.priced_base_count from agg a), 4)
         else 0 end,
  'base_ready', true
) as payload;
$$;

comment on function public.director_report_fetch_summary_v1(uuid, date, date, uuid, text, text) is
'Summary payload with runtime-aligned unevaluated_ratio base.';

-- -----------------------------------------------------------------------------
-- H) Index blueprint (same spirit, plus company on issues)
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'warehouse_issues' and column_name = 'company_id'
  ) then
    execute 'create index if not exists idx_wh_issues_company_id on public.warehouse_issues (company_id)';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'warehouse_issues' and column_name = 'status'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'warehouse_issues' and column_name = 'iss_date'
  ) then
    execute 'create index if not exists idx_wh_issues_status_iss_date on public.warehouse_issues (status, iss_date)';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'warehouse_issues' and column_name = 'object_name'
  ) then
    execute 'create index if not exists idx_wh_issues_object_name on public.warehouse_issues (object_name)';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'warehouse_issue_items' and column_name = 'issue_id'
  ) then
    execute 'create index if not exists idx_wh_issue_items_issue_id on public.warehouse_issue_items (issue_id)';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'warehouse_issue_items' and column_name = 'request_item_id'
  ) then
    execute 'create index if not exists idx_wh_issue_items_request_item_id on public.warehouse_issue_items (request_item_id)';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'warehouse_issue_items' and column_name = 'rik_code'
  ) then
    execute 'create index if not exists idx_wh_issue_items_rik_code on public.warehouse_issue_items (rik_code)';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'request_items' and column_name = 'request_id'
  ) then
    execute 'create index if not exists idx_request_items_request_id on public.request_items (request_id)';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'requests' and column_name = 'company_id'
  ) then
    execute 'create index if not exists idx_requests_company_id on public.requests (company_id)';
  end if;
end$$;

commit;

