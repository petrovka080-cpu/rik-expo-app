begin;

create or replace function public.pdf_warehouse_object_work_source_v1(
  p_from text,
  p_to text,
  p_object_id text default null
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
    nullif(btrim(coalesce(p_object_id, '')), '') as object_id_text_arg,
    nullif(btrim(coalesce(p_from, '')), '')::timestamptz as from_ts_arg,
    nullif(btrim(coalesce(p_to, '')), '')::timestamptz as to_ts_arg,
    nullif(btrim(coalesce(p_object_id, '')), '')::uuid as object_id_uuid_arg
),
report_rows as (
  select r.*
  from normalized_args a
  cross join public.wh_report_issued_by_object_fast(
    p_from => a.from_ts_arg,
    p_to => a.to_ts_arg,
    p_object_id => a.object_id_uuid_arg
  ) r
),
rows_data as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'object_id', rr.object_id,
        'object_name', rr.object_name,
        'work_name', rr.work_name,
        'docs_cnt', rr.docs_cnt,
        'req_cnt', rr.req_cnt,
        'active_days', rr.active_days,
        'uniq_materials', rr.uniq_materials,
        'recipients_text', rr.recipients_text,
        'top3_materials', rr.top3_materials
      )
      order by rr.object_name, rr.work_name, rr.object_id
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
    'req_total', coalesce(sum(rr.req_cnt), 0),
    'active_days_total', coalesce(sum(rr.active_days), 0),
    'uniq_materials_total', coalesce(sum(rr.uniq_materials), 0)
  ) as value
  from report_rows rr
),
header_data as (
  select jsonb_build_object(
    'period_from', a.from_text_arg,
    'period_to', a.to_text_arg,
    'object_id', a.object_id_text_arg
  ) as value
  from normalized_args a
)
select jsonb_build_object(
  'document_type', 'warehouse_object_work_report',
  'version', 'v1',
  'generated_at', timezone('utc', now()),
  'document_id', concat_ws(
    '__',
    coalesce(p_from, 'all'),
    coalesce(p_to, 'all'),
    coalesce(nullif(p_object_id, ''), 'all')
  ),
  'source_branch', 'canonical',
  'header', hd.value,
  'rows', rd.value,
  'totals', td.value,
  'meta', jsonb_build_object(
    'rows_source', 'wh_report_issued_by_object_fast',
    'docs_source', 'acc_report_issues_v2',
    'payload_shape_version', 'v1'
  )
)
from header_data hd
cross join rows_data rd
cross join totals_data td;
$$;

comment on function public.pdf_warehouse_object_work_source_v1(text, text, text) is
'Warehouse object-work PDF canonical source envelope v1. Collapses report rows, report totals bases, and filter normalization into one read-only RPC while leaving contract shaping, HTML render, and preview/export semantics on the client.';

grant execute on function public.pdf_warehouse_object_work_source_v1(text, text, text) to authenticated;

commit;
