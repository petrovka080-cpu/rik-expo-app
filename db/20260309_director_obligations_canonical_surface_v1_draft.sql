-- Director Obligations Canonical Surface v1 (DRAFT, additive only)
-- Purpose:
--   Single reporting surface for director-approved obligations with anti-double-count rules.
--
-- Hard constraints preserved:
--   - no legacy path removal
--   - no runtime cutover
--   - no request/proposal/procurement triple counting
--   - only approved-to-execute decisions
--
-- Notes:
--   1) This draft intentionally uses finance supplier spend as the approved decision layer
--      for material/work/service obligations.
--   2) Warehouse issue/request rows are excluded from obligations to avoid double counting.
--   3) Subcontract paid amount linkage is not present in current source map; amount_paid=0,
--      amount_due=amount_approved until payment bridge is added.

begin;

create or replace view public.v_director_obligations_facts_v1 as
with proposal_scope as (
  select
    pi.proposal_id::text as proposal_id,
    max(
      nullif(
        trim(
          coalesce(req.object_name, req.object)
        ),
        ''
      )
    ) as object_name
  from public.proposal_items pi
  left join public.request_items ri
    on ri.id::text = pi.request_item_id::text
  left join public.requests req
    on req.id::text = ri.request_id::text
  group by pi.proposal_id::text
),
finance_supplier as (
  select
    case
      when lower(coalesce(fs.kind_code, fs.kind_name, '')) ~ '(service|услуг)' then 'service_supplier'
      when lower(coalesce(fs.kind_code, fs.kind_name, '')) ~ '(work|работ)' then 'work_supplier'
      else 'material'
    end::text as obligation_type,
    'finance_supplier'::text as source_origin,
    coalesce(nullif(trim(fs.proposal_id::text), ''), md5(row_to_json(fs)::text)) as source_id,
    null::uuid as company_id,
    nullif(trim(fs.supplier), '') as counterparty_name,
    ps.object_name as object_name,
    nullif(trim(coalesce(fs.kind_name, fs.kind_code)), '') as work_or_category,
    greatest(coalesce(fs.approved_alloc, 0)::numeric, 0::numeric) as amount_approved,
    greatest(coalesce(fs.paid_alloc_cap, fs.paid_alloc, 0)::numeric, 0::numeric) as amount_paid,
    greatest(
      coalesce(fs.approved_alloc, 0)::numeric
      - coalesce(fs.paid_alloc_cap, fs.paid_alloc, 0)::numeric,
      0::numeric
    ) as amount_due,
    'approved'::text as status,
    fs.director_approved_at::timestamptz as approved_at,
    coalesce(fs.director_approved_at::timestamptz, now()) as created_at
  from public.v_director_finance_spend_kinds_v3 fs
  left join proposal_scope ps
    on ps.proposal_id = fs.proposal_id::text
  where fs.director_approved_at is not null
    and coalesce(fs.approved_alloc, 0)::numeric > 0
    and nullif(trim(fs.supplier), '') is not null
    and nullif(trim(ps.object_name), '') is not null
),
approved_subcontracts as (
  select
    'subcontract'::text as obligation_type,
    'subcontract'::text as source_origin,
    s.id::text as source_id,
    null::uuid as company_id,
    nullif(trim(s.contractor_org), '') as counterparty_name,
    nullif(trim(s.object_name), '') as object_name,
    nullif(trim(s.work_type), '') as work_or_category,
    greatest(coalesce(s.total_price, 0)::numeric, 0::numeric) as amount_approved,
    0::numeric as amount_paid,
    greatest(coalesce(s.total_price, 0)::numeric, 0::numeric) as amount_due,
    s.status::text as status,
    s.approved_at::timestamptz as approved_at,
    coalesce(s.created_at::timestamptz, s.approved_at::timestamptz, now()) as created_at
  from public.subcontracts s
  where lower(coalesce(s.status, '')) = 'approved'
    and coalesce(s.total_price, 0)::numeric > 0
    and nullif(trim(s.contractor_org), '') is not null
    and nullif(trim(s.object_name), '') is not null
)
select * from finance_supplier
union all
select * from approved_subcontracts;

