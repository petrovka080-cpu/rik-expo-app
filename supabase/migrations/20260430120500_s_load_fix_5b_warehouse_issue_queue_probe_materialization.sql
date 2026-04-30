begin;

do $$
declare
  v_source text;
  v_next text;
begin
  select pg_get_functiondef(
    'public.warehouse_issue_queue_scope_v4_source_before_sloadfix4(integer, integer)'::regprocedure
  )
  into v_source;

  if v_source is null then
    raise exception 'S-LOAD-FIX-5B expected warehouse_issue_queue_scope_v4_source_before_sloadfix4 to exist';
  end if;

  if position('sorted_probe_rows as (' in lower(v_source)) = 0
    or position('paged_rows as (' in lower(v_source)) = 0
    or position('limit ((select limit_value from normalized_args) + 1)' in lower(v_source)) = 0
  then
    raise exception 'S-LOAD-FIX-5B expected Fix-5 limit+1 probe block was not found';
  end if;

  v_next := replace(v_source, 'sorted_probe_rows as (', 'sorted_probe_rows as materialized (');
  v_next := replace(v_next, 'paged_rows as (', 'paged_rows as materialized (');

  if position('sorted_probe_rows as materialized (' in lower(v_next)) = 0
    or position('paged_rows as materialized (' in lower(v_next)) = 0
    or position('limit ((select limit_value from normalized_args) + 1)' in lower(v_next)) = 0
    or position('''total_exact'', false' in lower(v_next)) = 0
    or position('''total_kind'', ''lower_bound''' in lower(v_next)) = 0
  then
    raise exception 'S-LOAD-FIX-5B transformed source failed safety checks';
  end if;

  execute v_next;
end;
$$;

create or replace function public.warehouse_issue_queue_sloadfix5b_probe_materialization_proof_v1()
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
  'source_uses_limit_plus_one_probe', position('limit ((select limit_value from normalized_args) + 1)' in lower(source_def)) > 0,
  'source_materializes_probe_rows', position('sorted_probe_rows as materialized (' in lower(source_def)) > 0,
  'source_materializes_paged_rows', position('paged_rows as materialized (' in lower(source_def)) > 0,
  'source_reports_lower_bound_total', position('''total_exact'', false' in lower(source_def)) > 0
    and position('''total_kind'', ''lower_bound''' in lower(source_def)) > 0,
  'source_preserves_row_order', position('jsonb_agg(' in lower(source_def)) > 0
    and position('order by pr.submitted_at desc nulls last, pr.display_year desc, pr.display_seq desc, pr.request_id desc' in lower(source_def)) > 0,
  'source_preserves_page_bound', position('limit (select limit_value from normalized_args)' in lower(source_def)) > 0
)
from defs;
$$;

comment on function public.warehouse_issue_queue_scope_v4_source_before_sloadfix4(integer, integer) is
'S-LOAD-FIX-5B source body for warehouse_issue_queue_scope_v4. Preserves Fix-5 lower-bound total metadata and materializes the limit+1 probe/page CTEs to avoid repeated probe evaluation.';

comment on function public.warehouse_issue_queue_sloadfix5b_probe_materialization_proof_v1() is
'S-LOAD-FIX-5B verifier for warehouse_issue_queue_scope_v4 limit+1 probe materialization.';

grant execute on function public.warehouse_issue_queue_sloadfix5b_probe_materialization_proof_v1() to authenticated;

notify pgrst, 'reload schema';

commit;
