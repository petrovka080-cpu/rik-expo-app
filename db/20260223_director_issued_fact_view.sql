-- Director report source view
-- Scope: Director -> Reports -> "Факт выдачи (склад)"
-- Safe: read-only objects only, no ledger/commit logic changes.

create or replace view public.v_director_issued_fact_rows as
with base as (
  select
    wi.id as issue_id,
    wi.iss_date as iss_date,
    wii.id as issue_item_id,
    upper(trim(wii.rik_code::text)) as rik_code,
    trim(coalesce(wii.uom_id::text, '')) as uom,
    coalesce(wii.qty, 0)::numeric as qty,
    wii.request_item_id,
    ri.request_id as request_id_from_item,
    wi.request_id as request_id_from_issue,
    coalesce(
      nullif(trim(req.object_name::text), ''),
      nullif(trim(wi.object_name::text), ''),
      'Без объекта'
    ) as object_name,
    coalesce(
      nullif(trim(wi.work_name::text), ''),
      nullif(trim(req.system_code::text), ''),
      'Без вида работ'
    ) as work_name
  from public.warehouse_issue_items wii
  join public.warehouse_issues wi
    on wi.id = wii.issue_id
  left join public.request_items ri
    on ri.id = wii.request_item_id
  left join public.requests req
    on req.id = coalesce(ri.request_id, wi.request_id)
  where wi.status = 'Подтверждено'
)
select
  b.issue_id,
  b.iss_date,
  b.issue_item_id,
  b.object_name,
  b.work_name,
  b.rik_code,
  coalesce(
    nullif(trim(cic.name_human_ru::text), ''),
    nullif(trim(ci.name_human_ru::text), ''),
    nullif(trim(ci.name_human::text), ''),
    nullif(trim(ci.name::text), ''),
    nullif(trim(vrr.name_ru::text), ''),
    b.rik_code
  ) as material_name_ru,
  b.uom,
  b.qty,
  (b.request_item_id is null) as is_without_request
from base b
left join public.catalog_items_canon cic
  on upper(trim(cic.code::text)) = b.rik_code
left join public.catalog_items ci
  on upper(trim(ci.rik_code::text)) = b.rik_code
left join public.v_rik_names_ru vrr
  on upper(trim(vrr.code::text)) = b.rik_code;

comment on view public.v_director_issued_fact_rows is
'Director warehouse issued fact rows: confirmed issues only, free + request issue lines, with resolved object/work and Russian material names.';
