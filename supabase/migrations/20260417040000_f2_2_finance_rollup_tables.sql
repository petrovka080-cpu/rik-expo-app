begin;

-- ============================================================================
-- F2.2 — finance_supplier_rollup_v1 + finance_object_rollup_v1
--
-- Derived per-supplier and per-object finance aggregates, built on top of
-- finance_proposal_summary_v1. Pre-aggregates date-independent totals;
-- stores due_date+amount_debt buckets for cheap runtime overdue/critical
-- classification without re-scanning all proposals.
--
-- NOT a source of financial truth. Authoritative money truth remains in:
--   list_accountant_inbox_fact  (payment/invoice source)
--   finance_proposal_summary_v1 (per-proposal derived basis)
-- Overdue/critical classification stays runtime (depends on current_date).
-- ============================================================================

-- === 1. Supplier Rollup Table ===

create table if not exists public.finance_supplier_rollup_v1 (
  supplier_id         text        not null,
  supplier_name       text        not null default E'\u2014',
  amount_total        numeric     not null default 0,
  amount_paid         numeric     not null default 0,
  amount_debt         numeric     not null default 0,
  invoice_count       integer     not null default 0,
  debt_count          integer     not null default 0,
  due_buckets         jsonb       not null default '[]',
  projection_version  integer     not null default 1,
  rebuilt_at          timestamptz not null default now(),

  constraint pk_fsr_v1 primary key (supplier_id)
);

comment on table public.finance_supplier_rollup_v1 is
  'F2.2 derived per-supplier finance rollup. Built from finance_proposal_summary_v1. NOT a source of financial truth. Overdue/critical computed at runtime from due_buckets. Rebuild via finance_supplier_rollup_rebuild_v1().';

-- === 2. Object Rollup Table ===

create table if not exists public.finance_object_rollup_v1 (
  object_key          text        not null,
  object_id           text,
  object_code         text,
  object_name         text        not null default E'\u0411\u0435\u0437 \u043e\u0431\u044a\u0435\u043a\u0442\u0430',
  amount_total        numeric     not null default 0,
  amount_paid         numeric     not null default 0,
  amount_debt         numeric     not null default 0,
  invoice_count       integer     not null default 0,
  debt_count          integer     not null default 0,
  due_buckets         jsonb       not null default '[]',
  projection_version  integer     not null default 1,
  rebuilt_at          timestamptz not null default now(),

  constraint pk_for_v1 primary key (object_key)
);

comment on table public.finance_object_rollup_v1 is
  'F2.2 derived per-object finance rollup. Built from finance_proposal_summary_v1. NOT a source of financial truth. Overdue/critical computed at runtime from due_buckets. Rebuild via finance_object_rollup_rebuild_v1().';

-- === 3. Indexes ===

create index if not exists idx_fsr_v1_debt_total
  on public.finance_supplier_rollup_v1 (amount_debt desc);

create index if not exists idx_fsr_v1_rebuilt_at
  on public.finance_supplier_rollup_v1 (rebuilt_at);

create index if not exists idx_for_v1_debt_total
  on public.finance_object_rollup_v1 (amount_debt desc);

create index if not exists idx_for_v1_rebuilt_at
  on public.finance_object_rollup_v1 (rebuilt_at);

-- === 4. Supplier Rollup Rebuild ===

create or replace function public.finance_supplier_rollup_rebuild_v1()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $fn$
declare
  v_before integer; v_after integer; v_started timestamptz := clock_timestamp();
