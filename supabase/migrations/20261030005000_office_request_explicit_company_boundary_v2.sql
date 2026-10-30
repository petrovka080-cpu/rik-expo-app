-- COW proposal, request-only prerequisite. New-company UI/intent wiring must
-- ship with this guard. Never deploy alone to existing company-less callers.
begin;
alter table public.requests add column if not exists company_id uuid references public.companies(id);

create function public.office_request_mfa_ok_v2()
returns boolean language sql stable security definer set search_path=''
as $f$
 select auth.uid() is not null and (coalesce(auth.jwt()->>'aal','')='aal2'
   or not exists(select 1 from auth.mfa_factors f where f.user_id=auth.uid() and f.status='verified'));
$f$;
create function public.office_request_company_role_v2(p_company uuid,p_roles text[])
returns boolean language sql stable security definer set search_path=''
as $f$
 select public.office_request_mfa_ok_v2() and p_company is not null and (
  exists(select 1 from public.company_members cm where cm.company_id=p_company
   and cm.user_id=auth.uid() and cm.role=any(p_roles))
  or ('director'=any(p_roles) and exists(select 1 from public.companies c
   where c.id=p_company and c.owner_user_id=auth.uid())));
$f$;
create function public.office_request_read_v2(p_request uuid)
returns boolean language sql stable security definer set search_path=''
as $f$
 select public.office_request_mfa_ok_v2() and exists(select 1 from public.requests r
  where r.id=p_request and ((r.company_id is null and r.created_by=auth.uid())
   or public.office_request_company_role_v2(r.company_id,array['director','foreman','engineer','buyer','accountant','warehouse']::text[])));
$f$;
create function public.office_request_write_v2(p_request uuid)
returns boolean language sql stable security definer set search_path=''
as $f$
 select exists(select 1 from public.requests r where r.id=p_request and r.company_id is not null
  and (public.office_request_company_role_v2(r.company_id,array['director']::text[])
   or (r.created_by=auth.uid() and public.office_request_company_role_v2(r.company_id,array['foreman','engineer']::text[]))));
$f$;
create function public.office_request_identity_guard_v2()
returns trigger language plpgsql security definer set search_path=''
as $f$
declare v_actor uuid:=auth.uid();
begin
 -- Protected SET ROLE/session_user, never editable JWT role hints.
 if current_setting('role',true)='service_role' or
  (current_setting('role',true)='none' and session_user in ('postgres','supabase_admin','service_role')) then
  if tg_op='DELETE' then return old; end if; return new;
 end if;
 if not public.office_request_mfa_ok_v2() then raise exception 'REQUEST_ACTOR_MFA_REQUIRED' using errcode='42501'; end if;
 if tg_op='INSERT' then
  if new.created_by is not null and new.created_by<>v_actor then raise exception 'REQUEST_OWNER_MISMATCH' using errcode='42501'; end if;
  new.created_by:=v_actor;
  if new.company_id is null or not public.office_request_company_role_v2(new.company_id,array['director','foreman','engineer']::text[]) then
   raise exception 'REQUEST_EXPLICIT_COMPANY_REQUIRED' using errcode='42501';
  end if;
 elsif tg_op='UPDATE' then
  if new.created_by is distinct from old.created_by or new.company_id is distinct from old.company_id then
   raise exception 'REQUEST_IDENTITY_IMMUTABLE' using errcode='42501';
  end if;
  if not public.office_request_write_v2(old.id) then raise exception 'REQUEST_TARGET_WRITE_DENIED' using errcode='42501'; end if;
 else
  if not public.office_request_write_v2(old.id) then raise exception 'REQUEST_TARGET_WRITE_DENIED' using errcode='42501'; end if;
  if not public.request_lifecycle_is_mutable_v1(old.status::text,old.submitted_at) then
   raise exception 'REQUEST_LIFECYCLE_IMMUTABLE' using errcode='42501';
  end if;
  return old;
 end if;
 -- Linking is part of document identity scope even for direct REST writes;
 -- unproven legacy subcontract/job mappings never inherit today's membership.
 if new.subcontract_id is not null and (tg_op='INSERT' or new.subcontract_id is distinct from old.subcontract_id) and not exists(
  select 1 from public.subcontracts sc where sc.id=new.subcontract_id
   and to_jsonb(sc)->>'company_id'=new.company_id::text
 ) then raise exception 'REQUEST_LINKED_CONTRACT_COMPANY_UNPROVEN' using errcode='42501'; end if;
 if new.contractor_job_id is not null and (tg_op='INSERT' or new.contractor_job_id is distinct from old.contractor_job_id)
  and new.contractor_job_id is distinct from new.subcontract_id then
  raise exception 'REQUEST_LINKED_JOB_COMPANY_UNPROVEN' using errcode='42501';
 end if;
 -- Existing canonical lifecycle triggers remain enabled. This guard adds role
 -- authority without replacing their draft/submit/rework/state arithmetic.
 if lower(new.status::text) in ('approved','утверждено','утверждена','sent','to_purchase','к закупке')
  and (tg_op='INSERT' or new.status is distinct from old.status)
  and not public.office_request_company_role_v2(new.company_id,array['director']::text[]) then
  raise exception 'REQUEST_DIRECTOR_REQUIRED' using errcode='42501';
 end if;
 return new;
