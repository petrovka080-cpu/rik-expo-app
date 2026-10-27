begin;

create table if not exists public.director_report_works_snapshots_v1 (
  snapshot_key text primary key,
  date_from date,
  date_to date,
  object_name text,
  object_name_key text not null default '',
  include_costs boolean not null default false,
  payload jsonb not null,
  summary jsonb not null default '{}'::jsonb,
  works jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default timezone('utc', now()),
  source_high_water_mark timestamptz,
  source_row_count bigint not null default 0,
  fact_projection_version text,
  fact_selected_source text,
  fact_fallback_reason text,
  fact_rebuilt_at timestamptz,
  fact_projected_row_count bigint,
  projection_version text not null default 'r2_4_works_snapshot_v1',
  rebuild_status text not null default 'success',
  rebuild_duration_ms integer,
  row_count bigint not null default 0,
  payload_hash text not null,
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists director_report_works_snapshots_v1_identity_idx
  on public.director_report_works_snapshots_v1 (
    coalesce(date_from, '0001-01-01'::date),
    coalesce(date_to, '9999-12-31'::date),
    object_name_key,
    include_costs
  );

create index if not exists director_report_works_snapshots_v1_generated_idx
  on public.director_report_works_snapshots_v1 (generated_at desc);

create table if not exists public.director_report_works_snapshot_rebuild_events_v1 (
  id bigserial primary key,
  snapshot_key text not null,
  date_from date,
  date_to date,
  object_name text,
  object_name_key text not null default '',
  include_costs boolean not null default false,
  started_at timestamptz not null default timezone('utc', now()),
  finished_at timestamptz,
  status text not null,
  error text,
  duration_ms integer,
  row_count bigint,
  payload_hash text,
  projection_version text,
  fact_projection_version text,
  fact_selected_source text,
  fact_fallback_reason text,
  source_high_water_mark timestamptz,
  source_row_count bigint
);

create index if not exists director_report_works_snapshot_rebuild_events_key_idx
  on public.director_report_works_snapshot_rebuild_events_v1 (snapshot_key, started_at desc);

create table if not exists public.director_report_works_snapshot_runtime_metrics_v1 (
  id bigserial primary key,
  recorded_at timestamptz not null default timezone('utc', now()),
  event_name text not null,
  snapshot_key text,
  date_from date,
  date_to date,
  object_name text,
  object_name_key text,
  include_costs boolean not null default false,
  selected_source text not null,
  fallback_reason text not null,
  is_fresh boolean not null,
  projection_version text,
  generated_at timestamptz,
  age_ms bigint,
  source_high_water_mark timestamptz,
  current_source_high_water_mark timestamptz,
  source_row_count bigint,
  current_source_row_count bigint,
  fact_selected_source text,
  fact_fallback_reason text,
  rebuild_status text,
  rebuild_duration_ms integer
);

create index if not exists director_report_works_snapshot_runtime_metrics_recorded_idx
  on public.director_report_works_snapshot_runtime_metrics_v1 (recorded_at desc);

create index if not exists director_report_works_snapshot_runtime_metrics_source_idx
  on public.director_report_works_snapshot_runtime_metrics_v1 (selected_source, fallback_reason, recorded_at desc);

create or replace function public.director_report_works_snapshot_object_key_v1(
  p_object_name text default null
)
returns text
language sql
immutable
security definer
set search_path = public
as $$
  select case
    when nullif(trim(coalesce(p_object_name, '')), '') is null then ''
    else lower(trim(regexp_replace(trim(coalesce(p_object_name, '')), '\s*\|.*$', '', 'i')))
  end;
$$;

create or replace function public.director_report_works_snapshot_key_v1(
  p_from date default null,
  p_to date default null,
  p_object_name text default null,
  p_include_costs boolean default false
)
returns text
language sql
immutable
security definer
set search_path = public
as $$
  select md5(concat_ws(
    '|',
    coalesce(p_from::text, '*'),
    coalesce(p_to::text, '*'),
    public.director_report_works_snapshot_object_key_v1(p_object_name),
    case when coalesce(p_include_costs, false) then '1' else '0' end
  ));
$$;

do $$
begin
  if to_regprocedure('public.director_report_fetch_works_from_facts_v1(date,date,text,boolean)') is null then
    if to_regprocedure('public.director_report_fetch_works_v1(date,date,text,boolean)') is null then
      raise exception 'director_report_fetch_works_v1(date,date,text,boolean) is missing';
    end if;

    alter function public.director_report_fetch_works_v1(date, date, text, boolean)
      rename to director_report_fetch_works_from_facts_v1;
  end if;
end $$;

create or replace function public.director_report_works_snapshot_status_v1(
  p_from date default null,
  p_to date default null,
  p_object_name text default null,
  p_include_costs boolean default false,
  p_max_age_seconds integer default 900,
  p_expected_projection_version text default 'r2_4_works_snapshot_v1'
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with args as (
  select
    public.director_report_works_snapshot_key_v1(p_from, p_to, p_object_name, p_include_costs) as snapshot_key,
    public.director_report_works_snapshot_object_key_v1(p_object_name) as object_name_key
),
stats as (
  select public.director_report_issue_facts_source_stats_v1() as value
),
fact_status as (
  select public.director_report_issue_facts_scope_status_v1() as value
),
scope as (
  select
    a.snapshot_key,
    a.object_name_key,
    s.generated_at,
    s.source_high_water_mark,
    s.source_row_count,
    s.projection_version,
    s.fact_projection_version,
    s.fact_selected_source,
    s.fact_fallback_reason,
    s.fact_rebuilt_at,
    s.fact_projected_row_count,
    s.rebuild_status,
    s.rebuild_duration_ms,
    s.row_count,
    s.payload_hash,
    jsonb_typeof(s.payload) as payload_type,
    jsonb_typeof(s.works) as works_type,
    s.snapshot_key is not null as snapshot_exists,
    coalesce((stats.value ->> 'source_row_count')::bigint, 0) as current_source_row_count,
    nullif(stats.value ->> 'source_high_water_mark', '')::timestamptz as current_source_high_water_mark,
    fact_status.value as fact_status,
    case
      when s.generated_at is null then null::bigint
      else greatest(0, floor(extract(epoch from (timezone('utc', now()) - s.generated_at)) * 1000))::bigint
    end as age_ms
  from args a
  cross join stats
  cross join fact_status
  left join public.director_report_works_snapshots_v1 s
    on s.snapshot_key = a.snapshot_key
),
classified as (
  select
    *,
    case
      when not snapshot_exists then 'missing_snapshot'
      when projection_version is distinct from p_expected_projection_version then 'version_mismatch'
      when rebuild_status is distinct from 'success' then 'rebuild_failed'
      when payload_type is distinct from 'object' or works_type is distinct from 'array' then 'snapshot_incomplete'
      when source_row_count is distinct from current_source_row_count
        or source_high_water_mark is distinct from current_source_high_water_mark then 'stale_snapshot'
      when p_max_age_seconds is not null
        and p_max_age_seconds >= 0
        and generated_at < timezone('utc', now()) - make_interval(secs => p_max_age_seconds) then 'expired_snapshot'
      else 'none'
    end as fallback_reason
  from scope
)
select jsonb_build_object(
  'snapshot_key', snapshot_key,
  'date_from', p_from,
  'date_to', p_to,
  'object_name', p_object_name,
  'object_name_key', object_name_key,
  'include_costs', coalesce(p_include_costs, false),
  'is_fresh', fallback_reason = 'none',
  'selected_source',
    case
      when fallback_reason = 'none' then 'snapshot'
      when coalesce(fact_status ->> 'selected_source', 'raw_fallback') = 'projection' then 'facts'
      else 'raw_fallback'
    end,
  'fallback_reason', fallback_reason,
  'projection_version', projection_version,
  'expected_projection_version', p_expected_projection_version,
  'generated_at', generated_at,
  'age_ms', age_ms,
  'source_high_water_mark', source_high_water_mark,
  'current_source_high_water_mark', current_source_high_water_mark,
  'source_row_count', source_row_count,
  'current_source_row_count', current_source_row_count,
  'fact_projection_version', fact_projection_version,
  'fact_selected_source', fact_selected_source,
  'fact_fallback_reason', fact_fallback_reason,
  'fact_rebuilt_at', fact_rebuilt_at,
  'fact_projected_row_count', fact_projected_row_count,
  'rebuild_status', rebuild_status,
  'rebuild_duration_ms', rebuild_duration_ms,
  'row_count', row_count,
  'payload_hash', payload_hash,
  'fact_status', fact_status
)
from classified;
$$;

create or replace function public.director_report_works_snapshot_rebuild_v1(
  p_from date default null,
  p_to date default null,
  p_object_name text default null,
  p_include_costs boolean default false
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
set statement_timeout = '30s'
as $$
declare
  v_started_at timestamptz := timezone('utc', now());
  v_finished_at timestamptz;
  v_duration_ms integer;
  v_snapshot_key text := public.director_report_works_snapshot_key_v1(p_from, p_to, p_object_name, p_include_costs);
  v_object_name_key text := public.director_report_works_snapshot_object_key_v1(p_object_name);
  v_payload jsonb;
  v_summary jsonb;
  v_works jsonb;
  v_stats jsonb;
  v_fact_status jsonb;
  v_source_high_water_mark timestamptz;
  v_source_row_count bigint;
  v_row_count bigint;
  v_payload_hash text;
  v_event_id bigint;
begin
  insert into public.director_report_works_snapshot_rebuild_events_v1 (
    snapshot_key,
    date_from,
    date_to,
    object_name,
    object_name_key,
    include_costs,
    started_at,
    status,
    projection_version
  )
  values (
    v_snapshot_key,
    p_from,
    p_to,
    p_object_name,
    v_object_name_key,
    coalesce(p_include_costs, false),
    v_started_at,
    'started',
    'r2_4_works_snapshot_v1'
  )
  returning id into v_event_id;

  begin
    v_payload := public.director_report_fetch_works_from_facts_v1(
      p_from => p_from,
      p_to => p_to,
      p_object_name => p_object_name,
      p_include_costs => p_include_costs
    );

    v_summary := coalesce(v_payload -> 'summary', '{}'::jsonb);
    v_works := coalesce(v_payload -> 'works', '[]'::jsonb);
    v_row_count := case
      when jsonb_typeof(v_works) = 'array' then jsonb_array_length(v_works)
      else 0
    end;
    v_payload_hash := md5(v_payload::text);

    v_stats := public.director_report_issue_facts_source_stats_v1();
    v_fact_status := public.director_report_issue_facts_scope_status_v1();
    v_source_high_water_mark := nullif(v_stats ->> 'source_high_water_mark', '')::timestamptz;
    v_source_row_count := coalesce((v_stats ->> 'source_row_count')::bigint, 0);
    v_finished_at := timezone('utc', now());
    v_duration_ms := greatest(0, floor(extract(epoch from (v_finished_at - v_started_at)) * 1000))::integer;

    insert into public.director_report_works_snapshots_v1 (
      snapshot_key,
      date_from,
      date_to,
      object_name,
      object_name_key,
      include_costs,
      payload,
      summary,
      works,
      generated_at,
      source_high_water_mark,
      source_row_count,
      fact_projection_version,
      fact_selected_source,
      fact_fallback_reason,
      fact_rebuilt_at,
      fact_projected_row_count,
      projection_version,
      rebuild_status,
      rebuild_duration_ms,
      row_count,
      payload_hash,
      updated_at
    )
    values (
      v_snapshot_key,
      p_from,
      p_to,
      p_object_name,
      v_object_name_key,
      coalesce(p_include_costs, false),
      v_payload,
      v_summary,
      v_works,
      v_finished_at,
      v_source_high_water_mark,
      v_source_row_count,
      v_fact_status ->> 'projection_version',
      v_fact_status ->> 'selected_source',
      v_fact_status ->> 'fallback_reason',
      nullif(v_fact_status ->> 'rebuilt_at', '')::timestamptz,
      nullif(v_fact_status ->> 'projected_row_count', '')::bigint,
      'r2_4_works_snapshot_v1',
      'success',
      v_duration_ms,
      v_row_count,
      v_payload_hash,
      v_finished_at
    )
    on conflict (snapshot_key) do update set
      date_from = excluded.date_from,
      date_to = excluded.date_to,
      object_name = excluded.object_name,
      object_name_key = excluded.object_name_key,
      include_costs = excluded.include_costs,
      payload = excluded.payload,
      summary = excluded.summary,
      works = excluded.works,
      generated_at = excluded.generated_at,
      source_high_water_mark = excluded.source_high_water_mark,
      source_row_count = excluded.source_row_count,
      fact_projection_version = excluded.fact_projection_version,
      fact_selected_source = excluded.fact_selected_source,
      fact_fallback_reason = excluded.fact_fallback_reason,
      fact_rebuilt_at = excluded.fact_rebuilt_at,
      fact_projected_row_count = excluded.fact_projected_row_count,
      projection_version = excluded.projection_version,
      rebuild_status = excluded.rebuild_status,
      rebuild_duration_ms = excluded.rebuild_duration_ms,
      row_count = excluded.row_count,
      payload_hash = excluded.payload_hash,
      updated_at = excluded.updated_at;

    update public.director_report_works_snapshot_rebuild_events_v1
    set
      finished_at = v_finished_at,
      status = 'success',
      duration_ms = v_duration_ms,
      row_count = v_row_count,
      payload_hash = v_payload_hash,
      fact_projection_version = v_fact_status ->> 'projection_version',
      fact_selected_source = v_fact_status ->> 'selected_source',
      fact_fallback_reason = v_fact_status ->> 'fallback_reason',
      source_high_water_mark = v_source_high_water_mark,
      source_row_count = v_source_row_count
    where id = v_event_id;

    return jsonb_build_object(
      'status', 'success',
      'snapshot_key', v_snapshot_key,
      'projection_version', 'r2_4_works_snapshot_v1',
      'generated_at', v_finished_at,
      'rebuild_duration_ms', v_duration_ms,
      'row_count', v_row_count,
      'payload_hash', v_payload_hash,
      'source_row_count', v_source_row_count,
      'source_high_water_mark', v_source_high_water_mark,
      'fact_selected_source', v_fact_status ->> 'selected_source',
      'fact_fallback_reason', v_fact_status ->> 'fallback_reason'
    );
  exception when others then
    v_finished_at := timezone('utc', now());
    v_duration_ms := greatest(0, floor(extract(epoch from (v_finished_at - v_started_at)) * 1000))::integer;

    update public.director_report_works_snapshot_rebuild_events_v1
    set
      finished_at = v_finished_at,
      status = 'failed',
      error = sqlerrm,
      duration_ms = v_duration_ms
    where id = v_event_id;

    raise;
  end;
end;
$$;

create or replace function public.director_report_works_snapshot_drift_v1(
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
with args as (
  select public.director_report_works_snapshot_key_v1(p_from, p_to, p_object_name, p_include_costs) as snapshot_key
),
snap as (
  select s.payload
  from public.director_report_works_snapshots_v1 s
  join args a on a.snapshot_key = s.snapshot_key
),
facts as (
  select public.director_report_fetch_works_from_facts_v1(
    p_from => p_from,
    p_to => p_to,
    p_object_name => p_object_name,
    p_include_costs => p_include_costs
  ) as payload
),
compared as (
  select
    (select snapshot_key from args) as snapshot_key,
    (select payload from snap) as snapshot_payload,
    (select payload from facts) as facts_payload
)
select jsonb_build_object(
  'snapshot_key', snapshot_key,
  'snapshot_exists', snapshot_payload is not null,
  'projection_version', 'r2_4_works_snapshot_v1',
  'snapshot_row_count',
    case
      when jsonb_typeof(snapshot_payload -> 'works') = 'array' then jsonb_array_length(snapshot_payload -> 'works')
      else 0
    end,
  'facts_row_count',
    case
      when jsonb_typeof(facts_payload -> 'works') = 'array' then jsonb_array_length(facts_payload -> 'works')
      else 0
    end,
  'summary_equal', coalesce(snapshot_payload -> 'summary' = facts_payload -> 'summary', false),
  'works_equal', coalesce(snapshot_payload -> 'works' = facts_payload -> 'works', false),
  'diff_count', case when coalesce(snapshot_payload = facts_payload, false) then 0 else 1 end,
  'is_drift_free', coalesce(snapshot_payload = facts_payload, false),
  'snapshot_payload_hash', case when snapshot_payload is null then null else md5(snapshot_payload::text) end,
  'facts_payload_hash', md5(facts_payload::text),
  'checked_at', timezone('utc', now()),
  'filters', jsonb_build_object(
    'from', p_from,
    'to', p_to,
    'object_name', p_object_name,
    'include_costs', coalesce(p_include_costs, false)
  )
)
from compared;
$$;

create or replace function public.director_report_fetch_works_v1(
  p_from date default null,
  p_to date default null,
  p_object_name text default null,
  p_include_costs boolean default false
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
set statement_timeout = '30s'
as $$
declare
  v_status jsonb;
  v_snapshot_key text;
  v_payload jsonb;
  v_selected_source text;
  v_fallback_reason text;
begin
  v_status := public.director_report_works_snapshot_status_v1(
    p_from => p_from,
    p_to => p_to,
    p_object_name => p_object_name,
    p_include_costs => p_include_costs,
    p_max_age_seconds => 900,
    p_expected_projection_version => 'r2_4_works_snapshot_v1'
  );

  v_snapshot_key := v_status ->> 'snapshot_key';

  if coalesce((v_status ->> 'is_fresh')::boolean, false) then
    select s.payload
    into v_payload
    from public.director_report_works_snapshots_v1 s
    where s.snapshot_key = v_snapshot_key;

    v_selected_source := 'snapshot';
    v_fallback_reason := 'none';
  else
    v_payload := public.director_report_fetch_works_from_facts_v1(
      p_from => p_from,
      p_to => p_to,
      p_object_name => p_object_name,
      p_include_costs => p_include_costs
    );

    v_selected_source := coalesce(v_status ->> 'selected_source', 'facts');
    v_fallback_reason := coalesce(v_status ->> 'fallback_reason', 'missing_snapshot');
  end if;

  insert into public.director_report_works_snapshot_runtime_metrics_v1 (
    event_name,
    snapshot_key,
    date_from,
    date_to,
    object_name,
    object_name_key,
    include_costs,
    selected_source,
    fallback_reason,
    is_fresh,
    projection_version,
    generated_at,
    age_ms,
    source_high_water_mark,
    current_source_high_water_mark,
    source_row_count,
    current_source_row_count,
    fact_selected_source,
    fact_fallback_reason,
    rebuild_status,
    rebuild_duration_ms
  )
  values (
    'director_report_works_snapshot_used',
    v_snapshot_key,
    p_from,
    p_to,
    p_object_name,
    v_status ->> 'object_name_key',
    coalesce(p_include_costs, false),
    v_selected_source,
    v_fallback_reason,
    v_selected_source = 'snapshot',
    v_status ->> 'projection_version',
    nullif(v_status ->> 'generated_at', '')::timestamptz,
    nullif(v_status ->> 'age_ms', '')::bigint,
    nullif(v_status ->> 'source_high_water_mark', '')::timestamptz,
    nullif(v_status ->> 'current_source_high_water_mark', '')::timestamptz,
    nullif(v_status ->> 'source_row_count', '')::bigint,
    nullif(v_status ->> 'current_source_row_count', '')::bigint,
    v_status ->> 'fact_selected_source',
    v_status ->> 'fact_fallback_reason',
    v_status ->> 'rebuild_status',
    nullif(v_status ->> 'rebuild_duration_ms', '')::integer
  );

  return v_payload;
end;
$$;

select public.director_report_works_snapshot_rebuild_v1(null, null, null, false);

comment on table public.director_report_works_snapshots_v1 is
'R2.4 snapshot envelope for Director works report payloads. Derived from issue facts; not source-of-truth.';

comment on table public.director_report_works_snapshot_rebuild_events_v1 is
'R2.4 rebuild event log for Director works snapshots with success/failure, duration, rows, and source watermark.';

comment on table public.director_report_works_snapshot_runtime_metrics_v1 is
'R2.4 runtime metrics for Director works snapshot usage versus facts/raw fallback.';

comment on function public.director_report_works_snapshot_object_key_v1(text) is
'R2.4 canonical object key helper for Director works snapshot identity.';

comment on function public.director_report_works_snapshot_key_v1(date, date, text, boolean) is
'R2.4 deterministic key over date_from, date_to, object_name, and include_costs.';

comment on function public.director_report_fetch_works_from_facts_v1(date, date, text, boolean) is
'R2.4 preserved facts-path implementation of Director works report. Maintains R2.2/R2.3 report semantics and raw fallback.';

comment on function public.director_report_works_snapshot_status_v1(date, date, text, boolean, integer, text) is
'R2.4 classifies Director works snapshot freshness and explicit fallback reason.';

comment on function public.director_report_works_snapshot_rebuild_v1(date, date, text, boolean) is
'R2.4 rebuilds one Director works snapshot envelope from the preserved facts path.';

comment on function public.director_report_works_snapshot_drift_v1(date, date, text, boolean) is
'R2.4 compares Director works snapshot payload with preserved facts-path payload.';

comment on function public.director_report_fetch_works_v1(date, date, text, boolean) is
'Canonical works payload for director reports. R2.4 uses fresh snapshot when available, otherwise preserves facts/raw fallback behavior.';

grant select on public.director_report_works_snapshots_v1 to authenticated;
grant select on public.director_report_works_snapshot_rebuild_events_v1 to authenticated;
grant select on public.director_report_works_snapshot_runtime_metrics_v1 to authenticated;
grant execute on function public.director_report_works_snapshot_object_key_v1(text) to authenticated;
grant execute on function public.director_report_works_snapshot_key_v1(date, date, text, boolean) to authenticated;
grant execute on function public.director_report_fetch_works_from_facts_v1(date, date, text, boolean) to authenticated;
grant execute on function public.director_report_works_snapshot_status_v1(date, date, text, boolean, integer, text) to authenticated;
grant execute on function public.director_report_works_snapshot_rebuild_v1(date, date, text, boolean) to authenticated;
grant execute on function public.director_report_works_snapshot_drift_v1(date, date, text, boolean) to authenticated;
grant execute on function public.director_report_fetch_works_v1(date, date, text, boolean) to authenticated;

notify pgrst, 'reload schema';

commit;
