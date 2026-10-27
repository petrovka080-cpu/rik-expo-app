begin;

create temp table r3_b_issue_facts_raw_before on commit drop as
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
  material_name_resolved,
  source_updated_at,
  projection_version
from public.director_report_issue_facts_raw_v1();

alter function public.director_report_issue_facts_raw_v1()
  rename to director_report_issue_facts_build_source_v1;

revoke all on function public.director_report_issue_facts_build_source_v1() from public;
revoke all on function public.director_report_issue_facts_build_source_v1() from anon;
revoke all on function public.director_report_issue_facts_build_source_v1() from authenticated;

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
  from public.director_report_issue_facts_v1 f;
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
    from public.director_report_issue_facts_build_source_v1() f;

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
      'source_high_water_mark', v_stats ->> 'source_high_water_mark',
      'build_source', 'director_report_issue_facts_build_source_v1'
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

create or replace function public.director_report_issue_facts_r3b_parity_v1(
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
        '\s*(?:В·|вЂў|\|)\s*(?:РљРѕРЅС‚РµРєСЃС‚|РЎРёСЃС‚РµРјР°|Р—РѕРЅР°|Р’РёРґ|Р­С‚Р°Р¶|РћСЃРё)\s*:.*$',
        '',
        'i'
      )
    )::text
  end as object_name
),
prepared_raw as (
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
    material_name_resolved,
    source_updated_at,
    projection_version
  from public.director_report_issue_facts_raw_v1() f
  cross join target t
  where (p_from is null or f.iss_date::date >= p_from)
    and (p_to is null or f.iss_date::date <= p_to)
    and (t.object_name is null or f.object_name_resolved = t.object_name)
),
build_source as (
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
    material_name_resolved,
    source_updated_at,
    projection_version
  from public.director_report_issue_facts_build_source_v1() f
  cross join target t
  where (p_from is null or f.iss_date::date >= p_from)
    and (p_to is null or f.iss_date::date <= p_to)
    and (t.object_name is null or f.object_name_resolved = t.object_name)
),
prepared_minus_build_source as (
  select * from prepared_raw
  except
  select * from build_source
),
build_source_minus_prepared as (
  select * from build_source
  except
  select * from prepared_raw
),
counts as (
  select
    (select count(*)::bigint from prepared_raw) as prepared_raw_row_count,
    (select count(*)::bigint from build_source) as build_source_row_count,
    (select count(*)::bigint from prepared_minus_build_source) as prepared_minus_build_source_count,
    (select count(*)::bigint from build_source_minus_prepared) as build_source_minus_prepared_count
)
select jsonb_build_object(
  'projection_version', 'r2_2_issue_fact_v1',
  'prepared_raw_row_count', prepared_raw_row_count,
  'build_source_row_count', build_source_row_count,
  'prepared_minus_build_source_count', prepared_minus_build_source_count,
  'build_source_minus_prepared_count', build_source_minus_prepared_count,
  'diff_count', prepared_minus_build_source_count + build_source_minus_prepared_count,
  'is_drift_free', prepared_minus_build_source_count = 0 and build_source_minus_prepared_count = 0,
  'checked_at', timezone('utc', now()),
  'filters', jsonb_build_object(
    'from', p_from,
    'to', p_to,
    'object_name', (select object_name from target)
  )
)
from counts;
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
        '\s*(?:В·|вЂў|\|)\s*(?:РљРѕРЅС‚РµРєСЃС‚|РЎРёСЃС‚РµРјР°|Р—РѕРЅР°|Р’РёРґ|Р­С‚Р°Р¶|РћСЃРё)\s*:.*$',
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
build_source as (
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
  from public.director_report_issue_facts_build_source_v1() f
  cross join target t
  where (p_from is null or f.iss_date::date >= p_from)
    and (p_to is null or f.iss_date::date <= p_to)
    and (t.object_name is null or f.object_name_resolved = t.object_name)
),
projected_minus_build_source as (
  select * from projected
  except
  select * from build_source
),
build_source_minus_projected as (
  select * from build_source
  except
  select * from projected
),
counts as (
  select
    (select count(*)::bigint from projected) as projected_row_count,
    (select count(*)::bigint from build_source) as raw_row_count,
    (select count(*)::bigint from projected_minus_build_source) as projected_minus_raw_count,
    (select count(*)::bigint from build_source_minus_projected) as raw_minus_projected_count
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
  'comparison_source', 'director_report_issue_facts_build_source_v1',
  'filters', jsonb_build_object(
    'from', p_from,
    'to', p_to,
    'object_name', (select object_name from target)
  )
)
from counts;
$$;

