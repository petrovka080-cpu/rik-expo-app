begin;

do $$
declare
  v_definition text;
  v_hardened_definition text;
begin
  select pg_get_functiondef('public.warehouse_issue_queue_scope_v4(integer,integer)'::regprocedure)
  into v_definition;

  if v_definition is null then
    raise exception 'warehouse_issue_queue_scope_v4(integer,integer) is missing';
  end if;

  v_hardened_definition := replace(
    v_definition,
    '(select count(*)::integer from sorted_rows) as total_count',
    '(select count(*)::integer from visible_queue_rows) as total_count'
  );

  if v_hardened_definition = v_definition then
    raise exception 'warehouse_issue_queue_scope_v4 total_count block did not match expected definition';
  end if;

  execute v_hardened_definition;
end $$;

comment on function public.warehouse_issue_queue_scope_v4(integer, integer) is
'Canonical warehouse issue queue scope. W1 hardening counts total visible queue rows before sort-only display parsing; stock/issue semantics unchanged.';

grant execute on function public.warehouse_issue_queue_scope_v4(integer, integer) to authenticated;

notify pgrst, 'reload schema';

commit;
