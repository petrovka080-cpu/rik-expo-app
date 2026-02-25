-- APPLY SCRIPT.
-- Goal:
-- 1) add missing rule codes to catalog_items_canon from catalog_items
-- 2) normalize known duplicate code variants in calculator rule tables
-- 3) keep all changes auditable
--
-- IMPORTANT:
-- - Run DRY RUN first: db/20260223_smeta_catalog_code_alignment_dry_run.sql
-- - Review results before APPLY in production.

begin;

-- Optional audit table for traceability.
create table if not exists public.rik_code_alignment_audit (
  id bigserial primary key,
  changed_at timestamptz not null default now(),
  actor text null default current_user,
  table_name text null,
  work_type_code text null,
  old_rik_code text null,
  new_rik_code text null,
  action text not null
);

-- Manual alias map for known format conflicts (underscore/comma/dot variants).
create temp table if not exists _code_alias_map (
  old_code text primary key,
  new_code text not null
) on commit drop;

insert into _code_alias_map(old_code, new_code) values
  ('MAT-CABLE-VVGNG-LS-3X1_5', 'MAT-CABLE-VVGNG-LS-3X1.5'),
  ('MAT-CABLE-VVGNG-LS-3X2_5', 'MAT-CABLE-VVGNG-LS-3X2.5'),
  ('MAT-CABLE-VVGNG-LS-5X2_5', 'MAT-CABLE-VVGNG-LS-5X2.5'),
  ('MAT-ROOF-SUPERDIFF-160-1,5X50', 'MAT-ROOF-SUPERDIFF-160-1.5X50'),
  ('MAT-CEIL-T24-MAIN-3_6M', 'MAT-CEIL-T24-MAIN-3,6M'),
  ('MAT-CEIL-T24-CROSS-1_2M', 'MAT-CEIL-T24-CROSS-1,2M')
on conflict (old_code) do update set new_code = excluded.new_code;

-- Discover candidate rule tables (public.* containing work_type_code + rik_code).
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

-- Build working set of distinct rule codes.
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

-- 1) Insert missing rule codes into canon from catalog_items.
create temp table if not exists _inserted_canon_codes (
  code text primary key
) on commit drop;

with inserted as (
insert into public.catalog_items_canon (
  code, name, uom_id, sector_code, kind, mark_m, updated_at
)
select
  ci.rik_code as code,
  coalesce(nullif(ci.name_human_ru, ''), nullif(ci.name_human, ''), ci.rik_code) as name,
  ci.uom_code as uom_id,
  ci.sector_code,
  ci.kind,
  null::numeric as mark_m,
  now() as updated_at
from _rule_distinct_codes r
join public.catalog_items ci
  on upper(trim(ci.rik_code)) = r.rik_code
left join public.catalog_items_canon canon
  on upper(trim(canon.code)) = r.rik_code
where canon.code is null
returning code
)
insert into _inserted_canon_codes(code)
select upper(trim(code))
from inserted
on conflict (code) do nothing;

-- 2) Normalize alias variants in all rule tables.
do $$
declare
  t record;
  m record;
  sql_update text;
  sql_audit text;
begin
  for t in select * from _rule_tables loop
    for m in select * from _code_alias_map loop
      -- audit old->new before update
      sql_audit := format(
        'insert into public.rik_code_alignment_audit(table_name, work_type_code, old_rik_code, new_rik_code, action)
         select %L, nullif(trim(work_type_code::text), ''''), %L, %L, %L
         from %I.%I
         where upper(trim(rik_code::text)) = %L',
        t.table_name,
        upper(trim(m.old_code)),
        upper(trim(m.new_code)),
        'normalize_alias',
        t.table_schema, t.table_name,
        upper(trim(m.old_code))
      );
      execute sql_audit;

      -- update rule code
      sql_update := format(
        'update %I.%I
         set rik_code = %L
         where upper(trim(rik_code::text)) = %L',
        t.table_schema, t.table_name,
        upper(trim(m.new_code)),
        upper(trim(m.old_code))
      );
      execute sql_update;
    end loop;
  end loop;
end $$;

-- 3) Audit inserted canon codes.
insert into public.rik_code_alignment_audit(table_name, work_type_code, old_rik_code, new_rik_code, action)
select
  'catalog_items_canon' as table_name,
  null as work_type_code,
  null as old_rik_code,
  i.code as new_rik_code,
  'insert_missing_into_canon' as action
from _inserted_canon_codes i;

commit;
