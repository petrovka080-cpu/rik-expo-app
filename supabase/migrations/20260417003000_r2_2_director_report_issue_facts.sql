begin;

create table if not exists public.director_report_issue_facts_v1 (
  issue_item_id text primary key,
  issue_id text not null,
  iss_date timestamptz not null,
  request_item_id text,
  request_id_resolved text,
  object_name_resolved text not null,
  work_type_name text not null,
  level_name_resolved text not null,
  system_name_resolved text,
  zone_name_resolved text,
  location_label text not null,
  rik_code text not null,
  uom text not null default '',
  qty numeric not null default 0,
  is_without_request boolean not null default false,
  material_name_resolved text not null,
  source_updated_at timestamptz,
  projected_at timestamptz not null default timezone('utc', now()),
  projection_version text not null default 'r2_2_issue_fact_v1'
);

create table if not exists public.director_report_issue_facts_meta_v1 (
  id boolean primary key default true check (id),
  projection_version text not null,
  rebuilt_at timestamptz not null,
  source_row_count bigint not null,
  source_high_water_mark timestamptz,
  projected_row_count bigint not null
);

create index if not exists director_report_issue_facts_v1_date_idx
  on public.director_report_issue_facts_v1 (iss_date);

create index if not exists director_report_issue_facts_v1_object_idx
  on public.director_report_issue_facts_v1 (object_name_resolved);

create index if not exists director_report_issue_facts_v1_rik_code_idx
  on public.director_report_issue_facts_v1 (rik_code);

create or replace function public.director_report_issue_facts_source_stats_v1()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'source_row_count', count(*)::bigint,
    'source_high_water_mark',
      max(
        greatest(
          coalesce(wi.iss_date, '-infinity'::timestamptz),
          coalesce(wi.created_at, '-infinity'::timestamptz),
          coalesce(wii.created_at, '-infinity'::timestamptz),
          coalesce(ri.updated_at, '-infinity'::timestamptz),
          coalesce(req.updated_at, '-infinity'::timestamptz)
        )
      )
  )
  from public.warehouse_issue_items wii
  join public.warehouse_issues wi
    on wi.id = wii.issue_id
  left join public.request_items ri
    on ri.id::text = wii.request_item_id::text
  left join public.requests req
    on req.id::text = coalesce(ri.request_id::text, wi.request_id::text)
  where wi.status = 'Подтверждено'
    and trim(coalesce(wii.rik_code::text, '')) <> '';
$$;

