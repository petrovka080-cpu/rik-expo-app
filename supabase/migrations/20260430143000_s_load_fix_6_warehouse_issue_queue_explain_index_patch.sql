begin;

do $$
declare
  v_source text;
  v_next text;
  v_old_fallback_truth text := $old$
fallback_truth_by_req as (
$old$;
  v_new_fallback_truth text := $new$
fallback_truth_by_req as materialized (
$new$;
  v_old_merged_truth text := $old$
merged_truth as (
$old$;
  v_new_merged_truth text := $new$
merged_truth as materialized (
$new$;
begin
  select pg_get_functiondef(
    'public.warehouse_issue_queue_scope_v4_source_before_sloadfix4(integer, integer)'::regprocedure
  )
  into v_source;

  if v_source is null then
    raise exception 'S-LOAD-FIX-6 expected warehouse_issue_queue_scope_v4_source_before_sloadfix4 to exist';
  end if;

  if position(v_old_fallback_truth in v_source) = 0 then
    raise exception 'S-LOAD-FIX-6 expected fallback_truth_by_req block was not found or is already patched';
  end if;

  if position(v_old_merged_truth in v_source) = 0 then
    raise exception 'S-LOAD-FIX-6 expected merged_truth block was not found or is already patched';
  end if;

  v_next := replace(v_source, v_old_fallback_truth, v_new_fallback_truth);
  v_next := replace(v_next, v_old_merged_truth, v_new_merged_truth);

  if position('fallback_truth_by_req as materialized (' in lower(v_next)) = 0
    or position('merged_truth as materialized (' in lower(v_next)) = 0
    or position('(select count(*)::integer from visible_queue_rows) as total_count' in lower(v_next)) = 0
    or position('sorted_probe_rows as' in lower(v_next)) > 0
    or position('''total_exact'', false' in lower(v_next)) > 0
    or position('''total_kind'', ''lower_bound''' in lower(v_next)) > 0
    or position('from public.v_warehouse_stock vs' in lower(v_next)) = 0
    or position('stock_by_code as' in lower(v_next)) = 0
    or position('stock_by_code_uom as' in lower(v_next)) = 0
    or position('order by submitted_at desc nulls last, display_year desc, display_seq desc, request_id desc' in lower(v_next)) = 0
    or position('order by pr.submitted_at desc nulls last, pr.display_year desc, pr.display_seq desc, pr.request_id desc' in lower(v_next)) = 0
    or position('limit (select limit_value from normalized_args)' in lower(v_next)) = 0
  then
    raise exception 'S-LOAD-FIX-6 transformed source failed safety checks';
  end if;

  execute v_next;
end;
$$;

create or replace function public.warehouse_issue_queue_sloadfix6_explain_materialization_proof_v1()
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
  'source_materializes_fallback_truth_by_req', position('fallback_truth_by_req as materialized (' in lower(source_def)) > 0,
  'source_materializes_merged_truth', position('merged_truth as materialized (' in lower(source_def)) > 0,
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
'S-LOAD-FIX-6 EXPLAIN-backed source body for warehouse_issue_queue_scope_v4. Preserves exact-count bounded source semantics while materializing fallback_truth_by_req and merged_truth to avoid repeatedly rebuilding fallback truth inside ready_rows.';

comment on function public.warehouse_issue_queue_sloadfix6_explain_materialization_proof_v1() is
'S-LOAD-FIX-6 verifier for EXPLAIN-backed warehouse_issue_queue_scope_v4 materialization patch. Does not expose row payloads or secrets.';

grant execute on function public.warehouse_issue_queue_sloadfix6_explain_materialization_proof_v1() to authenticated;

notify pgrst, 'reload schema';

commit;
