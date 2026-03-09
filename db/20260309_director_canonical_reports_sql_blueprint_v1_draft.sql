-- Director Canonical Reports SQL Blueprint v1 (DRAFT)
-- -----------------------------------------------------------------------------
-- IMPORTANT:
-- 1) This is a blueprint draft, not a forced migration.
-- 2) Preserve current production semantics; do not silently "improve" formulas.
-- 3) Keep existing fallback runtime path until canonical RPC availability is proven.
-- -----------------------------------------------------------------------------

begin;

-- -----------------------------------------------------------------------------
-- A) Helper CTE views for price semantics aligned to current runtime
-- -----------------------------------------------------------------------------
create or replace view public.v_director_price_by_request_item_v1 as
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

comment on view public.v_director_price_by_request_item_v1 is
'Weighted proposal price by request_item_id; mirrors current runtime price preference.';

create or replace view public.v_director_price_by_code_v1 as
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

comment on view public.v_director_price_by_code_v1 is
'Weighted proposal price by RIK code; runtime-compatible fallback price source.';

-- -----------------------------------------------------------------------------
-- B) Canonical base facts: works
-- -----------------------------------------------------------------------------
create or replace view public.v_director_work_facts_base as
with src as (
  select
    req.company_id::uuid as company_id,
    coalesce(wi.iss_date::date, req.created_at::date, current_date) as fact_date,
    req.object_id::uuid as object_id,
    coalesce(
      nullif(trim(req.object_name::text), ''),
      nullif(trim(wi.object_name::text), ''),
      nullif(trim(req.object::text), ''),
      'Без объекта'
    )::text as object_name,
    req.system_code::text as system_code,
    coalesce(
      nullif(trim(rs.name_human_ru::text), ''),
      nullif(trim(rs.display_name::text), ''),
      nullif(trim(rs.alias_ru::text), ''),
      nullif(trim(rs.name::text), ''),
      nullif(trim(req.system_code::text), '')
    )::text as system_name,
    req.level_code::text as level_code,
    coalesce(
      nullif(trim(rl.name_human_ru::text), ''),
      nullif(trim(rl.display_name::text), ''),
      nullif(trim(rl.name::text), ''),
      nullif(trim(req.level_code::text), '')
    )::text as level_name,
    req.zone_code::text as zone_code,
    coalesce(
      nullif(trim(rz.name_human_ru::text), ''),
      nullif(trim(rz.display_name::text), ''),
      nullif(trim(rz.name::text), ''),
      nullif(trim(req.zone_code::text), '')
    )::text as zone_name,
    coalesce(
      nullif(trim(ri.work_type_code::text), ''),
      nullif(trim(req.work_type_code::text), '')
    )::text as work_type_code,
    coalesce(
      nullif(trim(wi.work_name::text), ''),
      nullif(trim(rs.name_human_ru::text), ''),
      nullif(trim(req.system_code::text), ''),
      'Без вида работ'
    )::text as work_type_name,
    -- Current runtime discipline is effectively work/system label based.
    coalesce(
      nullif(trim(ri.work_type_code::text), ''),
      nullif(trim(req.work_type_code::text), ''),
      nullif(trim(wi.work_name::text), ''),
      nullif(trim(req.system_code::text), ''),
      'unknown'
    )::text as discipline_key,
    coalesce(
      nullif(trim(wi.work_name::text), ''),
      nullif(trim(rs.name_human_ru::text), ''),
      nullif(trim(req.system_code::text), ''),
      'Не определено'
    )::text as discipline_name,
    req.id::uuid as request_id,
    ri.id::uuid as request_item_id,
    wii.id::uuid as issue_item_id,
    null::uuid as material_id,
    coalesce(
      nullif(trim(cno.name_ru::text), ''),
      nullif(trim(vrr.name_ru::text), ''),
      upper(trim(coalesce(wii.rik_code::text, '')))
    )::text as material_name,
    coalesce(wii.qty, 0)::numeric as qty,
    coalesce(nullif(trim(wii.uom_id::text), ''), '')::text as uom,
    (wii.request_item_id is not null) as is_requested,
    (wii.request_item_id is null) as is_free,
    coalesce(
      coalesce(pri.unit_price, prc.unit_price, 0)::numeric * coalesce(wii.qty, 0)::numeric,
      0::numeric
    ) as issue_cost,
    -- Keep works purchase semantics conservative by default (matches current runtime path).
    0::numeric as purchase_cost
  from public.warehouse_issue_items wii
  join public.warehouse_issues wi
    on wi.id = wii.issue_id
  left join public.request_items ri
    on ri.id = wii.request_item_id
  left join public.requests req
    on req.id = coalesce(ri.request_id, wi.request_id)
  left join public.ref_systems rs
    on rs.code = req.system_code
  left join public.ref_levels rl
    on rl.code = req.level_code
  left join public.ref_zones rz
    on rz.code = req.zone_code
  left join public.catalog_name_overrides cno
    on upper(trim(cno.code::text)) = upper(trim(coalesce(wii.rik_code::text, '')))
  left join public.v_rik_names_ru vrr
    on upper(trim(vrr.code::text)) = upper(trim(coalesce(wii.rik_code::text, '')))
  left join public.v_director_price_by_request_item_v1 pri
    on pri.request_item_id = ri.id
  left join public.v_director_price_by_code_v1 prc
    on prc.rik_code = upper(trim(coalesce(wii.rik_code::text, '')))
  where wi.status = 'Подтверждено'
)
select
  company_id,
  fact_date,
  object_id,
  object_name,
  system_code,
  system_name,
  level_code,
  level_name,
  zone_code,
  zone_name,
  work_type_code,
  work_type_name,
  discipline_key,
  discipline_name,
  request_id,
  request_item_id,
  issue_item_id,
  material_id,
  material_name,
  qty,
  uom,
  is_requested,
  is_free,
  issue_cost,
  purchase_cost
