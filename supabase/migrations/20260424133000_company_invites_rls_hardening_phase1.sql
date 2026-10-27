begin;

create or replace function public.company_invites_actor_can_view_company_v1(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and (
      exists (
        select 1
        from public.companies c
        where c.id = p_company_id
          and c.owner_user_id = auth.uid()
      )
      or exists (
        select 1
        from public.company_members cm
        where cm.company_id = p_company_id
          and cm.user_id = auth.uid()
      )
    );
$$;

comment on function public.company_invites_actor_can_view_company_v1(uuid) is
'Company invites RLS phase 1: authenticated actors may read invites only for companies they own or belong to.';

revoke all on function public.company_invites_actor_can_view_company_v1(uuid) from public;
grant execute on function public.company_invites_actor_can_view_company_v1(uuid) to authenticated, service_role;

create or replace function public.company_invites_actor_can_manage_company_v1(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and (
      exists (
        select 1
        from public.companies c
        where c.id = p_company_id
          and c.owner_user_id = auth.uid()
      )
      or exists (
        select 1
        from public.company_members cm
        where cm.company_id = p_company_id
          and cm.user_id = auth.uid()
          and lower(trim(coalesce(cm.role, ''))) = 'director'
      )
    );
$$;

comment on function public.company_invites_actor_can_manage_company_v1(uuid) is
'Company invites RLS phase 1: authenticated actors may create invites only for companies they own or manage as director.';

revoke all on function public.company_invites_actor_can_manage_company_v1(uuid) from public;
grant execute on function public.company_invites_actor_can_manage_company_v1(uuid) to authenticated, service_role;

alter table public.company_invites enable row level security;

revoke all on table public.company_invites from anon;
revoke all on table public.company_invites from authenticated;
grant select, insert on table public.company_invites to authenticated;

drop policy if exists company_invites_select_authenticated_company_scope on public.company_invites;
create policy company_invites_select_authenticated_company_scope
on public.company_invites
for select
to authenticated
using (
  public.company_invites_actor_can_view_company_v1(company_id)
);

drop policy if exists company_invites_insert_authenticated_manage_company on public.company_invites;
create policy company_invites_insert_authenticated_manage_company
on public.company_invites
for insert
to authenticated
with check (
  auth.uid() is not null
  and public.company_invites_actor_can_manage_company_v1(company_id)
  and length(btrim(coalesce(invite_code, ''))) between 1 and 64
  and length(btrim(coalesce(name, ''))) between 1 and 200
  and length(btrim(coalesce(phone, ''))) between 1 and 32
  and length(btrim(coalesce(role, ''))) between 1 and 64
  and nullif(lower(trim(coalesce(status, ''))), '') = 'pending'
  and accepted_at is null
);

notify pgrst, 'reload schema';

commit;
