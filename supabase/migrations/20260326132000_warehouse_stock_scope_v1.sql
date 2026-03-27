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
ordered_rows as (
  select
    nullif(trim(v.code), '') as code,
    coalesce(nullif(trim(v.name), ''), nullif(trim(v.code), ''), '—') as name,
    nullif(trim(v.uom_id), '') as uom_id,
    coalesce(v.qty_available, 0)::numeric as qty_available,
    coalesce(v.qty_available, 0)::numeric as qty_on_hand,
    0::numeric as qty_reserved,
    v.updated_at
  from public.v_wh_balance_ledger_truth_ui_named v
  where nullif(trim(v.code), '') is not null
  order by trim(v.code) asc, trim(coalesce(v.uom_id, '')) asc
),
paged_rows as (
  select *
  from ordered_rows
  offset (select offset_value from normalized_args)
  limit (select limit_value from normalized_args)
)
select jsonb_build_object(
  'document_type', 'warehouse_stock_scope',
  'version', 'v1',
  'rows', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'material_id', pr.code || '::' || coalesce(pr.uom_id, ''),
          'code', pr.code,
          'name', pr.name,
          'uom_id', pr.uom_id,
          'qty_on_hand', pr.qty_on_hand,
          'qty_reserved', pr.qty_reserved,
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
    'rows_source', 'v_wh_balance_ledger_truth_ui_named',
    'payload_shape_version', 'v1',
    'primary_owner', 'rpc_scope_v1',
    'limit', (select limit_value from normalized_args),
    'offset', (select offset_value from normalized_args),
    'total', (select count(*)::integer from ordered_rows)
  )
);
$$;

comment on function public.warehouse_stock_scope_v1(integer, integer) is
'Warehouse stock scope v1. Returns ready stock rows from the named truth ledger view so the stock list no longer depends on client-owned name-map stitching for first paint.';

grant execute on function public.warehouse_stock_scope_v1(integer, integer) to authenticated;

commit;
