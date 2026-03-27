begin;

create or replace function public.warehouse_stock_scope_v1(
  p_limit integer default 400,
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
    greatest(coalesce(p_limit, 400), 1)::integer as limit_value,
    greatest(coalesce(p_offset, 0), 0)::integer as offset_value
),
paged_truth as (
  select
    trim(v.code) as code,
    nullif(trim(v.uom_id), '') as uom_id,
    coalesce(v.qty_available, 0)::numeric as qty_available,
    v.updated_at
  from public.v_wh_balance_ledger_truth_ui v
  where nullif(trim(v.code), '') is not null
  order by trim(v.code) asc, trim(coalesce(v.uom_id, '')) asc
  offset (select offset_value from normalized_args)
  limit (select limit_value from normalized_args)
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
    pt.code,
    pt.uom_id,
    pt.qty_available,
    pt.updated_at,
    coalesce(pm.display_name, om.name_ru, lm.name_ui, pt.code, '—') as display_name
  from paged_truth pt
  left join projection_map pm
    on pm.code_key = upper(pt.code)
  left join override_map om
    on om.code_key = upper(pt.code)
  left join ledger_ui_map lm
    on lm.code_key = upper(pt.code)
)
select jsonb_build_object(
  'document_type', 'warehouse_stock_scope',
  'version', 'v1',
  'rows', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'material_id', rr.code || '::' || coalesce(rr.uom_id, ''),
          'code', rr.code,
          'name', rr.display_name,
          'uom_id', rr.uom_id,
          'qty_on_hand', rr.qty_available,
          'qty_reserved', 0,
          'qty_available', rr.qty_available,
          'updated_at', rr.updated_at,
          'object_name', null,
          'warehouse_name', null
        )
        order by rr.code asc, rr.uom_id asc nulls last
      )
      from ready_rows rr
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
    'payload_shape_version', 'v1',
    'primary_owner', 'rpc_scope_v1',
    'limit', (select limit_value from normalized_args),
    'offset', (select offset_value from normalized_args),
    'row_count', (select count(*)::integer from ready_rows)
  )
);
$$;

comment on function public.warehouse_stock_scope_v1(integer, integer) is
'Warehouse stock scope v1 tuned. Preserves current stock first-paint naming semantics (projection -> overrides -> ledger ui -> code) while moving stock read-model assembly into a single backend-owned contract.';

grant execute on function public.warehouse_stock_scope_v1(integer, integer) to authenticated;

commit;
