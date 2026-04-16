begin;

do $$
declare
  v_definition text;
  v_hardened_definition text;
begin
  select pg_get_functiondef('public.director_finance_panel_scope_v4(uuid,date,date,integer,integer,integer,integer)'::regprocedure)
  into v_definition;

  if v_definition is null then
    raise exception 'director_finance_panel_scope_v4(uuid,date,date,integer,integer,integer,integer) is missing';
  end if;

  v_hardened_definition := replace(
    v_definition,
    '''total'', (select count(*)::integer from ordered_rows)',
    '''total'', coalesce((select row_count from summary_row), 0)'
  );

  if v_hardened_definition = v_definition then
    raise exception 'director_finance_panel_scope_v4 pagination total block did not match expected definition';
  end if;

  execute v_hardened_definition;
end $$;

comment on function public.director_finance_panel_scope_v4(
  uuid,
  date,
  date,
  integer,
  integer,
  integer,
  integer
) is
'Canonical director finance panel scope. F1 hardening reuses summary_row.row_count for pagination total to avoid recounting the ordered finance rowset; business semantics unchanged.';

grant execute on function public.director_finance_panel_scope_v4(
  uuid,
  date,
  date,
  integer,
  integer,
  integer,
  integer
) to authenticated;

notify pgrst, 'reload schema';

commit;