from src
where company_id is not null;

comment on view public.v_director_work_facts_base is
'Canonical normalized work facts for Director reports. Preserves current requested/free and issue-cost semantics.';

-- -----------------------------------------------------------------------------
-- C) Canonical base facts: materials
-- -----------------------------------------------------------------------------
create or replace view public.v_director_material_facts_base as
with src as (
  select
    req.company_id::uuid as company_id,
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
    coalesce(
      nullif(trim(cno.name_ru::text), ''),
      nullif(trim(vrr.name_ru::text), ''),
      upper(trim(coalesce(wii.rik_code::text, '')))
    )::text as material_name,
    coalesce(nullif(trim(ci.group_name::text), ''), nullif(trim(ci.category_name::text), ''), 'Прочее')::text as material_group,
    coalesce(nullif(trim(wii.uom_id::text), ''), '')::text as uom,
    coalesce(wii.qty, 0)::numeric as issued_qty,
    coalesce(ri.purchase_qty, ri.qty, 0)::numeric as purchased_qty,
    -- Must be replaced with real warehouse balance source if available.
    0::numeric as stock_qty,
    coalesce(
      coalesce(pri.unit_price, prc.unit_price, 0)::numeric * coalesce(wii.qty, 0)::numeric,
      0::numeric
    ) as issue_cost,
    0::numeric as purchase_cost,
    req.id::uuid as request_id,
    wii.id::uuid as issue_item_id
  from public.warehouse_issue_items wii
  join public.warehouse_issues wi
    on wi.id = wii.issue_id
  left join public.request_items ri
    on ri.id = wii.request_item_id
  left join public.requests req
    on req.id = coalesce(ri.request_id, wi.request_id)
  left join public.catalog_items ci
    on upper(trim(ci.rik_code::text)) = upper(trim(coalesce(wii.rik_code::text, '')))
  left join public.catalog_name_overrides cno
    on upper(trim(cno.code::text)) = upper(trim(coalesce(wii.rik_code::text, '')))
  left join public.v_rik_names_ru vrr
    on upper(trim(vrr.code::text)) = upper(trim(coalesce(wii.rik_code::text, '')))
  left join public.v_director_price_by_request_item_v1 pri
    on pri.request_item_id = ri.id
  left join public.v_director_price_by_code_v1 prc
    on prc.rik_code = upper(trim(coalesce(wii.rik_code::text, '')))
  where wi.status = 'Подтверждено'
)
select
  company_id,
  fact_date,
  object_id,
  object_name,
  material_id,
  material_code,
  material_name,
  material_group,
  uom,
  issued_qty,
  purchased_qty,
  stock_qty,
  issue_cost,
  purchase_cost,
  request_id,
  issue_item_id
