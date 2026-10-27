begin;

-- ============================================================================
-- F2.1 — finance_proposal_summary_v1
-- Derived per-proposal read-model: pre-materializes the finance_base CTE from
-- director_finance_panel_scope_v4 so the director panel can read pre-computed
-- per-proposal totals instead of re-joining 5 tables on every call.
--
-- NOT a source of financial truth. All write paths (payment_apply, allocation,
-- etc.) continue to write to their authoritative tables.
-- ============================================================================

-- === 1. Table ===

create table if not exists public.finance_proposal_summary_v1 (
  proposal_id       text      not null primary key,

  request_id        text,
  object_id         text,
  object_code       text,
  object_name       text,
  supplier_id       text,
  supplier_name     text,
  proposal_no       text,
  invoice_number    text,

  amount_total      numeric   not null default 0,
  amount_paid       numeric   not null default 0,
  amount_debt       numeric   not null default 0,

  approved_date     date,
  invoice_date      date,
  due_date          date,

  spend_approved    numeric   not null default 0,
  spend_paid        numeric   not null default 0,
  spend_overpay     numeric   not null default 0,
  spend_to_pay      numeric   not null default 0,

  projection_version  integer     not null default 1,
  rebuilt_at          timestamptz not null default now(),
  source_snapshot_id  text,

  constraint chk_fps_v1_amount_debt_nonneg check (amount_debt >= 0),
  constraint chk_fps_v1_spend_to_pay_nonneg check (spend_to_pay >= 0)
);

comment on table public.finance_proposal_summary_v1 is
  'F2.1 derived per-proposal finance summary. Read-only projection from list_accountant_inbox_fact + v_director_finance_spend_kinds_v3. NOT a source of financial truth. Rebuild via finance_proposal_summary_rebuild_all_v1().';

-- === 2. Indexes ===

create index if not exists idx_fps_v1_object_id
  on public.finance_proposal_summary_v1 (object_id)
  where object_id is not null;

create index if not exists idx_fps_v1_approved_date
  on public.finance_proposal_summary_v1 (approved_date)
  where approved_date is not null;

create index if not exists idx_fps_v1_supplier_id
  on public.finance_proposal_summary_v1 (supplier_id)
  where supplier_id is not null;

create index if not exists idx_fps_v1_rebuilt_at
  on public.finance_proposal_summary_v1 (rebuilt_at);

-- === 3. Full Rebuild Function ===

