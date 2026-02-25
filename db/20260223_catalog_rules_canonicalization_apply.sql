-- APPLY: Canonicalize rik_code across calculator rules and catalog_items.
-- Safe-by-default approach:
-- 1) apply manual + auto code mapping to rule tables
-- 2) normalize catalog_items rik_code with same mapping
-- 3) deduplicate catalog_items by canonical rik_code (keep best row)
-- 4) audit all changes

begin;

create table if not exists public.rik_code_alignment_audit (
  id bigserial primary key,
  changed_at timestamptz not null default now(),
  actor text not null default current_user,
  table_name text not null,
  work_type_code text null,
  old_rik_code text null,
  new_rik_code text null,
  action text not null
);

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

create temp table if not exists _rule_distinct_codes (
  rik_code text primary key
) on commit drop;

do $$
declare
  r record;
  sql_text text;
begin
  for r in select * from _rule_tables loop
    sql_text := format(
      'insert into _rule_distinct_codes(rik_code)
       select distinct upper(trim(rik_code::text))
       from %I.%I
       where nullif(trim(rik_code::text), '''') is not null
       on conflict (rik_code) do nothing',
      r.table_schema, r.table_name
    );
    execute sql_text;
  end loop;
end $$;

create temp table if not exists _resolved_map (
  old_code text primary key,
  new_code text not null,
  source text not null
) on commit drop;

with
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
auto_map as (
  select
    rd.rik_code as old_code,
    min(cn.canon_code) as new_code
  from _rule_distinct_codes rd
  join canon_norm cn
    on cn.norm_code = upper(replace(replace(rd.rik_code, '_', '.'), ',', '.'))
  left join canon_codes cc
    on cc.code = rd.rik_code
  where cc.code is null
  group by rd.rik_code
  having count(*) = 1
)
insert into _resolved_map(old_code, new_code, source)
select upper(trim(old_code)), upper(trim(new_code)), 'manual'
from _manual_map
union all
select upper(trim(old_code)), upper(trim(new_code)), 'auto'
from auto_map
on conflict (old_code) do update
set new_code = excluded.new_code,
    source = excluded.source;

delete from _resolved_map rm
where rm.old_code = rm.new_code
   or not exists (
     select 1
     from public.catalog_items_canon c
     where upper(trim(c.code)) = rm.new_code
   );

do $$
declare
  r record;
  sql_text text;
begin
  for r in select * from _rule_tables loop
    sql_text := format(
      'insert into public.rik_code_alignment_audit(table_name, work_type_code, old_rik_code, new_rik_code, action)
       select %L, nullif(trim(work_type_code::text), ''''), upper(trim(rik_code::text)), rm.new_code, ''rules_update''
       from %I.%I t
       join _resolved_map rm on rm.old_code = upper(trim(t.rik_code::text))
       where nullif(trim(t.rik_code::text), '''') is not null',
      r.table_name, r.table_schema, r.table_name
    );
    execute sql_text;

    sql_text := format(
      'update %I.%I t
       set rik_code = rm.new_code
       from _resolved_map rm
       where rm.old_code = upper(trim(t.rik_code::text))
         and rm.new_code <> upper(trim(t.rik_code::text))',
      r.table_schema, r.table_name
    );
    execute sql_text;
  end loop;
end $$;

insert into public.rik_code_alignment_audit(table_name, work_type_code, old_rik_code, new_rik_code, action)
select
  'catalog_items',
  null,
  upper(trim(ci.rik_code)),
  rm.new_code,
  'catalog_items_code_update'
from public.catalog_items ci
join _resolved_map rm on rm.old_code = upper(trim(ci.rik_code))
where nullif(trim(ci.rik_code), '') is not null
  and upper(trim(ci.rik_code)) <> rm.new_code;

update public.catalog_items ci
set rik_code = rm.new_code
from _resolved_map rm
where rm.old_code = upper(trim(ci.rik_code))
  and nullif(trim(ci.rik_code), '') is not null
  and upper(trim(ci.rik_code)) <> rm.new_code;

-- Deduplicate catalog_items by canonical rik_code.
create temp table if not exists _keep_catalog_ids (
  id bigint primary key
) on commit drop;

insert into _keep_catalog_ids(id)
select id
from (
  select
    id,
    row_number() over (
      partition by upper(trim(rik_code))
      order by
        (name_human_ru is not null and btrim(name_human_ru) <> '') desc,
        (name_human is not null and btrim(name_human) <> '') desc,
        coalesce(is_foreman, false) desc,
        coalesce(foreman_priority, 0) desc,
        id desc
    ) as rn
  from public.catalog_items
  where nullif(trim(rik_code), '') is not null
) s
where s.rn = 1;

insert into public.rik_code_alignment_audit(table_name, work_type_code, old_rik_code, new_rik_code, action)
select
  'catalog_items',
  null,
  upper(trim(ci.rik_code)),
  upper(trim(ci.rik_code)),
  'catalog_items_duplicate_delete'
from public.catalog_items ci
where nullif(trim(ci.rik_code), '') is not null
  and not exists (select 1 from _keep_catalog_ids k where k.id = ci.id);

delete from public.catalog_items ci
where nullif(trim(ci.rik_code), '') is not null
  and not exists (select 1 from _keep_catalog_ids k where k.id = ci.id);

-- Keep request_items.code aligned with rik_code.
update public.request_items
set code = rik_code
where nullif(trim(code), '') is distinct from nullif(trim(rik_code), '')
  and nullif(trim(rik_code), '') is not null;

commit;

