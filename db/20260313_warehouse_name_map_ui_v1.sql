-- Phase v1: cheap warehouse name projection for stock read path.

create table if not exists public.warehouse_name_map_ui (
  code text primary key,
  display_name text not null,
  source_priority smallint not null,
  source_name text not null,
  updated_at timestamptz not null default now()
);

create index if not exists warehouse_name_map_ui_updated_at_idx
  on public.warehouse_name_map_ui(updated_at);

create or replace function public.warehouse_refresh_name_map_ui(
  p_code_list text[] default null,
  p_refresh_mode text default 'incremental'
)
returns bigint
language plpgsql
as $$
declare
  v_mode text := lower(coalesce(p_refresh_mode, 'incremental'));
  v_rows bigint := 0;
begin
  with src_codes as (
    select distinct upper(trim(code)) as code
    from (
      select unnest(
        case
          when v_mode = 'full' then (
            select array_agg(distinct upper(trim(x.code)))
            from (
              select code from public.v_wh_balance_ledger_truth_ui
              union all
              select code from public.catalog_name_overrides
              union all
              select code from public.v_rik_names_ru
              union all
              select code from public.v_wh_balance_ledger_ui
            ) x
            where trim(coalesce(x.code, '')) <> ''
          )
          else p_code_list
        end
      ) as code
    ) s
    where trim(coalesce(code, '')) <> ''
  ),
  ranked_names as (
    select
      sc.code,
      trim(src.display_name) as display_name,
      src.source_priority,
      src.source_name,
      row_number() over (
        partition by sc.code
        order by src.source_priority asc, src.source_name asc
      ) as rn
    from src_codes sc
    join (
      select
        upper(trim(code)) as code,
        trim(name_ru) as display_name,
        1::smallint as source_priority,
        'catalog_name_overrides'::text as source_name
      from public.catalog_name_overrides
      where trim(coalesce(code, '')) <> ''
        and trim(coalesce(name_ru, '')) <> ''

      union all

      select
        upper(trim(code)) as code,
        trim(name_ru) as display_name,
        2::smallint as source_priority,
        'v_rik_names_ru'::text as source_name
      from public.v_rik_names_ru
      where trim(coalesce(code, '')) <> ''
        and trim(coalesce(name_ru, '')) <> ''

      union all

      select
        upper(trim(code)) as code,
        trim(name) as display_name,
        3::smallint as source_priority,
        'v_wh_balance_ledger_ui'::text as source_name
      from public.v_wh_balance_ledger_ui
      where trim(coalesce(code, '')) <> ''
        and trim(coalesce(name, '')) <> ''
    ) src on src.code = sc.code
  ),
  best_names as (
    select
      sc.code,
      coalesce(rn.display_name, sc.code) as display_name,
      coalesce(rn.source_priority, 999::smallint) as source_priority,
      coalesce(rn.source_name, 'code') as source_name
    from src_codes sc
    left join ranked_names rn
      on rn.code = sc.code
     and rn.rn = 1
  ),
  upserted as (
    insert into public.warehouse_name_map_ui (
      code,
      display_name,
      source_priority,
      source_name,
      updated_at
    )
    select
      code,
      display_name,
      source_priority,
      source_name,
      now()
    from best_names
    on conflict (code) do update
      set display_name = excluded.display_name,
          source_priority = excluded.source_priority,
          source_name = excluded.source_name,
          updated_at = now()
    returning 1
  )
  select count(*)::bigint into v_rows from upserted;

  return coalesce(v_rows, 0);
end;
$$;
