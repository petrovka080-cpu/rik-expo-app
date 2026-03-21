begin;

create or replace function public.pdf_director_production_source_v1(
  p_from text default null,
  p_to text default null,
  p_object_name text default null,
  p_include_costs boolean default true
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
    end as to_date_arg,
    coalesce(p_include_costs, true) as include_costs_arg
),
header_data as (
  select jsonb_build_object(
    'period_from', a.from_text_arg,
    'period_to', a.to_text_arg,
    'object_name', a.object_name_arg,
    'include_costs', a.include_costs_arg
  ) as value
  from normalized_args a
),
materials_data as (
  select public.director_report_fetch_materials_v1(
    p_from => a.from_date_arg,
    p_to => a.to_date_arg,
    p_object_name => a.object_name_arg
  ) as value
  from normalized_args a
),
discipline_data as (
  select public.director_report_fetch_works_v1(
    p_from => a.from_date_arg,
    p_to => a.to_date_arg,
    p_object_name => a.object_name_arg,
    p_include_costs => a.include_costs_arg
  ) as value
  from normalized_args a
)
select jsonb_build_object(
  'document_type', 'director_production_report',
  'version', 'v1',
  'generated_at', timezone('utc', now()),
  'document_id', concat_ws(
    '__',
    coalesce(p_from, 'all'),
    coalesce(p_to, 'all'),
    coalesce(nullif(p_object_name, ''), 'all'),
    case when coalesce(p_include_costs, true) then 'priced' else 'base' end
  ),
  'source_branch', 'canonical',
  'header', hd.value,
  'report_payload', md.value,
  'discipline_payload', dd.value,
  'meta', jsonb_build_object(
    'report_source', 'director_report_fetch_materials_v1',
    'discipline_source', 'director_report_fetch_works_v1',
    'priced_stage', case when coalesce(p_include_costs, true) then 'priced' else 'base' end,
    'payload_shape_version', 'v1'
  )
)
from header_data hd
cross join materials_data md
cross join discipline_data dd;
$$;

comment on function public.pdf_director_production_source_v1(text, text, text, boolean) is
'Director production PDF canonical source envelope v1. Collapses materials and discipline report payload RPCs into one read-only source boundary while keeping renderer, staged base/priced behavior, and preview/export semantics on the client.';

grant execute on function public.pdf_director_production_source_v1(text, text, text, boolean) to authenticated;

commit;