create or replace function public.finance_proposal_summary_rebuild_all_v1()
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
  select count(*) into v_before_count from finance_proposal_summary_v1;

  truncate table finance_proposal_summary_v1;

  insert into finance_proposal_summary_v1 (
    proposal_id, request_id, object_id, object_code, object_name,
    supplier_id, supplier_name, proposal_no, invoice_number,
    amount_total, amount_paid, amount_debt,
    approved_date, invoice_date, due_date,
    spend_approved, spend_paid, spend_overpay, spend_to_pay,
    projection_version, rebuilt_at, source_snapshot_id
  )
  with proposal_scope as (
    select
      pi.proposal_id::text as proposal_id,
      min(ri.request_id::text) filter (where ri.request_id is not null) as request_id
    from public.proposal_items pi
    left join public.request_items ri on ri.id::text = pi.request_item_id::text
    group by pi.proposal_id::text
  ),
  request_identity as (
    select
      roi.request_id::text as request_id,
      nullif(btrim(coalesce(roi.construction_object_code, '')), '') as object_code,
      nullif(btrim(coalesce(roi.construction_object_name, '')), '') as object_name,
      nullif(btrim(coalesce(req.object_id::text, '')), '') as legacy_object_id
    from public.request_object_identity_scope_v1 roi
    left join public.requests req on req.id::text = roi.request_id::text
  ),
  purchase_scope as (
    select
      p.proposal_id::text as proposal_id,
      max(nullif(trim(p.object_id::text), '')) as legacy_object_id,
      max(nullif(trim(p.object_name), '')) as legacy_object_name,
      max(nullif(trim(p.supplier_id::text), '')) as supplier_id,
      max(nullif(trim(p.supplier), '')) as supplier_name
    from public.purchases p
    where p.proposal_id is not null
    group by p.proposal_id::text
  ),
  invoice_rows as (
    select
      coalesce(
        nullif(trim(coalesce(src.row_json->>'proposal_id', src.row_json->>'proposalId')), ''),
        nullif(trim(coalesce(src.row_json->>'id', '')), '')
      ) as proposal_id,
      coalesce(
        nullif(trim(coalesce(src.row_json->>'request_id', '')), ''),
        ps.request_id
      ) as request_id,
      coalesce(
        ri.legacy_object_id,
        pu.legacy_object_id,
        nullif(trim(coalesce(src.row_json->>'object_id', '')), '')
      ) as object_id,
      coalesce(
        ri.object_code,
        nullif(trim(coalesce(src.row_json->>'object_code', '')), '')
      ) as object_code,
      coalesce(
        ri.object_name,
        pu.legacy_object_name,
        nullif(trim(coalesce(src.row_json->>'object_name', '')), ''),
        E'\u0411\u0435\u0437 \u043e\u0431\u044a\u0435\u043a\u0442\u0430'
      )::text as object_name,
      coalesce(
        nullif(trim(coalesce(src.row_json->>'supplier_id', '')), ''),
        pu.supplier_id,
        md5(lower(coalesce(
          nullif(trim(src.row_json->>'supplier'), ''),
          pu.supplier_name,
          E'\u2014'
        )))
      ) as supplier_id,
      coalesce(
        nullif(trim(src.row_json->>'supplier'), ''),
        pu.supplier_name,
        E'\u2014'
      )::text as supplier_name,
      coalesce(
        nullif(trim(src.row_json->>'proposal_no'), ''),
        nullif(trim(src.row_json->>'proposalNo'), ''),
        nullif(trim(src.row_json->>'pretty'), '')
      ) as proposal_no,
      coalesce(
        nullif(trim(src.row_json->>'invoice_number'), ''),
        nullif(trim(src.row_json->>'invoiceNumber'), '')
      ) as invoice_number,
      coalesce(nullif(trim(src.row_json->>'invoice_amount'), '')::numeric, 0)::numeric as amount_total,
      coalesce(nullif(trim(src.row_json->>'total_paid'), '')::numeric, 0)::numeric as amount_paid,
      greatest(
        coalesce(nullif(trim(src.row_json->>'invoice_amount'), '')::numeric, 0)
        - coalesce(nullif(trim(src.row_json->>'total_paid'), '')::numeric, 0),
        0
      )::numeric as amount_debt,
      coalesce(
        nullif(trim(src.row_json->>'director_approved_at'), '')::timestamptz::date,
        nullif(trim(src.row_json->>'approved_at'), '')::timestamptz::date,
        nullif(trim(src.row_json->>'sent_to_accountant_at'), '')::timestamptz::date,
        nullif(trim(src.row_json->>'invoice_date'), '')::date
      ) as approved_date,
      coalesce(
        nullif(trim(src.row_json->>'invoice_date'), '')::date,
        nullif(trim(src.row_json->>'invoiceDate'), '')::date
      ) as invoice_date,
      coalesce(
        nullif(trim(src.row_json->>'due_date'), '')::date,
        (coalesce(
          nullif(trim(src.row_json->>'invoice_date'), '')::date,
          nullif(trim(src.row_json->>'invoiceDate'), '')::date,
          nullif(trim(src.row_json->>'director_approved_at'), '')::timestamptz::date,
          nullif(trim(src.row_json->>'approved_at'), '')::timestamptz::date,
          nullif(trim(src.row_json->>'sent_to_accountant_at'), '')::timestamptz::date
        ) + 7)
      ) as due_date
    from public.list_accountant_inbox_fact(null) as src(row_json)
    left join proposal_scope ps
      on ps.proposal_id = nullif(trim(coalesce(src.row_json->>'proposal_id', src.row_json->>'proposalId')), '')
    left join request_identity ri
      on ri.request_id = coalesce(
        nullif(trim(coalesce(src.row_json->>'request_id', '')), ''),
        ps.request_id
      )
    left join purchase_scope pu
      on pu.proposal_id = nullif(trim(coalesce(src.row_json->>'proposal_id', src.row_json->>'proposalId')), '')
  ),
  spend_per_proposal as (
    select
      nullif(trim(v.proposal_id::text), '')::text as proposal_id,
      coalesce(sum(coalesce(v.approved_alloc, 0)), 0)::numeric as spend_approved,
      coalesce(sum(coalesce(v.paid_alloc_cap, v.paid_alloc, 0)), 0)::numeric as spend_paid,
      coalesce(sum(coalesce(v.overpay_alloc, 0)), 0)::numeric as spend_overpay
    from public.v_director_finance_spend_kinds_v3 v
    where v.proposal_id is not null
    group by nullif(trim(v.proposal_id::text), '')
  )
  select
    ir.proposal_id,
    ir.request_id,
    ir.object_id,
    ir.object_code,
    ir.object_name,
    ir.supplier_id,
    ir.supplier_name,
    ir.proposal_no,
    ir.invoice_number,
    ir.amount_total,
    ir.amount_paid,
    ir.amount_debt,
    ir.approved_date,
    ir.invoice_date,
    ir.due_date,
    coalesce(sp.spend_approved, 0),
    coalesce(sp.spend_paid, 0),
    coalesce(sp.spend_overpay, 0),
    greatest(coalesce(sp.spend_approved, 0) - coalesce(sp.spend_paid, 0), 0),
    1,
    now(),
    null
  from invoice_rows ir
  left join spend_per_proposal sp on sp.proposal_id = ir.proposal_id
  where ir.proposal_id is not null;

  select count(*) into v_after_count from finance_proposal_summary_v1;

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

