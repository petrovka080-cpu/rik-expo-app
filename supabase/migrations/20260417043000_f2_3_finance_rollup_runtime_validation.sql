begin;

-- ============================================================================
-- F2.3 - Finance rollup drift / freshness / runtime validation.
--
-- Observability around the F2.2 supplier/object rollups. This migration does
-- not change money semantics, rounding, write paths, or the raw runtime
-- fallback.
-- ============================================================================

create table if not exists public.finance_rollup_rebuild_events_v1 (
  id                       bigserial primary key,
  rebuild_id               text        not null,
  layer                    text        not null,
  status                   text        not null,
  started_at               timestamptz not null default now(),
  finished_at              timestamptz,
  duration_ms              integer,
  before_count             integer,
  after_count              integer,
  proposal_summary_count   integer,
  error_message            text,
  payload                  jsonb       not null default '{}'::jsonb,
  created_at               timestamptz not null default now(),

  constraint chk_frr_events_layer_v1
    check (layer in ('proposal_summary', 'supplier', 'object', 'combined')),
  constraint chk_frr_events_status_v1
    check (status in ('started', 'success', 'failed'))
);

create index if not exists idx_frr_events_layer_created_v1
  on public.finance_rollup_rebuild_events_v1 (layer, created_at desc);

create index if not exists idx_frr_events_rebuild_id_v1
  on public.finance_rollup_rebuild_events_v1 (rebuild_id);

comment on table public.finance_rollup_rebuild_events_v1 is
  'F2.3 append-only operational log for finance supplier/object rollup rebuild health. Not a money truth source.';

