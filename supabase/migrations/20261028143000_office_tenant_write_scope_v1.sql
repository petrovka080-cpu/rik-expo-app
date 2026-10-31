-- The four legacy Office tables had grants but no tenant RLS.
-- Reuse the existing authoritative company membership/management helpers.
-- Preserve storefront reads of companies/user_profiles; private company profiles
-- and membership rosters require authenticated company scope.
do $guard$
begin
  if exists (
    select 1 from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename in ('companies','company_members','company_profiles','user_profiles')
      and policyname not like 'office_tenant_v1_%'
  ) then
    raise exception 'Review existing Office table policies before applying tenant write scope';
  end if;
end;
$guard$;

alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.company_profiles enable row level security;
alter table public.user_profiles enable row level security;

revoke all on public.companies, public.company_members,
  public.company_profiles, public.user_profiles from public, anon, authenticated;
grant select on public.companies, public.user_profiles to anon, authenticated;
grant select, insert, update, delete on public.company_members,
  public.company_profiles to authenticated;
grant insert, update, delete on public.companies, public.user_profiles to authenticated;

drop policy if exists office_tenant_v1_companies_read on public.companies;
create policy office_tenant_v1_companies_read on public.companies
for select to anon, authenticated using (true);
drop policy if exists office_tenant_v1_companies_insert on public.companies;
create policy office_tenant_v1_companies_insert on public.companies
for insert to authenticated with check (owner_user_id = auth.uid());
drop policy if exists office_tenant_v1_companies_update on public.companies;
create policy office_tenant_v1_companies_update on public.companies
for update to authenticated using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());
drop policy if exists office_tenant_v1_companies_delete on public.companies;
create policy office_tenant_v1_companies_delete on public.companies
for delete to authenticated using (owner_user_id = auth.uid());

drop policy if exists office_tenant_v1_members_read on public.company_members;
create policy office_tenant_v1_members_read on public.company_members
for select to authenticated
using (user_id = auth.uid() or public.company_invites_actor_can_view_company_v1(company_id));
drop policy if exists office_tenant_v1_members_insert on public.company_members;
create policy office_tenant_v1_members_insert on public.company_members
for insert to authenticated with check (
  public.company_invites_actor_can_manage_company_v1(company_id)
  and role = any(array['director','buyer','foreman','warehouse','accountant','security','contractor','engineer']::text[])
);
drop policy if exists office_tenant_v1_members_update on public.company_members;
create policy office_tenant_v1_members_update on public.company_members
for update to authenticated
using (public.company_invites_actor_can_manage_company_v1(company_id))
with check (
  public.company_invites_actor_can_manage_company_v1(company_id)
  and role = any(array['director','buyer','foreman','warehouse','accountant','security','contractor','engineer']::text[])
);
drop policy if exists office_tenant_v1_members_delete on public.company_members;
create policy office_tenant_v1_members_delete on public.company_members
for delete to authenticated using (public.company_invites_actor_can_manage_company_v1(company_id));

drop policy if exists office_tenant_v1_company_profiles_read on public.company_profiles;
create policy office_tenant_v1_company_profiles_read on public.company_profiles
for select to authenticated using (
  owner_user_id = auth.uid() or user_id = auth.uid()
  or public.company_invites_actor_can_view_company_v1(id)
);
drop policy if exists office_tenant_v1_company_profiles_insert on public.company_profiles;
create policy office_tenant_v1_company_profiles_insert on public.company_profiles
for insert to authenticated with check (
  owner_user_id = auth.uid() and (user_id is null or user_id = auth.uid())
  and (not exists(select 1 from public.companies c where c.id = company_profiles.id)
    or exists(select 1 from public.companies c where c.id = company_profiles.id and c.owner_user_id = auth.uid()))
);
drop policy if exists office_tenant_v1_company_profiles_update on public.company_profiles;
create policy office_tenant_v1_company_profiles_update on public.company_profiles
for update to authenticated
using (owner_user_id = auth.uid() or public.company_invites_actor_can_manage_company_v1(id))
with check (
  (owner_user_id = auth.uid() and (user_id is null or user_id = auth.uid())
    and (not exists(select 1 from public.companies c where c.id = company_profiles.id)
      or exists(select 1 from public.companies c where c.id = company_profiles.id and c.owner_user_id = auth.uid())))
  or (
    public.company_invites_actor_can_manage_company_v1(id)
    and exists(select 1 from public.companies c where c.id = company_profiles.id
      and c.owner_user_id = company_profiles.owner_user_id
      and (company_profiles.user_id is null or company_profiles.user_id = c.owner_user_id))
  )
);
drop policy if exists office_tenant_v1_company_profiles_delete on public.company_profiles;
create policy office_tenant_v1_company_profiles_delete on public.company_profiles
for delete to authenticated using (owner_user_id = auth.uid() or public.company_invites_actor_can_manage_company_v1(id));

drop policy if exists office_tenant_v1_user_profiles_read on public.user_profiles;
create policy office_tenant_v1_user_profiles_read on public.user_profiles
for select to anon, authenticated using (true);
drop policy if exists office_tenant_v1_user_profiles_insert on public.user_profiles;
create policy office_tenant_v1_user_profiles_insert on public.user_profiles
for insert to authenticated with check (user_id = auth.uid());
drop policy if exists office_tenant_v1_user_profiles_update on public.user_profiles;
create policy office_tenant_v1_user_profiles_update on public.user_profiles
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists office_tenant_v1_user_profiles_delete on public.user_profiles;
create policy office_tenant_v1_user_profiles_delete on public.user_profiles
for delete to authenticated using (user_id = auth.uid());
