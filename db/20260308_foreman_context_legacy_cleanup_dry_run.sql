-- db/20260308_foreman_context_legacy_cleanup_dry_run.sql
-- Purpose: dry-run audit of legacy level_code / zone_code mismatches against
-- the new foreman object context model.
-- Safe: no writes.

with req as (
  select
    r.id,
    nullif(trim(r.object_type_code), '') as object_type_code,
    coalesce(nullif(trim(r.object_name), ''), nullif(trim(r.object), '')) as object_name,
    nullif(trim(r.level_code), '') as level_code,
    nullif(trim(r.zone_code), '') as zone_code
  from public.requests r
),
typed as (
  select
    q.*,
    case
      when q.object_type_code = 'BLD-PARKING-OPEN' then 'open_site'
      when q.object_type_code in ('BLD-RES-DORM', 'BLD-RES-BLOCK', 'BLD-RES-LOW') then 'campus_block'
      when q.object_type_code in ('BLD-IND-WAREHOUSE', 'BLD-IND-COLD') then 'warehouse_complex'
      when q.object_type_code in ('BLD-IND-HANGAR', 'BLD-IND-WORKSHOP', 'BLD-IND-PLANT') then 'industrial_hall'
      when q.object_type_code in ('BLD-ENG-KNS', 'BLD-ENG-BOILER', 'BLD-ENG-TP', 'BLD-AGRO-GREEN', 'BLD-AGRO', 'BLD-INFRA-DEPOT', 'BLD-IND-CHEM', 'BLD-SITE-TEMP') then 'technical_facility'
      when q.object_type_code in ('BLD-INFRA-TERMINAL') then 'transport_terminal'
      when q.object_type_code in ('BLD-INFRA-PEDESTR', 'BLD-INFRA-OVERPASS', 'BLD-INFRA') then 'linear_infrastructure'
      when q.object_type_code in ('BLD-ADMIN', 'BLD-OFFICE', 'BLD-RES-TOWER', 'BLD-SOC-SCHOOL', 'BLD-MED-HOSP', 'BLD-SOC-HOSP', 'BLD-EDU-UNI') then 'multilevel_building'
      when q.object_type_code like 'BLD-IND-%' then 'industrial_hall'
      when q.object_type_code like 'BLD-ENG-%' then 'technical_facility'
      when q.object_type_code like 'BLD-INFRA-%' then 'linear_infrastructure'
      when q.object_type_code like 'BLD-%' then 'service_building'
      when q.object_type_code is null and lower(coalesce(q.object_name, '')) ~ '(ангар|цех|завод)' then 'industrial_hall'
      when q.object_type_code is null and lower(coalesce(q.object_name, '')) ~ '(склад|логист)' then 'warehouse_complex'
      when q.object_type_code is null and lower(coalesce(q.object_name, '')) ~ '(паркинг открытый)' then 'open_site'
      when q.object_type_code is null and lower(coalesce(q.object_name, '')) ~ '(общеж|вахтов)' then 'campus_block'
      when q.object_type_code is null and lower(coalesce(q.object_name, '')) ~ '(кнс|итп|ктп|котель)' then 'technical_facility'
      when q.object_type_code is null and lower(coalesce(q.object_name, '')) ~ '(админ|офис|башн|школ|корпус)' then 'multilevel_building'
      else 'generic_object'
    end as object_class
  from req q
),
joined as (
  select
    t.*,
    l.name as level_name,
    z.name as zone_name
  from typed t
  left join public.ref_levels l on l.code = t.level_code
  left join public.ref_zones z on z.code = t.zone_code
),
flags as (
  select
    j.*,
    case
      when j.level_code is null then false
      when j.level_name is null then true
      when j.object_class = 'multilevel_building'
        then not (lower(j.level_name) ~ '(этаж|уров|подвал|цокол|кровл|техэтаж|floor|lvl-)')
      when j.object_class in ('industrial_hall', 'warehouse_complex')
        then not (lower(j.level_name) ~ '(секц|блок|пролет|корпус|ось|захватк|line|мезонин)')
      when j.object_class = 'open_site'
        then not (lower(j.level_name) ~ '(участ|сектор|периметр|площад|наруж|террит|двор|зона)')
      when j.object_class = 'campus_block'
        then not (lower(j.level_name) ~ '(блок|корпус|модул|секц|городок|кампус)')
      when j.object_class = 'technical_facility'
        then not (lower(j.level_name) ~ '(узел|камера|секц|отсек|линия|шкаф|колод|блок|мезонин)')
      when j.object_class in ('transport_terminal', 'service_building')
        then not (lower(j.level_name) ~ '(секц|блок|корпус|ось|участ|зона)')
      when j.object_class = 'linear_infrastructure'
        then not (lower(j.level_name) ~ '(участ|сектор|периметр|трасс|маршрут|ось)')
      else false
    end as clear_level,
    case
      when j.zone_code is null then false
      when j.zone_name is null then true
      when j.object_class = 'multilevel_building'
        then not (lower(j.zone_name) ~ '(помещ|коридор|холл|сануз|шахт|кварт|офис|вход|ось)')
      when j.object_class in ('industrial_hall', 'warehouse_complex')
        then not (lower(j.zone_name) ~ '(участ|линия|ось|рамп|отгруз|склад|секц|зона)')
      when j.object_class = 'open_site'
        then not (lower(j.zone_name) ~ '(сектор|периметр|въезд|наруж|контур|пешеход|участ|площад)')
      when j.object_class = 'campus_block'
        then not (lower(j.zone_name) ~ '(блок|корпус|участ|модул|зона|сектор)')
      when j.object_class = 'technical_facility'
        then not (lower(j.zone_name) ~ '(узел|камера|тех|отсек|шкаф|зона|участ)')
      else false
    end as clear_zone
  from joined j
)
select
  object_class,
  count(*) as total_rows,
  count(*) filter (where clear_level) as rows_with_invalid_level,
  count(*) filter (where clear_zone) as rows_with_invalid_zone
