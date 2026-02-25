-- DRY RUN: Canonicalize rik_code between calculator rules and catalog.
-- No data changes. Shows what would be updated and what is still unresolved.

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

with
rule_distinct as (
  select distinct rik_code
  from _rule_codes
),
canon_codes as (
  select distinct upper(trim(code)) as code
  from public.catalog_items_canon
),
canon_norm as (
  select
    upper(trim(code)) as canon_code,
    upper(replace(replace(trim(code), '_', '.'), ',', '.')) as norm_code
  from public.catalog_items_canon
),
rule_norm as (
  select
    r.rik_code,
    upper(replace(replace(r.rik_code, '_', '.'), ',', '.')) as norm_code
  from rule_distinct r
),
auto_map as (
  select
    rn.rik_code as old_code,
    min(cn.canon_code) as new_code,
    count(*) as candidates
  from rule_norm rn
  join canon_norm cn on cn.norm_code = rn.norm_code
  left join canon_codes cc on cc.code = rn.rik_code
  where cc.code is null
  group by rn.rik_code
  having count(*) = 1
),
resolved as (
  select upper(trim(old_code)) as old_code, upper(trim(new_code)) as new_code, 'manual'::text as source
  from _manual_map
  union all
  select upper(trim(old_code)), upper(trim(new_code)), 'auto'::text as source
  from auto_map
),
resolved_filtered as (
  select r.*
  from resolved r
  join canon_codes c on c.code = r.new_code
  where r.old_code <> r.new_code
),
unresolved as (
  select rd.rik_code
  from rule_distinct rd
  left join canon_codes c on c.code = rd.rik_code
  left join resolved_filtered rm on rm.old_code = rd.rik_code
  where c.code is null and rm.old_code is null
),
impact as (
  select
    rc.table_name,
    rc.work_type_code,
    rc.rik_code as old_code,
    rm.new_code
  from _rule_codes rc
  join resolved_filtered rm on rm.old_code = rc.rik_code
)
select
  (select count(*) from _rule_tables) as rule_tables,
  (select count(*) from _rule_codes) as rule_rows,
  (select count(distinct rik_code) from _rule_codes) as distinct_rule_codes,
  (select count(*) from resolved_filtered) as mapping_rows,
  (select count(*) from unresolved) as unresolved_codes;

with
canon_codes as (
  select distinct upper(trim(code)) as code
  from public.catalog_items_canon
),
resolved as (
  select upper(trim(old_code)) as old_code, upper(trim(new_code)) as new_code, 'manual'::text as source
  from _manual_map
  union all
  select
    rn.rik_code as old_code,
    min(cn.canon_code) as new_code,
    'auto'::text as source
  from (
    select distinct upper(trim(rik_code)) as rik_code
    from _rule_codes
  ) rn
  join (
    select
      upper(trim(code)) as canon_code,
      upper(replace(replace(trim(code), '_', '.'), ',', '.')) as norm_code
    from public.catalog_items_canon
  ) cn
    on cn.norm_code = upper(replace(replace(rn.rik_code, '_', '.'), ',', '.'))
  left join canon_codes cc on cc.code = rn.rik_code
  where cc.code is null
  group by rn.rik_code
  having count(*) = 1
)
select *
from resolved
order by source, old_code
limit 200;

with
rule_distinct as (
  select distinct upper(trim(rik_code)) as rik_code
  from _rule_codes
),
canon_codes as (
  select distinct upper(trim(code)) as code
  from public.catalog_items_canon
),
resolved as (
  select upper(trim(old_code)) as old_code
  from _manual_map
  union
  select
    rn.rik_code
  from rule_distinct rn
  join (
    select
      upper(trim(code)) as canon_code,
      upper(replace(replace(trim(code), '_', '.'), ',', '.')) as norm_code
    from public.catalog_items_canon
  ) cn
    on cn.norm_code = upper(replace(replace(rn.rik_code, '_', '.'), ',', '.'))
  left join canon_codes cc on cc.code = rn.rik_code
  where cc.code is null
  group by rn.rik_code
  having count(*) = 1
),
unresolved as (
  select rd.rik_code
  from rule_distinct rd
  left join canon_codes c on c.code = rd.rik_code
  left join resolved r on r.old_code = rd.rik_code
  where c.code is null and r.old_code is null
)
select *
from unresolved
order by rik_code
limit 500;

select
  upper(trim(rik_code)) as rik_code,
  count(*) as rows_in_catalog_items
from public.catalog_items
where nullif(trim(rik_code), '') is not null
group by upper(trim(rik_code))
having count(*) > 1
order by rows_in_catalog_items desc, rik_code
limit 500;

rollback;