create or replace function public.director_report_issue_facts_r3b_cpu_proof_v1()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with raw_proc as (
  select p.prosrc
  from pg_proc p
  join pg_namespace n
    on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'director_report_issue_facts_raw_v1'
    and pg_get_function_identity_arguments(p.oid) = ''
  limit 1
),
build_proc as (
  select p.oid
  from pg_proc p
  join pg_namespace n
    on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'director_report_issue_facts_build_source_v1'
    and pg_get_function_identity_arguments(p.oid) = ''
  limit 1
),
raw_source as (
  select lower(coalesce((select prosrc from raw_proc), '')) as value
)
select jsonb_build_object(
  'raw_has_substring', position('substring(' in (select value from raw_source)) > 0,
  'raw_has_regexp_replace', position('regexp_replace(' in (select value from raw_source)) > 0,
  'raw_reads_projection', position('director_report_issue_facts_v1' in (select value from raw_source)) > 0,
  'build_source_exists', exists(select 1 from build_proc),
  'checked_at', timezone('utc', now())
);
$$;

select public.director_report_issue_facts_rebuild_v1();

create temp table r3_b_issue_facts_raw_after on commit drop as
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
  material_name_resolved,
  source_updated_at,
  projection_version
from public.director_report_issue_facts_raw_v1();

do $$
declare
  v_before_minus_after bigint;
  v_after_minus_before bigint;
begin
  select count(*)::bigint
  into v_before_minus_after
  from (
    select * from r3_b_issue_facts_raw_before
    except
    select * from r3_b_issue_facts_raw_after
  ) diff;

  select count(*)::bigint
  into v_after_minus_before
  from (
    select * from r3_b_issue_facts_raw_after
    except
    select * from r3_b_issue_facts_raw_before
  ) diff;

  if coalesce(v_before_minus_after, 0) <> 0 or coalesce(v_after_minus_before, 0) <> 0 then
    raise exception
      'R3.B director issue facts raw parity failed: before_minus_after=%, after_minus_before=%',
      v_before_minus_after,
      v_after_minus_before;
  end if;
end;
$$;

comment on function public.director_report_issue_facts_build_source_v1() is
'R3.B rebuild/proof-only source for Director issue facts. Preserves legacy warehouse/request/note parsing outside public raw runtime.';

comment on function public.director_report_issue_facts_raw_v1() is
'R3.B prepared raw reader for Director issue facts. Reads normalized projection rows and avoids runtime regex/text parsing over issued-item rowsets.';

comment on function public.director_report_issue_facts_rebuild_v1() is
'R3.B rebuilds Director issue facts from the preserved build source and records rebuild metadata.';

comment on function public.director_report_issue_facts_drift_v1(date, date, text) is
'R3.B compares projected Director issue facts with the preserved build source and returns drift counts.';

comment on function public.director_report_issue_facts_r3b_parity_v1(date, date, text) is
'R3.B verifier: compares public prepared raw rows with the preserved build source, excluding projected_at runtime stamp drift.';

comment on function public.director_report_issue_facts_r3b_cpu_proof_v1() is
'R3.B verifier: proves public director_report_issue_facts_raw_v1 no longer contains substring or regexp_replace CPU transforms.';

grant execute on function public.director_report_issue_facts_raw_v1() to authenticated;
grant execute on function public.director_report_issue_facts_rebuild_v1() to authenticated;
grant execute on function public.director_report_issue_facts_drift_v1(date, date, text) to authenticated;
grant execute on function public.director_report_issue_facts_r3b_parity_v1(date, date, text) to authenticated;
grant execute on function public.director_report_issue_facts_r3b_cpu_proof_v1() to authenticated;

notify pgrst, 'reload schema';

commit;
