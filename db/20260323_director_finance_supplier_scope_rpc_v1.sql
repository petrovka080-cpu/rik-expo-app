begin;

create or replace function public.director_finance_supplier_scope_v1(
  p_supplier text,
  p_kind_name text default null,
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
    coalesce(nullif(btrim(p_supplier), ''), '—')::text as supplier_name,
    nullif(btrim(coalesce(p_kind_name, '')), '')::text as kind_name,
    case
      when coalesce(p_due_days, 7) = 0 then 7
      else coalesce(p_due_days, 7)
    end::integer as due_days,
    case
      when coalesce(p_critical_days, 14) = 0 then 14
      else coalesce(p_critical_days, 14)
    end::integer as critical_days
),
spend_scope as (
  select
    nullif(btrim(v.proposal_id::text), '')::text as proposal_id,
    nullif(btrim(v.proposal_no), '')::text as proposal_no
  from public.v_director_finance_spend_kinds_v3 v
  cross join params p
  where coalesce(nullif(btrim(v.supplier), ''), '—') = p.supplier_name
    and (p.kind_name is null or coalesce(nullif(btrim(v.kind_name), ''), 'Другое') = p.kind_name)
    and (p_from is null or v.director_approved_at::date >= p_from)
    and (p_to is null or v.director_approved_at::date <= p_to)
),
allowed_proposals as (
  select
    proposal_id,
    max(proposal_no)::text as proposal_no
  from spend_scope
  where proposal_id is not null
  group by proposal_id
),
finance_base as (
  select
    coalesce(nullif(btrim(src.row_json ->> 'supplier'), ''), '—')::text as supplier_name,
    nullif(btrim(src.row_json ->> 'proposal_id'), '')::text as proposal_id,
    nullif(btrim(src.row_json ->> 'proposal_no'), '')::text as proposal_no,
    nullif(btrim(src.row_json ->> 'invoice_number'), '')::text as invoice_number,
    coalesce(nullif(btrim(src.row_json ->> 'invoice_amount'), '')::numeric, 0)::numeric as amount,
    coalesce(nullif(btrim(src.row_json ->> 'total_paid'), '')::numeric, 0)::numeric as paid,
    greatest(
      coalesce(nullif(btrim(src.row_json ->> 'invoice_amount'), '')::numeric, 0)
      - coalesce(nullif(btrim(src.row_json ->> 'total_paid'), '')::numeric, 0),
      0
    )::numeric as rest,
    coalesce(
      nullif(btrim(src.row_json ->> 'director_approved_at'), '')::timestamptz::date,
      nullif(btrim(src.row_json ->> 'approved_at'), '')::timestamptz::date,
      nullif(btrim(src.row_json ->> 'sent_to_accountant_at'), '')::timestamptz::date,
      nullif(btrim(src.row_json ->> 'invoice_date'), '')::date
    ) as approved_date,
    coalesce(
      nullif(btrim(src.row_json ->> 'invoice_date'), '')::date,
      nullif(btrim(src.row_json ->> 'invoice_at'), '')::timestamptz::date,
      nullif(btrim(src.row_json ->> 'created_at'), '')::timestamptz::date
    ) as invoice_date,
    nullif(btrim(src.row_json ->> 'due_date'), '')::date as explicit_due_date
  from public.list_accountant_inbox_fact(null) as src(row_json)
),
finance_filtered as (
  select
    fb.supplier_name,
    fb.proposal_id,
    coalesce(ap.proposal_no, fb.proposal_no)::text as proposal_no,
    fb.invoice_number,
    fb.amount,
    fb.paid,
    fb.rest,
    fb.approved_date,
    fb.invoice_date,
    coalesce(
      fb.explicit_due_date,
      case
        when coalesce(fb.invoice_date, fb.approved_date) is null then null
        else coalesce(fb.invoice_date, fb.approved_date) + (select due_days from params)
      end
    ) as due_date
  from finance_base fb
  cross join params p
  left join allowed_proposals ap on ap.proposal_id = fb.proposal_id
  where fb.supplier_name = p.supplier_name
    and (
      fb.approved_date is null or (
        (p_from is null or fb.approved_date >= p_from)
        and (p_to is null or fb.approved_date <= p_to)
      )
    )
    and (
      p.kind_name is null
      or (fb.proposal_id is not null and ap.proposal_id is not null)
    )
),
classified as (
  select
    ff.*,
    (
      ff.rest > 0
      and ff.due_date is not null
      and ff.due_date <= current_date
    ) as is_overdue,
    (
      ff.rest > 0
      and ff.due_date is not null
      and ff.due_date <= current_date
      and (current_date - ff.due_date) >= (select critical_days from params)
    ) as is_critical
  from finance_filtered ff
),
invoice_rows as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', concat_ws(
          '|',
          coalesce(proposal_id, ''),
          coalesce(invoice_number, ''),
          coalesce(invoice_date::text, ''),
          coalesce(approved_date::text, '')
        ),
        'title', case
          when invoice_number is not null then concat('Счёт №', invoice_number)
          when proposal_no is not null then concat('Предложение ', proposal_no)
          when proposal_id is not null then concat('Предложение #', left(proposal_id, 8))
          else 'Счёт'
        end,
        'amount', amount,
        'paid', paid,
        'rest', rest,
        'isOverdue', is_overdue,
        'isCritical', is_critical,
        'approvedIso', approved_date::text,
        'invoiceIso', invoice_date::text,
        'dueIso', due_date::text
      )
      order by
        is_overdue desc,
        due_date asc nulls last,
        invoice_date asc nulls last,
        proposal_id asc nulls last
    ),
    '[]'::jsonb
  ) as value
  from classified
  where amount > 0 or rest > 0
),
summary_row as (
  select
    coalesce(sum(rest), 0)::numeric as amount,
    count(*) filter (where rest > 0)::integer as count,
    count(*) filter (where is_overdue and rest > 0)::integer as overdue_count,
    count(*) filter (where is_critical and rest > 0)::integer as critical_count
  from classified
)
select jsonb_build_object(
  'document_type', 'director_finance_supplier_scope',
  'version', 'v1',
  'supplier', (select supplier_name from params),
  'kindName', (select kind_name from params),
  'amount', summary_row.amount,
  'count', summary_row.count,
  'approved', summary_row.amount,
  'paid', 0,
  'toPay', summary_row.amount,
  'overdueCount', summary_row.overdue_count,
  'criticalCount', summary_row.critical_count,
  'invoices', invoice_rows.value,
  'meta', jsonb_build_object(
    'finance_source', 'list_accountant_inbox_fact',
    'spend_source', 'v_director_finance_spend_kinds_v3',
    'payload_shape_version', 'v1'
  )
)
from summary_row
cross join invoice_rows;
$$;

comment on function public.director_finance_supplier_scope_v1(text, text, date, date, integer, integer) is
'Director finance supplier scope envelope v1. Moves supplier invoice shaping, overdue/critical flags, and kind-filtered proposal scoping to backend while preserving client modal behavior and fallback path.';

grant execute on function public.director_finance_supplier_scope_v1(text, text, date, date, integer, integer) to authenticated;

commit;
