begin;

do $$
declare
  v_source text;
  v_next text;
  v_old_block text := $old$
sorted_rows as (
  select *
  from visible_queue_rows
  order by submitted_at desc nulls last, display_year desc, display_seq desc, request_id desc
),
sorted_probe_rows as materialized (
  select *
  from sorted_rows
  offset (select offset_value from normalized_args)
  limit ((select limit_value from normalized_args) + 1)
),
$old$;
  v_new_block text := $new$
sorted_probe_rows as materialized (
  select *
  from visible_queue_rows
  order by submitted_at desc nulls last, display_year desc, display_seq desc, request_id desc
  offset (select offset_value from normalized_args)
  limit ((select limit_value from normalized_args) + 1)
),
$new$;
begin
  select pg_get_functiondef(
    'public.warehouse_issue_queue_scope_v4_source_before_sloadfix4(integer, integer)'::regprocedure
  )
  into v_source;

  if v_source is null then
    raise exception 'S-LOAD-FIX-5C expected warehouse_issue_queue_scope_v4_source_before_sloadfix4 to exist';
  end if;

  if position(v_old_block in v_source) = 0 then
    raise exception 'S-LOAD-FIX-5C expected materialized probe block was not found';
  end if;

  v_next := replace(v_source, v_old_block, v_new_block);

  if position('from visible_queue_rows' in lower(v_next)) = 0
    or position('sorted_probe_rows as materialized (' in lower(v_next)) = 0
    or position('from sorted_rows' in lower(v_next)) > 0
    or position('limit ((select limit_value from normalized_args) + 1)' in lower(v_next)) = 0
    or position('''total_exact'', false' in lower(v_next)) = 0
    or position('''total_kind'', ''lower_bound''' in lower(v_next)) = 0
  then
    raise exception 'S-LOAD-FIX-5C transformed source failed safety checks';
  end if;

  execute v_next;
end;
$$;

create or replace function public.warehouse_issue_queue_sloadfix5c_inline_probe_order_proof_v1()
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
  'source_uses_inline_ordered_probe', position('sorted_probe_rows as materialized (' in lower(source_def)) > 0
    and position('from visible_queue_rows' in lower(source_def)) > 0
    and position('from sorted_rows' in lower(source_def)) = 0,
  'source_uses_limit_plus_one_probe', position('limit ((select limit_value from normalized_args) + 1)' in lower(source_def)) > 0,
  'source_reports_lower_bound_total', position('''total_exact'', false' in lower(source_def)) > 0
    and position('''total_kind'', ''lower_bound''' in lower(source_def)) > 0,
  'source_preserves_row_order', position('order by submitted_at desc nulls last, display_year desc, display_seq desc, request_id desc' in lower(source_def)) > 0
    and position('order by pr.submitted_at desc nulls last, pr.display_year desc, pr.display_seq desc, pr.request_id desc' in lower(source_def)) > 0,
  'source_preserves_page_bound', position('limit (select limit_value from normalized_args)' in lower(source_def)) > 0
)
from defs;
$$;

comment on function public.warehouse_issue_queue_scope_v4_source_before_sloadfix4(integer, integer) is
'S-LOAD-FIX-5C source body for warehouse_issue_queue_scope_v4. Preserves Fix-5 lower-bound metadata and moves ORDER BY/OFFSET/LIMIT+1 directly into the bounded probe CTE.';

comment on function public.warehouse_issue_queue_sloadfix5c_inline_probe_order_proof_v1() is
'S-LOAD-FIX-5C verifier for warehouse_issue_queue_scope_v4 inline ordered limit+1 probe.';

grant execute on function public.warehouse_issue_queue_sloadfix5c_inline_probe_order_proof_v1() to authenticated;

notify pgrst, 'reload schema';

commit;
