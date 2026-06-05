do $$
begin
  if not exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'warehouse_issues'
  ) and to_regclass('public.warehouse_issues') is not null then
    alter publication supabase_realtime add table public.warehouse_issues;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'warehouse_issue_items'
  ) and to_regclass('public.warehouse_issue_items') is not null then
    alter publication supabase_realtime add table public.warehouse_issue_items;
  end if;
end;
$$;
