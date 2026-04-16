begin;

-- ============================================================================
-- W2 — Hook warehouse_stock_scope_v2 to read from warehouse_stock_summary_v1
-- when available, with full raw fallback.
--
-- Strategy: UNION ALL — summary path (fast) when data exists,
-- raw v_wh_balance_ledger_truth_ui + name joins (fallback) when empty.
-- ============================================================================

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
summary_available as (
  select exists(select 1 from public.warehouse_stock_summary_v1 limit 1) as has_data
),
-- === W2: Use pre-computed summary when available ===
ready_rows as (
  -- Fast path: read from summary table
  select
    wss.code,
    wss.uom_id,
    wss.qty_available,
    wss.updated_at,
    wss.display_name
  from public.warehouse_stock_summary_v1 wss
  where (select has_data from summary_available)
  union all
  -- Fallback: original v_wh_balance_ledger_truth_ui + name resolution
  select
    trim(v.code) as code,
    nullif(trim(v.uom_id), '') as uom_id,
    coalesce(v.qty_available, 0)::numeric as qty_available,
    v.updated_at,
    coalesce(pm.display_name, om.name_ru, lm.name_ui, trim(v.code), E'\u2014') as display_name
  from public.v_wh_balance_ledger_truth_ui v
  left join (
    select
      upper(trim(code)) as code_key,
      nullif(trim(display_name), '') as display_name
    from public.warehouse_name_map_ui
    where nullif(trim(code), '') is not null
  ) pm on pm.code_key = upper(trim(v.code))
  left join (
    select
      upper(trim(code)) as code_key,
      nullif(trim(name_ru), '') as name_ru
    from public.catalog_name_overrides
    where nullif(trim(code), '') is not null
  ) om on om.code_key = upper(trim(v.code))
  left join (
    select distinct on (upper(trim(code)))
      upper(trim(code)) as code_key,
      nullif(trim(name), '') as name_ui
    from public.v_wh_balance_ledger_ui
    where nullif(trim(code), '') is not null
    order by upper(trim(code)), updated_at desc nulls last
  ) lm on lm.code_key = upper(trim(v.code))
  where not (select has_data from summary_available)
    and nullif(trim(v.code), '') is not null
),
ordered_rows as (
  select *
  from ready_rows
  order by code asc, coalesce(uom_id, '') asc
),
paged_rows as (
  select *
  from ordered_rows
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
    'rows_source', case
      when (select has_data from summary_available) then 'warehouse_stock_summary_v1'
      else 'v_wh_balance_ledger_truth_ui'
    end,
    'name_sources', case
      when (select has_data from summary_available) then jsonb_build_array('pre_resolved_in_summary')
      else jsonb_build_array(
        'warehouse_name_map_ui',
        'catalog_name_overrides',
        'v_wh_balance_ledger_ui',
        'code_fallback'
      )
    end,
    'payload_shape_version', 'v2',
    'primary_owner', 'rpc_scope_v2',
    'limit', (select limit_value from normalized_args),
    'offset', (select offset_value from normalized_args),
    'returned_row_count', (select count(*)::integer from paged_rows),
    'total_row_count', (select total_rows from totals),
    'has_more', (
      (select offset_value from normalized_args) + (select count(*)::integer from paged_rows)
    ) < (select total_rows from totals),
    'summary_layer_version', case
      when (select has_data from summary_available) then 'w2_v1'
      else null
    end
  )
);
$$;

comment on function public.warehouse_stock_scope_v2(integer, integer) is
  'W2: Warehouse stock scope v2 with summary-layer optimization. Reads pre-computed per-material balances from warehouse_stock_summary_v1 when available; falls back to raw v_wh_balance_ledger_truth_ui + name joins when summary is empty. Stock semantics unchanged.';

grant execute on function public.warehouse_stock_scope_v2(integer, integer) to authenticated;

notify pgrst, 'reload schema';

commit;
