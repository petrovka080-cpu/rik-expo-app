begin;

-- ============================================================================
-- W2 — warehouse_stock_summary_v1
-- Derived per-material stock balance read-model: pre-materializes
-- v_wh_balance_ledger_truth_ui + display name resolution chain so the
-- warehouse stock list reads flat rows instead of re-aggregating movements.
--
-- NOT a source of stock truth. All write paths (receive, issue) continue
-- to write to warehouse_incoming_items / warehouse_issue_items.
-- ============================================================================

-- === 1. Table ===

create table if not exists public.warehouse_stock_summary_v1 (
  code              text        not null,
  uom_id            text        not null default '',
  qty_available     numeric     not null default 0,
  display_name      text        not null default E'\u2014',
  updated_at        timestamptz,
  projection_version  integer     not null default 1,
  rebuilt_at          timestamptz not null default now(),

  constraint pk_wss_v1 primary key (code, uom_id)
);

comment on table public.warehouse_stock_summary_v1 is
  'W2 derived per-material stock balance summary. Read-only projection from v_wh_balance_ledger_truth_ui + name resolution chain. NOT a source of stock truth. Rebuild via warehouse_stock_summary_rebuild_all_v1().';

-- === 2. Indexes ===

create index if not exists idx_wss_v1_code_upper
  on public.warehouse_stock_summary_v1 (upper(code));

create index if not exists idx_wss_v1_rebuilt_at
  on public.warehouse_stock_summary_v1 (rebuilt_at);

-- === 3. Full Rebuild Function ===

create or replace function public.warehouse_stock_summary_rebuild_all_v1()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $fn$
declare
  v_before_count integer;
  v_after_count integer;
  v_started_at timestamptz := clock_timestamp();
begin
  select count(*) into v_before_count from warehouse_stock_summary_v1;

  truncate table warehouse_stock_summary_v1;

  insert into warehouse_stock_summary_v1 (
    code, uom_id, qty_available, display_name, updated_at,
    projection_version, rebuilt_at
  )
  with projection_map as (
    select
      upper(trim(code)) as code_key,
      nullif(trim(display_name), '') as display_name
    from public.warehouse_name_map_ui
    where nullif(trim(code), '') is not null
  ),
  override_map as (
    select
      upper(trim(code)) as code_key,
      nullif(trim(name_ru), '') as name_ru
    from public.catalog_name_overrides
    where nullif(trim(code), '') is not null
  ),
  ledger_ui_map as (
    select distinct on (upper(trim(code)))
      upper(trim(code)) as code_key,
      nullif(trim(name), '') as name_ui
    from public.v_wh_balance_ledger_ui
    where nullif(trim(code), '') is not null
    order by upper(trim(code)), updated_at desc nulls last
  )
  select
    trim(v.code) as code,
    coalesce(nullif(trim(v.uom_id), ''), '') as uom_id,
    coalesce(v.qty_available, 0)::numeric as qty_available,
    coalesce(
      pm.display_name,
      om.name_ru,
      lm.name_ui,
      trim(v.code),
      E'\u2014'
    ) as display_name,
    v.updated_at,
    1,
    now()
  from public.v_wh_balance_ledger_truth_ui v
  left join projection_map pm
    on pm.code_key = upper(trim(v.code))
  left join override_map om
    on om.code_key = upper(trim(v.code))
  left join ledger_ui_map lm
    on lm.code_key = upper(trim(v.code))
  where nullif(trim(v.code), '') is not null;

  select count(*) into v_after_count from warehouse_stock_summary_v1;

  return jsonb_build_object(
    'status', 'ok',
    'before_count', v_before_count,
    'after_count', v_after_count,
    'duration_ms', extract(milliseconds from clock_timestamp() - v_started_at)::integer,
    'rebuilt_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'strategy', 'full_truncate_rebuild'
  );
end;
$fn$;

comment on function public.warehouse_stock_summary_rebuild_all_v1() is
  'W2 full rebuild of warehouse_stock_summary_v1. Truncates and repopulates from v_wh_balance_ledger_truth_ui + name resolution chain.';

-- === 4. Drift Check Function ===

create or replace function public.warehouse_stock_summary_drift_check_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v_drift_count integer := 0;
  v_total_count integer := 0;
  v_summary_count integer := 0;
  v_raw_count integer := 0;
  v_started_at timestamptz := clock_timestamp();
begin
  select count(*) into v_summary_count from warehouse_stock_summary_v1;

  select count(*)
  into v_raw_count
  from public.v_wh_balance_ledger_truth_ui v
  where nullif(trim(v.code), '') is not null;

  with raw_balance as (
    select
      trim(v.code) as code,
      coalesce(nullif(trim(v.uom_id), ''), '') as uom_id,
      coalesce(v.qty_available, 0)::numeric as qty_available
    from public.v_wh_balance_ledger_truth_ui v
    where nullif(trim(v.code), '') is not null
  )
  select
    count(*) filter (where wss.qty_available != rb.qty_available),
    count(*)
  into v_drift_count, v_total_count
  from warehouse_stock_summary_v1 wss
  join raw_balance rb
    on rb.code = wss.code
    and rb.uom_id = wss.uom_id;

  return jsonb_build_object(
    'status', case when v_drift_count = 0 and abs(v_summary_count - v_raw_count) = 0 then 'GREEN' else 'DRIFT_DETECTED' end,
    'drift_count', v_drift_count,
    'total_compared', v_total_count,
    'summary_count', v_summary_count,
    'raw_count', v_raw_count,
    'count_mismatch', abs(v_summary_count - v_raw_count),
    'duration_ms', extract(milliseconds from clock_timestamp() - v_started_at)::integer,
    'checked_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
end;
$fn$;

comment on function public.warehouse_stock_summary_drift_check_v1() is
  'W2 drift check: compares warehouse_stock_summary_v1 qty_available against raw v_wh_balance_ledger_truth_ui. Returns GREEN if zero drift.';

-- === 5. Grants ===

grant select on public.warehouse_stock_summary_v1 to authenticated;
grant execute on function public.warehouse_stock_summary_rebuild_all_v1() to authenticated;
grant execute on function public.warehouse_stock_summary_drift_check_v1() to authenticated;

-- === 6. Initial backfill ===

select public.warehouse_stock_summary_rebuild_all_v1();

notify pgrst, 'reload schema';

commit;