create or replace function public.director_report_issue_facts_raw_v1()
returns table (
  issue_item_id text,
  issue_id text,
  iss_date timestamptz,
  request_item_id text,
  request_id_resolved text,
  object_name_resolved text,
  work_type_name text,
  level_name_resolved text,
  system_name_resolved text,
  zone_name_resolved text,
  location_label text,
  rik_code text,
  uom text,
  qty numeric,
  is_without_request boolean,
  material_name_resolved text,
  source_updated_at timestamptz,
  projected_at timestamptz,
  projection_version text
)
language sql
stable
security definer
set search_path = public
set statement_timeout = '30s'
as $$
with cfg as (
  select
    'Без объекта'::text as without_object,
    'Без вида работ'::text as without_work,
    'Без этажа'::text as without_level
),
system_ref as (
  select distinct on (upper(trim(coalesce(code::text, ''))))
    upper(trim(coalesce(code::text, '')))::text as code,
    coalesce(
      nullif(trim(name_human_ru::text), ''),
      nullif(trim(display_name::text), ''),
      nullif(trim(alias_ru::text), ''),
      nullif(trim(name::text), '')
    )::text as system_name
  from public.ref_systems
  where trim(coalesce(code::text, '')) <> ''
  order by
    upper(trim(coalesce(code::text, ''))),
    nullif(trim(name_human_ru::text), '') desc nulls last,
    nullif(trim(display_name::text), '') desc nulls last,
    nullif(trim(alias_ru::text), '') desc nulls last,
    nullif(trim(name::text), '') desc nulls last
),
level_ref as (
  select distinct on (upper(trim(coalesce(code::text, ''))))
    upper(trim(coalesce(code::text, '')))::text as code,
    coalesce(
      nullif(trim(name_human_ru::text), ''),
      nullif(trim(display_name::text), ''),
      nullif(trim(name::text), '')
    )::text as level_name
  from public.ref_levels
  where trim(coalesce(code::text, '')) <> ''
  order by
    upper(trim(coalesce(code::text, ''))),
    nullif(trim(name_human_ru::text), '') desc nulls last,
    nullif(trim(display_name::text), '') desc nulls last,
    nullif(trim(name::text), '') desc nulls last
),
ledger_names as (
  select distinct on (upper(trim(coalesce(code::text, ''))))
    upper(trim(coalesce(code::text, '')))::text as code,
    nullif(trim(name::text), '')::text as name_ru
  from public.v_wh_balance_ledger_ui
  where trim(coalesce(code::text, '')) <> ''
  order by upper(trim(coalesce(code::text, '')))
),
rik_names as (
  select distinct on (upper(trim(coalesce(code::text, ''))))
    upper(trim(coalesce(code::text, '')))::text as code,
    nullif(trim(name_ru::text), '')::text as name_ru
  from public.v_rik_names_ru
  where trim(coalesce(code::text, '')) <> ''
  order by upper(trim(coalesce(code::text, '')))
),
override_names as (
  select distinct on (upper(trim(coalesce(code::text, ''))))
    upper(trim(coalesce(code::text, '')))::text as code,
    nullif(trim(name_ru::text), '')::text as name_ru
  from public.catalog_name_overrides
  where trim(coalesce(code::text, '')) <> ''
  order by upper(trim(coalesce(code::text, '')))
),
source_rows as (
  select
    wii.id::text as issue_item_id,
    wi.id::text as issue_id,
    wi.iss_date::timestamptz as iss_date,
    ri.request_id::text as request_id_from_item,
    wi.request_id::text as request_id_from_issue,
    nullif(trim(wii.request_item_id::text), '')::text as request_item_id,
    wi.note::text as issue_note,
    nullif(trim(wi.object_name::text), '')::text as issue_object_name,
    nullif(trim(wi.work_name::text), '')::text as issue_work_name,
    nullif(trim(req.system_code::text), '')::text as request_system_code,
    sr.system_name::text as request_system_name,
    nullif(trim(req.level_code::text), '')::text as request_level_code,
    lr.level_name::text as request_level_name,
    nullif(trim(req.zone_code::text), '')::text as request_zone_name,
    upper(trim(coalesce(wii.rik_code::text, '')))::text as rik_code,
    coalesce(nullif(trim(wii.uom_id::text), ''), '')::text as uom,
    coalesce(wii.qty, 0)::numeric as qty,
    greatest(
      coalesce(wi.iss_date, '-infinity'::timestamptz),
      coalesce(wi.created_at, '-infinity'::timestamptz),
      coalesce(wii.created_at, '-infinity'::timestamptz),
      coalesce(ri.updated_at, '-infinity'::timestamptz),
      coalesce(req.updated_at, '-infinity'::timestamptz)
    ) as source_updated_at
  from public.warehouse_issue_items wii
  join public.warehouse_issues wi
    on wi.id = wii.issue_id
  left join public.request_items ri
    on ri.id::text = wii.request_item_id::text
  left join public.requests req
    on req.id::text = coalesce(ri.request_id::text, wi.request_id::text)
  left join system_ref sr
    on sr.code = upper(trim(coalesce(req.system_code::text, '')))
  left join level_ref lr
    on lr.code = upper(trim(coalesce(req.level_code::text, '')))
  where wi.status = 'Подтверждено'
    and trim(coalesce(wii.rik_code::text, '')) <> ''
),
parsed as (
  select
    s.*,
    trim(regexp_replace(coalesce(substring(coalesce(s.issue_note, '') from '(?i)Объект:\s*([^\n\r]+)'), ''), '\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*$', '', 'i'))::text as free_object_name_raw,
    trim(regexp_replace(coalesce(substring(coalesce(s.issue_note, '') from '(?i)(?:Вид|Работа):\s*([^\n\r]+)'), ''), '\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*$', '', 'i'))::text as free_work_name_raw,
    trim(regexp_replace(coalesce(nullif(substring(coalesce(s.issue_note, '') from '(?i)Система:\s*([^\n\r]+)'), ''), substring(coalesce(s.issue_note, '') from '(?i)Контекст:\s*([^\n\r]+)')), '\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*$', '', 'i'))::text as free_system_name_raw,
    trim(regexp_replace(coalesce(substring(coalesce(s.issue_note, '') from '(?i)Зона:\s*([^\n\r]+)'), ''), '\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*$', '', 'i'))::text as free_zone_name_raw,
    trim(regexp_replace(coalesce(nullif(substring(coalesce(s.issue_note, '') from '(?i)Этаж:\s*([^\n\r]+)'), ''), substring(coalesce(s.issue_note, '') from '(?i)Уровень:\s*([^\n\r]+)')), '\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*$', '', 'i'))::text as free_level_name_raw
  from source_rows s
),
resolved as (
  select
    p.issue_item_id,
    p.issue_id,
    p.iss_date,
    p.request_item_id,
    p.rik_code,
    p.uom,
    p.qty,
    p.source_updated_at,
    case
      when nullif(trim(coalesce(p.issue_work_name, '')), '') is not null
        then nullif(trim(coalesce(p.request_id_from_issue, '')), '')
      else coalesce(nullif(trim(coalesce(p.request_id_from_item, '')), ''), nullif(trim(coalesce(p.request_id_from_issue, '')), ''))
    end as request_id_resolved,
    coalesce(nullif(trim(regexp_replace(trim(coalesce(p.issue_object_name, '')), '\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*$', '', 'i')), ''), cfg.without_object)::text as object_name_resolved,
    case
      when nullif(trim(coalesce(p.issue_work_name, '')), '') is null
        and coalesce(nullif(trim(coalesce(p.request_id_from_item, '')), ''), nullif(trim(coalesce(p.request_id_from_issue, '')), '')) is not null
        then coalesce(nullif(trim(regexp_replace(regexp_replace(coalesce(nullif(trim(coalesce(p.request_system_name, '')), ''), nullif(trim(coalesce(p.request_system_code, '')), '')), '\s+', ' ', 'g'), '\s*/\s*', ' / ', 'g')), ''), cfg.without_work)
      else coalesce(nullif(trim(regexp_replace(regexp_replace(coalesce(nullif(trim(coalesce(p.issue_work_name, '')), ''), nullif(trim(coalesce(p.free_work_name_raw, '')), '')), '\s+', ' ', 'g'), '\s*/\s*', ' / ', 'g')), ''), cfg.without_work)
    end::text as work_type_name,
    case
      when nullif(trim(coalesce(p.issue_work_name, '')), '') is null
        and coalesce(nullif(trim(coalesce(p.request_id_from_item, '')), ''), nullif(trim(coalesce(p.request_id_from_issue, '')), '')) is not null
        then coalesce(nullif(trim(regexp_replace(regexp_replace(coalesce(nullif(trim(coalesce(p.request_level_name, '')), ''), nullif(trim(coalesce(p.request_level_code, '')), '')), '\s+', ' ', 'g'), '\s*/\s*', ' / ', 'g')), ''), cfg.without_level)
      when nullif(trim(coalesce(p.issue_work_name, '')), '') is not null
        then cfg.without_level
      else coalesce(nullif(trim(regexp_replace(regexp_replace(coalesce(nullif(trim(coalesce(p.free_level_name_raw, '')), ''), cfg.without_level), '\s+', ' ', 'g'), '\s*/\s*', ' / ', 'g')), ''), cfg.without_level)
    end::text as level_name_resolved,
    case
      when nullif(trim(coalesce(p.issue_work_name, '')), '') is null
        and coalesce(nullif(trim(coalesce(p.request_id_from_item, '')), ''), nullif(trim(coalesce(p.request_id_from_issue, '')), '')) is not null
        then coalesce(nullif(trim(coalesce(p.request_system_name, '')), ''), nullif(trim(coalesce(p.request_system_code, '')), ''))
      else nullif(trim(coalesce(p.free_system_name_raw, '')), '')
    end::text as system_name_resolved,
    case
      when nullif(trim(coalesce(p.issue_work_name, '')), '') is null
        and coalesce(nullif(trim(coalesce(p.request_id_from_item, '')), ''), nullif(trim(coalesce(p.request_id_from_issue, '')), '')) is not null
        then nullif(trim(coalesce(p.request_zone_name, '')), '')
      else nullif(trim(coalesce(p.free_zone_name_raw, '')), '')
    end::text as zone_name_resolved,
    case
      when nullif(trim(coalesce(p.issue_work_name, '')), '') is null
        and coalesce(nullif(trim(coalesce(p.request_id_from_item, '')), ''), nullif(trim(coalesce(p.request_id_from_issue, '')), '')) is not null
        then false
      else p.request_item_id is null
    end as is_without_request
  from parsed p
  cross join cfg
),
filtered as (
  select
    r.*,
    case
      when trim(concat_ws(' / ', r.object_name_resolved, case when r.level_name_resolved = cfg.without_level then null else r.level_name_resolved end, r.system_name_resolved, r.zone_name_resolved)) <> ''
        then trim(concat_ws(' / ', r.object_name_resolved, case when r.level_name_resolved = cfg.without_level then null else r.level_name_resolved end, r.system_name_resolved, r.zone_name_resolved))
      else r.object_name_resolved
    end::text as location_label
  from resolved r
  cross join cfg
),
named as (
  select
    f.issue_item_id,
    f.issue_id,
    f.iss_date,
    f.request_item_id,
    f.request_id_resolved,
    f.object_name_resolved,
    f.work_type_name,
    f.level_name_resolved,
    f.system_name_resolved,
    f.zone_name_resolved,
    f.location_label,
    f.rik_code,
    f.uom,
    f.qty,
    f.is_without_request,
    coalesce(nullif(trim(coalesce(onm.name_ru, '')), ''), nullif(trim(coalesce(rnm.name_ru, '')), ''), nullif(trim(coalesce(lnm.name_ru, '')), ''), f.rik_code)::text as material_name_resolved,
    f.source_updated_at,
    timezone('utc', now()) as projected_at,
    'r2_2_issue_fact_v1'::text as projection_version
  from filtered f
  left join override_names onm
    on onm.code = f.rik_code
  left join rik_names rnm
    on rnm.code = f.rik_code
  left join ledger_names lnm
    on lnm.code = f.rik_code
)
select * from named;
$$;

