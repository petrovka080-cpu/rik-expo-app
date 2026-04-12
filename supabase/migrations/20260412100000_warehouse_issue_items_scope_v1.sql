begin;

create or replace function public.warehouse_issue_items_scope_v1(
  p_request_id text
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with normalized_args as (
  select nullif(trim(coalesce(p_request_id, '')), '') as request_id
),
request_head as (
  select
    r.id::text as request_id,
    nullif(trim(coalesce(r.display_no::text, '')), '') as display_no,
    nullif(trim(coalesce(r.object_name, r.object_type_code, '')), '') as object_name,
    nullif(trim(coalesce(r.level_code, '')), '') as level_code,
    nullif(trim(coalesce(r.system_code, '')), '') as system_code,
    nullif(trim(coalesce(r.zone_code, '')), '') as zone_code,
    nullif(trim(coalesce(r.level_code, '')), '') as level_name,
    nullif(trim(coalesce(r.system_code, '')), '') as system_name,
    nullif(trim(coalesce(r.zone_code, '')), '') as zone_name,
    nullif(trim(coalesce(r.note, '')), '') as note,
    nullif(trim(coalesce(r.comment, '')), '') as comment
  from public.requests r
  join normalized_args a
    on r.id::text = a.request_id
),
item_truth as (
  select
    trim(coalesce(v.request_id::text, '')) as request_id,
    trim(coalesce(v.request_item_id::text, '')) as request_item_id,
    max(nullif(trim(coalesce(v.rik_code, '')), '')) as rik_code,
    max(nullif(trim(coalesce(v.name_human, v.rik_code, '')), '')) as name_human,
    max(nullif(trim(coalesce(v.uom, '')), '')) as uom,
    max(greatest(coalesce(v.qty_limit, 0), 0))::numeric as qty_limit,
    max(greatest(coalesce(v.qty_issued, 0), 0))::numeric as qty_issued,
    max(greatest(coalesce(v.qty_left, 0), 0))::numeric as qty_left,
    max(greatest(coalesce(v.qty_available, 0), 0))::numeric as qty_available,
    max(greatest(coalesce(v.qty_can_issue_now, 0), 0))::numeric as qty_can_issue_now
  from public.v_wh_issue_req_items_ui v
  join normalized_args a
    on trim(coalesce(v.request_id::text, '')) = a.request_id
  where nullif(trim(coalesce(v.request_id::text, '')), '') is not null
    and nullif(trim(coalesce(v.request_item_id::text, '')), '') is not null
  group by 1, 2
),
ready_rows as (
  select
    it.request_id,
    it.request_item_id,
    rh.display_no,
    rh.object_name,
    rh.level_code,
    rh.system_code,
    rh.zone_code,
    rh.level_name,
    rh.system_name,
    rh.zone_name,
    it.rik_code,
    coalesce(it.name_human, it.rik_code, '-') as name_human,
    it.uom,
    it.qty_limit,
    it.qty_issued,
    it.qty_left,
    it.qty_available,
    it.qty_can_issue_now,
    rh.note,
    rh.comment
  from item_truth it
  left join request_head rh
    on rh.request_id = it.request_id
),
ordered_rows as (
  select
    rr.*,
    row_number() over (
      order by rr.name_human asc, rr.rik_code asc nulls last, rr.request_item_id asc
    ) as row_index
  from ready_rows rr
),
meta as (
  select
    (select request_id from normalized_args) as request_id,
    (select count(*)::integer from ordered_rows) as row_count
)
select jsonb_build_object(
  'document_type', 'warehouse_issue_items_scope',
  'version', 'v1',
  'rows', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'request_id', orr.request_id,
          'request_item_id', orr.request_item_id,
          'display_no', orr.display_no,
          'object_name', orr.object_name,
          'level_code', orr.level_code,
          'system_code', orr.system_code,
          'zone_code', orr.zone_code,
          'level_name', orr.level_name,
          'system_name', orr.system_name,
          'zone_name', orr.zone_name,
          'rik_code', orr.rik_code,
          'name_human', orr.name_human,
          'uom', orr.uom,
          'qty_limit', orr.qty_limit,
          'qty_issued', orr.qty_issued,
          'qty_left', orr.qty_left,
          'qty_available', orr.qty_available,
          'qty_can_issue_now', orr.qty_can_issue_now,
          'note', orr.note,
          'comment', orr.comment
        )
        order by orr.row_index
      )
      from ordered_rows orr
    ),
    '[]'::jsonb
  ),
  'meta', jsonb_build_object(
    'rows_source', 'warehouse_issue_items_scope_v1',
    'payload_shape_version', 'v1',
    'primary_owner', 'rpc_scope_v1',
    'request_id', (select request_id from meta),
    'row_count', (select row_count from meta),
    'scope_key', concat('warehouse_issue_items_scope_v1:', coalesce((select request_id from meta), '')),
    'generated_at', timezone('utc', now())
  )
);
$$;

comment on function public.warehouse_issue_items_scope_v1(text) is
'Warehouse request issue item scope v1. Returns server-owned request-item issue quantities and head display context; client must not materialize item availability from local stock.';

grant execute on function public.warehouse_issue_items_scope_v1(text) to authenticated;

commit;