end;
$f$;
create function public.office_request_child_guard_v2()
returns trigger language plpgsql security definer set search_path=''
as $f$
declare v_parent uuid;
begin
 if current_setting('role',true)='service_role' or
  (current_setting('role',true)='none' and session_user in ('postgres','supabase_admin','service_role')) then
  if tg_op='DELETE' then return old; end if; return new;
 end if;
 if tg_op='UPDATE' and new.request_id is distinct from old.request_id then
  raise exception 'REQUEST_CHILD_PARENT_IMMUTABLE' using errcode='42501';
 end if;
 if tg_op='DELETE' then v_parent:=old.request_id; else v_parent:=new.request_id; end if;
 if v_parent is null or not public.office_request_write_v2(v_parent) then
  raise exception 'REQUEST_CHILD_WRITE_DENIED' using errcode='42501';
 end if;
 if tg_op='DELETE' then return old; end if; return new;
end;
$f$;
-- Reject unreviewed guard collision; do not overwrite a captured live body.
do $guard$
begin
 if exists(select 1 from pg_catalog.pg_trigger where tgrelid='public.requests'::regclass
  and tgname in ('aaa_office_document_identity_v1','aaa_office_request_identity_v2')) then
  raise exception 'STOP_REQUEST_IDENTITY_GUARD_REQUIRES_REVIEW';
 end if;
 if exists(select 1 from pg_catalog.pg_trigger where tgrelid='public.request_items'::regclass
  and tgname='aaa_office_request_child_v2') then raise exception 'STOP_REQUEST_CHILD_GUARD_REQUIRES_REVIEW'; end if;
end;
$guard$;
create trigger aaa_office_request_identity_v2 before insert or update or delete on public.requests
 for each row execute function public.office_request_identity_guard_v2();
create trigger aaa_office_request_child_v2 before insert or update or delete on public.request_items
 for each row execute function public.office_request_child_guard_v2();

-- Restrictive policies AND with every current permissive policy. They do not
-- turn a legacy read helper into mutation authority, even under an old FOR ALL.
alter table public.requests enable row level security;
alter table public.request_items enable row level security;
revoke all on public.requests,public.request_items from public,anon;
create policy office_request_v2_read_boundary on public.requests as restrictive for select to authenticated
 using(public.office_request_mfa_ok_v2() and ((company_id is null and created_by=auth.uid())
  or public.office_request_company_role_v2(company_id,array['director','foreman','engineer','buyer','accountant','warehouse']::text[])));
create policy office_request_v2_insert_boundary on public.requests as restrictive for insert to authenticated
 with check(created_by=auth.uid() and public.office_request_company_role_v2(company_id,array['director','foreman','engineer']::text[]));
create policy office_request_v2_update_boundary on public.requests as restrictive for update to authenticated
 using(public.office_request_write_v2(id)) with check(public.office_request_write_v2(id));
create policy office_request_v2_delete_boundary on public.requests as restrictive for delete to authenticated
 using(public.office_request_write_v2(id));
-- An explicit permissive read makes lawful legacy creator reads independent
-- of historical permissive membership policies; restrictive read still applies.
create policy office_request_v2_read_allow on public.requests for select to authenticated
 using(public.office_request_mfa_ok_v2() and ((company_id is null and created_by=auth.uid())
  or public.office_request_company_role_v2(company_id,array['director','foreman','engineer','buyer','accountant','warehouse']::text[])));
create policy office_request_child_v2_read_boundary on public.request_items as restrictive for select to authenticated
 using(public.office_request_read_v2(request_id));
create policy office_request_child_v2_read_allow on public.request_items for select to authenticated
 using(public.office_request_read_v2(request_id));
create policy office_request_child_v2_insert_boundary on public.request_items as restrictive for insert to authenticated
 with check(public.office_request_write_v2(request_id));
create policy office_request_child_v2_update_boundary on public.request_items as restrictive for update to authenticated
 using(public.office_request_write_v2(request_id)) with check(public.office_request_write_v2(request_id));
create policy office_request_child_v2_delete_boundary on public.request_items as restrictive for delete to authenticated
 using(public.office_request_write_v2(request_id));
revoke all on function public.office_request_mfa_ok_v2(),public.office_request_company_role_v2(uuid,text[]),
 public.office_request_read_v2(uuid),public.office_request_write_v2(uuid),
 public.office_request_identity_guard_v2(),public.office_request_child_guard_v2() from public,anon,authenticated,service_role;
grant execute on function public.office_request_mfa_ok_v2(),public.office_request_company_role_v2(uuid,text[]),
 public.office_request_read_v2(uuid),public.office_request_write_v2(uuid) to authenticated;
commit;