create or replace function public.director_report_issue_facts_rebuild_v1()
returns jsonb
language plpgsql
security definer
set search_path = public
set statement_timeout = '30s'
as $$
declare
  v_stats jsonb;
  v_projected_count bigint;
  v_now timestamptz := timezone('utc', now());
begin
  delete from public.director_report_issue_facts_v1;

  insert into public.director_report_issue_facts_v1 (
    issue_item_id,
    issue_id,
    iss_date,
    request_item_id,
    request_id_resolved,
    object_name_resolved,
    work_type_name,
    level_name_resolved,
    system_name_resolved,
    zone_name_resolved,
    location_label,
    rik_code,
    uom,
    qty,
    is_without_request,
    material_name_resolved,
    source_updated_at,
    projected_at,
    projection_version
  )
  select
    f.issue_item_id,
    f.issue_id,
    f.iss_date,
    f.request_item_id,
    f.request_id_resolved,
    f.object_name_resolved,
    f.work_type_name,
    f.level_name_resolved,
    f.system_name_resolved,
    f.zone_name_resolved,
    f.location_label,
    f.rik_code,
    f.uom,
    f.qty,
    f.is_without_request,
    f.material_name_resolved,
    f.source_updated_at,
    v_now,
    'r2_2_issue_fact_v1'
  from public.director_report_issue_facts_raw_v1() f;

  get diagnostics v_projected_count = row_count;
  v_stats := public.director_report_issue_facts_source_stats_v1();

  insert into public.director_report_issue_facts_meta_v1 (
    id,
    projection_version,
    rebuilt_at,
    source_row_count,
    source_high_water_mark,
    projected_row_count
  )
  values (
    true,
    'r2_2_issue_fact_v1',
    v_now,
    coalesce((v_stats ->> 'source_row_count')::bigint, 0),
    nullif(v_stats ->> 'source_high_water_mark', '')::timestamptz,
    v_projected_count
  )
  on conflict (id) do update set
    projection_version = excluded.projection_version,
    rebuilt_at = excluded.rebuilt_at,
    source_row_count = excluded.source_row_count,
    source_high_water_mark = excluded.source_high_water_mark,
    projected_row_count = excluded.projected_row_count;

  return jsonb_build_object(
    'projection_version', 'r2_2_issue_fact_v1',
    'rebuilt_at', v_now,
    'projected_row_count', v_projected_count,
    'source_row_count', coalesce((v_stats ->> 'source_row_count')::bigint, 0),
    'source_high_water_mark', v_stats ->> 'source_high_water_mark'
  );