from src
where company_id is not null;

comment on view public.v_director_material_facts_base is
'Canonical normalized material facts for Director reports. stock_qty remains placeholder until ledger-linked source is approved.';

-- -----------------------------------------------------------------------------
-- D) RPC: Works
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
returns table (
  group_key text,
  group_label text,
  positions_count integer,
  requested_count integer,
  free_count integer,
  issue_cost_total numeric,
  purchase_cost_total numeric,
  unevaluated_ratio numeric,
  object_id uuid,
  object_name text
)
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
prepared as (
  select
    case
      when p_group_by = 'work_type' then coalesce(filtered.work_type_code, filtered.work_type_name, 'unknown')
      when p_group_by = 'object' then coalesce(filtered.object_id::text, lower(filtered.object_name), 'unknown')
      else coalesce(filtered.discipline_key, 'unknown')
    end as group_key,
    case
      when p_group_by = 'work_type' then coalesce(filtered.work_type_name, 'Не определено')
      when p_group_by = 'object' then coalesce(filtered.object_name, 'Без объекта')
      else coalesce(filtered.discipline_name, 'Не определено')
    end as group_label,
    filtered.object_id,
    filtered.object_name,
    filtered.is_requested,
    filtered.is_free,
    filtered.issue_cost,
    filtered.purchase_cost
  from filtered
)
select
  p.group_key,
  p.group_label,
  count(*)::integer as positions_count,
  count(*) filter (where p.is_requested)::integer as requested_count,
  count(*) filter (where p.is_free)::integer as free_count,
  case when p_include_costs then coalesce(sum(p.issue_cost), 0) else 0::numeric end as issue_cost_total,
  -- Keep current runtime semantics for works: purchase total not used as blocking metric.
  case when p_include_costs then 0::numeric else 0::numeric end as purchase_cost_total,
  case
    when count(*) = 0 then 0::numeric
    else round(
      (count(*) filter (where coalesce(p.issue_cost, 0) = 0)::numeric / count(*)::numeric),
      4
    )
  end as unevaluated_ratio,
  case when p_group_by = 'object' then min(p.object_id) else null::uuid end as object_id,
  case when p_group_by = 'object' then min(p.object_name) else null::text end as object_name
from prepared p
group by p.group_key, p.group_label
order by p.group_label asc;
$$;

comment on function public.director_report_fetch_works_v1(uuid, date, date, uuid, text, boolean, text, text) is
'Canonical works report table payload; preserves requested/free semantics and non-blocking purchase branch.';