from flags
group by object_class
order by object_class;

-- Sample of rows that would be sanitized.
with req as (
  select
    r.id,
    nullif(trim(r.object_type_code), '') as object_type_code,
    coalesce(nullif(trim(r.object_name), ''), nullif(trim(r.object), '')) as object_name,
    nullif(trim(r.level_code), '') as level_code,
    nullif(trim(r.zone_code), '') as zone_code
  from public.requests r
),
typed as (
  select
    q.*,
    case
      when q.object_type_code = 'BLD-PARKING-OPEN' then 'open_site'
      when q.object_type_code in ('BLD-RES-DORM', 'BLD-RES-BLOCK', 'BLD-RES-LOW') then 'campus_block'
      when q.object_type_code in ('BLD-IND-WAREHOUSE', 'BLD-IND-COLD') then 'warehouse_complex'
      when q.object_type_code in ('BLD-IND-HANGAR', 'BLD-IND-WORKSHOP', 'BLD-IND-PLANT') then 'industrial_hall'
      when q.object_type_code in ('BLD-ENG-KNS', 'BLD-ENG-BOILER', 'BLD-ENG-TP', 'BLD-AGRO-GREEN', 'BLD-AGRO', 'BLD-INFRA-DEPOT', 'BLD-IND-CHEM', 'BLD-SITE-TEMP') then 'technical_facility'
      when q.object_type_code in ('BLD-INFRA-TERMINAL') then 'transport_terminal'
      when q.object_type_code in ('BLD-INFRA-PEDESTR', 'BLD-INFRA-OVERPASS', 'BLD-INFRA') then 'linear_infrastructure'
      when q.object_type_code in ('BLD-ADMIN', 'BLD-OFFICE', 'BLD-RES-TOWER', 'BLD-SOC-SCHOOL', 'BLD-MED-HOSP', 'BLD-SOC-HOSP', 'BLD-EDU-UNI') then 'multilevel_building'
      when q.object_type_code like 'BLD-IND-%' then 'industrial_hall'
      when q.object_type_code like 'BLD-ENG-%' then 'technical_facility'
      when q.object_type_code like 'BLD-INFRA-%' then 'linear_infrastructure'
      when q.object_type_code like 'BLD-%' then 'service_building'
      else 'generic_object'
    end as object_class
  from req q
),
joined as (
  select
    t.*,
    l.name as level_name,
    z.name as zone_name
  from typed t
  left join public.ref_levels l on l.code = t.level_code
  left join public.ref_zones z on z.code = t.zone_code
)
select *
from joined
where level_code is not null or zone_code is not null
order by id desc
limit 200;

