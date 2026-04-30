begin;

do $$
declare
  v_source text;
  v_next text;
  v_old_window text := $old$
sorted_rows as (
  select *
  from visible_queue_rows
  order by submitted_at desc nulls last, display_year desc, display_seq desc, request_id desc
),
paged_rows as (
  select *
  from sorted_rows
  offset (select offset_value from normalized_args)
  limit (select limit_value from normalized_args)
),
meta_stats as (
  select
    (select count(*)::integer from visible_queue_rows) as total_count,
    (select count(*)::integer from paged_rows) as row_count,
    (
      select count(*)::integer
      from visible_requests vr
      left join head_view hv
        on hv.request_id = vr.request_id
      where hv.request_id is null
    ) as repaired_missing_ids_count,
    (select count(*)::integer from ui_truth_by_req) as ui_truth_request_count,
    (select fallback_truth_request_count from fallback_active_request_count) as fallback_truth_request_count
)
$old$;
  v_new_window text := $new$
sorted_rows as (
  select *
  from visible_queue_rows
  order by submitted_at desc nulls last, display_year desc, display_seq desc, request_id desc
),
sorted_probe_rows as (
  select *
  from sorted_rows
  offset (select offset_value from normalized_args)
  limit ((select limit_value from normalized_args) + 1)
),
paged_rows as (
  select *
  from sorted_probe_rows
  limit (select limit_value from normalized_args)
),
window_stats as (
  select
    (select count(*)::integer from sorted_probe_rows) as probe_row_count,
    (select count(*)::integer from paged_rows) as row_count
),
meta_stats as (
  select
    (
      (select offset_value from normalized_args)
      + (select row_count from window_stats)
      + case
          when (select probe_row_count from window_stats) > (select limit_value from normalized_args) then 1
          else 0
        end
    )::integer as total_count,
    (select row_count from window_stats) as row_count,
    ((select probe_row_count from window_stats) > (select limit_value from normalized_args)) as has_more,
    (
      select count(*)::integer
      from visible_requests vr
      left join head_view hv
        on hv.request_id = vr.request_id
      where hv.request_id is null
    ) as repaired_missing_ids_count,
    (select count(*)::integer from ui_truth_by_req) as ui_truth_request_count,
    (select count(*)::integer from fallback_truth_by_req) as fallback_truth_request_count
)
$new$;
  v_old_has_more text := $old$
    'has_more',
      (
        (select offset_value from normalized_args)
        + (select row_count from meta_stats)
      ) < (select total_count from meta_stats),
    'repaired_missing_ids_count', (select repaired_missing_ids_count from meta_stats),
$old$;
  v_new_has_more text := $new$
    'has_more', (select has_more from meta_stats),
    'total_exact', false,
    'total_kind', 'lower_bound',
    'repaired_missing_ids_count', (select repaired_missing_ids_count from meta_stats),
$new$;
begin
  select pg_get_functiondef(
    'public.warehouse_issue_queue_scope_v4_source_before_sloadfix4(integer, integer)'::regprocedure
  )
  into v_source;

  if v_source is null then
    raise exception 'S-LOAD-FIX-5 expected warehouse_issue_queue_scope_v4_source_before_sloadfix4 to exist';
  end if;

  if position(v_old_window in v_source) = 0 then
    raise exception 'S-LOAD-FIX-5 expected warehouse issue queue window/count block was not found';
  end if;

  if position(v_old_has_more in v_source) = 0 then
    raise exception 'S-LOAD-FIX-5 expected warehouse issue queue has_more block was not found';
  end if;

  v_next := replace(v_source, v_old_window, v_new_window);
  v_next := replace(v_next, v_old_has_more, v_new_has_more);

  if position('sorted_probe_rows as' in lower(v_next)) = 0
    or position('limit ((select limit_value from normalized_args) + 1)' in lower(v_next)) = 0
    or position('(select count(*)::integer from visible_queue_rows) as total_count' in lower(v_next)) > 0
    or position('''total_exact'', false' in lower(v_next)) = 0
    or position('''total_kind'', ''lower_bound''' in lower(v_next)) = 0
    or position('(select fallback_truth_request_count from fallback_active_request_count)' in lower(v_next)) > 0
  then
    raise exception 'S-LOAD-FIX-5 transformed source failed safety checks';
  end if;

  execute v_next;
end;
$$;

create index if not exists idx_requests_issue_queue_visible_status_order_sloadfix5
on public.requests (
  (lower(trim(coalesce(status::text, '')))),
  (coalesce(submitted_at, created_at)) desc,
  id desc
)
include (display_no, object_name, object_type_code, level_code, system_code, zone_code);

create or replace function public.warehouse_issue_queue_sloadfix5_total_count_reduction_proof_v1()
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
  'source_uses_limit_plus_one_probe', position('sorted_probe_rows as' in lower(source_def)) > 0
    and position('limit ((select limit_value from normalized_args) + 1)' in lower(source_def)) > 0,
  'source_removes_exact_visible_queue_total_count', position('(select count(*)::integer from visible_queue_rows) as total_count' in lower(source_def)) = 0,
  'source_reports_lower_bound_total', position('''total_exact'', false' in lower(source_def)) > 0
    and position('''total_kind'', ''lower_bound''' in lower(source_def)) > 0,
  'source_preserves_row_order', position('jsonb_agg(' in lower(source_def)) > 0
    and position('order by pr.submitted_at desc nulls last, pr.display_year desc, pr.display_seq desc, pr.request_id desc' in lower(source_def)) > 0,
  'source_preserves_page_bound', position('limit (select limit_value from normalized_args)' in lower(source_def)) > 0,
  'source_uses_scoped_fallback_diagnostic_count', position('(select count(*)::integer from fallback_truth_by_req) as fallback_truth_request_count' in lower(source_def)) > 0,
  'request_status_order_index_exists', to_regclass('public.idx_requests_issue_queue_visible_status_order_sloadfix5') is not null
)
from defs;
$$;

comment on function public.warehouse_issue_queue_scope_v4_source_before_sloadfix4(integer, integer) is
'S-LOAD-FIX-5 source body for warehouse_issue_queue_scope_v4. Preserves row payload, order, page bounds, visibility, and stock truth while replacing the exact total-count path with a limit+1 pagination probe and lower-bound total metadata.';

comment on function public.warehouse_issue_queue_sloadfix5_total_count_reduction_proof_v1() is
'S-LOAD-FIX-5 verifier for warehouse_issue_queue_scope_v4 source total-count reduction and request status/order index readiness.';

comment on index public.idx_requests_issue_queue_visible_status_order_sloadfix5 is
'S-LOAD-FIX-5 additive index for warehouse_issue_queue_scope_v4 visible request filtering and submitted/order scan support.';

grant execute on function public.warehouse_issue_queue_sloadfix5_total_count_reduction_proof_v1() to authenticated;

notify pgrst, 'reload schema';

commit;