-- -----------------------------------------------------------------------------
-- E) RPC: Materials
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
returns table (
  group_key text,
  group_label text,
  positions_count integer,
  issued_qty numeric,
  purchased_qty numeric,
  balance_qty numeric,
  issue_cost_total numeric,
  purchase_cost_total numeric,
  object_id uuid,
  object_name text
)
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
prepared as (
  select
    case
      when p_group_by = 'object' then coalesce(filtered.object_id::text, lower(filtered.object_name), 'unknown')
      when p_group_by = 'material' then coalesce(filtered.material_code, 'unknown')
      else coalesce(filtered.material_group, 'Прочее')
    end as group_key,
    case
      when p_group_by = 'object' then coalesce(filtered.object_name, 'Без объекта')
      when p_group_by = 'material' then coalesce(filtered.material_name, 'Без материала')
      else coalesce(filtered.material_group, 'Прочее')
    end as group_label,
    filtered.object_id,
    filtered.object_name,
    filtered.issued_qty,
    filtered.purchased_qty,
    filtered.stock_qty,
    filtered.issue_cost,
    filtered.purchase_cost
  from filtered
)
select
  p.group_key,
  p.group_label,
  count(*)::integer as positions_count,
  coalesce(sum(p.issued_qty), 0) as issued_qty,
  coalesce(sum(p.purchased_qty), 0) as purchased_qty,
  coalesce(sum(p.stock_qty), 0) as balance_qty,
  case when p_include_costs then coalesce(sum(p.issue_cost), 0) else 0::numeric end as issue_cost_total,
  case when p_include_costs then coalesce(sum(p.purchase_cost), 0) else 0::numeric end as purchase_cost_total,
  case when p_group_by = 'object' then min(p.object_id) else null::uuid end as object_id,
  case when p_group_by = 'object' then min(p.object_name) else null::text end as object_name
from prepared p
group by p.group_key, p.group_label
order by p.group_label asc;
$$;

comment on function public.director_report_fetch_materials_v1(uuid, date, date, uuid, text, boolean, text, text) is
'Canonical materials report table payload. Replace stock/purchase branches with approved ledger semantics when ready.';

-- -----------------------------------------------------------------------------
-- F) RPC: Summary
-- -----------------------------------------------------------------------------
create or replace function public.director_report_fetch_summary_v1(
  p_company_id uuid,
  p_from date,
  p_to date,
  p_object_id uuid default null,
  p_object_name text default null,
  p_mode text default null
)
returns table (
  issue_cost_total numeric,
  purchase_cost_total numeric,
  unevaluated_ratio numeric,
  base_ready boolean
)
language sql
stable
security definer
set search_path = public
as $$
with base as (
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
)
select
  coalesce(sum(base.issue_cost), 0)::numeric as issue_cost_total,
  0::numeric as purchase_cost_total,
  case
    when count(*) = 0 then 0::numeric
    else round((count(*) filter (where coalesce(base.issue_cost, 0) = 0)::numeric / count(*)::numeric), 4)
  end as unevaluated_ratio,
  true as base_ready
from base;
$$;

comment on function public.director_report_fetch_summary_v1(uuid, date, date, uuid, text, text) is
'Director summary over canonical works facts; conservative purchase branch preserved.';

-- -----------------------------------------------------------------------------
-- G) Index blueprint (safe conditional creation)
-- -----------------------------------------------------------------------------
do $$
begin
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

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'requests' and column_name = 'object_id'
  ) then
    execute 'create index if not exists idx_requests_object_id on public.requests (object_id)';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'requests' and column_name = 'system_code'
  ) then
    execute 'create index if not exists idx_requests_system_code on public.requests (system_code)';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'requests' and column_name = 'level_code'
  ) then
    execute 'create index if not exists idx_requests_level_code on public.requests (level_code)';
  end if;
end$$;

-- -----------------------------------------------------------------------------
-- H) Access notes
-- -----------------------------------------------------------------------------
-- grant select on public.v_director_work_facts_base to authenticated;
-- grant select on public.v_director_material_facts_base to authenticated;
-- grant execute on function public.director_report_fetch_works_v1(uuid, date, date, uuid, text, boolean, text, text) to authenticated;
-- grant execute on function public.director_report_fetch_materials_v1(uuid, date, date, uuid, text, boolean, text, text) to authenticated;
-- grant execute on function public.director_report_fetch_summary_v1(uuid, date, date, uuid, text, text) to authenticated;

commit;

