-- Persist the document tenant instead of trusting editable snapshots/global roles.
-- Existing rows are deliberately not backfilled from current user membership:
-- membership today does not establish the company of a historical document.
-- Legacy NULL-company rows remain readable by their creator. Cross-user Office
-- workflows require an independently reviewed tenant reconciliation before release.
alter table public.requests add column if not exists company_id uuid references public.companies(id);
alter table public.proposals add column if not exists company_id uuid references public.companies(id);

create or replace function public.office_actor_has_company_role_v1(p_company_id uuid, p_roles text[] default null)
returns boolean language sql stable security definer set search_path = ''
as $function$
  select auth.uid() is not null and p_company_id is not null and (
    exists (select 1 from public.company_members cm
      where cm.company_id = p_company_id and cm.user_id = auth.uid()
        and (p_roles is null or cm.role = any(p_roles)))
    or exists (select 1 from public.companies c
      where c.id = p_company_id and c.owner_user_id = auth.uid()
        and (p_roles is null or 'director' = any(p_roles)))
  );
$function$;

create or replace function public.office_actor_single_company_v1()
returns uuid language sql stable security definer set search_path = ''
as $function$
  with mine as (
    select cm.company_id from public.company_members cm where cm.user_id = auth.uid()
    union select c.id from public.companies c where c.owner_user_id = auth.uid()
  )
  select case when count(*) = 1 then (array_agg(company_id))[1] else null end from mine;
$function$;

create or replace function public.office_request_role_allowed_v1(p_request_id uuid, p_roles text[] default null)
returns boolean language sql stable security definer set search_path = ''
as $function$
  select exists (select 1 from public.requests r where r.id = p_request_id
    and public.office_actor_has_company_role_v1(r.company_id,p_roles));
$function$;

create or replace function public.office_proposal_role_allowed_v1(p_proposal_id uuid, p_roles text[] default null)
returns boolean language sql stable security definer set search_path = ''
as $function$
  select exists (select 1 from public.proposals p where p.id = p_proposal_id
    and public.office_actor_has_company_role_v1(p.company_id,p_roles));
$function$;

create or replace function public.office_require_document_role_v1(p_kind text, p_id text, p_roles text[])
returns void language plpgsql stable security definer set search_path = ''
as $function$
declare v_id uuid; v_allowed boolean := false;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  begin v_id := p_id::uuid;
  exception when invalid_text_representation then
    raise exception 'Document access denied' using errcode='42501';
  end;
  if p_kind = 'request' then
    v_allowed := public.office_request_role_allowed_v1(v_id,p_roles);
  elsif p_kind = 'proposal' then
    v_allowed := public.office_proposal_role_allowed_v1(v_id,p_roles);
  end if;
  if not coalesce(v_allowed,false) then
    raise exception 'Document access denied' using errcode='42501';
  end if;
end;
$function$;

-- Table-owner/backend maintenance is distinct from a PostgREST authenticated or
-- anonymous request. SECURITY DEFINER changes current_user, but not SET ROLE's
-- protected role setting or session_user; a definer RPC cannot bypass this guard.
create or replace function public.office_document_trusted_backend_v1()
returns boolean language sql stable security definer set search_path = ''
as $function$
  select current_setting('role',true) = 'service_role'
    or (current_setting('role',true) = 'none'
      and session_user in ('postgres','supabase_admin','service_role'));
$function$;

