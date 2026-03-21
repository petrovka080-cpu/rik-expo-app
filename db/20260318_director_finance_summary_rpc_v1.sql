begin;

create or replace function public.director_finance_fetch_summary_v1(
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
with params as (
  select
    case
      when coalesce(p_due_days, 7) = 0 then 7
      else coalesce(p_due_days, 7)
    end::integer as due_days,
    case
      when coalesce(p_critical_days, 14) = 0 then 14
      else coalesce(p_critical_days, 14)
    end::integer as critical_days
),
base as (
  select
    nullif(btrim(coalesce(src.row_json ->> 'supplier', '')), '')::text as supplier_name,
    coalesce(nullif(btrim(src.row_json ->> 'invoice_amount'), '')::numeric, 0)::numeric as amount,
    coalesce(nullif(btrim(src.row_json ->> 'total_paid'), '')::numeric, 0)::numeric as paid,
    greatest(
      coalesce(nullif(btrim(src.row_json ->> 'invoice_amount'), '')::numeric, 0)
      - coalesce(nullif(btrim(src.row_json ->> 'total_paid'), '')::numeric, 0),
      0
    )::numeric as to_pay,
    coalesce(
      nullif(btrim(src.row_json ->> 'director_approved_at'), '')::timestamptz::date,
      nullif(btrim(src.row_json ->> 'sent_to_accountant_at'), '')::timestamptz::date,
      nullif(btrim(src.row_json ->> 'invoice_date'), '')::date
    ) as approved_date,
    case
      when coalesce(
        nullif(btrim(src.row_json ->> 'invoice_date'), '')::date,
        nullif(btrim(src.row_json ->> 'director_approved_at'), '')::timestamptz::date,
        nullif(btrim(src.row_json ->> 'sent_to_accountant_at'), '')::timestamptz::date
      ) is null then null
      else (
        coalesce(
          nullif(btrim(src.row_json ->> 'invoice_date'), '')::date,
          nullif(btrim(src.row_json ->> 'director_approved_at'), '')::timestamptz::date,
          nullif(btrim(src.row_json ->> 'sent_to_accountant_at'), '')::timestamptz::date
        )
        + (select due_days from params)
      )
    end as due_date
  from public.list_accountant_inbox_fact(null) as src(row_json)
),
filtered as (
  select
    coalesce(supplier_name, '') as supplier_key,
    supplier_name,
    amount,
    paid,
    to_pay,
    due_date,
    approved_date,
    (paid > 0 and to_pay > 0) as is_partial,
    (
      to_pay > 0
      and due_date is not null
      and due_date <= current_date
    ) as is_overdue
  from base
  where approved_date is null
     or (
       (p_from is null or approved_date >= p_from)
       and (p_to is null or approved_date <= p_to)
     )
),
classified as (
  select
    supplier_key,
    supplier_name,
    amount,
    paid,
    to_pay,
    is_partial,
    is_overdue,
    (
      is_overdue
      and due_date is not null
      and (current_date - due_date) >= (select critical_days from params)
    ) as is_critical
  from filtered
),
supplier_rows as (
  select
    supplier_key,
    max(supplier_name)::text as supplier_name,
    count(*)::integer as count,
    coalesce(sum(amount), 0)::numeric as approved,
    coalesce(sum(paid), 0)::numeric as paid,
    coalesce(sum(to_pay), 0)::numeric as to_pay,
    count(*) filter (where is_overdue)::integer as overdue_count,
    count(*) filter (where is_critical)::integer as critical_count
  from classified
  group by supplier_key
),
summary_row as (
  select
    coalesce(sum(amount), 0)::numeric as approved,
    coalesce(sum(paid), 0)::numeric as paid,
    coalesce(sum(paid) filter (where is_partial), 0)::numeric as partial_paid,
    coalesce(sum(to_pay), 0)::numeric as to_pay,
    count(*) filter (where is_overdue)::integer as overdue_count,
    coalesce(sum(to_pay) filter (where is_overdue), 0)::numeric as overdue_amount,
    count(*) filter (where is_critical)::integer as critical_count,
    coalesce(sum(to_pay) filter (where is_critical), 0)::numeric as critical_amount,
    count(*) filter (where is_partial)::integer as partial_count,
    count(*) filter (where to_pay > 0)::integer as debt_count
  from classified
)
select jsonb_build_object(
  'summary',
  jsonb_build_object(
    'approved', summary_row.approved,
    'paid', summary_row.paid,
    'partialPaid', summary_row.partial_paid,
    'toPay', summary_row.to_pay,
    'overdueCount', summary_row.overdue_count,
    'overdueAmount', summary_row.overdue_amount,
    'criticalCount', summary_row.critical_count,
    'criticalAmount', summary_row.critical_amount,
    'partialCount', summary_row.partial_count,
    'debtCount', summary_row.debt_count
  ),
  'report',
  jsonb_build_object(
    'suppliers',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'supplier', supplier_name,
            'count', count,
            'approved', approved,
            'paid', paid,
            'toPay', to_pay,
            'overdueCount', overdue_count,
            'criticalCount', critical_count
          )
          order by to_pay desc, supplier_key asc
        )
        from supplier_rows
      ),
      '[]'::jsonb
    )
  )
)
from summary_row;
$$;

comment on function public.director_finance_fetch_summary_v1(date, date, integer, integer) is
'Director finance summary and supplier grouping at finance-row grain. Replaces client-side totals, overdue/critical math, and supplier grouping while leaving UI fallback/render semantics on the client.';

grant execute on function public.director_finance_fetch_summary_v1(date, date, integer, integer) to authenticated;

commit;
