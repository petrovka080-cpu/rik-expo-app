begin;

create or replace function public.accountant_inbox_scope_v1(
  p_tab text default null,
  p_offset integer default 0,
  p_limit integer default 40
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with scope_input as (
  select
    nullif(trim(coalesce(p_tab, '')), '') as tab_name,
    greatest(0, coalesce(p_offset, 0))::integer as offset_rows,
    least(200, greatest(1, coalesce(p_limit, 40)))::integer as limit_rows
),
base_rows as (
  select
    trim(coalesce(src.row_json ->> 'proposal_id', '')) as proposal_id,
    nullif(trim(coalesce(src.row_json ->> 'supplier', '')), '') as supplier,
    nullif(trim(coalesce(src.row_json ->> 'invoice_number', '')), '') as invoice_number,
    nullif(trim(coalesce(src.row_json ->> 'invoice_date', '')), '') as invoice_date,
    coalesce(
      nullif(trim(coalesce(src.row_json ->> 'invoice_currency', '')), ''),
      'KGS'
    ) as invoice_currency,
    nullif(trim(coalesce(src.row_json ->> 'payment_status', '')), '') as payment_status,
    case
      when nullif(trim(coalesce(src.row_json ->> 'invoice_amount', '')), '') is null then null
      else (src.row_json ->> 'invoice_amount')::numeric
    end as invoice_amount,
    case
      when nullif(trim(coalesce(src.row_json ->> 'total_paid', '')), '') is null then 0::numeric
      else (src.row_json ->> 'total_paid')::numeric
    end as total_paid,
    case
      when nullif(trim(coalesce(src.row_json ->> 'payments_count', '')), '') is null then 0::integer
      else (src.row_json ->> 'payments_count')::integer
    end as payments_count,
    case
      when nullif(trim(coalesce(src.row_json ->> 'has_invoice', '')), '') is null then false
      else (src.row_json ->> 'has_invoice')::boolean
    end as has_invoice,
    nullif(trim(coalesce(src.row_json ->> 'sent_to_accountant_at', '')), '')::timestamptz as sent_to_accountant_at
  from public.list_accountant_inbox_fact((select tab_name from scope_input)) as src(row_json)
  where nullif(trim(coalesce(src.row_json ->> 'proposal_id', '')), '') is not null
),
payment_agg as (
  select
    pp.proposal_id::text as proposal_id,
    max(coalesce(pp.paid_at, pp.created_at)) as last_paid_at
  from public.proposal_payments pp
  where pp.proposal_id::text in (select br.proposal_id from base_rows br)
  group by pp.proposal_id::text
),
enriched_rows as (
  select
    br.proposal_id,
    nullif(trim(coalesce(p.proposal_no::text, p.display_no::text, '')), '') as proposal_no,
    nullif(trim(coalesce(p.id_short::text, '')), '') as id_short,
    br.supplier,
    br.invoice_number,
    br.invoice_date,
    br.invoice_amount,
    br.invoice_currency,
    br.payment_status,
    br.total_paid,
    br.payments_count,
    br.has_invoice,
    br.sent_to_accountant_at,
    pa.last_paid_at,
    (extract(epoch from pa.last_paid_at) * 1000)::bigint as last_paid_at_ms
  from base_rows br
  left join public.proposals p
    on p.id::text = br.proposal_id
  left join payment_agg pa
    on pa.proposal_id = br.proposal_id
),
ordered_rows as (
  select
    er.*,
    row_number() over (
      order by
        case
          when (select tab_name from scope_input) in ('Частично', 'Частично оплачено', 'Оплачено')
            then er.last_paid_at
          else null
        end desc nulls last,
        er.sent_to_accountant_at desc nulls last,
        er.proposal_id asc
    ) - 1 as row_index
  from enriched_rows er
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
    coalesce((select count(*)::integer from page_rows), 0) as returned_row_count
)
select jsonb_build_object(
  'document_type', 'accountant_inbox_scope',
  'version', 'v1',
  'rows', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'proposal_id', pr.proposal_id,
          'proposal_no', pr.proposal_no,
          'id_short', pr.id_short,
          'supplier', pr.supplier,
          'invoice_number', pr.invoice_number,
          'invoice_date', pr.invoice_date,
          'invoice_amount', pr.invoice_amount,
          'invoice_currency', pr.invoice_currency,
          'payment_status', pr.payment_status,
          'total_paid', pr.total_paid,
          'payments_count', pr.payments_count,
          'has_invoice', pr.has_invoice,
          'sent_to_accountant_at', pr.sent_to_accountant_at,
          'last_paid_at', pr.last_paid_at_ms
        )
        order by pr.row_index asc
      )
      from page_rows pr
    ),
    '[]'::jsonb
  ),
  'meta', jsonb_build_object(
    'rows_source', 'accountant_inbox_scope_v1',
    'legacy_rows_source', 'list_accountant_inbox_fact+proposal_payments+proposals',
    'payload_shape_version', 'v1',
    'primary_owner', 'rpc_scope_v1',
    'backend_first_primary', true,
    'offset_rows', (select offset_rows from scope_input),
    'limit_rows', (select limit_rows from scope_input),
    'returned_row_count', (select returned_row_count from meta_counts),
    'total_row_count', (select total_row_count from meta_counts),
    'has_more', (
      (select offset_rows from scope_input) + (select returned_row_count from meta_counts)
    ) < (select total_row_count from meta_counts),
    'tab', (select tab_name from scope_input)
  )
);
$$;

comment on function public.accountant_inbox_scope_v1(text, integer, integer) is
'Accountant inbox scope v1. Moves accountant inbox ordering and row windowing into a backend-owned read contract while preserving current tab semantics.';

grant execute on function public.accountant_inbox_scope_v1(text, integer, integer) to authenticated;

commit;