create or replace function public.office_document_identity_guard_v1()
returns trigger language plpgsql security definer set search_path = ''
as $function$
declare v_actor uuid := auth.uid(); v_link_company uuid;
begin
  if public.office_document_trusted_backend_v1() then return new; end if;
  if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if tg_op = 'INSERT' then
    if new.created_by is not null and new.created_by <> v_actor then
      raise exception 'Document owner mismatch' using errcode='42501';
    end if;
    new.created_by := v_actor;
    if tg_table_name = 'proposals' then
      if new.request_id is not null then
        select r.company_id into v_link_company from public.requests r where r.id = new.request_id;
        if v_link_company is null then
          raise exception 'Linked request requires verified company scope' using errcode='42501';
        end if;
        if new.company_id is not null and new.company_id <> v_link_company then
          raise exception 'Linked document company mismatch' using errcode='42501';
        end if;
        new.company_id := v_link_company;
      end if;
    end if;
    new.company_id := coalesce(new.company_id,public.office_actor_single_company_v1());
    if new.company_id is null or not public.office_actor_has_company_role_v1(new.company_id,null) then
      raise exception 'Explicit authorized company scope required' using errcode='42501';
    end if;
  else
    if new.created_by is distinct from old.created_by or new.company_id is distinct from old.company_id then
      raise exception 'Document owner and company are immutable' using errcode='42501';
    end if;
    if old.company_id is null then
      raise exception 'Historical document requires verified company reconciliation' using errcode='42501';
    end if;
    if not public.office_actor_has_company_role_v1(old.company_id,null) then
      raise exception 'Target company membership required' using errcode='42501';
    end if;
    if tg_table_name = 'proposals' then
      if new.request_id is distinct from old.request_id and new.request_id is not null then
          select r.company_id into v_link_company from public.requests r where r.id = new.request_id;
          if v_link_company is null or v_link_company <> new.company_id then
            raise exception 'Linked document company mismatch' using errcode='42501';
          end if;
        end if;
    end if;
  end if;
  if tg_table_name = 'requests' then
    if tg_op = 'INSERT' and not public.office_actor_has_company_role_v1(new.company_id,array['director','foreman','engineer']::text[]) then
      raise exception 'Request creation role required' using errcode='42501';
    end if;
    if tg_op = 'INSERT' or new.status is distinct from old.status then
      if lower(new.status::text) in ('approved','sent','to_purchase','утверждено','утверждена','к закупке')
        and not public.office_actor_has_company_role_v1(new.company_id,array['director']::text[]) then
        raise exception 'Target company director required' using errcode='42501';
      end if;
    end if;
  elsif tg_table_name = 'proposals' then
    if not public.office_actor_has_company_role_v1(new.company_id,
      case when tg_op='INSERT' then array['buyer','director']::text[] else array['buyer','director','accountant']::text[] end) then
      raise exception 'Proposal operation role required' using errcode='42501';
    end if;
    if tg_op='INSERT' then
      if lower(new.status) not in ('draft','черновик') then
        raise exception 'Proposal must start as draft' using errcode='42501';
      end if;
    else
      if (new.sent_to_accountant_at is distinct from old.sent_to_accountant_at
        or (new.status is distinct from old.status and lower(new.status) in ('approved','утверждено','утверждена')))
        and not public.office_actor_has_company_role_v1(new.company_id,array['director']::text[]) then
        raise exception 'Target company director required' using errcode='42501';
      end if;
      if new.total_paid is distinct from old.total_paid
        and not public.office_actor_has_company_role_v1(new.company_id,array['accountant']::text[]) then
        raise exception 'Target company accountant required' using errcode='42501';
      end if;
    end if;
  end if;
  return new;
end;
$function$;

-- Sorted before legacy numbering/side-effect triggers on INSERT. The guard also
-- runs through existing definer creators; direct anonymous INSERT is not enough.
drop trigger if exists aaa_office_document_identity_v1 on public.requests;
create trigger aaa_office_document_identity_v1 before insert or update on public.requests
for each row execute function public.office_document_identity_guard_v1();
drop trigger if exists aaa_office_document_identity_v1 on public.proposals;
create trigger aaa_office_document_identity_v1 before insert or update on public.proposals
for each row execute function public.office_document_identity_guard_v1();