end;
$$;

create or replace function public.director_report_issue_facts_freshness_v1()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with stats as (
  select public.director_report_issue_facts_source_stats_v1() as value
),
meta as (
  select *
  from public.director_report_issue_facts_meta_v1
  where id
),
projected as (
  select count(*)::bigint as row_count
  from public.director_report_issue_facts_v1
)
select jsonb_build_object(
  'projection_version', (select projection_version from meta),
  'rebuilt_at', (select rebuilt_at from meta),
  'source_row_count', coalesce((select (value ->> 'source_row_count')::bigint from stats), 0),
  'source_high_water_mark', (select nullif(value ->> 'source_high_water_mark', '')::timestamptz from stats),
  'meta_source_row_count', (select source_row_count from meta),
  'meta_source_high_water_mark', (select source_high_water_mark from meta),
  'projected_row_count', (select row_count from projected),
  'meta_projected_row_count', (select projected_row_count from meta),
  'is_fresh',
    coalesce((
      select
        m.projection_version = 'r2_2_issue_fact_v1'
        and m.source_row_count = coalesce((stats.value ->> 'source_row_count')::bigint, 0)
        and m.source_high_water_mark is not distinct from nullif(stats.value ->> 'source_high_water_mark', '')::timestamptz
        and m.projected_row_count = projected.row_count
      from meta m
      cross join stats
      cross join projected
    ), false)
);
$$;

