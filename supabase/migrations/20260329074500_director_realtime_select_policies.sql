do $$
declare
  has_rls boolean;
begin
  select c.relrowsecurity
    into has_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'requests'
  limit 1;

  if has_rls and not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'requests'
      and policyname = 'director_realtime_select_requests'
  ) then
    create policy director_realtime_select_requests
      on public.requests
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.profiles p
          where p.user_id = auth.uid()
            and p.role = 'director'
        )
      );
  end if;

  select c.relrowsecurity
    into has_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'request_items'
  limit 1;

  if has_rls and not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'request_items'
      and policyname = 'director_realtime_select_request_items'
  ) then
    create policy director_realtime_select_request_items
      on public.request_items
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.profiles p
          where p.user_id = auth.uid()
            and p.role = 'director'
        )
      );
  end if;

  select c.relrowsecurity
    into has_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'proposals'
  limit 1;

  if has_rls and not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'proposals'
      and policyname = 'director_realtime_select_proposals'
  ) then
    create policy director_realtime_select_proposals
      on public.proposals
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.profiles p
          where p.user_id = auth.uid()
            and p.role = 'director'
        )
      );
  end if;

  select c.relrowsecurity
    into has_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'proposal_payments'
  limit 1;

  if has_rls and not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'proposal_payments'
      and policyname = 'director_realtime_select_proposal_payments'
  ) then
    create policy director_realtime_select_proposal_payments
      on public.proposal_payments
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.profiles p
          where p.user_id = auth.uid()
            and p.role = 'director'
        )
      );
  end if;

  select c.relrowsecurity
    into has_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'warehouse_issues'
  limit 1;

  if has_rls and not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'warehouse_issues'
      and policyname = 'director_realtime_select_warehouse_issues'
  ) then
    create policy director_realtime_select_warehouse_issues
      on public.warehouse_issues
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.profiles p
          where p.user_id = auth.uid()
            and p.role = 'director'
        )
      );
  end if;

  select c.relrowsecurity
    into has_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'warehouse_issue_items'
  limit 1;

  if has_rls and not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'warehouse_issue_items'
      and policyname = 'director_realtime_select_warehouse_issue_items'
  ) then
    create policy director_realtime_select_warehouse_issue_items
      on public.warehouse_issue_items
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.profiles p
          where p.user_id = auth.uid()
            and p.role = 'director'
        )
      );
  end if;

  select c.relrowsecurity
    into has_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'notifications'
  limit 1;

  if has_rls and not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notifications'
      and policyname = 'director_realtime_select_notifications'
  ) then
    create policy director_realtime_select_notifications
      on public.notifications
      for select
      to authenticated
      using (
        role = 'director'
        and exists (
          select 1
          from public.profiles p
          where p.user_id = auth.uid()
            and p.role = 'director'
        )
      );
  end if;
end;
$$;