create or replace function public.rls_request_visible_v1(p_request_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $function$
  select auth.uid() is not null and exists (select 1 from public.requests r
    where r.id = p_request_id and ((r.company_id is null and r.created_by = auth.uid())
      or public.office_actor_has_company_role_v1(r.company_id,null)));
$function$;
create or replace function public.rls_proposal_visible_v1(p_proposal_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $function$
  select auth.uid() is not null and exists (select 1 from public.proposals p
    where p.id = p_proposal_id and ((p.company_id is null and p.created_by = auth.uid())
      or public.office_actor_has_company_role_v1(p.company_id,null)));
$function$;

-- Remove the complete permissive OR set for these two audited document tables.
-- Names are the reviewed live preimage, plus our idempotent successor policies.
-- Unknown policies stop the migration for review rather than being silently lost.
do $guard$
declare p record;
begin
  for p in select tablename,policyname from pg_catalog.pg_policies
    where schemaname='public' and tablename in ('requests','proposals') loop
    if p.policyname not like 'office_document_v1_%' and not p.policyname = any(array[
      'buyer_read_rework','director_realtime_select_proposals','pr_sel','proposals_insert_auth',
      'proposals_select_accountant','proposals_select_any','proposals_select_auth',
      'proposals_status_update_director_before_accounting','proposals_update_accountant',
      'proposals_update_any','proposals_update_auth','proposals_update_buyer_min',
      'proposals_update_status_basic','rls_proposals_company_scope_v1',
      'dev.requests.insert.any','director_select','foreman_insert','foreman_insert_own_drafts',
      'foreman_own_drafts_rw','foreman_select','req_ins_any','requests.insert.own',
      'requests.select.own','requests.update.own','requests_insert_auth',
      'requests_owner_modify','requests_owner_select','rls_requests_company_scope_v1','warehouse_select'
    ]::text[]) then raise exception 'Unreviewed document policy: %.%',p.tablename,p.policyname; end if;
    execute format('drop policy %I on public.%I',p.policyname,p.tablename);
  end loop;
end;
$guard$;
alter table public.requests enable row level security;
alter table public.proposals enable row level security;
revoke all on public.requests,public.proposals from public,anon;
grant select,insert,update,delete on public.requests,public.proposals to authenticated;

create policy office_document_v1_request_read on public.requests for select to authenticated
-- Use the policy row itself. A STABLE helper that re-selects the document by ID
-- cannot see the newly inserted row during INSERT ... RETURNING's read check.
using (auth.uid() is not null and ((company_id is null and created_by=auth.uid())
  or public.office_actor_has_company_role_v1(company_id,null)));
create policy office_document_v1_request_insert on public.requests for insert to authenticated
with check (created_by=auth.uid() and public.office_actor_has_company_role_v1(company_id,array['director','foreman','engineer']::text[]));
create policy office_document_v1_request_update on public.requests for update to authenticated
using (created_by=auth.uid() or public.office_actor_has_company_role_v1(company_id,array['director']::text[]))
with check (created_by=auth.uid() or public.office_actor_has_company_role_v1(company_id,array['director']::text[]));
create policy office_document_v1_request_delete on public.requests for delete to authenticated
using (created_by=auth.uid() and public.office_actor_has_company_role_v1(company_id,null)
  and lower(status::text) in ('draft','черновик'));

create policy office_document_v1_proposal_read on public.proposals for select to authenticated
using (auth.uid() is not null and ((company_id is null and created_by=auth.uid())
  or public.office_actor_has_company_role_v1(company_id,null)));
create policy office_document_v1_proposal_insert on public.proposals for insert to authenticated
with check (created_by=auth.uid() and public.office_actor_has_company_role_v1(company_id,array['buyer','director']::text[]));
create policy office_document_v1_proposal_update on public.proposals for update to authenticated
using (public.office_actor_has_company_role_v1(company_id,array['buyer','director','accountant']::text[]))
with check (public.office_actor_has_company_role_v1(company_id,array['buyer','director','accountant']::text[]));
create policy office_document_v1_proposal_delete on public.proposals for delete to authenticated
using (created_by=auth.uid() and public.office_actor_has_company_role_v1(company_id,null)
  and lower(status) in ('draft','черновик'));

-- New functions must explicitly revoke both PUBLIC inheritance and explicit anon
-- grants (the project has historical ALTER DEFAULT PRIVILEGES grants).
revoke all on function public.office_actor_has_company_role_v1(uuid,text[]),
  public.office_actor_single_company_v1(),public.office_request_role_allowed_v1(uuid,text[]),
  public.office_proposal_role_allowed_v1(uuid,text[]),public.office_require_document_role_v1(text,text,text[]),
  public.office_document_trusted_backend_v1(),public.office_document_identity_guard_v1()
from public,anon,authenticated;
grant execute on function public.office_actor_has_company_role_v1(uuid,text[]),
  public.office_actor_single_company_v1(),public.office_request_role_allowed_v1(uuid,text[]),
  public.office_proposal_role_allowed_v1(uuid,text[]),public.office_require_document_role_v1(text,text,text[])
to authenticated,service_role;
revoke all on function public.rls_request_visible_v1(uuid),public.rls_proposal_visible_v1(uuid) from public,anon;
grant execute on function public.rls_request_visible_v1(uuid),public.rls_proposal_visible_v1(uuid) to authenticated,service_role;
