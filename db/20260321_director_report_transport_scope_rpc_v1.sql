begin;

create or replace function public.director_report_transport_scope_v1(
  p_from date default null,
  p_to date default null,
  p_object_name text default null,
  p_include_discipline boolean default false,
  p_include_costs boolean default false
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_options jsonb;
  v_report jsonb;
  v_discipline jsonb;
  v_priced_stage text;
begin
  v_options := public.director_report_fetch_options_v1(
    p_from => p_from,
    p_to => p_to
  );

  v_report := public.director_report_fetch_materials_v1(
    p_from => p_from,
    p_to => p_to,
    p_object_name => p_object_name
  );

  if coalesce(p_include_discipline, false) then
    v_discipline := public.director_report_fetch_works_v1(
      p_from => p_from,
      p_to => p_to,
      p_object_name => p_object_name,
      p_include_costs => coalesce(p_include_costs, false)
    );
    v_priced_stage := case
      when coalesce(p_include_costs, false) then 'priced'
      else 'base'
    end;
  else
    v_discipline := null;
    v_priced_stage := null;
  end if;

  return jsonb_build_object(
    'document_type', 'director_report_transport_scope',
    'version', 'v1',
    'options_payload', coalesce(v_options, '{}'::jsonb),
    'report_payload', coalesce(v_report, '{}'::jsonb),
    'discipline_payload', v_discipline,
    'priced_stage', to_jsonb(v_priced_stage),
    'sources', jsonb_build_object(
      'options', 'director_report_fetch_options_v1',
      'report', 'director_report_fetch_materials_v1',
      'discipline', case when coalesce(p_include_discipline, false) then 'director_report_fetch_works_v1' else null end
    )
  );
end;
$$;

comment on function public.director_report_transport_scope_v1(date, date, text, boolean, boolean) is
'Director report transport scope envelope v1. Bundles options + materials + optional discipline payload into one canonical RPC response for controller/report loading.';

grant execute on function public.director_report_transport_scope_v1(date, date, text, boolean, boolean) to authenticated;

commit;