comment on view public.v_director_obligations_facts_v1 is
'Director approved obligations canonical surface. Approved decision grain only; no request-level double counting.';

create or replace function public.director_report_fetch_obligations_v1(
  p_from date default null,
  p_to date default null,
  p_object_name text default null,
  p_obligation_type text default null
)
returns jsonb
language sql
stable
as $$
with base as (
  select *
  from public.v_director_obligations_facts_v1 v
  where (p_from is null or v.approved_at::date >= p_from)
    and (p_to is null or v.approved_at::date <= p_to)
    and (
      p_object_name is null
      or lower(coalesce(v.object_name, '')) = lower(p_object_name)
    )
    and (
      p_obligation_type is null
      or lower(coalesce(v.obligation_type, '')) = lower(p_obligation_type)
    )
),
summary as (
  select
    count(*)::int as obligations_total,
    coalesce(sum(amount_approved), 0)::numeric as approved_total,
    coalesce(sum(amount_paid), 0)::numeric as paid_total,
    coalesce(sum(amount_due), 0)::numeric as due_total,
    coalesce(sum(amount_approved) filter (where obligation_type = 'material'), 0)::numeric as material_total,
    coalesce(sum(amount_approved) filter (where obligation_type in ('work_supplier', 'service_supplier')), 0)::numeric as supplier_work_service_total,
    coalesce(sum(amount_approved) filter (where obligation_type = 'subcontract'), 0)::numeric as subcontract_total
  from base
),
by_object as (
  select
    coalesce(object_name, 'Без объекта') as object_name,
    count(*)::int as obligations_count,
    coalesce(sum(amount_approved), 0)::numeric as approved_total,
    coalesce(sum(amount_paid), 0)::numeric as paid_total,
    coalesce(sum(amount_due), 0)::numeric as due_total
  from base
  group by coalesce(object_name, 'Без объекта')
  order by approved_total desc
),
by_counterparty as (
  select
    coalesce(counterparty_name, '—') as counterparty_name,
    count(*)::int as obligations_count,
    coalesce(sum(amount_approved), 0)::numeric as approved_total,
    coalesce(sum(amount_paid), 0)::numeric as paid_total,
    coalesce(sum(amount_due), 0)::numeric as due_total
  from base
  group by coalesce(counterparty_name, '—')
  order by approved_total desc
),
by_type as (
  select
    obligation_type,
    count(*)::int as obligations_count,
    coalesce(sum(amount_approved), 0)::numeric as approved_total,
    coalesce(sum(amount_paid), 0)::numeric as paid_total,
    coalesce(sum(amount_due), 0)::numeric as due_total
  from base
  group by obligation_type
  order by obligation_type
),
rows_payload as (
  select jsonb_agg(
    jsonb_build_object(
      'obligation_type', obligation_type,
      'source_origin', source_origin,
      'source_id', source_id,
      'company_id', company_id,
      'counterparty_name', counterparty_name,
      'object_name', object_name,
      'work_or_category', work_or_category,
      'amount_approved', amount_approved,
      'amount_paid', amount_paid,
      'amount_due', amount_due,
      'status', status,
      'approved_at', approved_at,
      'created_at', created_at
    )
    order by approved_at desc nulls last, created_at desc nulls last
  ) as payload
  from base
)
select jsonb_build_object(
  'summary', coalesce((select to_jsonb(s) from summary s), '{}'::jsonb),
  'by_type', coalesce((select jsonb_agg(to_jsonb(t)) from by_type t), '[]'::jsonb),
  'by_object', coalesce((select jsonb_agg(to_jsonb(o)) from by_object o), '[]'::jsonb),
  'by_counterparty', coalesce((select jsonb_agg(to_jsonb(c)) from by_counterparty c), '[]'::jsonb),
  'rows', coalesce((select payload from rows_payload), '[]'::jsonb)
);
$$;

comment on function public.director_report_fetch_obligations_v1(date, date, text, text) is
'Director obligations unified report (approved-decision grain). Additive layer; legacy flows remain unchanged.';

commit;

