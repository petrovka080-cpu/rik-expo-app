-- Deploy together with the independently verified login/resume MFA challenge.
-- A source/rolled-back SQL proof does not enable the live PostgREST hook.
-- RLS covers the reviewed company tables; the Data API hook also precedes
-- SECURITY DEFINER RPC bodies. Storage/Realtime and other private tables require
-- their own reviewed policies; this migration does not claim their acceptance.
-- https://supabase.com/docs/guides/api/securing-your-api

do $preimage$
begin
  if pg_catalog.to_regprocedure('public.auth_mfa_assurance_satisfied_v1()') is not null
    or pg_catalog.to_regprocedure('public.auth_mfa_data_api_pre_request_v1()') is not null then
    raise exception 'STOP_MFA_BOUNDARY_UNREVIEWED_EXISTING_FUNCTION';
  end if;
  if exists (
    select 1 from pg_catalog.pg_roles r
    cross join lateral pg_catalog.unnest(r.rolconfig) s(setting)
    where r.rolname in ('authenticator','authenticated','anon','service_role')
      and pg_catalog.split_part(s.setting,'=',1) in ('pgrst.db_pre_request','pgrst.db_pre_config')
      and pg_catalog.btrim(pg_catalog.substr(s.setting,pg_catalog.strpos(s.setting,'=')+1)) <> ''
  ) or exists (
    select 1 from pg_catalog.pg_db_role_setting ds
    left join pg_catalog.pg_roles r on r.oid=ds.setrole
    cross join lateral pg_catalog.unnest(ds.setconfig) s(setting)
    where (ds.setrole=0 or r.rolname in ('authenticator','authenticated','anon','service_role'))
      and pg_catalog.split_part(s.setting,'=',1) in ('pgrst.db_pre_request','pgrst.db_pre_config')
      and pg_catalog.btrim(pg_catalog.substr(s.setting,pg_catalog.strpos(s.setting,'=')+1)) <> ''
  ) then
    -- Preserve any prior request/config hook, including database-specific ones.
    -- Its reviewed chaining contract must be supplied before this can proceed.
    raise exception 'STOP_MFA_BOUNDARY_EXISTING_REQUEST_OR_CONFIG_HOOK';
  end if;
end;
$preimage$;

create function public.auth_mfa_assurance_satisfied_v1()
returns boolean language sql stable security definer set search_path = ''
as $function$
  select auth.uid() is not null and (
    coalesce(auth.jwt()->>'aal','') = 'aal2'
    or not exists (
      select 1 from auth.mfa_factors f
      where f.user_id = auth.uid() and f.status = 'verified'
    )
  );
$function$;
revoke all on function public.auth_mfa_assurance_satisfied_v1() from public,anon;
grant execute on function public.auth_mfa_assurance_satisfied_v1() to authenticated,service_role;

create function public.auth_mfa_data_api_pre_request_v1()
returns void language plpgsql stable security invoker set search_path = ''
as $function$
declare v_role text := pg_catalog.current_setting('role',true);
begin
  -- SET ROLE survives SECURITY DEFINER nesting. Editable metadata or a role
  -- string in request.jwt.claims cannot promote this protected database role.
  if v_role = 'authenticated' then
    if not coalesce(public.auth_mfa_assurance_satisfied_v1(),false) then
      raise exception 'MFA_SECOND_FACTOR_REQUIRED' using errcode='42501';
    end if;
  elsif v_role not in ('anon','service_role') or v_role is null then
    raise exception 'MFA_REQUEST_ROLE_CONTEXT_REQUIRED' using errcode='42501';
  end if;
end;
$function$;
revoke all on function public.auth_mfa_data_api_pre_request_v1() from public;
grant execute on function public.auth_mfa_data_api_pre_request_v1() to anon,authenticated,service_role,authenticator;

do $policies$
declare v_table text; v_policy text;
begin
  foreach v_table in array array['companies','company_profiles','company_members','company_invites'] loop
    if not exists (select 1 from pg_catalog.pg_class c
      join pg_catalog.pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname=v_table
        and c.relkind in ('r','p') and c.relrowsecurity) then
      raise exception 'STOP_MFA_BOUNDARY_REVIEWED_COMPANY_RLS_PRECONDITION';
    end if;
    v_policy := 'auth_mfa_company_assurance_v1';
    if exists (select 1 from pg_catalog.pg_policies
      where schemaname='public' and tablename=v_table and policyname=v_policy) then
      raise exception 'STOP_MFA_BOUNDARY_UNREVIEWED_EXISTING_POLICY';
    end if;
    -- Non-correlated scalar SELECT allows one indexed factor check per query,
    -- rather than correlating the lookup with every returned company row.
    execute pg_catalog.format('create policy %I on public.%I as restrictive for all to authenticated using ((select public.auth_mfa_assurance_satisfied_v1())) with check ((select public.auth_mfa_assurance_satisfied_v1()))',v_policy,v_table);
  end loop;
end;
$policies$;

alter role authenticator set pgrst.db_pre_request = 'public.auth_mfa_data_api_pre_request_v1';
notify pgrst, 'reload config';