create or replace function public.director_report_issue_facts_scope_v1(
  p_from date default null,
  p_to date default null,
  p_object_name text default null
)
returns table (
  issue_item_id text,
  issue_id text,
  iss_date timestamptz,
  request_item_id text,
  request_id_resolved text,
  object_name_resolved text,
  work_type_name text,
  level_name_resolved text,
  system_name_resolved text,
  zone_name_resolved text,
  location_label text,
  rik_code text,
  uom text,
  qty numeric,
  is_without_request boolean,
  material_name_resolved text,
  source_updated_at timestamptz,
  projected_at timestamptz,
  projection_version text
)
language plpgsql
stable
security definer
set search_path = public
set statement_timeout = '30s'
as $$
declare
  v_fresh boolean;
  v_target_object_name text;
begin
  select coalesce((public.director_report_issue_facts_freshness_v1() ->> 'is_fresh')::boolean, false)
  into v_fresh;

  v_target_object_name := case
    when nullif(trim(coalesce(p_object_name, '')), '') is null then null::text
    else trim(
      regexp_replace(
        trim(coalesce(p_object_name, '')),
        '\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*$',
        '',
        'i'
      )
    )::text
  end;

  if v_fresh then
    return query
    select
      f.issue_item_id,
      f.issue_id,
      f.iss_date,
      f.request_item_id,
      f.request_id_resolved,
      f.object_name_resolved,
      f.work_type_name,
      f.level_name_resolved,
      f.system_name_resolved,
      f.zone_name_resolved,
      f.location_label,
      f.rik_code,
      f.uom,
      f.qty,
      f.is_without_request,
      f.material_name_resolved,
      f.source_updated_at,
      f.projected_at,
      f.projection_version
    from public.director_report_issue_facts_v1 f
    where (p_from is null or f.iss_date::date >= p_from)
      and (p_to is null or f.iss_date::date <= p_to)
      and (v_target_object_name is null or f.object_name_resolved = v_target_object_name);
  else
    return query
    select
      f.issue_item_id,
      f.issue_id,
      f.iss_date,
      f.request_item_id,
      f.request_id_resolved,
      f.object_name_resolved,
      f.work_type_name,
      f.level_name_resolved,
      f.system_name_resolved,
      f.zone_name_resolved,
      f.location_label,
      f.rik_code,
      f.uom,
      f.qty,
      f.is_without_request,
      f.material_name_resolved,
      f.source_updated_at,
      f.projected_at,
      'raw_fallback:r2_2_issue_fact_v1'::text as projection_version
    from public.director_report_issue_facts_raw_v1() f
    where (p_from is null or f.iss_date::date >= p_from)
      and (p_to is null or f.iss_date::date <= p_to)
      and (v_target_object_name is null or f.object_name_resolved = v_target_object_name);
  end if;
