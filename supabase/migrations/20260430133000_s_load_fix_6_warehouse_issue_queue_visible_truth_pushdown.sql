begin;

do $$
declare
  v_source text;
  v_next text;
  v_old_head_view text := $old$
head_view as (
  select
    trim(coalesce(v.request_id::text, '')) as request_id,
    nullif(trim(coalesce(v.display_no, '')), '') as display_no,
    nullif(trim(coalesce(v.object_name, '')), '') as object_name,
    nullif(trim(coalesce(v.level_code, '')), '') as level_code,
    nullif(trim(coalesce(v.system_code, '')), '') as system_code,
    nullif(trim(coalesce(v.zone_code, '')), '') as zone_code,
    nullif(trim(coalesce(v.level_name, '')), '') as level_name,
    nullif(trim(coalesce(v.system_name, '')), '') as system_name,
    nullif(trim(coalesce(v.zone_name, '')), '') as zone_name,
    v.submitted_at
  from public.v_wh_issue_req_heads_ui v
  where nullif(trim(coalesce(v.request_id::text, '')), '') is not null
),
$old$;
  v_new_head_view text := $new$
head_view as (
  select
    trim(coalesce(v.request_id::text, '')) as request_id,
    nullif(trim(coalesce(v.display_no, '')), '') as display_no,
    nullif(trim(coalesce(v.object_name, '')), '') as object_name,
    nullif(trim(coalesce(v.level_code, '')), '') as level_code,
    nullif(trim(coalesce(v.system_code, '')), '') as system_code,
    nullif(trim(coalesce(v.zone_code, '')), '') as zone_code,
    nullif(trim(coalesce(v.level_name, '')), '') as level_name,
    nullif(trim(coalesce(v.system_name, '')), '') as system_name,
    nullif(trim(coalesce(v.zone_name, '')), '') as zone_name,
    v.submitted_at
  from public.v_wh_issue_req_heads_ui v
  join visible_requests vr
    on vr.request_id = trim(coalesce(v.request_id::text, ''))
  where nullif(trim(coalesce(v.request_id::text, '')), '') is not null
),
$new$;
  v_old_ui_truth text := $old$
ui_item_truth as (
  select
    trim(coalesce(v.request_id::text, '')) as request_id,
    trim(coalesce(v.request_item_id::text, '')) as request_item_id,
    max(greatest(coalesce(v.qty_limit, 0), 0))::numeric as qty_limit,
    max(greatest(coalesce(v.qty_issued, 0), 0))::numeric as qty_issued,
    max(greatest(coalesce(v.qty_left, 0), 0))::numeric as qty_left,
    max(greatest(coalesce(v.qty_can_issue_now, 0), 0))::numeric as qty_can_issue_now
  from public.v_wh_issue_req_items_ui v
  where nullif(trim(coalesce(v.request_id::text, '')), '') is not null
    and nullif(trim(coalesce(v.request_item_id::text, '')), '') is not null
  group by 1, 2
),
$old$;
  v_new_ui_truth text := $new$
