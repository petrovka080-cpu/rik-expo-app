begin;

create or replace function public.director_report_canonical_decorations_v1(
  p_options jsonb default '{}'::jsonb,
  p_report jsonb default '{}'::jsonb,
  p_discipline jsonb default null,
  p_transport_branch text default 'rpc_scope_v1',
  p_priced_stage text default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with cfg as (
  select
    'Р‘РµР· РІРёРґР° СЂР°Р±РѕС‚'::text as without_work,
    'РћР±СЉРµРєС‚С‹ РїРѕ РїРѕРґС‚РІРµСЂР¶РґС‘РЅРЅС‹Рј РІС‹РґР°С‡Р°Рј'::text as object_count_label,
    'РЎС‡С‘С‚С‡РёРє РїРѕСЃС‚СЂРѕРµРЅ РїРѕ РїРѕРґС‚РІРµСЂР¶РґС‘РЅРЅС‹Рј РІС‹РґР°С‡Р°Рј СЃРѕ СЃРєР»Р°РґР° Р·Р° РІС‹Р±СЂР°РЅРЅС‹Р№ РїРµСЂРёРѕРґ.'::text as object_count_explanation,
    'Р’РёРґ СЂР°Р±РѕС‚ РЅРµ Р±С‹Р» СѓРєР°Р·Р°РЅ РїСЂРё РїРѕРґС‚РІРµСЂР¶РґС‘РЅРЅРѕР№ РІС‹РґР°С‡Рµ. Р­С‚Рѕ РїСЂРѕР±РµР» РёСЃС…РѕРґРЅС‹С… РґР°РЅРЅС‹С…, Р° РЅРµ РѕС€РёР±РєР° РёРЅС‚РµСЂС„РµР№СЃР°.'::text as no_work_explanation
),
object_scope as (
  select count(*)::numeric as object_count
  from jsonb_array_elements_text(
    case
      when jsonb_typeof(coalesce(p_options, '{}'::jsonb) -> 'objects') = 'array'
        then coalesce(p_options, '{}'::jsonb) -> 'objects'
      else '[]'::jsonb
    end
  ) as object_names(value)
),
report_rows as (
  select
    upper(trim(coalesce(row_value ->> 'rik_code', '')))::text as rik_code,
    trim(coalesce(row_value ->> 'name_human_ru', ''))::text as name_human_ru
  from jsonb_array_elements(
    case
      when jsonb_typeof(coalesce(p_report, '{}'::jsonb) -> 'rows') = 'array'
        then coalesce(p_report, '{}'::jsonb) -> 'rows'
      else '[]'::jsonb
    end
  ) as rows(row_value)
),
name_counts as (
  select
    count(distinct rik_code) filter (
      where rik_code <> ''
        and name_human_ru <> ''
        and upper(name_human_ru) <> rik_code
    )::numeric as resolved_count,
    count(distinct rik_code) filter (
      where rik_code <> ''
        and (name_human_ru = '' or upper(name_human_ru) = rik_code)
    )::numeric as unresolved_count
  from report_rows
),
unresolved_codes as (
  select
    coalesce(jsonb_agg(rik_code order by rik_code), '[]'::jsonb) as codes
  from (
    select distinct rik_code
    from report_rows
    where rik_code <> ''
      and (name_human_ru = '' or upper(name_human_ru) = rik_code)
  ) unresolved
),
works_raw as (
  select
    work_value,
    trim(coalesce(work_value ->> 'work_type_name', ''))::text as work_type_name,
    case
      when trim(coalesce(work_value ->> 'total_positions', '')) ~ '^-?[0-9]+(\.[0-9]+)?$'
        then (work_value ->> 'total_positions')::numeric
      else 0::numeric
    end as total_positions,
    greatest(
      case
        when trim(coalesce(work_value ->> 'location_count', '')) ~ '^-?[0-9]+(\.[0-9]+)?$'
          then (work_value ->> 'location_count')::numeric
        else 0::numeric
      end,
      case
        when jsonb_typeof(work_value -> 'levels') = 'array'
          then jsonb_array_length(work_value -> 'levels')::numeric
        else 0::numeric
      end
    ) as location_count
  from jsonb_array_elements(
    case
      when jsonb_typeof(coalesce(p_discipline, '{}'::jsonb) -> 'works') = 'array'
        then coalesce(p_discipline, '{}'::jsonb) -> 'works'
      else '[]'::jsonb
    end
  ) as works(work_value)
),
works_classified as (
  select
    work_type_name,
    total_positions,
    location_count,
    lower(work_type_name) like lower((select without_work from cfg)) || '%' as is_without_work
  from works_raw
),
work_counts as (
  select
    count(*) filter (where is_without_work)::numeric as missing_work_count,
    count(*) filter (where not is_without_work)::numeric as resolved_work_count,
    coalesce(sum(total_positions) filter (where is_without_work), 0)::numeric as items_without_work,
    coalesce(sum(location_count) filter (where is_without_work), 0)::numeric as locations_without_work,
    coalesce(sum(total_positions), 0)::numeric as total_positions
  from works_classified
),
source_status as (
  select
    case when to_regclass('public.v_rik_names_ru') is null then 'missing' else 'ok' end::text as vrr,
    case when to_regclass('public.catalog_name_overrides') is null then 'missing' else 'ok' end::text as overrides,
    case when to_regclass('public.v_wh_balance_ledger_ui') is null then 'missing' else 'ok' end::text as ledger
),
naming_status as (
  select
    vrr,
    overrides,
    ledger,
    case when vrr = 'ok' or overrides = 'ok' or ledger = 'ok' then 'ok' else 'degraded' end::text as composite,
    case when ledger = 'ok' then 'ok' else 'degraded' end::text as balance,
    case when vrr = 'ok' then 'ok' else 'degraded' end::text as names,
    case when overrides = 'ok' then 'ok' else 'degraded' end::text as overrides_health
  from source_status
),
decorations as (
  select
    jsonb_build_object(
      'objectCount', object_scope.object_count,
      'objectCountLabel', cfg.object_count_label,
      'objectCountExplanation', cfg.object_count_explanation,
      'confirmedWarehouseObjectCount', object_scope.object_count,
      'displayObjectCount', object_scope.object_count,
      'displayObjectCountLabel', cfg.object_count_label,
      'displayObjectCountExplanation', cfg.object_count_explanation,
      'noWorkNameCount', work_counts.items_without_work,
      'noWorkNameExplanation', cfg.no_work_explanation,
      'unresolvedNamesCount', coalesce(name_counts.unresolved_count, 0)
    ) as canonical_summary,
    jsonb_build_object(
      'naming', jsonb_build_object(
        'vrr', naming_status.vrr,
        'overrides', naming_status.overrides,
        'ledger', naming_status.ledger,
        'objectNamingSourceStatus', naming_status.composite,
        'workNamingSourceStatus', naming_status.composite,
        'balanceViewStatus', naming_status.balance,
        'namesViewStatus', naming_status.names,
        'overridesStatus', naming_status.overrides_health,
        'resolvedNames', coalesce(name_counts.resolved_count, 0),
        'unresolvedCodes', unresolved_codes.codes,
        'lastProbeAt', to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'probeCacheMode', 'live'
      ),
      'objectCountSource', 'warehouse_confirmed_issues',
      'noWorkName', jsonb_build_object(
        'workNameMissingCount', work_counts.missing_work_count,
        'workNameResolvedCount', work_counts.resolved_work_count,
        'itemsWithoutWorkName', work_counts.items_without_work,
        'locationsWithoutWorkName', work_counts.locations_without_work,
        'share',
          case
            when work_counts.total_positions > 0
              then round((work_counts.items_without_work * 10000.0) / work_counts.total_positions) / 100.0
            else 0
          end,
        'source', 'warehouse_issues',
        'fallbackApplied', false,
        'canResolveFromSource', false,
        'explanation', cfg.no_work_explanation
      ),
      'backendOwnerPreserved', true,
      'transportBranch', 'rpc_scope_v1',
      'pricedStage', p_priced_stage
    ) as canonical_diagnostics
  from cfg
  cross join object_scope
  cross join name_counts
  cross join unresolved_codes
  cross join work_counts
  cross join naming_status
)
select jsonb_build_object(
  'summary', canonical_summary,
  'diagnostics', canonical_diagnostics
)
from decorations;
$$;

comment on function public.director_report_canonical_decorations_v1(jsonb, jsonb, jsonb, text, text) is
'Canonical server-owned Director report summary and diagnostics. Prevents client recompute of truth-bearing report counters.';

grant execute on function public.director_report_canonical_decorations_v1(jsonb, jsonb, jsonb, text, text) to authenticated;

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
  v_decorations jsonb;
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

  v_decorations := public.director_report_canonical_decorations_v1(
    p_options => coalesce(v_options, '{}'::jsonb),
    p_report => coalesce(v_report, '{}'::jsonb),
    p_discipline => v_discipline,
    p_transport_branch => 'rpc_scope_v1',
    p_priced_stage => v_priced_stage
  );

  return jsonb_build_object(
    'document_type', 'director_report_transport_scope',
    'version', 'v1',
    'options_payload', coalesce(v_options, '{}'::jsonb),
    'report_payload', coalesce(v_report, '{}'::jsonb),
    'discipline_payload', v_discipline,
    'canonical_summary', v_decorations -> 'summary',
    'canonical_diagnostics', v_decorations -> 'diagnostics',
    'priced_stage', to_jsonb(v_priced_stage),
    'sources', jsonb_build_object(
      'options', 'director_report_fetch_options_v1',
      'report', 'director_report_fetch_materials_v1',
      'discipline', case when coalesce(p_include_discipline, false) then 'director_report_fetch_works_v1' else null end,
      'canonical_summary', 'director_report_canonical_decorations_v1',
      'canonical_diagnostics', 'director_report_canonical_decorations_v1'
    )
  );
end;
$$;

comment on function public.director_report_transport_scope_v1(date, date, text, boolean, boolean) is
'Director report transport scope envelope v1. Bundles options + materials + optional discipline + canonical summary/diagnostics payload into one server-owned response.';

grant execute on function public.director_report_transport_scope_v1(date, date, text, boolean, boolean) to authenticated;

commit;
