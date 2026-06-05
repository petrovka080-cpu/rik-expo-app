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
      and tablename = 'contractors'
  ) and to_regclass('public.contractors') is not null then
    alter publication supabase_realtime add table public.contractors;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'subcontracts'
  ) and to_regclass('public.subcontracts') is not null then
    alter publication supabase_realtime add table public.subcontracts;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'purchase_items'
  ) and to_regclass('public.purchase_items') is not null then
    alter publication supabase_realtime add table public.purchase_items;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'work_progress'
  ) and to_regclass('public.work_progress') is not null then
    alter publication supabase_realtime add table public.work_progress;
  end if;
end
$$;
