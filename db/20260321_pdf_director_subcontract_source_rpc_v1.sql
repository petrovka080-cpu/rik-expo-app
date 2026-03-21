begin;

create or replace function public.pdf_director_subcontract_source_v1(
  p_from text default null,
  p_to text default null,
  p_object_name text default null
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
    nullif(btrim(coalesce(p_object_name, '')), '') as object_name_arg,
    case
      when nullif(btrim(coalesce(p_from, '')), '') is null then null::date
      else nullif(btrim(coalesce(p_from, '')), '')::date
    end as from_date_arg,
    case
      when nullif(btrim(coalesce(p_to, '')), '') is null then null::date
      else nullif(btrim(coalesce(p_to, '')), '')::date
    end as to_date_arg
),
source_rows as (
  select
    s.id,
    s.display_no,
    s.status,
    s.object_name,
    s.work_type,
    s.contractor_org,
    s.total_price,
    s.approved_at,
    s.submitted_at,
    s.rejected_at,
    s.director_comment
  from public.subcontracts s
  cross join normalized_args a
  where (a.from_date_arg is null or s.created_at::date >= a.from_date_arg)
    and (a.to_date_arg is null or s.created_at::date <= a.to_date_arg)
    and (a.object_name_arg is null or s.object_name = a.object_name_arg)
),
rows_data as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', sr.id,
        'display_no', sr.display_no,
        'status', sr.status,
        'object_name', sr.object_name,
        'work_type', sr.work_type,
        'contractor_org', sr.contractor_org,
        'total_price', sr.total_price,
        'approved_at', sr.approved_at,
        'submitted_at', sr.submitted_at,
        'rejected_at', sr.rejected_at,
        'director_comment', sr.director_comment
      )
      order by sr.approved_at desc nulls last, sr.submitted_at desc nulls last, sr.id
    ),
    '[]'::jsonb
  ) as value
  from source_rows sr
),
totals_data as (
  select jsonb_build_object(
    'total_rows', count(*),
    'approved_count', count(*) filter (where sr.status = 'approved'),
    'pending_count', count(*) filter (where sr.status = 'pending'),
    'rejected_count', count(*) filter (where sr.status = 'rejected')
  ) as value
  from source_rows sr
),
header_data as (
  select jsonb_build_object(
    'period_from', a.from_text_arg,
    'period_to', a.to_text_arg,
    'object_name', a.object_name_arg
  ) as value
  from normalized_args a
)
select jsonb_build_object(
  'document_type', 'director_subcontract_report',
  'version', 'v1',
  'generated_at', timezone('utc', now()),
  'document_id', concat_ws(
    '__',
    coalesce(p_from, 'all'),
    coalesce(p_to, 'all'),
    coalesce(nullif(p_object_name, ''), 'all')
  ),
  'source_branch', 'canonical',
  'header', hd.value,
  'rows', rd.value,
  'totals', td.value,
  'meta', jsonb_build_object(
    'rows_source', 'subcontracts',
    'payload_shape_version', 'v1'
  )
)
from header_data hd
cross join rows_data rd
cross join totals_data td;
$$;

comment on function public.pdf_director_subcontract_source_v1(text, text, text) is
'Director subcontract PDF canonical source envelope v1. Collapses subcontract rows and period/object filtering into one read-only source boundary while leaving aggregation, HTML render, and preview/export semantics on the client.';

grant execute on function public.pdf_director_subcontract_source_v1(text, text, text) to authenticated;

commit;
