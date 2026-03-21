begin;

create or replace function public.pdf_warehouse_day_materials_source_v1(
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
    nullif(btrim(coalesce(p_from, '')), '') as from_text_arg,
    nullif(btrim(coalesce(p_to, '')), '') as to_text_arg,
    nullif(btrim(coalesce(p_from, '')), '')::timestamptz as from_ts_arg,
    nullif(btrim(coalesce(p_to, '')), '')::timestamptz as to_ts_arg
),
report_rows as (
  select r.*
  from normalized_args a
  cross join public.wh_report_issued_materials_fast(
    p_from => a.from_ts_arg,
    p_to => a.to_ts_arg,
    p_object_id => null::uuid
  ) r
),
rows_data as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'material_code', rr.material_code,
        'material_name', rr.material_name,
        'uom', rr.uom,
        'sum_in_req', rr.sum_in_req,
        'sum_free', rr.sum_free,
        'sum_over', rr.sum_over,
        'sum_total', rr.sum_total,
        'docs_cnt', rr.docs_cnt,
        'lines_cnt', rr.lines_cnt
      )
      order by rr.material_name, rr.material_code, rr.uom
    ),
    '[]'::jsonb
  ) as value
  from report_rows rr
),
totals_data as (
  select jsonb_build_object(
    'docs_total', (
      select count(*)
      from normalized_args a
      cross join public.acc_report_issues_v2(
        p_from => a.from_text_arg,
        p_to => a.to_text_arg
      ) i
    ),
    'rows_count', count(*),
    'qty_total', coalesce(sum(rr.sum_total), 0),
    'line_count', coalesce(sum(rr.lines_cnt), 0)
  ) as value
  from report_rows rr
),
header_data as (
  select jsonb_build_object(
    'period_from', a.from_text_arg,
    'period_to', a.to_text_arg
  ) as value
  from normalized_args a
)
select jsonb_build_object(
  'document_type', 'warehouse_day_materials_report',
  'version', 'v1',
  'generated_at', timezone('utc', now()),
  'document_id', concat_ws('__', coalesce(p_from, 'all'), coalesce(p_to, 'all')),
  'source_branch', 'canonical',
  'header', hd.value,
  'rows', rd.value,
  'totals', td.value,
  'meta', jsonb_build_object(
    'rows_source', 'wh_report_issued_materials_fast',
    'docs_source', 'acc_report_issues_v2',
    'payload_shape_version', 'v1'
  )
)
from header_data hd
cross join rows_data rd
cross join totals_data td;
$$;

comment on function public.pdf_warehouse_day_materials_source_v1(text, text) is
'Warehouse day materials PDF canonical source envelope v1. Collapses issued-material rows and report totals bases into one read-only RPC while leaving contract shaping, HTML render, and preview/export semantics on the client.';

grant execute on function public.pdf_warehouse_day_materials_source_v1(text, text) to authenticated;

commit;
