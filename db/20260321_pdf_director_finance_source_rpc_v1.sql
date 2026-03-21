begin;

create or replace function public.pdf_director_finance_source_v1(
  p_from text default null,
  p_to text default null,
  p_due_days integer default 7,
  p_critical_days integer default 14
)
returns jsonb
language sql
stable
set search_path = public
as $$
with normalized_args as (
  select
    nullif(btrim(coalesce(p_from, '')), '') as from_text_arg,
    nullif(btrim(coalesce(p_to, '')), '') as to_text_arg,
    case
      when nullif(btrim(coalesce(p_from, '')), '') is null then null::date
      else nullif(btrim(coalesce(p_from, '')), '')::date
    end as from_date_arg,
    case
      when nullif(btrim(coalesce(p_to, '')), '') is null then null::date
      else nullif(btrim(coalesce(p_to, '')), '')::date
    end as to_date_arg,
    case
      when coalesce(p_due_days, 0) = 0 then 7
      else coalesce(p_due_days, 7)
    end::integer as due_days_arg,
    case
      when coalesce(p_critical_days, 0) = 0 then 14
      else coalesce(p_critical_days, 14)
    end::integer as critical_days_arg
),
finance_rows as (
  select src.row_json
  from public.list_accountant_inbox_fact(null) as src(row_json)
),
spend_rows as (
  select to_jsonb(v) as row_json
  from normalized_args a
  cross join lateral (
    select
      proposal_id,
      proposal_no,
      supplier,
      kind_code,
      kind_name,
      approved_alloc,
      paid_alloc,
      paid_alloc_cap,
      overpay_alloc,
      director_approved_at
    from public.v_director_finance_spend_kinds_v3 v
    where (a.from_date_arg is null or v.director_approved_at::date >= a.from_date_arg)
      and (a.to_date_arg is null or v.director_approved_at::date <= a.to_date_arg)
  ) v
),
header_data as (
  select jsonb_build_object(
    'period_from', a.from_text_arg,
    'period_to', a.to_text_arg,
    'due_days_default', a.due_days_arg,
    'critical_days', a.critical_days_arg
  ) as value
  from normalized_args a
),
finance_rows_data as (
  select coalesce(
    jsonb_agg(
      fr.row_json
      order by
        coalesce(fr.row_json ->> 'director_approved_at', fr.row_json ->> 'sent_to_accountant_at', fr.row_json ->> 'invoice_date', '') desc,
        coalesce(fr.row_json ->> 'proposal_id', '')
    ),
    '[]'::jsonb
  ) as value
  from finance_rows fr
),
spend_rows_data as (
  select coalesce(
    jsonb_agg(
      sr.row_json
      order by
        coalesce(sr.row_json ->> 'director_approved_at', '') desc,
        coalesce(sr.row_json ->> 'proposal_id', '')
    ),
    '[]'::jsonb
  ) as value
  from spend_rows sr
),
summary_data as (
  select public.director_finance_fetch_summary_v1(
    p_from => a.from_date_arg,
    p_to => a.to_date_arg,
    p_due_days => a.due_days_arg,
    p_critical_days => a.critical_days_arg
  ) as value
  from normalized_args a
)
select jsonb_build_object(
  'document_type', 'director_finance_report',
  'version', 'v1',
  'generated_at', timezone('utc', now()),
  'document_id', concat_ws(
    '__',
    coalesce(p_from, 'all'),
    coalesce(p_to, 'all'),
    coalesce(p_due_days::text, '7'),
    coalesce(p_critical_days::text, '14')
  ),
  'source_branch', 'canonical',
  'header', hd.value,
  'finance_rows', frd.value,
  'spend_rows', srd.value,
  'summary', sd.value,
  'meta', jsonb_build_object(
    'finance_rows_source', 'list_accountant_inbox_fact',
    'spend_rows_source', 'v_director_finance_spend_kinds_v3',
    'summary_source', 'director_finance_fetch_summary_v1',
    'payload_shape_version', 'v1'
  )
)
from header_data hd
cross join finance_rows_data frd
cross join spend_rows_data srd
cross join summary_data sd;
$$;

comment on function public.pdf_director_finance_source_v1(text, text, integer, integer) is
'Director finance PDF canonical source envelope v1. Collapses accountant inbox facts, spend-kind rows, and finance summary RPC output into one read-only source boundary while leaving contract shaping, HTML render, and preview/export semantics on the client.';

grant execute on function public.pdf_director_finance_source_v1(text, text, integer, integer) to authenticated;

commit;