begin
  select count(*) into v_before from finance_supplier_rollup_v1;
  truncate table finance_supplier_rollup_v1;

  insert into finance_supplier_rollup_v1 (
    supplier_id, supplier_name,
    amount_total, amount_paid, amount_debt,
    invoice_count, debt_count,
    due_buckets, projection_version, rebuilt_at
  )
  select
    fps.supplier_id,
    max(fps.supplier_name)::text,
    coalesce(sum(fps.amount_total), 0)::numeric,
    coalesce(sum(fps.amount_paid), 0)::numeric,
    coalesce(sum(fps.amount_debt), 0)::numeric,
    count(*)::integer,
    count(*) filter (where fps.amount_debt > 0)::integer,
    coalesce(
      jsonb_agg(
        jsonb_build_object('due_date', fps.due_date, 'amount_debt', fps.amount_debt)
        order by fps.due_date asc nulls last
      ) filter (where fps.amount_debt > 0 and fps.due_date is not null),
      '[]'::jsonb
    ),
    1,
    now()
  from public.finance_proposal_summary_v1 fps
  where fps.supplier_id is not null
  group by fps.supplier_id;

  select count(*) into v_after from finance_supplier_rollup_v1;
  return jsonb_build_object(
    'status', 'ok',
    'before_count', v_before,
    'after_count', v_after,
    'duration_ms', extract(milliseconds from clock_timestamp() - v_started)::integer,
    'rebuilt_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'strategy', 'full_truncate_rebuild'
  );
end;
$fn$;

-- === 5. Object Rollup Rebuild ===

create or replace function public.finance_object_rollup_rebuild_v1()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $fn$
declare
  v_before integer; v_after integer; v_started timestamptz := clock_timestamp();
begin
  select count(*) into v_before from finance_object_rollup_v1;
  truncate table finance_object_rollup_v1;

  insert into finance_object_rollup_v1 (
    object_key, object_id, object_code, object_name,
    amount_total, amount_paid, amount_debt,
    invoice_count, debt_count,
    due_buckets, projection_version, rebuilt_at
  )
  select
    coalesce(
      nullif(btrim(coalesce(fps.object_code, '')), ''),
      nullif(btrim(coalesce(fps.object_id, '')), ''),
      md5(lower(coalesce(nullif(btrim(coalesce(fps.object_name, '')), ''), E'\u0411\u0435\u0437 \u043e\u0431\u044a\u0435\u043a\u0442\u0430')))
    )::text as object_key,
    max(nullif(btrim(coalesce(fps.object_id, '')), '')) as object_id,
    max(nullif(btrim(coalesce(fps.object_code, '')), '')) as object_code,
    max(coalesce(nullif(btrim(coalesce(fps.object_name, '')), ''), E'\u0411\u0435\u0437 \u043e\u0431\u044a\u0435\u043a\u0442\u0430'))::text,
    coalesce(sum(fps.amount_total), 0)::numeric,
    coalesce(sum(fps.amount_paid), 0)::numeric,
    coalesce(sum(fps.amount_debt), 0)::numeric,
    count(*)::integer,
    count(*) filter (where fps.amount_debt > 0)::integer,
    coalesce(
      jsonb_agg(
        jsonb_build_object('due_date', fps.due_date, 'amount_debt', fps.amount_debt)
        order by fps.due_date asc nulls last
      ) filter (where fps.amount_debt > 0 and fps.due_date is not null),
      '[]'::jsonb
    ),
    1,
    now()
  from public.finance_proposal_summary_v1 fps
  group by 1;

  select count(*) into v_after from finance_object_rollup_v1;
  return jsonb_build_object(
    'status', 'ok',
    'before_count', v_before,
    'after_count', v_after,
    'duration_ms', extract(milliseconds from clock_timestamp() - v_started)::integer,
    'rebuilt_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'strategy', 'full_truncate_rebuild'
  );
end;
$fn$;

-- === 6. Combined Rollup Rebuild ===

create or replace function public.finance_rollups_rebuild_all_v1()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $fn$
declare
  v_proposal jsonb; v_supplier jsonb; v_object jsonb;
  v_started timestamptz := clock_timestamp();
