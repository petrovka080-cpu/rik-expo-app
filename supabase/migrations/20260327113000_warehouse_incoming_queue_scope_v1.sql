begin;

create or replace function public.warehouse_incoming_queue_scope_v1(
  p_offset integer default 0,
  p_limit integer default 30
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with args as (
  select
    greatest(coalesce(p_offset, 0), 0)::integer as offset_value,
    greatest(coalesce(p_limit, 30), 1)::integer as limit_value
),
source_rows as (
  select
    trim(coalesce(v.incoming_id::text, '')) as incoming_id,
    trim(coalesce(v.purchase_id::text, '')) as purchase_id,
    coalesce(nullif(trim(coalesce(v.incoming_status, '')), ''), 'pending') as incoming_status,
    nullif(trim(coalesce(v.po_no, '')), '') as po_no,
    nullif(trim(coalesce(v.purchase_status, '')), '') as purchase_status,
    v.purchase_created_at,
    v.confirmed_at,
    greatest(coalesce(v.qty_expected_sum, 0), 0)::numeric as qty_expected_sum,
    greatest(coalesce(v.qty_received_sum, 0), 0)::numeric as qty_received_sum,
    greatest(
      coalesce(
        v.qty_left_sum,
        greatest(coalesce(v.qty_expected_sum, 0), 0) - greatest(coalesce(v.qty_received_sum, 0), 0)
      ),
      0
    )::numeric as qty_left_sum,
    greatest(coalesce(v.items_cnt, 0), 0)::integer as items_cnt,
    greatest(coalesce(v.pending_cnt, 0), 0)::integer as pending_cnt,
    greatest(coalesce(v.partial_cnt, 0), 0)::integer as partial_cnt
  from public.v_wh_incoming_heads_ui v
  where nullif(trim(coalesce(v.incoming_id::text, '')), '') is not null
    and nullif(trim(coalesce(v.purchase_id::text, '')), '') is not null
),
all_visible_rows as (
  select sr.*
  from source_rows sr
  where sr.qty_left_sum > 0
),
window_rows as (
  select sr.*
  from source_rows sr
  cross join args a
  order by sr.purchase_created_at desc nulls last, sr.incoming_id asc
  offset (select offset_value from args)
  limit (select limit_value from args)
),
visible_window_rows as (
  select
    wr.*,
    case when wr.qty_received_sum > 0 and wr.qty_left_sum > 0 then 1 else 0 end as partial_priority
  from window_rows wr
  where wr.qty_left_sum > 0
),
ordered_rows as (
  select
    vr.*,
    row_number() over (
      order by vr.partial_priority desc, vr.purchase_created_at desc nulls last, vr.incoming_id asc
    ) as row_index
  from visible_window_rows vr
),
meta as (
  select
    a.offset_value as page_offset,
    a.limit_value as page_size,
    (select count(*)::integer from window_rows) as raw_window_row_count,
    (select count(*)::integer from ordered_rows) as returned_row_count,
    (select count(*)::integer from all_visible_rows) as total_visible_count,
    ((select count(*) from window_rows) = a.limit_value) as has_more
  from args a
)
select jsonb_build_object(
  'version', 'v1',
  'meta', jsonb_build_object(
    'offset', meta.page_offset,
    'limit', meta.page_size,
    'rawWindowRowCount', meta.raw_window_row_count,
    'returnedRowCount', meta.returned_row_count,
    'totalVisibleCount', meta.total_visible_count,
    'hasMore', meta.has_more,
    'scopeKey', concat('warehouse_incoming_queue_scope_v1:', meta.page_offset, ':', meta.page_size),
    'sourceVersion', 'warehouse_incoming_queue_scope_v1',
    'generatedAt', to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  ),
  'rows', coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', orr.incoming_id,
        'incoming_id', orr.incoming_id,
        'purchase_id', orr.purchase_id,
        'incoming_status', orr.incoming_status,
        'po_no', orr.po_no,
        'purchase_status', orr.purchase_status,
        'purchase_created_at', orr.purchase_created_at,
        'confirmed_at', orr.confirmed_at,
        'qty_expected_sum', orr.qty_expected_sum,
        'qty_received_sum', orr.qty_received_sum,
        'qty_left_sum', orr.qty_left_sum,
        'items_cnt', orr.items_cnt,
        'pending_cnt', orr.pending_cnt,
        'partial_cnt', orr.partial_cnt
      )
      order by orr.row_index
    )
    from ordered_rows orr
  ), '[]'::jsonb)
)
from meta;
$$;

