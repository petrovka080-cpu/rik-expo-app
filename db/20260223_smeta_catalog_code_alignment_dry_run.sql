-- DRY RUN ONLY.
-- Purpose:
-- 1) detect rule tables that contain both work_type_code and rik_code
-- 2) detect codes used by calculator rules that are absent in catalog_items_canon
-- 3) split gaps into:
--    a) present in catalog_items (can be inserted into canon)
--    b) absent in both (hard blockers)

begin;

create temp table if not exists _rule_tables (
  table_schema text not null,
  table_name   text not null,
  primary key (table_schema, table_name)
) on commit drop;

insert into _rule_tables (table_schema, table_name)
select c1.table_schema, c1.table_name
from information_schema.columns c1
join information_schema.columns c2
  on c2.table_schema = c1.table_schema
 and c2.table_name   = c1.table_name
where c1.table_schema = 'public'
  and c1.column_name = 'rik_code'
  and c2.column_name = 'work_type_code';

create temp table if not exists _rule_codes (
  table_schema    text not null,
  table_name      text not null,
  work_type_code  text null,
  rik_code        text not null
) on commit drop;

do $$
declare
  r record;
  sql_text text;
begin
  for r in select * from _rule_tables loop
    sql_text := format(
      'insert into _rule_codes(table_schema, table_name, work_type_code, rik_code)
       select %L, %L, nullif(trim(work_type_code::text), ''''), trim(rik_code::text)
       from %I.%I
       where nullif(trim(rik_code::text), '''') is not null',
      r.table_schema, r.table_name, r.table_schema, r.table_name
    );
    execute sql_text;
  end loop;
end $$;

-- 0) discovery
select
  table_schema,
  table_name,
  count(*) as rows_with_rik_code
from _rule_codes
group by table_schema, table_name
order by rows_with_rik_code desc, table_name;

-- 1) totals
select
  count(*) as rule_rows,
  count(distinct rik_code) as rule_distinct_codes,
  count(distinct work_type_code) as rule_distinct_work_types
from _rule_codes;

-- 2) codes missing in canon
with rule_distinct as (
  select distinct upper(trim(rik_code)) as rik_code from _rule_codes
),
canon as (
  select distinct upper(trim(code)) as code from public.catalog_items_canon
),
cat as (
  select distinct upper(trim(rik_code)) as rik_code from public.catalog_items
)
select
  r.rik_code,
  case when c.rik_code is not null then true else false end as exists_in_catalog_items,
  case when n.code is not null then true else false end as exists_in_canon
from rule_distinct r
left join cat c
  on c.rik_code = r.rik_code
left join canon n
  on n.code = r.rik_code
where n.code is null
order by r.rik_code;

-- 3) expanded sample with table/work_type where missing appears
with missing as (
  select distinct upper(trim(rc.rik_code)) as rik_code
  from _rule_codes rc
  left join public.catalog_items_canon c
    on upper(trim(c.code)) = upper(trim(rc.rik_code))
  where c.code is null
)
select
  rc.table_name,
  rc.work_type_code,
  upper(trim(rc.rik_code)) as rik_code,
  count(*) as rows_cnt
from _rule_codes rc
join missing m
  on m.rik_code = upper(trim(rc.rik_code))
group by rc.table_name, rc.work_type_code, upper(trim(rc.rik_code))
order by rc.table_name, rc.work_type_code, rik_code;

rollback;