begin
  v_proposal := public.finance_proposal_summary_rebuild_all_v1();
  v_supplier := public.finance_supplier_rollup_rebuild_v1();
  v_object   := public.finance_object_rollup_rebuild_v1();
  return jsonb_build_object(
    'status', 'ok',
    'duration_ms', extract(milliseconds from clock_timestamp() - v_started)::integer,
    'rebuilt_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'proposal_layer', v_proposal,
    'supplier_layer', v_supplier,
    'object_layer',   v_object
  );
end;
$fn$;

-- === 7. Drift Check ===

create or replace function public.finance_rollup_drift_check_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v_supplier_drift integer := 0;
  v_object_drift   integer := 0;
  v_supplier_count integer := 0;
  v_object_count   integer := 0;
  v_started timestamptz := clock_timestamp();
begin
  select count(*) into v_supplier_count from finance_supplier_rollup_v1;
  select count(*) into v_object_count   from finance_object_rollup_v1;

  -- Supplier drift: compare rollup totals vs direct aggregation from summary,
  -- including missing/extra rows on either side.
  with raw_supplier as (
    select
      supplier_id,
      coalesce(sum(amount_total), 0)::numeric as amount_total,
      coalesce(sum(amount_paid),  0)::numeric as amount_paid,
      coalesce(sum(amount_debt),  0)::numeric as amount_debt
    from finance_proposal_summary_v1
      where supplier_id is not null
      group by supplier_id
    )
  select count(*) into v_supplier_drift
  from finance_supplier_rollup_v1 fsr
  full outer join raw_supplier rs on rs.supplier_id = fsr.supplier_id
  where fsr.supplier_id is null
     or rs.supplier_id is null
     or fsr.amount_total != rs.amount_total
     or fsr.amount_paid  != rs.amount_paid
     or fsr.amount_debt  != rs.amount_debt;

  -- Object drift: compare rollup totals vs direct aggregation from summary,
  -- including missing/extra rows on either side.
  with raw_object as (
    select
      coalesce(
        nullif(btrim(coalesce(object_code, '')), ''),
        nullif(btrim(coalesce(object_id,   '')), ''),
        md5(lower(coalesce(nullif(btrim(coalesce(object_name, '')), ''), E'\u0411\u0435\u0437 \u043e\u0431\u044a\u0435\u043a\u0442\u0430')))
      )::text as object_key,
      coalesce(sum(amount_total), 0)::numeric as amount_total,
      coalesce(sum(amount_paid),  0)::numeric as amount_paid,
      coalesce(sum(amount_debt),  0)::numeric as amount_debt
    from finance_proposal_summary_v1
      group by 1
    )
  select count(*) into v_object_drift
  from finance_object_rollup_v1 fol
  full outer join raw_object ro on ro.object_key = fol.object_key
  where fol.object_key is null
     or ro.object_key is null
     or fol.amount_total != ro.amount_total
     or fol.amount_paid  != ro.amount_paid
     or fol.amount_debt  != ro.amount_debt;

  return jsonb_build_object(
    'status', case when v_supplier_drift = 0 and v_object_drift = 0 then 'GREEN' else 'DRIFT_DETECTED' end,
    'supplier_drift_count', v_supplier_drift,
    'object_drift_count',   v_object_drift,
    'supplier_rollup_count', v_supplier_count,
    'object_rollup_count',   v_object_count,
    'duration_ms', extract(milliseconds from clock_timestamp() - v_started)::integer,
    'checked_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
end;
$fn$;

-- === 8. Grants ===

grant select on public.finance_supplier_rollup_v1 to authenticated;
grant select on public.finance_object_rollup_v1   to authenticated;
grant execute on function public.finance_supplier_rollup_rebuild_v1() to authenticated;
grant execute on function public.finance_object_rollup_rebuild_v1()   to authenticated;
grant execute on function public.finance_rollups_rebuild_all_v1()      to authenticated;
grant execute on function public.finance_rollup_drift_check_v1()       to authenticated;

-- === 9. Initial backfill ===

select public.finance_supplier_rollup_rebuild_v1();
select public.finance_object_rollup_rebuild_v1();

notify pgrst, 'reload schema';

commit;
