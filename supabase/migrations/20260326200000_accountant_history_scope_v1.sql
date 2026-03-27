begin;

create or replace function public.accountant_history_scope_v1(
  p_date_from text default null,
  p_date_to text default null,
  p_search text default null,
  p_offset integer default 0,
  p_limit integer default 50
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with scope_input as (
  select
    nullif(trim(coalesce(p_date_from, '')), '')::date as date_from,
    nullif(trim(coalesce(p_date_to, '')), '')::date as date_to,
    nullif(lower(trim(coalesce(p_search, ''))), '') as search_text,
    greatest(0, coalesce(p_offset, 0))::integer as offset_rows,
    least(300, greatest(1, coalesce(p_limit, 50)))::integer as limit_rows
),
invoice_flags as (
  select
    pa.proposal_id::text as proposal_id,
    true as has_invoice
  from public.proposal_attachments pa
  where pa.group_key = 'invoice'
  group by pa.proposal_id::text
),
base_rows as (
  select
    pp.id::bigint as payment_id,
    pp.paid_at,
    pp.proposal_id::text as proposal_id,
    nullif(trim(coalesce(p.supplier, '')), '') as supplier,
    nullif(trim(coalesce(p.invoice_number, '')), '') as invoice_number,
    p.invoice_date,
    p.invoice_amount,
    coalesce(nullif(trim(coalesce(p.invoice_currency, '')), ''), 'KGS') as invoice_currency,
    coalesce(pp.amount, 0)::numeric as amount,
    nullif(trim(coalesce(pp.method, '')), '') as method,
    nullif(trim(coalesce(pp.note, '')), '') as note,
    coalesce(ifg.has_invoice, false) as has_invoice,
    nullif(trim(coalesce(pp.accountant_fio, '')), '') as accountant_fio,
    nullif(trim(coalesce(pp.purpose, '')), '') as purpose
  from public.proposal_payments pp
  join public.proposals p
    on p.id = pp.proposal_id
  left join invoice_flags ifg
    on ifg.proposal_id = pp.proposal_id::text
  cross join scope_input si
  where (si.date_from is null or pp.paid_at::date >= si.date_from)
    and (si.date_to is null or pp.paid_at::date <= si.date_to)
    and (
      si.search_text is null
      or lower(coalesce(p.supplier, '')) like ('%' || si.search_text || '%')
      or lower(coalesce(p.invoice_number, '')) like ('%' || si.search_text || '%')
      or lower(coalesce(pp.purpose, '')) like ('%' || si.search_text || '%')
      or lower(coalesce(pp.note, '')) like ('%' || si.search_text || '%')
    )
),
ordered_rows as (
  select
    br.*,
    row_number() over (
      order by br.paid_at desc nulls last, br.payment_id desc
    ) - 1 as row_index
  from base_rows br
),
page_rows as (
  select
    orw.*
  from ordered_rows orw
  cross join scope_input si
  where orw.row_index >= si.offset_rows
    and orw.row_index < (si.offset_rows + si.limit_rows)
),
meta_counts as (
  select
    coalesce((select count(*)::integer from ordered_rows), 0) as total_row_count,
    coalesce((select count(*)::integer from page_rows), 0) as returned_row_count,
    coalesce((select sum(br.amount) from base_rows br), 0)::numeric as total_amount
)
select jsonb_build_object(
  'document_type', 'accountant_history_scope',
  'version', 'v1',
  'rows', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'payment_id', pr.payment_id,
          'paid_at', pr.paid_at,
          'proposal_id', pr.proposal_id,
          'supplier', pr.supplier,
          'invoice_number', pr.invoice_number,
          'invoice_date', pr.invoice_date,
          'invoice_amount', pr.invoice_amount,
          'invoice_currency', pr.invoice_currency,
          'amount', pr.amount,
          'method', pr.method,
          'note', pr.note,
          'has_invoice', pr.has_invoice,
          'accountant_fio', pr.accountant_fio,
          'purpose', pr.purpose
        )
        order by pr.row_index asc
      )
      from page_rows pr
    ),
    '[]'::jsonb
  ),
  'meta', jsonb_build_object(
    'rows_source', 'accountant_history_scope_v1',
    'legacy_rows_source', 'proposal_payments+proposals+proposal_attachments',
    'payload_shape_version', 'v1',
    'primary_owner', 'rpc_scope_v1',
    'backend_first_primary', true,
    'offset_rows', (select offset_rows from scope_input),
    'limit_rows', (select limit_rows from scope_input),
    'returned_row_count', (select returned_row_count from meta_counts),
    'total_row_count', (select total_row_count from meta_counts),
    'total_amount', (select total_amount from meta_counts),
    'has_more', (
      (select offset_rows from scope_input) + (select returned_row_count from meta_counts)
    ) < (select total_row_count from meta_counts),
    'date_from', (select date_from from scope_input),
    'date_to', (select date_to from scope_input),
    'search', (select search_text from scope_input)
  )
);
$$;

comment on function public.accountant_history_scope_v1(text, text, text, integer, integer) is
'Accountant history scope v1. Moves accountant payments history ordering, filtering, totals, and row windowing into a backend-owned read contract.';

grant execute on function public.accountant_history_scope_v1(text, text, text, integer, integer) to authenticated;

commit;