end;
$$;

select public.director_report_issue_facts_rebuild_v1();

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
set statement_timeout = '30s'
as $$
with cfg as (
  select
    'Без вида работ'::text as without_work,
    'Без этажа'::text as without_level
),
fact_rows as (
  select *
  from public.director_report_issue_facts_scope_v1(
    p_from => p_from,
    p_to => p_to,
    p_object_name => p_object_name
  )
),
price_scope as (
  select *
  from public.director_report_fetch_issue_price_scope_v1(
    case when p_include_costs then (
      select array_agg(distinct f.request_item_id order by f.request_item_id)
      from fact_rows f
      where f.request_item_id is not null
    ) else '{}'::text[] end,
    case when p_include_costs then (
      select array_agg(distinct f.rik_code order by f.rik_code)
      from fact_rows f
      where f.rik_code <> ''
    ) else '{}'::text[] end,
    false
  )
  where p_include_costs
),
request_item_prices as (
  select
    ps.request_item_id,
    max(ps.unit_price)::numeric as unit_price
  from price_scope ps
  where ps.request_item_id is not null
  group by ps.request_item_id
),
code_prices as (
  select
    ps.rik_code,
    max(ps.unit_price)::numeric as unit_price
  from price_scope ps
  where ps.rik_code is not null
  group by ps.rik_code
),
named as (
  select
    f.issue_id,
    f.issue_item_id,
    f.request_item_id,
    f.request_id_resolved,
    f.object_name_resolved,
    f.work_type_name,
    f.level_name_resolved,
    f.system_name_resolved,
    f.zone_name_resolved,
    f.location_label,
    f.uom,
    f.qty,
    f.is_without_request,
    f.rik_code,
    f.material_name_resolved,
    case
      when p_include_costs then coalesce(rip.unit_price, cp.unit_price, 0)::numeric
      else 0::numeric
    end as unit_price,
    case
      when p_include_costs then f.qty * coalesce(rip.unit_price, cp.unit_price, 0)::numeric
      else 0::numeric
    end as amount_sum
  from fact_rows f
  left join request_item_prices rip
    on rip.request_item_id = f.request_item_id
  left join code_prices cp
    on cp.rik_code = f.rik_code
),
materials_agg as (
  select
    n.work_type_name,
    n.object_name_resolved,
    n.level_name_resolved,
    n.system_name_resolved,
    n.zone_name_resolved,
    n.location_label,
    n.material_name_resolved,
    n.rik_code,
    n.uom,
    coalesce(sum(n.qty), 0)::numeric as qty_sum,
    count(distinct n.issue_id)::bigint as docs_count,
    coalesce(sum(n.amount_sum), 0)::numeric as amount_sum,
    array_agg(distinct n.issue_id order by n.issue_id) as source_issue_ids,
    array_agg(distinct n.request_item_id order by n.request_item_id)
      filter (where n.request_item_id is not null) as source_request_item_ids
  from named n
  group by
    n.work_type_name,
    n.object_name_resolved,
    n.level_name_resolved,
    n.system_name_resolved,
    n.zone_name_resolved,
    n.location_label,
    n.material_name_resolved,
    n.rik_code,
    n.uom
),
levels_agg as (
  select
    n.work_type_name,
    n.object_name_resolved,
    n.level_name_resolved,
    n.system_name_resolved,
    n.zone_name_resolved,
    n.location_label,
    coalesce(sum(n.qty), 0)::numeric as total_qty,
    count(distinct n.issue_id)::bigint as total_docs,
    count(*)::bigint as total_positions,
    count(*) filter (where not n.is_without_request)::bigint as req_positions,
    count(*) filter (where n.is_without_request)::bigint as free_positions,
    array_agg(distinct n.issue_id order by n.issue_id) as source_issue_ids,
    array_agg(distinct n.request_item_id order by n.request_item_id)
      filter (where n.request_item_id is not null) as source_request_item_ids
  from named n
  group by
    n.work_type_name,
    n.object_name_resolved,
    n.level_name_resolved,
    n.system_name_resolved,
    n.zone_name_resolved,
    n.location_label
),
works_agg as (
  select
    n.work_type_name,
    coalesce(sum(n.qty), 0)::numeric as total_qty,
    count(distinct n.issue_id)::bigint as total_docs,
    count(*)::bigint as total_positions,
    count(*) filter (where not n.is_without_request)::bigint as req_positions,
    count(*) filter (where n.is_without_request)::bigint as free_positions,
    count(distinct n.location_label)::bigint as location_count
  from named n
  group by n.work_type_name
),
summary_agg as (
  select
    coalesce(sum(n.qty), 0)::numeric as total_qty,
    count(distinct n.issue_id)::bigint as total_docs,
    count(*)::bigint as total_positions,
    coalesce(
      sum(
        case
          when lower(n.work_type_name) like lower(cfg.without_work) || '%' then n.qty
          else 0::numeric
        end
      ),
      0::numeric
    )::numeric as qty_without_work,
    coalesce(
      sum(
        case
          when n.level_name_resolved = cfg.without_level then n.qty
          else 0::numeric
        end
      ),
      0::numeric
    )::numeric as qty_without_level,
    count(*) filter (where n.is_without_request)::bigint as positions_without_request,
    coalesce(sum(n.amount_sum), 0)::numeric as issue_cost_total,
    count(*) filter (where n.qty > 0 and coalesce(n.rik_code, '') <> '')::bigint as priced_base_positions,
    count(*) filter (where n.qty > 0 and coalesce(n.rik_code, '') <> '' and coalesce(n.unit_price, 0) <= 0)::bigint as unpriced_issue_positions
  from named n
  cross join cfg
)
select jsonb_build_object(
  'summary',
    jsonb_build_object(
      'total_qty', coalesce((select s.total_qty from summary_agg s), 0),
      'total_docs', coalesce((select s.total_docs from summary_agg s), 0),
      'total_positions', coalesce((select s.total_positions from summary_agg s), 0),
      'pct_without_work',
        case
          when coalesce((select s.total_qty from summary_agg s), 0) > 0
            then round((coalesce((select s.qty_without_work from summary_agg s), 0) * 10000.0) / (select s.total_qty from summary_agg s)) / 100.0
          else 0
        end,
      'pct_without_level',
        case
          when coalesce((select s.total_qty from summary_agg s), 0) > 0
            then round((coalesce((select s.qty_without_level from summary_agg s), 0) * 10000.0) / (select s.total_qty from summary_agg s)) / 100.0
          else 0
        end,
      'pct_without_request',
        case
          when coalesce((select s.total_positions from summary_agg s), 0) > 0
            then round((coalesce((select s.positions_without_request from summary_agg s), 0) * 10000.0) / (select s.total_positions from summary_agg s)) / 100.0
          else 0
        end,
      'issue_cost_total', case when p_include_costs then coalesce((select s.issue_cost_total from summary_agg s), 0) else 0 end,
      'purchase_cost_total', 0,
      'issue_to_purchase_pct', 0,
      'unpriced_issue_pct',
        case
          when p_include_costs and coalesce((select s.priced_base_positions from summary_agg s), 0) > 0
            then round((coalesce((select s.unpriced_issue_positions from summary_agg s), 0) * 10000.0) / (select s.priced_base_positions from summary_agg s)) / 100.0
          else 0
        end
    ),
  'works',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', w.work_type_name,
          'work_type_name', w.work_type_name,
          'total_qty', w.total_qty,
          'total_docs', w.total_docs,
          'total_positions', w.total_positions,
          'share_total_pct',
            case
              when coalesce((select s.total_qty from summary_agg s), 0) > 0
                then round((w.total_qty * 10000.0) / (select s.total_qty from summary_agg s)) / 100.0
              else 0
            end,
          'req_positions', w.req_positions,
          'free_positions', w.free_positions,
          'location_count', w.location_count,
          'levels',
            coalesce((
              select jsonb_agg(
                jsonb_build_object(
                  'id', (l.work_type_name || '::' || l.location_label),
                  'level_name', l.level_name_resolved,
                  'object_name', l.object_name_resolved,
                  'system_name', l.system_name_resolved,
                  'zone_name', l.zone_name_resolved,
                  'location_label', l.location_label,
                  'total_qty', l.total_qty,
                  'total_docs', l.total_docs,
                  'total_positions', l.total_positions,
                  'share_in_work_pct',
                    case
                      when w.total_qty > 0
                        then round((l.total_qty * 10000.0) / w.total_qty) / 100.0
                      else 0
                    end,
                  'req_positions', l.req_positions,
                  'free_positions', l.free_positions,
                  'source_issue_ids', to_jsonb(coalesce(l.source_issue_ids, array[]::text[])),
                  'source_request_item_ids', to_jsonb(coalesce(l.source_request_item_ids, array[]::text[])),
                  'materials',
                    coalesce((
                      select jsonb_agg(
                        jsonb_build_object(
                          'material_name', m.material_name_resolved,
                          'rik_code', m.rik_code,
                          'uom', m.uom,
                          'qty_sum', m.qty_sum,
                          'docs_count', m.docs_count,
                          'unit_price',
                            case
                              when p_include_costs and m.qty_sum > 0 then m.amount_sum / m.qty_sum
                              else 0
                            end,
                          'amount_sum', case when p_include_costs then m.amount_sum else 0 end,
                          'source_issue_ids', to_jsonb(coalesce(m.source_issue_ids, array[]::text[])),
                          'source_request_item_ids', to_jsonb(coalesce(m.source_request_item_ids, array[]::text[]))
                        )
                        order by
                          case when p_include_costs then m.amount_sum else 0 end desc,
                          m.qty_sum desc,
                          m.material_name_resolved asc
                      )
                      from materials_agg m
                      where m.work_type_name = l.work_type_name
                        and m.object_name_resolved = l.object_name_resolved
                        and m.level_name_resolved = l.level_name_resolved
                        and coalesce(m.system_name_resolved, '') = coalesce(l.system_name_resolved, '')
                        and coalesce(m.zone_name_resolved, '') = coalesce(l.zone_name_resolved, '')
                        and m.location_label = l.location_label
                    ), '[]'::jsonb)
                )
                order by
                  l.total_qty desc,
                  l.total_positions desc,
                  l.location_label asc
              )
              from levels_agg l
              where l.work_type_name = w.work_type_name
            ), '[]'::jsonb)
        )
        order by
          w.total_qty desc,
          w.total_positions desc,
          w.work_type_name asc
      )
      from works_agg w
    ), '[]'::jsonb)
);
$$;

