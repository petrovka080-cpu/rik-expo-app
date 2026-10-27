begin;

alter table public.director_report_issue_facts_meta_v1
  add column if not exists last_rebuild_started_at timestamptz,
  add column if not exists last_rebuild_finished_at timestamptz,
  add column if not exists last_rebuild_duration_ms integer,
  add column if not exists last_rebuild_status text,
  add column if not exists last_rebuild_error text;

create table if not exists public.director_report_issue_facts_runtime_metrics_v1 (
  id bigserial primary key,
  recorded_at timestamptz not null default timezone('utc', now()),
  event_name text not null,
  selected_source text not null,
  fallback_reason text not null,
  is_fresh boolean not null,
  projection_version text,
  source_row_count bigint,
  projected_row_count bigint,
  meta_source_row_count bigint,
  meta_projected_row_count bigint,
  source_high_water_mark timestamptz,
  meta_source_high_water_mark timestamptz,
  last_rebuild_started_at timestamptz,
  last_rebuild_finished_at timestamptz,
  last_rebuild_duration_ms integer,
  last_rebuild_status text,
  last_rebuild_error text
);

create index if not exists director_report_issue_facts_runtime_metrics_recorded_idx
  on public.director_report_issue_facts_runtime_metrics_v1 (recorded_at desc);

create index if not exists director_report_issue_facts_runtime_metrics_reason_idx
  on public.director_report_issue_facts_runtime_metrics_v1 (fallback_reason, recorded_at desc);

create or replace function public.director_report_issue_facts_scope_status_v1()
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
),
signals as (
  select
    (select projection_version from meta) as projection_version,
    'r2_2_issue_fact_v1'::text as expected_projection_version,
    (select rebuilt_at from meta) as rebuilt_at,
    (select last_rebuild_started_at from meta) as last_rebuild_started_at,
    (select last_rebuild_finished_at from meta) as last_rebuild_finished_at,
    (select last_rebuild_duration_ms from meta) as last_rebuild_duration_ms,
    (select last_rebuild_status from meta) as last_rebuild_status,
    (select last_rebuild_error from meta) as last_rebuild_error,
    coalesce((select (value ->> 'source_row_count')::bigint from stats), 0) as source_row_count,
    (select nullif(value ->> 'source_high_water_mark', '')::timestamptz from stats) as source_high_water_mark,
    (select source_row_count from meta) as meta_source_row_count,
    (select source_high_water_mark from meta) as meta_source_high_water_mark,
    (select row_count from projected) as projected_row_count,
    (select projected_row_count from meta) as meta_projected_row_count
),
classified as (
  select
    *,
    case
      when projection_version is null then 'missing_projection'
      when projection_version <> expected_projection_version then 'version_mismatch'
      when coalesce(projected_row_count, 0) = 0 and coalesce(source_row_count, 0) > 0 then 'missing_projection'
      when meta_projected_row_count is distinct from projected_row_count then 'rebuild_incomplete'
      when meta_source_row_count is distinct from source_row_count
        or meta_source_high_water_mark is distinct from source_high_water_mark then 'stale_projection'
      else 'fresh_projection'
    end as fallback_reason
  from signals
)
select jsonb_build_object(
  'is_fresh', fallback_reason = 'fresh_projection',
  'selected_source', case when fallback_reason = 'fresh_projection' then 'projection' else 'raw_fallback' end,
  'fallback_reason', fallback_reason,
  'projection_version', projection_version,
  'expected_projection_version', expected_projection_version,
  'rebuilt_at', rebuilt_at,
  'projection_age_ms',
    case
      when rebuilt_at is null then null
      else greatest(0, floor(extract(epoch from (timezone('utc', now()) - rebuilt_at)) * 1000))::bigint
    end,
  'source_row_count', source_row_count,
  'projected_row_count', projected_row_count,
  'meta_source_row_count', meta_source_row_count,
  'meta_projected_row_count', meta_projected_row_count,
  'source_high_water_mark', source_high_water_mark,
  'meta_source_high_water_mark', meta_source_high_water_mark,
  'last_rebuild_started_at', last_rebuild_started_at,
  'last_rebuild_finished_at', last_rebuild_finished_at,
  'last_rebuild_duration_ms', last_rebuild_duration_ms,
  'last_rebuild_status', last_rebuild_status,
  'last_rebuild_error', last_rebuild_error
)
from classified;
$$;