ui_item_truth as (
  select
    trim(coalesce(v.request_id::text, '')) as request_id,
    trim(coalesce(v.request_item_id::text, '')) as request_item_id,
    max(greatest(coalesce(v.qty_limit, 0), 0))::numeric as qty_limit,
    max(greatest(coalesce(v.qty_issued, 0), 0))::numeric as qty_issued,
    max(greatest(coalesce(v.qty_left, 0), 0))::numeric as qty_left,
    max(greatest(coalesce(v.qty_can_issue_now, 0), 0))::numeric as qty_can_issue_now
  from public.v_wh_issue_req_items_ui v
  join visible_requests vr
    on vr.request_id = trim(coalesce(v.request_id::text, ''))
  where nullif(trim(coalesce(v.request_id::text, '')), '') is not null
    and nullif(trim(coalesce(v.request_item_id::text, '')), '') is not null
  group by 1, 2
),
$new$;
begin
  select pg_get_functiondef(
    'public.warehouse_issue_queue_scope_v4_source_before_sloadfix4(integer, integer)'::regprocedure
  )
  into v_source;

  if v_source is null then
    raise exception 'S-LOAD-FIX-6 expected warehouse_issue_queue_scope_v4_source_before_sloadfix4 to exist';
  end if;

  if position(v_old_head_view in v_source) = 0 then
    raise exception 'S-LOAD-FIX-6 expected head_view block was not found';
  end if;

  if position(v_old_ui_truth in v_source) = 0 then
    raise exception 'S-LOAD-FIX-6 expected ui_item_truth block was not found';
  end if;

  v_next := replace(v_source, v_old_head_view, v_new_head_view);
  v_next := replace(v_next, v_old_ui_truth, v_new_ui_truth);

  if position('join visible_requests vr' in lower(v_next)) = 0
    or position('from public.v_wh_issue_req_heads_ui v' in lower(v_next)) = 0
    or position('from public.v_wh_issue_req_items_ui v' in lower(v_next)) = 0
    or position('(select count(*)::integer from visible_queue_rows) as total_count' in lower(v_next)) = 0
    or position('''total_exact'', false' in lower(v_next)) > 0
    or position('''total_kind'', ''lower_bound''' in lower(v_next)) > 0
    or position('sorted_probe_rows as' in lower(v_next)) > 0
    or position('from public.v_warehouse_stock vs' in lower(v_next)) = 0
    or position('order by pr.submitted_at desc nulls last, pr.display_year desc, pr.display_seq desc, pr.request_id desc' in lower(v_next)) = 0
    or position('limit (select limit_value from normalized_args)' in lower(v_next)) = 0
  then
    raise exception 'S-LOAD-FIX-6 transformed source failed safety checks';
  end if;

  execute v_next;
end;
$$;

create or replace function public.warehouse_issue_queue_sloadfix6_visible_truth_pushdown_proof_v1()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with defs as (
  select
    pg_get_functiondef('public.warehouse_issue_queue_scope_v4(integer, integer)'::regprocedure) as public_def,
    pg_get_functiondef('public.warehouse_issue_queue_scope_v4_source_before_sloadfix4(integer, integer)'::regprocedure) as source_def
)
select jsonb_build_object(
  'checked_at', timezone('utc', now()),
  'public_wrapper_preserved', position('warehouse_issue_queue_scope_v4_source_before_sloadfix4' in lower(public_def)) > 0,
  'source_scopes_head_view_to_visible_requests', position('from public.v_wh_issue_req_heads_ui v
  join visible_requests vr' in lower(source_def)) > 0,
  'source_scopes_ui_item_truth_to_visible_requests', position('from public.v_wh_issue_req_items_ui v
  join visible_requests vr' in lower(source_def)) > 0,
  'source_keeps_exact_visible_queue_total_count', position('(select count(*)::integer from visible_queue_rows) as total_count' in lower(source_def)) > 0,
  'source_does_not_reintroduce_fix5_lower_bound_probe', position('sorted_probe_rows as' in lower(source_def)) = 0
    and position('''total_exact'', false' in lower(source_def)) = 0
    and position('''total_kind'', ''lower_bound''' in lower(source_def)) = 0,
  'source_preserves_stock_truth_path', position('from public.v_warehouse_stock vs' in lower(source_def)) > 0
    and position('stock_by_code as' in lower(source_def)) > 0
    and position('stock_by_code_uom as' in lower(source_def)) > 0,
  'source_preserves_row_order', position('order by submitted_at desc nulls last, display_year desc, display_seq desc, request_id desc' in lower(source_def)) > 0
    and position('order by pr.submitted_at desc nulls last, pr.display_year desc, pr.display_seq desc, pr.request_id desc' in lower(source_def)) > 0,
  'source_preserves_page_bound', position('limit (select limit_value from normalized_args)' in lower(source_def)) > 0,
  'source_preserves_meta_shape', position('''total'', (select total_count from meta_stats)' in lower(source_def)) > 0
    and position('''row_count'', (select row_count from meta_stats)' in lower(source_def)) > 0
    and position('''has_more''' in lower(source_def)) > 0
    and position('''ui_truth_request_count''' in lower(source_def)) > 0
    and position('''fallback_truth_request_count''' in lower(source_def)) > 0
)
from defs;
$$;

comment on function public.warehouse_issue_queue_scope_v4_source_before_sloadfix4(integer, integer) is
'S-LOAD-FIX-6 source body for warehouse_issue_queue_scope_v4. Preserves exact-count bounded source semantics while pushing head/item truth reads down to visible_requests to avoid aggregating unrelated request rows.';

comment on function public.warehouse_issue_queue_sloadfix6_visible_truth_pushdown_proof_v1() is
'S-LOAD-FIX-6 verifier for warehouse_issue_queue_scope_v4 visible-request head/item truth pushdown. Does not expose row payloads or secrets.';

grant execute on function public.warehouse_issue_queue_sloadfix6_visible_truth_pushdown_proof_v1() to authenticated;

notify pgrst, 'reload schema';

commit;
