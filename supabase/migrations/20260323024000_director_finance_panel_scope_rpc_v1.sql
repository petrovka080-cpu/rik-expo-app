begin;

create or replace function public.director_finance_panel_scope_v1(
  p_from date default null,
  p_to date default null,
  p_due_days integer default 7,
  p_critical_days integer default 14
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with summary_data as (
  select public.director_finance_fetch_summary_v1(
    p_from => p_from,
    p_to => p_to,
    p_due_days => p_due_days,
    p_critical_days => p_critical_days
  ) as value
),
spend_base as (
  select
    coalesce(nullif(btrim(v.kind_name), ''), 'Р”СЂСѓРіРѕРµ')::text as kind_name,
    coalesce(nullif(btrim(v.supplier), ''), 'вЂ”')::text as supplier_name,
    nullif(btrim(v.proposal_id::text), '')::text as proposal_id,
    coalesce(v.approved_alloc, 0)::numeric as approved_alloc,
    coalesce(v.paid_alloc_cap, v.paid_alloc, 0)::numeric as paid_alloc,
    coalesce(v.overpay_alloc, 0)::numeric as overpay_alloc
  from public.v_director_finance_spend_kinds_v3 v
  where (p_from is null or v.director_approved_at::date >= p_from)
    and (p_to is null or v.director_approved_at::date <= p_to)
),
proposal_rows as (
  select
    proposal_id,
    greatest(sum(approved_alloc) - sum(paid_alloc), 0)::numeric as to_pay
  from spend_base
  where proposal_id is not null
  group by proposal_id
),
kind_supplier_rows as (
  select
    kind_name,
    supplier_name,
    count(*)::integer as count,
    coalesce(sum(approved_alloc), 0)::numeric as approved,
    coalesce(sum(paid_alloc), 0)::numeric as paid,
    coalesce(sum(overpay_alloc), 0)::numeric as overpay
  from spend_base
  group by kind_name, supplier_name
),
kind_rows as (
  select
    k.kind_name,
    coalesce(sum(k.approved), 0)::numeric as approved,
    coalesce(sum(k.paid), 0)::numeric as paid,
    coalesce(sum(k.overpay), 0)::numeric as overpay,
    greatest(coalesce(sum(k.approved), 0) - coalesce(sum(k.paid), 0), 0)::numeric as to_pay,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'supplier', s.supplier_name,
            'approved', s.approved,
            'paid', s.paid,
            'overpay', s.overpay,
            'count', s.count
          )
          order by s.approved desc, s.supplier_name asc
        )
        from kind_supplier_rows s
        where s.kind_name = k.kind_name
      ),
      '[]'::jsonb
    ) as suppliers
  from kind_supplier_rows k
  group by k.kind_name
),
header_row as (
  select
    coalesce(sum(approved_alloc), 0)::numeric as approved,
    coalesce(sum(paid_alloc), 0)::numeric as paid,
    coalesce((select sum(pr.to_pay) from proposal_rows pr), 0)::numeric as to_pay,
    coalesce(sum(overpay_alloc), 0)::numeric as overpay
  from spend_base
),
overpay_supplier_rows as (
  select
    supplier_name,
    count(*)::integer as count,
    coalesce(sum(overpay_alloc), 0)::numeric as overpay
  from spend_base
  where overpay_alloc > 0
  group by supplier_name
)
select jsonb_build_object(
  'document_type', 'director_finance_panel_scope',
  'version', 'v1',
  'summary', coalesce((select value -> 'summary' from summary_data), '{}'::jsonb),
  'report', coalesce((select value -> 'report' from summary_data), '{}'::jsonb),
  'spend', jsonb_build_object(
    'header', jsonb_build_object(
      'approved', header_row.approved,
      'paid', header_row.paid,
      'toPay', header_row.to_pay,
      'overpay', header_row.overpay
    ),
    'kinds', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'kind', kind_name,
            'approved', approved,
            'paid', paid,
            'overpay', overpay,
            'toPay', to_pay,
            'suppliers', suppliers
          )
          order by approved desc, kind_name asc
        )
        from kind_rows
      ),
      '[]'::jsonb
    ),
    'overpaySuppliers', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'supplier', supplier_name,
            'approved', 0,
            'paid', 0,
            'overpay', overpay,
            'count', count
          )
          order by overpay desc, supplier_name asc
        )
        from overpay_supplier_rows
      ),
      '[]'::jsonb
    )
  ),
  'meta', jsonb_build_object(
    'summary_source', 'director_finance_fetch_summary_v1',
    'spend_source', 'v_director_finance_spend_kinds_v3',
    'payload_shape_version', 'v1'
  )
)
from header_row;
$$;

comment on function public.director_finance_panel_scope_v1(date, date, integer, integer) is
'Director finance panel scope envelope v1. Moves finance spend header, kind rollups, supplier grouping, and summary/report shaping to backend while preserving client render and fallback behavior.';

grant execute on function public.director_finance_panel_scope_v1(date, date, integer, integer) to authenticated;

commit;
