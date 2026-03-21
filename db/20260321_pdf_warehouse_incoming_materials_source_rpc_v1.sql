begin;

create or replace function public.pdf_warehouse_incoming_materials_source_v1(
  p_from text,
  p_to text
)
returns jsonb
language sql
stable
set search_path = public
as $$
with normalized_args as (
  select
    nullif(btrim(coalesce(p_from, '')), '') as from_arg,
    nullif(btrim(coalesce(p_to, '')), '') as to_arg
),
incoming_heads as (
  select r.*
  from normalized_args a
  cross join public.acc_report_incoming_v2(a.from_arg, a.to_arg) r
),
ledger_rows as (
  select
    wl.incoming_id,
    wl.code,
    wl.uom_id,
    wl.qty,
    wl.moved_at
  from public.wh_ledger wl
  cross join normalized_args a
  where wl.direction = 'in'
    and (a.from_arg is null or wl.moved_at >= a.from_arg::timestamptz)
    and (a.to_arg is null or wl.moved_at <= a.to_arg::timestamptz)
),
grouped_rows as (
  select
    lr.code,
    lr.uom_id,
    min(lr.moved_at) as first_seen_at,
    count(*)::bigint as lines_cnt,
    count(distinct lr.incoming_id)::bigint as docs_cnt,
    coalesce(sum(lr.qty), 0)::numeric as sum_total
  from ledger_rows lr
  group by lr.code, lr.uom_id
),
enriched_rows as (
  select
    gr.code as material_code,
    coalesce(nullif(btrim(gr.code), ''), 'Позиция') as material_name,
    gr.uom_id as uom,
    gr.sum_total,
    gr.docs_cnt,
    gr.lines_cnt,
    gr.first_seen_at
  from grouped_rows gr
),
rows_data as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'material_code', er.material_code,
        'material_name', er.material_name,
        'uom', er.uom,
        'sum_total', er.sum_total,
        'docs_cnt', er.docs_cnt,
        'lines_cnt', er.lines_cnt
      )
      order by er.first_seen_at nulls last, er.material_code, er.uom
    ),
    '[]'::jsonb
  ) as value
  from enriched_rows er
),
totals_data as (
  select jsonb_build_object(
    'docs_total', (select count(*) from incoming_heads),
    'rows_count', count(*),
    'qty_total', coalesce(sum(er.sum_total), 0),
    'line_count', coalesce(sum(er.lines_cnt), 0)
  ) as value
  from enriched_rows er
),
header_data as (
  select jsonb_build_object(
    'period_from', a.from_arg,
    'period_to', a.to_arg
  ) as value
  from normalized_args a
)
select jsonb_build_object(
  'document_type', 'warehouse_incoming_materials_report',
  'version', 'v1',
  'generated_at', timezone('utc', now()),
  'document_id', concat_ws('__', coalesce(p_from, 'all'), coalesce(p_to, 'all')),
  'source_branch', 'canonical',
  'header', hd.value,
  'rows', rd.value,
  'totals', td.value,
  'meta', jsonb_build_object(
    'rows_source', 'wh_ledger',
    'docs_source', 'acc_report_incoming_v2',
    'payload_shape_version', 'v1'
  )
)
from header_data hd
cross join rows_data rd
cross join totals_data td;
$$;

comment on function public.pdf_warehouse_incoming_materials_source_v1(text, text) is
'Warehouse incoming materials PDF canonical source envelope v1. Collapses ledger aggregation and incoming-doc totals into one read-only RPC while leaving final name enrichment, contract shaping, HTML render, and preview/export semantics on the client.';

grant execute on function public.pdf_warehouse_incoming_materials_source_v1(text, text) to authenticated;

commit;