comment on function public.finance_proposal_summary_rebuild_all_v1() is
  'F2.1 full rebuild of finance_proposal_summary_v1. Truncates and repopulates from list_accountant_inbox_fact + v_director_finance_spend_kinds_v3.';

-- === 4. Single-Proposal Rebuild Function ===

create or replace function public.finance_proposal_summary_rebuild_one_v1(
  p_proposal_id text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $fn$
declare
  v_existed boolean := false;
  v_old_version integer := 0;
begin
  if p_proposal_id is null or btrim(p_proposal_id) = '' then
    return jsonb_build_object('status', 'error', 'reason', 'proposal_id is null or empty');
  end if;

  select true, projection_version
  into v_existed, v_old_version
  from finance_proposal_summary_v1
  where proposal_id = p_proposal_id;

  delete from finance_proposal_summary_v1
  where proposal_id = p_proposal_id;

  insert into finance_proposal_summary_v1 (
    proposal_id, request_id, object_id, object_code, object_name,
    supplier_id, supplier_name, proposal_no, invoice_number,
    amount_total, amount_paid, amount_debt,
    approved_date, invoice_date, due_date,
    spend_approved, spend_paid, spend_overpay, spend_to_pay,
    projection_version, rebuilt_at, source_snapshot_id
  )
  with proposal_scope as (
    select
      pi.proposal_id::text as proposal_id,
      min(ri.request_id::text) filter (where ri.request_id is not null) as request_id
    from public.proposal_items pi
    left join public.request_items ri on ri.id::text = pi.request_item_id::text
    where pi.proposal_id::text = p_proposal_id
    group by pi.proposal_id::text
  ),
  request_identity as (
    select
      roi.request_id::text as request_id,
      nullif(btrim(coalesce(roi.construction_object_code, '')), '') as object_code,
      nullif(btrim(coalesce(roi.construction_object_name, '')), '') as object_name,
      nullif(btrim(coalesce(req.object_id::text, '')), '') as legacy_object_id
    from public.request_object_identity_scope_v1 roi
    left join public.requests req on req.id::text = roi.request_id::text
  ),
  purchase_scope as (
    select
      p.proposal_id::text as proposal_id,
      max(nullif(trim(p.object_id::text), '')) as legacy_object_id,
      max(nullif(trim(p.object_name), '')) as legacy_object_name,
      max(nullif(trim(p.supplier_id::text), '')) as supplier_id,
      max(nullif(trim(p.supplier), '')) as supplier_name
    from public.purchases p
    where p.proposal_id is not null
      and p.proposal_id::text = p_proposal_id
    group by p.proposal_id::text
  ),
  invoice_rows as (
    select
      coalesce(
        nullif(trim(coalesce(src.row_json->>'proposal_id', src.row_json->>'proposalId')), ''),
        nullif(trim(coalesce(src.row_json->>'id', '')), '')
      ) as proposal_id,
      coalesce(
        nullif(trim(coalesce(src.row_json->>'request_id', '')), ''),
        ps.request_id
      ) as request_id,
      coalesce(
        ri.legacy_object_id,
        pu.legacy_object_id,
        nullif(trim(coalesce(src.row_json->>'object_id', '')), '')
      ) as object_id,
      coalesce(
        ri.object_code,
        nullif(trim(coalesce(src.row_json->>'object_code', '')), '')
      ) as object_code,
      coalesce(
        ri.object_name,
        pu.legacy_object_name,
        nullif(trim(coalesce(src.row_json->>'object_name', '')), ''),
        E'\u0411\u0435\u0437 \u043e\u0431\u044a\u0435\u043a\u0442\u0430'
      )::text as object_name,
      coalesce(
        nullif(trim(coalesce(src.row_json->>'supplier_id', '')), ''),
        pu.supplier_id,
        md5(lower(coalesce(
          nullif(trim(src.row_json->>'supplier'), ''),
          pu.supplier_name,
          E'\u2014'
        )))
      ) as supplier_id,
      coalesce(
        nullif(trim(src.row_json->>'supplier'), ''),
        pu.supplier_name,
        E'\u2014'
      )::text as supplier_name,
      coalesce(
        nullif(trim(src.row_json->>'proposal_no'), ''),
        nullif(trim(src.row_json->>'proposalNo'), ''),
        nullif(trim(src.row_json->>'pretty'), '')
      ) as proposal_no,
      coalesce(
        nullif(trim(src.row_json->>'invoice_number'), ''),
        nullif(trim(src.row_json->>'invoiceNumber'), '')
      ) as invoice_number,
      coalesce(nullif(trim(src.row_json->>'invoice_amount'), '')::numeric, 0)::numeric as amount_total,
      coalesce(nullif(trim(src.row_json->>'total_paid'), '')::numeric, 0)::numeric as amount_paid,
      greatest(
        coalesce(nullif(trim(src.row_json->>'invoice_amount'), '')::numeric, 0)
        - coalesce(nullif(trim(src.row_json->>'total_paid'), '')::numeric, 0),
        0
      )::numeric as amount_debt,
      coalesce(
        nullif(trim(src.row_json->>'director_approved_at'), '')::timestamptz::date,
        nullif(trim(src.row_json->>'approved_at'), '')::timestamptz::date,
        nullif(trim(src.row_json->>'sent_to_accountant_at'), '')::timestamptz::date,
        nullif(trim(src.row_json->>'invoice_date'), '')::date
      ) as approved_date,
      coalesce(
        nullif(trim(src.row_json->>'invoice_date'), '')::date,
        nullif(trim(src.row_json->>'invoiceDate'), '')::date
      ) as invoice_date,
      coalesce(
        nullif(trim(src.row_json->>'due_date'), '')::date,
        (coalesce(
          nullif(trim(src.row_json->>'invoice_date'), '')::date,
          nullif(trim(src.row_json->>'invoiceDate'), '')::date,
          nullif(trim(src.row_json->>'director_approved_at'), '')::timestamptz::date,
          nullif(trim(src.row_json->>'approved_at'), '')::timestamptz::date,
          nullif(trim(src.row_json->>'sent_to_accountant_at'), '')::timestamptz::date
        ) + 7)
      ) as due_date
    from public.list_accountant_inbox_fact(null) as src(row_json)
    left join proposal_scope ps
      on ps.proposal_id = nullif(trim(coalesce(src.row_json->>'proposal_id', src.row_json->>'proposalId')), '')
    left join request_identity ri
      on ri.request_id = coalesce(
        nullif(trim(coalesce(src.row_json->>'request_id', '')), ''),
        ps.request_id
      )
    left join purchase_scope pu
      on pu.proposal_id = nullif(trim(coalesce(src.row_json->>'proposal_id', src.row_json->>'proposalId')), '')
    where coalesce(
      nullif(trim(coalesce(src.row_json->>'proposal_id', src.row_json->>'proposalId')), ''),
      nullif(trim(coalesce(src.row_json->>'id', '')), '')
    ) = p_proposal_id
  ),
  spend_per_proposal as (
    select
      nullif(trim(v.proposal_id::text), '')::text as proposal_id,
      coalesce(sum(coalesce(v.approved_alloc, 0)), 0)::numeric as spend_approved,
      coalesce(sum(coalesce(v.paid_alloc_cap, v.paid_alloc, 0)), 0)::numeric as spend_paid,
      coalesce(sum(coalesce(v.overpay_alloc, 0)), 0)::numeric as spend_overpay
    from public.v_director_finance_spend_kinds_v3 v
    where v.proposal_id is not null
      and v.proposal_id::text = p_proposal_id
    group by nullif(trim(v.proposal_id::text), '')
  )
  select
    ir.proposal_id,
    ir.request_id,
    ir.object_id,
    ir.object_code,
    ir.object_name,
    ir.supplier_id,
    ir.supplier_name,
    ir.proposal_no,
    ir.invoice_number,
    ir.amount_total,
    ir.amount_paid,
    ir.amount_debt,
    ir.approved_date,
    ir.invoice_date,
    ir.due_date,
    coalesce(sp.spend_approved, 0),
    coalesce(sp.spend_paid, 0),
    coalesce(sp.spend_overpay, 0),
    greatest(coalesce(sp.spend_approved, 0) - coalesce(sp.spend_paid, 0), 0),
    coalesce(v_old_version, 0) + 1,
    now(),
    null
  from invoice_rows ir
  left join spend_per_proposal sp on sp.proposal_id = ir.proposal_id
  where ir.proposal_id is not null;

  return jsonb_build_object(
    'status', 'ok',
    'proposal_id', p_proposal_id,
    'was_existing', coalesce(v_existed, false),
    'new_version', coalesce(v_old_version, 0) + 1,
    'rebuilt_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
end;
$fn$;

comment on function public.finance_proposal_summary_rebuild_one_v1(text) is
  'F2.1 single-proposal rebuild of finance_proposal_summary_v1. Deletes and reinserts one proposal from raw truth.';

-- === 5. Drift Check Function ===

create or replace function public.finance_proposal_summary_drift_check_v1()
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
  v_missing_in_summary integer := 0;
  v_extra_in_summary integer := 0;
  v_started_at timestamptz := clock_timestamp();
begin
  select count(*) into v_summary_count from finance_proposal_summary_v1;

  -- Count raw proposals from list_accountant_inbox_fact
  select count(distinct coalesce(
    nullif(trim(coalesce(src.row_json->>'proposal_id', src.row_json->>'proposalId')), ''),
    nullif(trim(coalesce(src.row_json->>'id', '')), '')
  ))
  into v_raw_count
  from public.list_accountant_inbox_fact(null) as src(row_json)
  where coalesce(
    nullif(trim(coalesce(src.row_json->>'proposal_id', src.row_json->>'proposalId')), ''),
    nullif(trim(coalesce(src.row_json->>'id', '')), '')
  ) is not null;

  -- Check money drift on summary rows
  with raw_money as (
    select
      coalesce(
        nullif(trim(coalesce(src.row_json->>'proposal_id', src.row_json->>'proposalId')), ''),
        nullif(trim(coalesce(src.row_json->>'id', '')), '')
      ) as proposal_id,
      coalesce(nullif(trim(src.row_json->>'invoice_amount'), '')::numeric, 0)::numeric as amount_total,
      coalesce(nullif(trim(src.row_json->>'total_paid'), '')::numeric, 0)::numeric as amount_paid,
      greatest(
        coalesce(nullif(trim(src.row_json->>'invoice_amount'), '')::numeric, 0)
        - coalesce(nullif(trim(src.row_json->>'total_paid'), '')::numeric, 0),
        0
      )::numeric as amount_debt
    from public.list_accountant_inbox_fact(null) as src(row_json)
    where coalesce(
      nullif(trim(coalesce(src.row_json->>'proposal_id', src.row_json->>'proposalId')), ''),
      nullif(trim(coalesce(src.row_json->>'id', '')), '')
    ) is not null
  )
  select
    count(*) filter (where
      fps.amount_total != rm.amount_total
      or fps.amount_paid != rm.amount_paid
      or fps.amount_debt != rm.amount_debt
    ),
    count(*)
  into v_drift_count, v_total_count
  from finance_proposal_summary_v1 fps
  join raw_money rm on rm.proposal_id = fps.proposal_id;

  -- Count coverage gaps
  v_missing_in_summary := greatest(v_raw_count - v_summary_count, 0);
  v_extra_in_summary := greatest(v_summary_count - v_raw_count, 0);

  return jsonb_build_object(
    'status', case when v_drift_count = 0 and v_missing_in_summary = 0 then 'GREEN' else 'DRIFT_DETECTED' end,
    'drift_count', v_drift_count,
    'total_compared', v_total_count,
    'summary_count', v_summary_count,
    'raw_count', v_raw_count,
    'missing_in_summary', v_missing_in_summary,
    'extra_in_summary', v_extra_in_summary,
    'duration_ms', extract(milliseconds from clock_timestamp() - v_started_at)::integer,
    'checked_at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
end;
$fn$;

comment on function public.finance_proposal_summary_drift_check_v1() is
  'F2.1 drift check: compares finance_proposal_summary_v1 money fields against raw list_accountant_inbox_fact values. Returns GREEN if zero drift.';

-- === 6. Grants ===

grant select on public.finance_proposal_summary_v1 to authenticated;
grant execute on function public.finance_proposal_summary_rebuild_all_v1() to authenticated;
grant execute on function public.finance_proposal_summary_rebuild_one_v1(text) to authenticated;
grant execute on function public.finance_proposal_summary_drift_check_v1() to authenticated;

-- === 7. Initial backfill ===

select public.finance_proposal_summary_rebuild_all_v1();

notify pgrst, 'reload schema';

commit;
