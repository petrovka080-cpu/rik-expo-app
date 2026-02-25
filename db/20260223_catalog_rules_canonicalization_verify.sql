-- VERIFY: canonicalization quality checks after APPLY.
-- Expected:
-- 1) rule codes missing in catalog_items_canon = 0
-- 2) rows with old mapped codes in rules/catalog = 0
-- 3) duplicate catalog_items rik_code groups = 0

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

create temp table if not exists _manual_map (
  old_code text primary key,
  new_code text not null
) on commit drop;

insert into _manual_map(old_code, new_code) values
  ('MAT-CONC-WIRE','MAT-WIRE-BIND'),
  ('MAT-TIE-WIRE','MAT-WIRE-BIND'),
  ('WORK-FORMWORK-INSTALL','WRK-FORMWORK-INSTALL'),
  ('MAT-FOAM-PU','MAT-FOAM'),
  ('WORK-PLMB-SINK-INSTALL','WRK-PLMB-SINK-INSTALL'),
  ('MAT-BAG-TRASH','MAT-TRASH-BAGS'),
  ('MAT-SCREW-GKL','MAT-GKL-SCREW'),
  ('MAT-TAPE-SERPYANKA','MAT-TAPE-SERP'),
  ('MAT-PRIMER-ACRYLIC','MAT-PRIMER-ACRYL'),
  ('MAT-TILE-SPACERS','MAT-TILE-CROSS'),
  ('MAT-GKL-BOARD-12_5-PCS','MAT-GKL-12-2500X1200'),
  ('MAT-CABLE-VVGNG-LS-3X1_5','MAT-CABLE-VVGNG-LS-3X1.5'),
  ('MAT-CABLE-VVGNG-LS-3X2_5','MAT-CABLE-VVGNG-LS-3X2.5'),
  ('MAT-CABLE-VVGNG-LS-5X2_5','MAT-CABLE-VVGNG-LS-5X2.5'),
  ('MAT-ROOF-SUPERDIFF-160-1,5X50','MAT-ROOF-SUPERDIFF-160-1.5X50'),
  ('MAT-CEIL-T24-MAIN-3_6M','MAT-CEIL-T24-MAIN-3,6M'),
  ('MAT-CEIL-T24-CROSS-1_2M','MAT-CEIL-T24-CROSS-1,2M')
on conflict (old_code) do nothing;

select
  count(*) as rule_rows,
  count(distinct rik_code) as distinct_rule_codes
from _rule_codes;

with missing as (
  select distinct rc.rik_code
  from _rule_codes rc
  left join public.catalog_items_canon c
    on upper(trim(c.code)) = rc.rik_code
  where c.code is null
)
select count(*) as missing_rule_codes_in_canon
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
order by rik_code
limit 500;

with mapped_old as (
  select upper(trim(old_code)) as old_code
  from _manual_map
)
select
  rc.table_name,
  rc.rik_code as old_code,
  count(*) as rows_left
from _rule_codes rc
join mapped_old mo on mo.old_code = rc.rik_code
group by rc.table_name, rc.rik_code
order by rows_left desc, rc.table_name, rc.rik_code
limit 500;

with mapped_old as (
  select upper(trim(old_code)) as old_code
  from _manual_map
)
select
  upper(trim(ci.rik_code)) as old_code,
  count(*) as rows_left
from public.catalog_items ci
join mapped_old mo on mo.old_code = upper(trim(ci.rik_code))
group by upper(trim(ci.rik_code))
order by rows_left desc, old_code
limit 500;

select
  upper(trim(rik_code)) as rik_code,
  count(*) as dup_rows
from public.catalog_items
where nullif(trim(rik_code), '') is not null
group by upper(trim(rik_code))
having count(*) > 1
order by dup_rows desc, rik_code
limit 500;

select
  changed_at, actor, table_name, work_type_code, old_rik_code, new_rik_code, action
from public.rik_code_alignment_audit
order by changed_at desc
limit 300;

rollback;