comment on table public.director_report_issue_facts_v1 is
'R2.2 derived normalized issue facts for Director works reports. Source-of-truth remains warehouse issue/request/naming tables.';

comment on table public.director_report_issue_facts_meta_v1 is
'R2.2 rebuild/freshness metadata for Director normalized issue facts.';

comment on function public.director_report_issue_facts_raw_v1() is
'R2.2 raw fallback normalization for Director issue facts. Mirrors director_report_fetch_works_v1 row semantics.';

comment on function public.director_report_issue_facts_rebuild_v1() is
'R2.2 rebuilds derived Director issue facts from authoritative warehouse issue/request/naming sources.';

comment on function public.director_report_issue_facts_freshness_v1() is
'R2.2 freshness/readiness proof for derived Director issue facts.';

comment on function public.director_report_issue_facts_scope_v1(date, date, text) is
'R2.2 fact scope for Director works report. Uses normalized projection when fresh and raw fallback when stale.';

comment on function public.director_report_fetch_works_v1(date, date, text, boolean) is
'Canonical works payload for director reports. R2.2 reads normalized issue facts with raw fallback; report contract and cost semantics preserved.';

grant select on public.director_report_issue_facts_v1 to authenticated;
grant select on public.director_report_issue_facts_meta_v1 to authenticated;
grant execute on function public.director_report_issue_facts_source_stats_v1() to authenticated;
grant execute on function public.director_report_issue_facts_raw_v1() to authenticated;
grant execute on function public.director_report_issue_facts_rebuild_v1() to authenticated;
grant execute on function public.director_report_issue_facts_freshness_v1() to authenticated;
grant execute on function public.director_report_issue_facts_scope_v1(date, date, text) to authenticated;
grant execute on function public.director_report_fetch_works_v1(date, date, text, boolean) to authenticated;

notify pgrst, 'reload schema';

commit;
