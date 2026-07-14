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
      and tablename = 'notifications'
  ) and to_regclass('public.notifications') is not null then
    alter publication supabase_realtime add table public.notifications;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'requests'
  ) and to_regclass('public.requests') is not null then
    alter publication supabase_realtime add table public.requests;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'request_items'
  ) and to_regclass('public.request_items') is not null then
    alter publication supabase_realtime add table public.request_items;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'proposals'
  ) and to_regclass('public.proposals') is not null then
    alter publication supabase_realtime add table public.proposals;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'proposal_payments'
  ) and to_regclass('public.proposal_payments') is not null then
    alter publication supabase_realtime add table public.proposal_payments;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'wh_incoming_items'
  ) and to_regclass('public.wh_incoming_items') is not null then
    alter publication supabase_realtime add table public.wh_incoming_items;
  end if;
end
$$;
