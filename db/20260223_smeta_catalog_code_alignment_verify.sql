-- VERIFY SCRIPT.
-- Run after APPLY.
-- Expected:
-- 1) missing_in_canon = 0
-- 2) no old alias codes left in rule tables

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
       select %L, %L, nullif(trim(work_type_code::text), ''''), upper(trim(rik_code::text))
       from %I.%I
       where nullif(trim(rik_code::text), '''') is not null',
      r.table_schema, r.table_name, r.table_schema, r.table_name
    );
    execute sql_text;
  end loop;
end $$;

-- 1) summary
select
  count(*) as rule_rows,
  count(distinct rik_code) as distinct_rule_codes,
  count(distinct work_type_code) as distinct_work_types
from _rule_codes;

-- 2) remaining gaps in canon
with missing as (
  select distinct rc.rik_code
  from _rule_codes rc
  left join public.catalog_items_canon c
    on upper(trim(c.code)) = rc.rik_code
  where c.code is null
)
select count(*) as missing_in_canon
from missing;

with missing as (
  select distinct rc.rik_code
  from _rule_codes rc
  left join public.catalog_items_canon c
    on upper(trim(c.code)) = rc.rik_code
  where c.code is null
)
select *
from missing
order by rik_code;

-- 3) old alias codes still present?
with aliases(old_code, new_code) as (
  values
    ('MAT-CABLE-VVGNG-LS-3X1_5','MAT-CABLE-VVGNG-LS-3X1.5'),
    ('MAT-CABLE-VVGNG-LS-3X2_5','MAT-CABLE-VVGNG-LS-3X2.5'),
    ('MAT-CABLE-VVGNG-LS-5X2_5','MAT-CABLE-VVGNG-LS-5X2.5'),
    ('MAT-ROOF-SUPERDIFF-160-1,5X50','MAT-ROOF-SUPERDIFF-160-1.5X50'),
    ('MAT-CEIL-T24-MAIN-3_6M','MAT-CEIL-T24-MAIN-3,6M'),
    ('MAT-CEIL-T24-CROSS-1_2M','MAT-CEIL-T24-CROSS-1,2M')
)
select
  a.old_code,
  count(*) as remaining_rows
from aliases a
join _rule_codes rc
  on rc.rik_code = a.old_code
group by a.old_code
order by a.old_code;

-- 4) last alignment audit rows
select
  changed_at, actor, table_name, work_type_code, old_rik_code, new_rik_code, action
from public.rik_code_alignment_audit
order by changed_at desc
limit 200;

rollback;
