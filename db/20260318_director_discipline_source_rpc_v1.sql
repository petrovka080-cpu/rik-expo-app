begin;

create or replace function public.director_report_fetch_discipline_source_rows_v1(
  p_from date default null,
  p_to date default null
)
returns table(
  issue_id text,
  issue_item_id text,
  iss_date timestamptz,
  request_id_from_item text,
  request_id_from_issue text,
  request_item_id text,
  issue_note text,
  issue_object_name text,
  issue_work_name text,
  request_system_code text,
  request_system_name text,
  request_level_code text,
  request_zone_name text,
  material_name text,
  rik_code text,
  uom text,
  qty numeric
)
language sql
stable
security definer
set search_path = public
as $$
with system_ref as (
  select distinct on (upper(trim(coalesce(code::text, ''))))
    upper(trim(coalesce(code::text, '')))::text as code,
    coalesce(
      nullif(trim(name_human_ru::text), ''),
      nullif(trim(display_name::text), ''),
      nullif(trim(alias_ru::text), ''),
      nullif(trim(name::text), '')
    )::text as system_name
  from public.ref_systems
  where trim(coalesce(code::text, '')) <> ''
  order by
    upper(trim(coalesce(code::text, ''))),
    nullif(trim(name_human_ru::text), '') desc nulls last,
    nullif(trim(display_name::text), '') desc nulls last,
    nullif(trim(alias_ru::text), '') desc nulls last,
    nullif(trim(name::text), '') desc nulls last
)
select
  wi.id::text as issue_id,
  wii.id::text as issue_item_id,
  wi.iss_date::timestamptz as iss_date,
  ri.request_id::text as request_id_from_item,
  wi.request_id::text as request_id_from_issue,
  wii.request_item_id::text as request_item_id,
  wi.note::text as issue_note,
  nullif(trim(wi.object_name::text), '')::text as issue_object_name,
  nullif(trim(wi.work_name::text), '')::text as issue_work_name,
  nullif(trim(req.system_code::text), '')::text as request_system_code,
  sr.system_name::text as request_system_name,
  nullif(trim(req.level_code::text), '')::text as request_level_code,
  nullif(trim(req.zone_code::text), '')::text as request_zone_name,
  nullif(trim(upper(coalesce(wii.rik_code::text, ''))), '')::text as material_name,
  nullif(trim(upper(coalesce(wii.rik_code::text, ''))), '')::text as rik_code,
  coalesce(nullif(trim(wii.uom_id::text), ''), '')::text as uom,
  coalesce(wii.qty, 0)::numeric as qty
from public.warehouse_issue_items wii
join public.warehouse_issues wi
  on wi.id = wii.issue_id
left join public.request_items ri
  on ri.id::text = wii.request_item_id::text
left join public.requests req
  on req.id::text = coalesce(ri.request_id::text, wi.request_id::text)
left join system_ref sr
  on sr.code = upper(trim(coalesce(req.system_code::text, '')))
where wi.status = 'Подтверждено'
  and (p_from is null or wi.iss_date::date >= p_from)
  and (p_to is null or wi.iss_date::date <= p_to)
order by wi.iss_date desc, wi.id desc, wii.id desc;
$$;

comment on function public.director_report_fetch_discipline_source_rows_v1(date, date) is
'Director discipline source rows at issue-item grain. Replaces client-side issue/request/system join for report source preparation while preserving client render semantics.';

grant execute on function public.director_report_fetch_discipline_source_rows_v1(date, date) to authenticated;

commit;