create or replace function public.director_report_issue_facts_drift_v1(
  p_from date default null,
  p_to date default null,
  p_object_name text default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
set statement_timeout = '30s'
as $$
with target as (
  select case
    when nullif(trim(coalesce(p_object_name, '')), '') is null then null::text
    else trim(
      regexp_replace(
        trim(coalesce(p_object_name, '')),
        '\s*(?:·|•|\|)\s*(?:Контекст|Система|Зона|Вид|Этаж|Оси)\s*:.*$',
        '',
        'i'
      )
    )::text
  end as object_name
),
projected as (
  select
    issue_item_id,
    issue_id,
    iss_date,
    request_item_id,
    request_id_resolved,
    object_name_resolved,
    work_type_name,
    level_name_resolved,
    coalesce(system_name_resolved, '') as system_name_resolved,
    coalesce(zone_name_resolved, '') as zone_name_resolved,
    location_label,
    rik_code,
    uom,
    qty,
    is_without_request,
    material_name_resolved
  from public.director_report_issue_facts_v1 f
  cross join target t
  where (p_from is null or f.iss_date::date >= p_from)
    and (p_to is null or f.iss_date::date <= p_to)
    and (t.object_name is null or f.object_name_resolved = t.object_name)
),
raw as (
  select
    issue_item_id,
    issue_id,
    iss_date,
    request_item_id,
    request_id_resolved,
    object_name_resolved,
    work_type_name,
    level_name_resolved,
    coalesce(system_name_resolved, '') as system_name_resolved,
    coalesce(zone_name_resolved, '') as zone_name_resolved,
    location_label,
    rik_code,
    uom,
    qty,
    is_without_request,
    material_name_resolved
  from public.director_report_issue_facts_raw_v1() f
  cross join target t
  where (p_from is null or f.iss_date::date >= p_from)
    and (p_to is null or f.iss_date::date <= p_to)
    and (t.object_name is null or f.object_name_resolved = t.object_name)
),
projected_minus_raw as (
  select * from projected
  except
  select * from raw
),
raw_minus_projected as (
  select * from raw
  except
  select * from projected
),
counts as (
  select
    (select count(*)::bigint from projected) as projected_row_count,
    (select count(*)::bigint from raw) as raw_row_count,
    (select count(*)::bigint from projected_minus_raw) as projected_minus_raw_count,
    (select count(*)::bigint from raw_minus_projected) as raw_minus_projected_count
)
select jsonb_build_object(
  'projection_version', 'r2_2_issue_fact_v1',
  'projected_row_count', projected_row_count,
  'raw_row_count', raw_row_count,
  'projected_minus_raw_count', projected_minus_raw_count,
  'raw_minus_projected_count', raw_minus_projected_count,
  'diff_count', projected_minus_raw_count + raw_minus_projected_count,
  'is_drift_free', projected_minus_raw_count = 0 and raw_minus_projected_count = 0,
  'checked_at', timezone('utc', now()),
  'filters', jsonb_build_object(
    'from', p_from,
    'to', p_to,
    'object_name', (select object_name from target)
  )
)
from counts;
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
  v_started_at timestamptz := timezone('utc', now());
  v_finished_at timestamptz;
  v_duration_ms integer;
begin
  insert into public.director_report_issue_facts_meta_v1 (
    id,
    projection_version,
    rebuilt_at,
    source_row_count,
    source_high_water_mark,
    projected_row_count,
    last_rebuild_started_at,
    last_rebuild_status,
    last_rebuild_error
  )
  values (
    true,
    'r2_2_issue_fact_v1',
    v_started_at,
    0,
    null,
    0,
    v_started_at,
    'started',
    null
  )
  on conflict (id) do update set
    last_rebuild_started_at = excluded.last_rebuild_started_at,
    last_rebuild_status = 'started',
    last_rebuild_error = null;

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
      v_started_at,
      'r2_2_issue_fact_v1'
    from public.director_report_issue_facts_raw_v1() f;

    get diagnostics v_projected_count = row_count;
    v_stats := public.director_report_issue_facts_source_stats_v1();
    v_finished_at := timezone('utc', now());
    v_duration_ms := greatest(0, floor(extract(epoch from (v_finished_at - v_started_at)) * 1000))::integer;

    insert into public.director_report_issue_facts_meta_v1 (
      id,
      projection_version,
      rebuilt_at,
      source_row_count,
      source_high_water_mark,
      projected_row_count,
      last_rebuild_started_at,
      last_rebuild_finished_at,
      last_rebuild_duration_ms,
      last_rebuild_status,
      last_rebuild_error
    )
    values (
      true,
      'r2_2_issue_fact_v1',
      v_finished_at,
      coalesce((v_stats ->> 'source_row_count')::bigint, 0),
      nullif(v_stats ->> 'source_high_water_mark', '')::timestamptz,
      v_projected_count,
      v_started_at,
      v_finished_at,
      v_duration_ms,
      'success',
      null
    )
    on conflict (id) do update set
      projection_version = excluded.projection_version,
      rebuilt_at = excluded.rebuilt_at,
      source_row_count = excluded.source_row_count,
      source_high_water_mark = excluded.source_high_water_mark,
      projected_row_count = excluded.projected_row_count,
      last_rebuild_started_at = excluded.last_rebuild_started_at,
      last_rebuild_finished_at = excluded.last_rebuild_finished_at,
      last_rebuild_duration_ms = excluded.last_rebuild_duration_ms,
      last_rebuild_status = excluded.last_rebuild_status,
      last_rebuild_error = null;

    return jsonb_build_object(
      'projection_version', 'r2_2_issue_fact_v1',
      'status', 'success',
      'rebuild_started_at', v_started_at,
      'rebuild_finished_at', v_finished_at,
      'rebuild_duration_ms', v_duration_ms,
      'projected_row_count', v_projected_count,
      'source_row_count', coalesce((v_stats ->> 'source_row_count')::bigint, 0),
      'source_high_water_mark', v_stats ->> 'source_high_water_mark'
    );
  exception when others then
    v_finished_at := timezone('utc', now());
    v_duration_ms := greatest(0, floor(extract(epoch from (v_finished_at - v_started_at)) * 1000))::integer;

    update public.director_report_issue_facts_meta_v1
    set
      last_rebuild_finished_at = v_finished_at,
      last_rebuild_duration_ms = v_duration_ms,
      last_rebuild_status = 'failed',
      last_rebuild_error = sqlerrm
    where id;

    raise;
  end;
end;
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
volatile
security definer
set search_path = public
set statement_timeout = '30s'
as $$
declare
  v_status jsonb;
  v_selected_source text;
  v_fallback_reason text;
  v_target_object_name text;
begin
  v_status := public.director_report_issue_facts_scope_status_v1();
  v_selected_source := coalesce(v_status ->> 'selected_source', 'raw_fallback');
  v_fallback_reason := coalesce(v_status ->> 'fallback_reason', 'raw_fallback');

  insert into public.director_report_issue_facts_runtime_metrics_v1 (
    event_name,
    selected_source,
    fallback_reason,
    is_fresh,
    projection_version,
    source_row_count,
    projected_row_count,
    meta_source_row_count,
    meta_projected_row_count,
    source_high_water_mark,
    meta_source_high_water_mark,
    last_rebuild_started_at,
    last_rebuild_finished_at,
    last_rebuild_duration_ms,
    last_rebuild_status,
    last_rebuild_error
  )
  values (
    'director_report_issue_facts_scope_used',
    v_selected_source,
    v_fallback_reason,
    coalesce((v_status ->> 'is_fresh')::boolean, false),
    v_status ->> 'projection_version',
    nullif(v_status ->> 'source_row_count', '')::bigint,
    nullif(v_status ->> 'projected_row_count', '')::bigint,
    nullif(v_status ->> 'meta_source_row_count', '')::bigint,
    nullif(v_status ->> 'meta_projected_row_count', '')::bigint,
    nullif(v_status ->> 'source_high_water_mark', '')::timestamptz,
    nullif(v_status ->> 'meta_source_high_water_mark', '')::timestamptz,
    nullif(v_status ->> 'last_rebuild_started_at', '')::timestamptz,
    nullif(v_status ->> 'last_rebuild_finished_at', '')::timestamptz,
    nullif(v_status ->> 'last_rebuild_duration_ms', '')::integer,
    v_status ->> 'last_rebuild_status',
    v_status ->> 'last_rebuild_error'
  );

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

  if v_selected_source = 'projection' then
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
      'raw_fallback:r2_2_issue_fact_v1:' || v_fallback_reason as projection_version
    from public.director_report_issue_facts_raw_v1() f
    where (p_from is null or f.iss_date::date >= p_from)
      and (p_to is null or f.iss_date::date <= p_to)
      and (v_target_object_name is null or f.object_name_resolved = v_target_object_name);
  end if;
end;
$$;

select public.director_report_issue_facts_rebuild_v1();

comment on table public.director_report_issue_facts_runtime_metrics_v1 is
'R2.3 runtime metrics for Director issue fact projection usage, fallback reason, freshness, and rebuild status.';

comment on function public.director_report_issue_facts_scope_status_v1() is
'R2.3 classifies Director issue fact projection freshness and explicit fallback reason.';

comment on function public.director_report_issue_facts_drift_v1(date, date, text) is
'R2.3 compares projected Director issue facts with raw fallback facts and returns drift counts.';

comment on function public.director_report_issue_facts_rebuild_v1() is
'R2.3 rebuilds derived Director issue facts and records started/finished/duration/failure metadata.';

comment on function public.director_report_issue_facts_scope_v1(date, date, text) is
'R2.3 fact scope for Director works report. Records projection/fallback usage and preserves raw fallback.';

grant select on public.director_report_issue_facts_runtime_metrics_v1 to authenticated;
grant execute on function public.director_report_issue_facts_scope_status_v1() to authenticated;
grant execute on function public.director_report_issue_facts_drift_v1(date, date, text) to authenticated;
grant execute on function public.director_report_issue_facts_rebuild_v1() to authenticated;
grant execute on function public.director_report_issue_facts_scope_v1(date, date, text) to authenticated;

notify pgrst, 'reload schema';

commit;