create or replace function public.finance_rollup_rebuild_event_record_v1(
  p_rebuild_id text,
  p_layer text,
  p_status text,
  p_started_at timestamptz,
  p_finished_at timestamptz default null,
  p_duration_ms integer default null,
  p_before_count integer default null,
  p_after_count integer default null,
  p_proposal_summary_count integer default null,
  p_error_message text default null,
  p_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $fn$
begin
  insert into public.finance_rollup_rebuild_events_v1 (
    rebuild_id, layer, status, started_at, finished_at, duration_ms,
    before_count, after_count, proposal_summary_count, error_message, payload
  )
  values (
    p_rebuild_id, p_layer, p_status, p_started_at, p_finished_at, p_duration_ms,
    p_before_count, p_after_count, p_proposal_summary_count, p_error_message,
    coalesce(p_payload, '{}'::jsonb)
  );
end;
$fn$;

create or replace function public.finance_rollups_rebuild_all_v1()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $fn$
declare
  v_rebuild_id text := gen_random_uuid()::text;
  v_started timestamptz := clock_timestamp();
  v_finished timestamptz;
  v_duration_ms integer;
  v_proposal jsonb;
  v_supplier jsonb;
  v_object jsonb;
  v_payload jsonb;
  v_error text;
  v_before_supplier integer := 0;
  v_before_object integer := 0;
  v_after_supplier integer := 0;
  v_after_object integer := 0;
  v_before_total integer := 0;
  v_after_total integer := 0;
  v_proposal_count integer := 0;
begin
  select count(*) into v_before_supplier from public.finance_supplier_rollup_v1;
  select count(*) into v_before_object from public.finance_object_rollup_v1;
  select count(*) into v_proposal_count from public.finance_proposal_summary_v1;
  v_before_total := coalesce(v_before_supplier, 0) + coalesce(v_before_object, 0);

  perform public.finance_rollup_rebuild_event_record_v1(
    v_rebuild_id, 'combined', 'started', v_started, null, null,
    v_before_total, null, v_proposal_count, null,
    jsonb_build_object('strategy', 'full_truncate_rebuild', 'layer', 'combined')
  );

  begin
    v_proposal := public.finance_proposal_summary_rebuild_all_v1();
    select count(*) into v_proposal_count from public.finance_proposal_summary_v1;

    v_supplier := public.finance_supplier_rollup_rebuild_v1();
    v_object   := public.finance_object_rollup_rebuild_v1();

    select count(*) into v_after_supplier from public.finance_supplier_rollup_v1;
    select count(*) into v_after_object from public.finance_object_rollup_v1;
    v_after_total := coalesce(v_after_supplier, 0) + coalesce(v_after_object, 0);

    v_finished := clock_timestamp();
    v_duration_ms := floor(extract(epoch from v_finished - v_started) * 1000)::integer;

    v_payload := jsonb_build_object(
      'status', 'ok',
      'rebuild_id', v_rebuild_id,
      'duration_ms', v_duration_ms,
      'rebuilt_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'proposal_summary_count', v_proposal_count,
      'proposal_layer', v_proposal,
      'supplier_layer', v_supplier,
      'object_layer',   v_object
    );

    perform public.finance_rollup_rebuild_event_record_v1(
      v_rebuild_id, 'proposal_summary', 'success', v_started, v_finished, v_duration_ms,
      null, v_proposal_count, v_proposal_count, null, v_proposal
    );

    perform public.finance_rollup_rebuild_event_record_v1(
      v_rebuild_id, 'supplier', 'success', v_started, v_finished,
      nullif((v_supplier->>'duration_ms')::integer, 0),
      v_before_supplier, v_after_supplier, v_proposal_count, null, v_supplier
    );

    perform public.finance_rollup_rebuild_event_record_v1(
      v_rebuild_id, 'object', 'success', v_started, v_finished,
      nullif((v_object->>'duration_ms')::integer, 0),
      v_before_object, v_after_object, v_proposal_count, null, v_object
    );

    perform public.finance_rollup_rebuild_event_record_v1(
      v_rebuild_id, 'combined', 'success', v_started, v_finished, v_duration_ms,
      v_before_total, v_after_total, v_proposal_count, null, v_payload
    );

    return v_payload;
  exception when others then
    v_error := SQLERRM;
    v_finished := clock_timestamp();
    v_duration_ms := floor(extract(epoch from v_finished - v_started) * 1000)::integer;

    select count(*) into v_after_supplier from public.finance_supplier_rollup_v1;
    select count(*) into v_after_object from public.finance_object_rollup_v1;
    select count(*) into v_proposal_count from public.finance_proposal_summary_v1;
    v_after_total := coalesce(v_after_supplier, 0) + coalesce(v_after_object, 0);

    v_payload := jsonb_build_object(
      'status', 'failed',
      'rebuild_id', v_rebuild_id,
      'duration_ms', v_duration_ms,
      'failed_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'error_message', v_error,
      'proposal_summary_count', v_proposal_count,
      'supplier_layer', jsonb_build_object('after_count', v_after_supplier),
      'object_layer', jsonb_build_object('after_count', v_after_object)
    );

    perform public.finance_rollup_rebuild_event_record_v1(
      v_rebuild_id, 'combined', 'failed', v_started, v_finished, v_duration_ms,
      v_before_total, v_after_total, v_proposal_count, v_error, v_payload
    );

    return v_payload;
  end;
end;
$fn$;

create or replace function public.finance_rollup_drift_check_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v_supplier_drift integer := 0;
  v_object_drift integer := 0;
  v_supplier_count integer := 0;
  v_object_count integer := 0;
  v_supplier_runtime_count integer := 0;
  v_object_runtime_count integer := 0;
  v_source_count integer := 0;
  v_supplier_min_version integer;
  v_supplier_max_version integer;
  v_object_min_version integer;
  v_object_max_version integer;
  v_supplier_last_rebuilt_at timestamptz;
  v_object_last_rebuilt_at timestamptz;
  v_started timestamptz := clock_timestamp();
begin
  select count(*), min(projection_version), max(projection_version), max(rebuilt_at)
    into v_supplier_count, v_supplier_min_version, v_supplier_max_version, v_supplier_last_rebuilt_at
  from public.finance_supplier_rollup_v1;

  select count(*), min(projection_version), max(projection_version), max(rebuilt_at)
    into v_object_count, v_object_min_version, v_object_max_version, v_object_last_rebuilt_at
  from public.finance_object_rollup_v1;

  select count(*) into v_source_count from public.finance_proposal_summary_v1;

  select count(*) into v_supplier_runtime_count
  from (
    select supplier_id
    from public.finance_proposal_summary_v1
    where supplier_id is not null
    group by supplier_id
  ) s;

  select count(*) into v_object_runtime_count
  from (
    select coalesce(
      nullif(btrim(coalesce(object_code, '')), ''),
      nullif(btrim(coalesce(object_id, '')), ''),
      md5(lower(coalesce(nullif(btrim(coalesce(object_name, '')), ''), E'\u0411\u0435\u0437 \u043e\u0431\u044a\u0435\u043a\u0442\u0430')))
    )::text as object_key
    from public.finance_proposal_summary_v1
    group by 1
  ) o;

  with raw_supplier as (
    select
      supplier_id,
      coalesce(sum(amount_total), 0)::numeric as amount_total,
      coalesce(sum(amount_paid), 0)::numeric as amount_paid,
      coalesce(sum(amount_debt), 0)::numeric as amount_debt
    from public.finance_proposal_summary_v1
    where supplier_id is not null
    group by supplier_id
  )
  select count(*) into v_supplier_drift
  from public.finance_supplier_rollup_v1 fsr
  full outer join raw_supplier rs on rs.supplier_id = fsr.supplier_id
  where fsr.supplier_id is null
     or rs.supplier_id is null
     or fsr.amount_total != rs.amount_total
     or fsr.amount_paid != rs.amount_paid
     or fsr.amount_debt != rs.amount_debt;

  with raw_object as (
    select
      coalesce(
        nullif(btrim(coalesce(object_code, '')), ''),
        nullif(btrim(coalesce(object_id, '')), ''),
        md5(lower(coalesce(nullif(btrim(coalesce(object_name, '')), ''), E'\u0411\u0435\u0437 \u043e\u0431\u044a\u0435\u043a\u0442\u0430')))
      )::text as object_key,
      coalesce(sum(amount_total), 0)::numeric as amount_total,
      coalesce(sum(amount_paid), 0)::numeric as amount_paid,
      coalesce(sum(amount_debt), 0)::numeric as amount_debt
    from public.finance_proposal_summary_v1
    group by 1
  )
  select count(*) into v_object_drift
  from public.finance_object_rollup_v1 fol
  full outer join raw_object ro on ro.object_key = fol.object_key
  where fol.object_key is null
     or ro.object_key is null
     or fol.amount_total != ro.amount_total
     or fol.amount_paid != ro.amount_paid
     or fol.amount_debt != ro.amount_debt;

  return jsonb_build_object(
    'status', case when v_supplier_drift = 0 and v_object_drift = 0 then 'GREEN' else 'DRIFT_DETECTED' end,
    'checked_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'duration_ms', floor(extract(epoch from clock_timestamp() - v_started) * 1000)::integer,
    'supplier_rollup_row_count', v_supplier_count,
    'object_rollup_row_count', v_object_count,
    'supplier_runtime_row_count', v_supplier_runtime_count,
    'object_runtime_row_count', v_object_runtime_count,
    'supplier_drift_count', v_supplier_drift,
    'object_drift_count', v_object_drift,
    'source_proposal_summary_row_count', v_source_count,
    'supplier_projection_version_min', v_supplier_min_version,
    'supplier_projection_version_max', v_supplier_max_version,
    'object_projection_version_min', v_object_min_version,
    'object_projection_version_max', v_object_max_version,
    'supplier_last_rebuilt_at', to_char(v_supplier_last_rebuilt_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'object_last_rebuilt_at', to_char(v_object_last_rebuilt_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
end;
$fn$;

create or replace function public.finance_rollup_status_v1(
  p_max_age_seconds integer default 900,
  p_expected_projection_version integer default 1
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v_max_age_seconds integer := greatest(coalesce(p_max_age_seconds, 900), 1);
  v_expected_version integer := coalesce(p_expected_projection_version, 1);
  v_supplier_count integer := 0;
  v_object_count integer := 0;
  v_source_count integer := 0;
  v_supplier_min_version integer;
  v_supplier_max_version integer;
  v_object_min_version integer;
  v_object_max_version integer;
  v_supplier_last_rebuilt_at timestamptz;
  v_object_last_rebuilt_at timestamptz;
  v_proposal_summary_last_rebuilt_at timestamptz;
  v_supplier_age_seconds integer;
  v_object_age_seconds integer;
  v_latest_status text;
  v_latest_error text;
  v_latest_success_at timestamptz;
  v_latest_success_duration_ms integer;
  v_status text;
  v_is_fresh boolean;
begin
  select count(*), min(projection_version), max(projection_version), max(rebuilt_at)
    into v_supplier_count, v_supplier_min_version, v_supplier_max_version, v_supplier_last_rebuilt_at
  from public.finance_supplier_rollup_v1;

  select count(*), min(projection_version), max(projection_version), max(rebuilt_at)
    into v_object_count, v_object_min_version, v_object_max_version, v_object_last_rebuilt_at
  from public.finance_object_rollup_v1;

  select count(*), max(rebuilt_at)
    into v_source_count, v_proposal_summary_last_rebuilt_at
  from public.finance_proposal_summary_v1;

  select status, error_message
    into v_latest_status, v_latest_error
  from public.finance_rollup_rebuild_events_v1
  where layer = 'combined'
  order by id desc
  limit 1;

  select finished_at, duration_ms
    into v_latest_success_at, v_latest_success_duration_ms
  from public.finance_rollup_rebuild_events_v1
  where layer = 'combined' and status = 'success'
  order by id desc
  limit 1;

  v_supplier_age_seconds :=
    case when v_supplier_last_rebuilt_at is null then null
      else floor(extract(epoch from now() - v_supplier_last_rebuilt_at))::integer
    end;
  v_object_age_seconds :=
    case when v_object_last_rebuilt_at is null then null
      else floor(extract(epoch from now() - v_object_last_rebuilt_at))::integer
    end;

  v_status := case
    when v_source_count > 0 and (v_supplier_count = 0 or v_object_count = 0) then 'MISSING_ROLLUP'
    when coalesce(v_supplier_min_version, v_expected_version) != v_expected_version
      or coalesce(v_supplier_max_version, v_expected_version) != v_expected_version
      or coalesce(v_object_min_version, v_expected_version) != v_expected_version
      or coalesce(v_object_max_version, v_expected_version) != v_expected_version
      then 'VERSION_MISMATCH'
    when v_latest_status is not null and v_latest_status != 'success' then 'REBUILD_INCOMPLETE'
    when coalesce(v_supplier_age_seconds, v_max_age_seconds + 1) > v_max_age_seconds
      or coalesce(v_object_age_seconds, v_max_age_seconds + 1) > v_max_age_seconds
      then 'STALE_ROLLUP'
    else 'FRESH'
  end;
  v_is_fresh := v_status = 'FRESH';

  return jsonb_build_object(
    'status', v_status,
    'is_fresh', v_is_fresh,
    'checked_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'max_age_seconds', v_max_age_seconds,
    'supplier_rollup_row_count', v_supplier_count,
    'object_rollup_row_count', v_object_count,
    'source_proposal_summary_row_count', v_source_count,
    'supplier_last_rebuilt_at', to_char(v_supplier_last_rebuilt_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'object_last_rebuilt_at', to_char(v_object_last_rebuilt_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'proposal_summary_last_rebuilt_at', to_char(v_proposal_summary_last_rebuilt_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'supplier_age_seconds', v_supplier_age_seconds,
    'object_age_seconds', v_object_age_seconds,
    'supplier_projection_version_min', v_supplier_min_version,
    'supplier_projection_version_max', v_supplier_max_version,
    'object_projection_version_min', v_object_min_version,
    'object_projection_version_max', v_object_max_version,
    'expected_projection_version', v_expected_version,
    'last_successful_rebuild_at', to_char(v_latest_success_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'last_rebuild_duration_ms', v_latest_success_duration_ms,
    'last_rebuild_status', v_latest_status,
    'last_rebuild_error', v_latest_error
  );
end;
$fn$;

create or replace function public.finance_rollup_validation_snapshot_v1(
  p_max_age_seconds integer default 900,
  p_expected_projection_version integer default 1
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'snapshot_version', 'f2_3_v1',
    'generated_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'drift', public.finance_rollup_drift_check_v1(),
    'freshness', public.finance_rollup_status_v1(p_max_age_seconds, p_expected_projection_version)
  );
$$;

create or replace function public.director_finance_panel_scope_v4(
  p_object_id uuid default null,
  p_date_from date default null,
  p_date_to date default null,
  p_due_days integer default 7,
  p_critical_days integer default 14,
  p_limit integer default 50,
  p_offset integer default 0
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with normalized_args as (
  select
    case when coalesce(p_due_days, 7) = 0 then 7 else coalesce(p_due_days, 7) end::integer as due_days,
    case when coalesce(p_critical_days, 14) = 0 then 14 else coalesce(p_critical_days, 14) end::integer as critical_days,
    greatest(coalesce(p_limit, 50), 1)::integer as limit_value,
    greatest(coalesce(p_offset, 0), 0)::integer as offset_value
),
summary_available as (
  select exists(select 1 from public.finance_proposal_summary_v1 limit 1) as has_data
),
finance_base as (
  select
    fps.request_id, fps.object_id, fps.object_code, fps.object_name,
    fps.supplier_id, fps.supplier_name, fps.proposal_id, fps.proposal_no,
    fps.invoice_number, fps.amount_total, fps.amount_paid, fps.amount_debt,
    fps.approved_date, fps.invoice_date,
    case
      when (select due_days from normalized_args) = 7 then fps.due_date
      else coalesce(fps.due_date, (coalesce(fps.invoice_date, fps.approved_date) + (select due_days from normalized_args)))
    end as due_date
  from public.finance_proposal_summary_v1 fps
  where (select has_data from summary_available)
  union all
  select
    coalesce(nullif(trim(coalesce(src.row_json->>'request_id', '')), ''), ps.request_id) as request_id,
    coalesce(ri.legacy_object_id, pu.legacy_object_id, nullif(trim(coalesce(src.row_json->>'object_id', '')), '')) as object_id,
    coalesce(ri.object_code, nullif(trim(coalesce(src.row_json->>'object_code', '')), '')) as object_code,
    coalesce(ri.object_name, pu.legacy_object_name, nullif(trim(coalesce(src.row_json->>'object_name', '')), ''), E'\u0411\u0435\u0437 \u043e\u0431\u044a\u0435\u043a\u0442\u0430')::text as object_name,
    coalesce(nullif(trim(coalesce(src.row_json->>'supplier_id', '')), ''), pu.supplier_id, md5(lower(coalesce(nullif(trim(src.row_json->>'supplier'), ''), pu.supplier_name, E'\u2014')))) as supplier_id,
    coalesce(nullif(trim(src.row_json->>'supplier'), ''), pu.supplier_name, E'\u2014')::text as supplier_name,
    coalesce(nullif(trim(coalesce(src.row_json->>'proposal_id', src.row_json->>'proposalId')), ''), nullif(trim(coalesce(src.row_json->>'id', '')), '')) as proposal_id,
    coalesce(nullif(trim(src.row_json->>'proposal_no'), ''), nullif(trim(src.row_json->>'proposalNo'), ''), nullif(trim(src.row_json->>'pretty'), '')) as proposal_no,
    coalesce(nullif(trim(src.row_json->>'invoice_number'), ''), nullif(trim(src.row_json->>'invoiceNumber'), '')) as invoice_number,
    coalesce(nullif(trim(src.row_json->>'invoice_amount'), '')::numeric, 0)::numeric as amount_total,
    coalesce(nullif(trim(src.row_json->>'total_paid'), '')::numeric, 0)::numeric as amount_paid,
    greatest(coalesce(nullif(trim(src.row_json->>'invoice_amount'), '')::numeric, 0) - coalesce(nullif(trim(src.row_json->>'total_paid'), '')::numeric, 0), 0)::numeric as amount_debt,
    coalesce(nullif(trim(src.row_json->>'director_approved_at'), '')::timestamptz::date, nullif(trim(src.row_json->>'approved_at'), '')::timestamptz::date, nullif(trim(src.row_json->>'sent_to_accountant_at'), '')::timestamptz::date, nullif(trim(src.row_json->>'invoice_date'), '')::date) as approved_date,
    coalesce(nullif(trim(src.row_json->>'invoice_date'), '')::date, nullif(trim(src.row_json->>'invoiceDate'), '')::date) as invoice_date,
    coalesce(nullif(trim(src.row_json->>'due_date'), '')::date, (coalesce(nullif(trim(src.row_json->>'invoice_date'), '')::date, nullif(trim(src.row_json->>'invoiceDate'), '')::date, nullif(trim(src.row_json->>'director_approved_at'), '')::timestamptz::date, nullif(trim(src.row_json->>'approved_at'), '')::timestamptz::date, nullif(trim(src.row_json->>'sent_to_accountant_at'), '')::timestamptz::date) + (select due_days from normalized_args))) as due_date
  from public.list_accountant_inbox_fact(null) as src(row_json)
  left join (select pi2.proposal_id::text, min(ri2.request_id::text) filter (where ri2.request_id is not null) as request_id from public.proposal_items pi2 left join public.request_items ri2 on ri2.id::text = pi2.request_item_id::text group by pi2.proposal_id::text) ps on ps.proposal_id = nullif(trim(coalesce(src.row_json->>'proposal_id', src.row_json->>'proposalId')), '')
  left join (select roi2.request_id::text, nullif(btrim(coalesce(roi2.construction_object_code, '')), '') as object_code, nullif(btrim(coalesce(roi2.construction_object_name, '')), '') as object_name, nullif(btrim(coalesce(req2.object_id::text, '')), '') as legacy_object_id from public.request_object_identity_scope_v1 roi2 left join public.requests req2 on req2.id::text = roi2.request_id::text) ri on ri.request_id = coalesce(nullif(trim(coalesce(src.row_json->>'request_id', '')), ''), ps.request_id)
  left join (select p2.proposal_id::text, max(nullif(trim(p2.object_id::text), '')) as legacy_object_id, max(nullif(trim(p2.object_name), '')) as legacy_object_name, max(nullif(trim(p2.supplier_id::text), '')) as supplier_id, max(nullif(trim(p2.supplier), '')) as supplier_name from public.purchases p2 where p2.proposal_id is not null group by p2.proposal_id::text) pu on pu.proposal_id = nullif(trim(coalesce(src.row_json->>'proposal_id', src.row_json->>'proposalId')), '')
  where not (select has_data from summary_available)
),
finance_filtered as (
  select
    fb.*,
    (fb.amount_paid > 0 and fb.amount_debt > 0) as is_partial,
    (fb.amount_debt > 0 and fb.due_date is not null and fb.due_date < current_date) as is_overdue,
    case when fb.amount_debt > 0 and fb.due_date is not null and fb.due_date < current_date then (current_date - fb.due_date)::integer else null::integer end as overdue_days
  from finance_base fb
  where (p_object_id is null or fb.object_id = p_object_id::text)
    and (fb.approved_date is null or ((p_date_from is null or fb.approved_date >= p_date_from) and (p_date_to is null or fb.approved_date <= p_date_to)))
),
classified_finance as (
  select ff.*, (ff.is_overdue and coalesce(ff.overdue_days, 0) >= (select critical_days from normalized_args)) as is_critical
  from finance_filtered ff
),
summary_row as (
  select
    coalesce(sum(amount_total), 0)::numeric as total_amount,
    coalesce(sum(amount_paid), 0)::numeric as total_paid,
    coalesce(sum(amount_debt), 0)::numeric as total_debt,
    coalesce(sum(amount_paid) filter (where is_partial), 0)::numeric as partial_paid,
    coalesce(sum(amount_debt) filter (where is_overdue), 0)::numeric as overdue_amount,
    coalesce(sum(amount_debt) filter (where is_critical), 0)::numeric as critical_amount,
    count(*)::integer as row_count,
    count(*) filter (where amount_debt > 0)::integer as debt_count,
    count(*) filter (where is_partial)::integer as partial_count,
    count(*) filter (where is_overdue)::integer as overdue_count,
    count(*) filter (where is_critical)::integer as critical_count
  from classified_finance
),
rollup_status as (
  select public.finance_rollup_status_v1(900, 1) as payload
),
rollup_available as (
  select
    (p_object_id is null and p_date_from is null and p_date_to is null) as unfiltered_scope,
    coalesce((rs.payload->>'is_fresh')::boolean, false) as is_fresh,
    coalesce(rs.payload->>'status', 'MISSING_ROLLUP') as freshness_status,
    rs.payload as status_payload,
    exists(select 1 from public.finance_supplier_rollup_v1 limit 1) as supplier_rows_exist,
    exists(select 1 from public.finance_object_rollup_v1 limit 1) as object_rows_exist
  from rollup_status rs
),
rollup_decision as (
  select
    ra.*,
    (ra.unfiltered_scope and ra.is_fresh and ra.supplier_rows_exist) as supplier_has_data,
    (ra.unfiltered_scope and ra.is_fresh and ra.object_rows_exist) as object_has_data,
    case
      when not ra.unfiltered_scope then 'filtered_scope'
      when ra.freshness_status = 'MISSING_ROLLUP' then 'missing_rollup'
      when ra.freshness_status = 'VERSION_MISMATCH' then 'version_mismatch'
      when ra.freshness_status = 'REBUILD_INCOMPLETE' then 'rebuild_incomplete'
      when ra.freshness_status = 'STALE_ROLLUP' then 'stale_rollup'
      when not ra.supplier_rows_exist then 'missing_rollup'
      else 'none'
    end as supplier_fallback_reason,
    case
      when not ra.unfiltered_scope then 'filtered_scope'
      when ra.freshness_status = 'MISSING_ROLLUP' then 'missing_rollup'
      when ra.freshness_status = 'VERSION_MISMATCH' then 'version_mismatch'
      when ra.freshness_status = 'REBUILD_INCOMPLETE' then 'rebuild_incomplete'
      when ra.freshness_status = 'STALE_ROLLUP' then 'stale_rollup'
      when not ra.object_rows_exist then 'missing_rollup'
      else 'none'
    end as object_fallback_reason
  from rollup_available ra
),
supplier_finance_rows as (
  select
    fsr.supplier_id,
    fsr.supplier_name,
    fsr.invoice_count,
    fsr.amount_total as approved_total,
    fsr.amount_paid as paid_total,
    fsr.amount_debt as debt_total,
    fsr.debt_count,
    coalesce((select sum((b->>'amount_debt')::numeric) from jsonb_array_elements(fsr.due_buckets) b where (b->>'due_date')::date < current_date), 0)::numeric as overdue_amount,
    coalesce((select sum((b->>'amount_debt')::numeric) from jsonb_array_elements(fsr.due_buckets) b where (b->>'due_date')::date < current_date and (current_date - (b->>'due_date')::date) >= (select critical_days from normalized_args)), 0)::numeric as critical_amount,
    coalesce((select count(*) from jsonb_array_elements(fsr.due_buckets) b where (b->>'due_date')::date < current_date), 0)::integer as overdue_count,
    coalesce((select count(*) from jsonb_array_elements(fsr.due_buckets) b where (b->>'due_date')::date < current_date and (current_date - (b->>'due_date')::date) >= (select critical_days from normalized_args)), 0)::integer as critical_count
  from public.finance_supplier_rollup_v1 fsr
  where (select supplier_has_data from rollup_decision)
  union all
  select
    supplier_id,
    max(supplier_name)::text,
    count(*)::integer,
    coalesce(sum(amount_total), 0)::numeric,
    coalesce(sum(amount_paid), 0)::numeric,
    coalesce(sum(amount_debt), 0)::numeric,
    count(*) filter (where amount_debt > 0)::integer,
    coalesce(sum(amount_debt) filter (where is_overdue), 0)::numeric,
    coalesce(sum(amount_debt) filter (where is_critical), 0)::numeric,
    count(*) filter (where is_overdue)::integer,
    count(*) filter (where is_critical)::integer
  from classified_finance
  where not (select supplier_has_data from rollup_decision)
  group by supplier_id
),
object_finance_rows as (
  select
    fol.object_key,
    fol.object_id,
    fol.object_code,
    fol.object_name,
    fol.invoice_count,
    fol.amount_total as approved_total,
    fol.amount_paid as paid_total,
    fol.amount_debt as debt_total,
    fol.debt_count,
    coalesce((select sum((b->>'amount_debt')::numeric) from jsonb_array_elements(fol.due_buckets) b where (b->>'due_date')::date < current_date), 0)::numeric as overdue_amount,
    coalesce((select sum((b->>'amount_debt')::numeric) from jsonb_array_elements(fol.due_buckets) b where (b->>'due_date')::date < current_date and (current_date - (b->>'due_date')::date) >= (select critical_days from normalized_args)), 0)::numeric as critical_amount,
    coalesce((select count(*) from jsonb_array_elements(fol.due_buckets) b where (b->>'due_date')::date < current_date), 0)::integer as overdue_count,
    coalesce((select count(*) from jsonb_array_elements(fol.due_buckets) b where (b->>'due_date')::date < current_date and (current_date - (b->>'due_date')::date) >= (select critical_days from normalized_args)), 0)::integer as critical_count
  from public.finance_object_rollup_v1 fol
  where (select object_has_data from rollup_decision)
  union all
  select
    coalesce(nullif(btrim(coalesce(object_code, '')), ''), nullif(btrim(coalesce(object_id, '')), ''), md5(lower(coalesce(nullif(btrim(coalesce(object_name, '')), ''), E'\u0411\u0435\u0437 \u043e\u0431\u044a\u0435\u043a\u0442\u0430'))))::text as object_key,
    max(nullif(btrim(coalesce(object_id, '')), '')) as object_id,
    max(nullif(btrim(coalesce(object_code, '')), '')) as object_code,
    max(coalesce(nullif(btrim(coalesce(object_name, '')), ''), E'\u0411\u0435\u0437 \u043e\u0431\u044a\u0435\u043a\u0442\u0430'))::text as object_name,
    count(*)::integer,
    coalesce(sum(amount_total), 0)::numeric,
    coalesce(sum(amount_paid), 0)::numeric,
    coalesce(sum(amount_debt), 0)::numeric,
    count(*) filter (where amount_debt > 0)::integer,
    coalesce(sum(amount_debt) filter (where is_overdue), 0)::numeric,
    coalesce(sum(amount_debt) filter (where is_critical), 0)::numeric,
    count(*) filter (where is_overdue)::integer,
    count(*) filter (where is_critical)::integer
  from classified_finance
  where not (select object_has_data from rollup_decision)
  group by 1
),
proposal_scope_for_spend as (
  select pi.proposal_id::text, min(ri.request_id::text) filter (where ri.request_id is not null) as request_id
  from public.proposal_items pi left join public.request_items ri on ri.id::text = pi.request_item_id::text
  group by pi.proposal_id::text
),
request_identity_for_spend as (
  select roi.request_id::text, nullif(btrim(coalesce(roi.construction_object_code, '')), '') as object_code, nullif(btrim(coalesce(roi.construction_object_name, '')), '') as object_name, nullif(btrim(coalesce(req.object_id::text, '')), '') as legacy_object_id
  from public.request_object_identity_scope_v1 roi left join public.requests req on req.id::text = roi.request_id::text
),
purchase_scope_for_spend as (
  select p.proposal_id::text, max(nullif(trim(p.object_id::text), '')) as legacy_object_id, max(nullif(trim(p.object_name), '')) as legacy_object_name, max(nullif(trim(p.supplier_id::text), '')) as supplier_id, max(nullif(trim(p.supplier), '')) as supplier_name
  from public.purchases p where p.proposal_id is not null group by p.proposal_id::text
),
spend_base as (
  select
    coalesce(nullif(trim(v.kind_name), ''), E'\u0414\u0440\u0443\u0433\u043e\u0435')::text as kind_name,
    coalesce(nullif(trim(v.supplier), ''), pu.supplier_name, E'\u2014')::text as supplier_name,
    nullif(trim(v.proposal_id::text), '')::text as proposal_id,
    nullif(trim(v.proposal_no), '')::text as proposal_no,
    coalesce(ri.legacy_object_id, pu.legacy_object_id) as object_id,
    ri.object_code, coalesce(ri.object_name, pu.legacy_object_name, E'\u0411\u0435\u0437 \u043e\u0431\u044a\u0435\u043a\u0442\u0430')::text as object_name,
    coalesce(v.approved_alloc, 0)::numeric as approved_alloc,
    coalesce(v.paid_alloc_cap, v.paid_alloc, 0)::numeric as paid_alloc,
    coalesce(v.overpay_alloc, 0)::numeric as overpay_alloc
  from public.v_director_finance_spend_kinds_v3 v
  left join proposal_scope_for_spend ps on ps.proposal_id = nullif(trim(v.proposal_id::text), '')
  left join request_identity_for_spend ri on ri.request_id = ps.request_id
  left join purchase_scope_for_spend pu on pu.proposal_id = nullif(trim(v.proposal_id::text), '')
  where (p_date_from is null or v.director_approved_at::date >= p_date_from)
    and (p_date_to is null or v.director_approved_at::date <= p_date_to)
    and (p_object_id is null or coalesce(ri.legacy_object_id, pu.legacy_object_id) = p_object_id::text)
),
proposal_spend_rows as (
  select proposal_id, greatest(sum(approved_alloc) - sum(paid_alloc), 0)::numeric as to_pay
  from spend_base where proposal_id is not null group by proposal_id
),
kind_supplier_rows as (
  select kind_name, supplier_name, count(*)::integer as count,
    coalesce(sum(approved_alloc), 0)::numeric as approved,
    coalesce(sum(paid_alloc), 0)::numeric as paid,
    coalesce(sum(overpay_alloc), 0)::numeric as overpay
  from spend_base group by kind_name, supplier_name
),
kind_rows as (
  select k.kind_name,
    coalesce(sum(k.approved), 0)::numeric as approved,
    coalesce(sum(k.paid), 0)::numeric as paid,
    coalesce(sum(k.overpay), 0)::numeric as overpay,
    greatest(coalesce(sum(k.approved), 0) - coalesce(sum(k.paid), 0), 0)::numeric as to_pay,
    coalesce((select jsonb_agg(jsonb_build_object('supplier', s.supplier_name, 'approved', s.approved, 'paid', s.paid, 'overpay', s.overpay, 'count', s.count) order by s.approved desc, s.supplier_name asc) from kind_supplier_rows s where s.kind_name = k.kind_name), '[]'::jsonb) as suppliers
  from kind_supplier_rows k group by k.kind_name
),
spend_header as (
  select
    coalesce(sum(approved_alloc), 0)::numeric as approved,
    coalesce(sum(paid_alloc), 0)::numeric as paid,
    coalesce((select sum(psr.to_pay) from proposal_spend_rows psr), 0)::numeric as to_pay,
    coalesce(sum(overpay_alloc), 0)::numeric as overpay
  from spend_base
),
spend_overpay_suppliers as (
  select supplier_name, count(*)::integer as count, coalesce(sum(overpay_alloc), 0)::numeric as overpay
  from spend_base where overpay_alloc > 0 group by supplier_name
),
supplier_overpay_rows as (
  select md5(lower(supplier_name))::text as supplier_id, supplier_name, coalesce(sum(overpay), 0)::numeric as overpayment
  from spend_overpay_suppliers group by supplier_name
),
object_overpay_rows as (
  select
    coalesce(nullif(btrim(coalesce(object_code, '')), ''), nullif(btrim(coalesce(object_id, '')), ''), md5(lower(coalesce(nullif(btrim(coalesce(object_name, '')), ''), E'\u0411\u0435\u0437 \u043e\u0431\u044a\u0435\u043a\u0442\u0430'))))::text as object_key,
    max(nullif(btrim(coalesce(object_id, '')), '')) as object_id,
    max(nullif(btrim(coalesce(object_code, '')), '')) as object_code,
    max(coalesce(nullif(btrim(coalesce(object_name, '')), ''), E'\u0411\u0435\u0437 \u043e\u0431\u044a\u0435\u043a\u0442\u0430'))::text as object_name,
    coalesce(sum(overpay_alloc), 0)::numeric as overpayment
  from spend_base group by 1
),
ordered_rows as (
  select
    cf.request_id, cf.object_id, cf.object_code, cf.object_name,
    cf.supplier_id, cf.supplier_name, cf.proposal_id, cf.proposal_no,
    cf.invoice_number, cf.amount_total, cf.amount_paid, cf.amount_debt,
    cf.due_date, cf.is_overdue, cf.overdue_days,
    case when cf.amount_total > 0 and cf.amount_debt <= 0 then 'paid' when cf.is_overdue then 'overdue' when cf.approved_date is not null then 'approved' else 'pending' end::text as status
  from classified_finance cf
  order by cf.is_overdue desc, cf.due_date asc nulls last, cf.amount_debt desc, cf.supplier_name asc, cf.proposal_id asc nulls last
),
paged_rows as (
  select * from ordered_rows
  offset (select offset_value from normalized_args)
  limit (select limit_value from normalized_args)
)
select jsonb_build_object(
  'document_type', 'director_finance_panel_scope',
  'version', 'v4',
  'canonical', jsonb_build_object(
    'summary', jsonb_build_object(
      'approvedTotal', coalesce((select total_amount from summary_row), 0),
      'paidTotal', coalesce((select total_paid from summary_row), 0),
      'debtTotal', coalesce((select total_debt from summary_row), 0),
      'overpaymentTotal', coalesce((select overpay from spend_header), 0),
      'overdueCount', coalesce((select overdue_count from summary_row), 0),
      'overdueAmount', coalesce((select overdue_amount from summary_row), 0),
      'criticalCount', coalesce((select critical_count from summary_row), 0),
      'criticalAmount', coalesce((select critical_amount from summary_row), 0),
      'debtCount', coalesce((select debt_count from summary_row), 0),
      'partialCount', coalesce((select partial_count from summary_row), 0),
      'partialPaidTotal', coalesce((select partial_paid from summary_row), 0)
    ),
    'suppliers', coalesce(
      (select jsonb_agg(jsonb_build_object(
          'supplierId', sfr.supplier_id,
          'supplierName', sfr.supplier_name,
          'approvedTotal', sfr.approved_total,
          'paidTotal', sfr.paid_total,
          'debtTotal', sfr.debt_total,
          'overpaymentTotal', coalesce(sor.overpayment, 0),
          'invoiceCount', sfr.invoice_count,
          'debtCount', sfr.debt_count,
          'overdueCount', sfr.overdue_count,
          'criticalCount', sfr.critical_count,
          'overdueAmount', sfr.overdue_amount,
          'criticalAmount', sfr.critical_amount
        ) order by sfr.debt_total desc, sfr.supplier_name asc)
       from supplier_finance_rows sfr
       left join supplier_overpay_rows sor on sor.supplier_id = sfr.supplier_id),
      '[]'::jsonb
    ),
    'objects', coalesce(
      (select jsonb_agg(jsonb_build_object(
          'objectKey', ofr.object_key,
          'objectId', ofr.object_id,
          'objectCode', ofr.object_code,
          'objectName', ofr.object_name,
          'approvedTotal', ofr.approved_total,
          'paidTotal', ofr.paid_total,
          'debtTotal', ofr.debt_total,
          'overpaymentTotal', coalesce(oor.overpayment, 0),
          'invoiceCount', ofr.invoice_count,
          'debtCount', ofr.debt_count,
          'overdueCount', ofr.overdue_count,
          'criticalCount', ofr.critical_count,
          'overdueAmount', ofr.overdue_amount,
          'criticalAmount', ofr.critical_amount
        ) order by ofr.debt_total desc, ofr.object_name asc)
       from object_finance_rows ofr
       left join object_overpay_rows oor on oor.object_key = ofr.object_key),
      '[]'::jsonb
    ),
    'spend', jsonb_build_object(
      'header', jsonb_build_object('approved', coalesce((select approved from spend_header), 0), 'paid', coalesce((select paid from spend_header), 0), 'toPay', coalesce((select to_pay from spend_header), 0), 'overpay', coalesce((select overpay from spend_header), 0)),
      'kindRows', coalesce((select jsonb_agg(jsonb_build_object('kind', kr.kind_name, 'approved', kr.approved, 'paid', kr.paid, 'overpay', kr.overpay, 'toPay', kr.to_pay, 'suppliers', kr.suppliers) order by case kr.kind_name when E'\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b\u044b' then 1 when E'\u0420\u0430\u0431\u043e\u0442\u044b' then 2 when E'\u0423\u0441\u043b\u0443\u0433\u0438' then 3 when E'\u0414\u0440\u0443\u0433\u043e\u0435' then 4 else 5 end, kr.approved desc, kr.kind_name asc) from kind_rows kr), '[]'::jsonb),
      'overpaySuppliers', coalesce((select jsonb_agg(jsonb_build_object('supplier', sos.supplier_name, 'approved', 0, 'paid', 0, 'overpay', sos.overpay, 'count', sos.count) order by sos.overpay desc, sos.supplier_name asc) from spend_overpay_suppliers sos), '[]'::jsonb)
    )
  ),
  'rows', coalesce(
    (select jsonb_agg(jsonb_build_object('requestId', pr.request_id, 'objectId', pr.object_id, 'objectCode', pr.object_code, 'objectName', pr.object_name, 'supplierId', pr.supplier_id, 'supplierName', pr.supplier_name, 'proposalId', pr.proposal_id, 'proposalNo', pr.proposal_no, 'invoiceNumber', pr.invoice_number, 'amountTotal', pr.amount_total, 'amountPaid', pr.amount_paid, 'amountDebt', pr.amount_debt, 'dueDate', pr.due_date, 'isOverdue', pr.is_overdue, 'overdueDays', pr.overdue_days, 'status', pr.status) order by pr.is_overdue desc, pr.due_date asc nulls last, pr.amount_debt desc, pr.supplier_name asc, pr.proposal_id asc nulls last) from paged_rows pr),
    '[]'::jsonb
  ),
  'pagination', jsonb_build_object('limit', (select limit_value from normalized_args), 'offset', (select offset_value from normalized_args), 'total', coalesce((select row_count from summary_row), 0)),
  'meta', jsonb_build_object(
    'owner', 'backend',
    'generatedAt', to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'filtersEcho', jsonb_build_object('objectId', p_object_id::text, 'dateFrom', p_date_from, 'dateTo', p_date_to, 'dueDays', (select due_days from normalized_args), 'criticalDays', (select critical_days from normalized_args)),
    'sourceVersion', 'director_finance_panel_scope_v4',
    'financeRowsSource', case when (select has_data from summary_available) then 'finance_proposal_summary_v1' else 'list_accountant_inbox_fact' end,
    'supplierRollupSource', case when (select supplier_has_data from rollup_decision) then 'finance_supplier_rollup_v1' else 'classified_finance_runtime' end,
    'objectRollupSource', case when (select object_has_data from rollup_decision) then 'finance_object_rollup_v1' else 'classified_finance_runtime' end,
    'supplierRollupFallbackReason', (select supplier_fallback_reason from rollup_decision),
    'objectRollupFallbackReason', (select object_fallback_reason from rollup_decision),
    'rollupFreshnessStatus', (select freshness_status from rollup_decision),
    'rollupIsFresh', (select is_fresh from rollup_decision),
    'rollupMaxAgeSeconds', coalesce(((select status_payload from rollup_decision)->>'max_age_seconds')::integer, 900),
    'rollupLastSuccessfulRebuildAt', ((select status_payload from rollup_decision)->>'last_successful_rebuild_at'),
    'rollupLastRebuildStatus', ((select status_payload from rollup_decision)->>'last_rebuild_status'),
    'identitySource', 'request_object_identity_scope_v1',
    'spendRowsSource', 'v_director_finance_spend_kinds_v3',
    'objectGroupingSource', 'stable_object_refs',
    'payloadShapeVersion', 'v4',
    'summaryLayerVersion', case when (select has_data from summary_available) then 'f2_1_v1' else null end,
    'rollupLayerVersion', case when (select supplier_has_data from rollup_decision) and (select object_has_data from rollup_decision) then 'f2_2_v1' else null end,
    'rollupValidationVersion', 'f2_3_v1'
  )
);
$$;

comment on function public.director_finance_panel_scope_v4(uuid, date, date, integer, integer, integer, integer) is
  'F2.3: Director finance panel scope v4 with freshness-aware supplier/object rollup usage. Keeps F2.2 rollup path for fresh unfiltered calls and preserves runtime fallback for filtered/stale/missing/version mismatch cases.';

grant select on public.finance_rollup_rebuild_events_v1 to authenticated;
grant execute on function public.finance_rollups_rebuild_all_v1() to authenticated;
grant execute on function public.finance_rollup_drift_check_v1() to authenticated;
grant execute on function public.finance_rollup_status_v1(integer, integer) to authenticated;
grant execute on function public.finance_rollup_validation_snapshot_v1(integer, integer) to authenticated;
grant execute on function public.director_finance_panel_scope_v4(uuid, date, date, integer, integer, integer, integer) to authenticated;

notify pgrst, 'reload schema';

commit;
