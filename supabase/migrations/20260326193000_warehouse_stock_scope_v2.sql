begin;

create or replace function public.warehouse_stock_scope_v2(
  p_limit integer default 120,
  p_offset integer default 0
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with normalized_args as (
  select
    greatest(coalesce(p_limit, 120), 1)::integer as limit_value,
    greatest(coalesce(p_offset, 0), 0)::integer as offset_value
),
ordered_truth as (
  select
    trim(v.code) as code,
    nullif(trim(v.uom_id), '') as uom_id,
    coalesce(v.qty_available, 0)::numeric as qty_available,
    v.updated_at
  from public.v_wh_balance_ledger_truth_ui v
  where nullif(trim(v.code), '') is not null
  order by trim(v.code) asc, trim(coalesce(v.uom_id, '')) asc
),
projection_map as (
  select
    upper(trim(code)) as code_key,
    nullif(trim(display_name), '') as display_name
  from public.warehouse_name_map_ui
  where nullif(trim(code), '') is not null
),
override_map as (
  select
    upper(trim(code)) as code_key,
    nullif(trim(name_ru), '') as name_ru
  from public.catalog_name_overrides
  where nullif(trim(code), '') is not null
),
ledger_ui_map as (
  select distinct on (upper(trim(code)))
    upper(trim(code)) as code_key,
    nullif(trim(name), '') as name_ui
  from public.v_wh_balance_ledger_ui
  where nullif(trim(code), '') is not null
  order by upper(trim(code)), updated_at desc nulls last
),
ready_rows as (
  select
    ot.code,
    ot.uom_id,
    ot.qty_available,
    ot.updated_at,
    coalesce(pm.display_name, om.name_ru, lm.name_ui, ot.code, '—') as display_name
  from ordered_truth ot
  left join projection_map pm
    on pm.code_key = upper(ot.code)
  left join override_map om
    on om.code_key = upper(ot.code)
  left join ledger_ui_map lm
    on lm.code_key = upper(ot.code)
),
paged_rows as (
  select *
  from ready_rows
  offset (select offset_value from normalized_args)
  limit (select limit_value from normalized_args)
),
totals as (
  select count(*)::integer as total_rows
  from ready_rows
)
select jsonb_build_object(
  'document_type', 'warehouse_stock_scope',
  'version', 'v2',
  'rows', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'material_id', pr.code || '::' || coalesce(pr.uom_id, ''),
          'code', pr.code,
          'name', pr.display_name,
          'uom_id', pr.uom_id,
          'qty_on_hand', pr.qty_available,
          'qty_reserved', 0,
          'qty_available', pr.qty_available,
          'updated_at', pr.updated_at,
          'object_name', null,
          'warehouse_name', null
        )
        order by pr.code asc, pr.uom_id asc nulls last
      )
      from paged_rows pr
    ),
    '[]'::jsonb
  ),
  'meta', jsonb_build_object(
    'rows_source', 'v_wh_balance_ledger_truth_ui',
    'name_sources', jsonb_build_array(
      'warehouse_name_map_ui',
      'catalog_name_overrides',
      'v_wh_balance_ledger_ui',
      'code_fallback'
    ),
    'payload_shape_version', 'v2',
    'primary_owner', 'rpc_scope_v2',
    'limit', (select limit_value from normalized_args),
    'offset', (select offset_value from normalized_args),
    'returned_row_count', (select count(*)::integer from paged_rows),
    'total_row_count', (select total_rows from totals),
    'has_more', (
      (select offset_value from normalized_args) + (select count(*)::integer from paged_rows)
    ) < (select total_rows from totals)
  )
);
$$;

comment on function public.warehouse_stock_scope_v2(integer, integer) is
'Warehouse stock scope v2. Adds page/window metadata (total rows, returned rows, has_more) while preserving the backend-owned stock read model and current display-name semantics.';

grant execute on function public.warehouse_stock_scope_v2(integer, integer) to authenticated;

commit;