comment on function public.warehouse_incoming_queue_scope_v1(integer, integer) is
  'Backend-owned incoming queue scope preserving current client-visible filter/sort semantics per raw page window.';

grant execute on function public.warehouse_incoming_queue_scope_v1(integer, integer) to authenticated;

create or replace function public.warehouse_incoming_items_scope_v1(
  p_incoming_id text
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with normalized_args as (
  select trim(coalesce(p_incoming_id, '')) as incoming_id
),
source_rows as (
  select
    nullif(trim(coalesce(v.incoming_item_id::text, '')), '') as incoming_item_id,
    trim(coalesce(v.purchase_item_id::text, '')) as purchase_item_id,
    nullif(upper(trim(coalesce(v.code, ''))), '') as code,
    coalesce(nullif(trim(coalesce(v.name, '')), ''), nullif(trim(coalesce(v.code, '')), ''), '—') as name,
    nullif(trim(coalesce(v.uom, '')), '') as uom,
    greatest(coalesce(v.qty_expected, 0), 0)::numeric as qty_expected,
    greatest(coalesce(v.qty_received, 0), 0)::numeric as qty_received,
    greatest(
      coalesce(
        v.qty_left,
        greatest(coalesce(v.qty_expected, 0), 0) - greatest(coalesce(v.qty_received, 0), 0)
      ),
      0
    )::numeric as qty_left,
    greatest(coalesce(v.sort_key, 1), 1)::integer as sort_key
  from public.v_wh_incoming_items_ui v
  cross join normalized_args a
  where trim(coalesce(v.incoming_id::text, '')) = a.incoming_id
    and nullif(trim(coalesce(v.purchase_item_id::text, '')), '') is not null
),
visible_rows as (
  select sr.*
  from source_rows sr
  where sr.qty_left > 0
    and (
      coalesce(sr.code, '') like 'MAT-%'
      or coalesce(sr.code, '') like 'TOOL-%'
    )
),
ordered_rows as (
  select
    vr.*,
    row_number() over (
      order by vr.sort_key asc, vr.name asc, vr.purchase_item_id asc
    ) as row_index
  from visible_rows vr
),
meta as (
  select
    (select incoming_id from normalized_args) as incoming_id,
    (select count(*)::integer from ordered_rows) as row_count
)
select jsonb_build_object(
  'version', 'v1',
  'meta', jsonb_build_object(
    'incomingId', meta.incoming_id,
    'rowCount', meta.row_count,
    'scopeKey', concat('warehouse_incoming_items_scope_v1:', meta.incoming_id),
    'sourceVersion', 'warehouse_incoming_items_scope_v1',
    'generatedAt', to_char(timezone('utc', now()), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  ),
  'rows', coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'incoming_item_id', orr.incoming_item_id,
        'purchase_item_id', orr.purchase_item_id,
        'code', orr.code,
        'name', orr.name,
        'uom', orr.uom,
        'qty_expected', orr.qty_expected,
        'qty_received', orr.qty_received,
        'qty_left', orr.qty_left,
        'sort_key', orr.sort_key
      )
      order by orr.row_index
    )
    from ordered_rows orr
  ), '[]'::jsonb)
)
from meta;
$$;

comment on function public.warehouse_incoming_items_scope_v1(text) is
  'Backend-owned incoming items scope preserving current warehouse-material filter and remaining-qty visibility semantics.';

grant execute on function public.warehouse_incoming_items_scope_v1(text) to authenticated;

commit;
