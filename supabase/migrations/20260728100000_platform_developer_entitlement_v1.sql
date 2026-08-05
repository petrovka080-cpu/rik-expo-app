-- P0: production owner/developer entitlement.
--
-- Authorization stays server-owned in developer_access_overrides. Client flags
-- can expose local UI, but cannot create this entitlement or authorize an RPC.

alter table public.developer_access_overrides
  add column if not exists entitlement text null;

alter table public.developer_override_audit_log
  add column if not exists actor_role text not null default 'authenticated_user';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'developer_access_overrides_entitlement_check'
      and conrelid = 'public.developer_access_overrides'::regclass
  ) then
    alter table public.developer_access_overrides
      add constraint developer_access_overrides_entitlement_check
      check (entitlement is null or entitlement = 'platform_developer');
  end if;
end
$$;

-- Revoke rows created by the two historical identity-bound verification seeds.
-- Match their server-owned purpose markers, not the embedded email or UUID, so
-- this migration remains identity agnostic and deterministic on every database.
update public.developer_access_overrides
set
  entitlement = null,
  is_enabled = false,
  active_effective_role = null,
  can_access_all_office_routes = false,
  can_impersonate_for_mutations = false,
  expires_at = now(),
  reason = 'Legacy identity-bound developer seed revoked by platform entitlement migration'
where reason like 'H1.8 developer verification break-glass for %'
   or reason = 'Developer full-office access restored for pre-release web/iOS/Android verification';

-- Existing enabled full-office overrides were already protected, server-written
-- grants. Promote those rows without embedding an email, password, or user id.
update public.developer_access_overrides
set
  entitlement = 'platform_developer',
  allowed_roles = array[
    'buyer',
    'director',
    'warehouse',
    'accountant',
    'foreman',
    'contractor',
    'security',
    'engineer'
  ]::text[],
  active_effective_role = coalesce(active_effective_role, 'director'),
  can_access_all_office_routes = true,
  can_impersonate_for_mutations = true,
  reason = coalesce(reason, 'Server-authorized platform developer entitlement')
where is_enabled
  and can_access_all_office_routes
  and (expires_at is null or expires_at > now());

revoke insert, update, delete, truncate
on public.developer_access_overrides
from anon, authenticated;

create or replace function public.platform_developer_entitled_v1()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and exists (
      select 1
      from public.developer_access_overrides dao
      where dao.user_id = auth.uid()
        and dao.entitlement = 'platform_developer'
        and dao.is_enabled
        and dao.can_access_all_office_routes
        and (dao.expires_at is null or dao.expires_at > now())
    );
$$;

revoke all on function public.platform_developer_entitled_v1() from public, anon;
grant execute on function public.platform_developer_entitled_v1()
to authenticated, service_role;

create or replace function public.developer_override_write_audit_v1(
  p_actor_user_id uuid,
  p_effective_role text,
  p_override_enabled boolean,
  p_action_name text,
  p_resource_id text default null,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_role text := case
    when exists (
      select 1
      from public.developer_access_overrides dao
      where dao.user_id = p_actor_user_id
        and dao.entitlement = 'platform_developer'
        and dao.is_enabled
        and (dao.expires_at is null or dao.expires_at > now())
    )
      then 'platform_developer'
    else 'authenticated_user'
  end;
begin
  insert into public.developer_override_audit_log (
    actor_user_id,
    actor_role,
    effective_role,
    override_enabled,
    action_name,
    resource_id,
    details
  )
  values (
    p_actor_user_id,
    v_actor_role,
    nullif(lower(trim(coalesce(p_effective_role, ''))), ''),
    coalesce(p_override_enabled, false),
    nullif(trim(coalesce(p_action_name, '')), ''),
    nullif(trim(coalesce(p_resource_id, '')), ''),
    coalesce(p_details, '{}'::jsonb)
      || jsonb_build_object(
        'actor_role',
        v_actor_role,
        'effective_role',
        nullif(lower(trim(coalesce(p_effective_role, ''))), '')
      )
  );
end;
$$;

revoke all on function public.developer_override_write_audit_v1(
  uuid,
  text,
  boolean,
  text,
  text,
  jsonb
) from public, anon, authenticated;
grant execute on function public.developer_override_write_audit_v1(
  uuid,
  text,
  boolean,
  text,
  text,
  jsonb
) to service_role;

create or replace function public.developer_override_context_v1()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_row public.developer_access_overrides%rowtype;
  v_is_entitled boolean := false;
  v_is_active boolean := false;
  v_active_effective_role text := null;
begin
  if v_actor_id is null then
    return jsonb_build_object(
      'actorUserId', null,
      'actorRole', null,
      'entitlement', null,
      'authorizationSource', 'none',
      'isEnabled', false,
      'isActive', false,
      'allowedRoles', jsonb_build_array(),
      'activeEffectiveRole', null,
      'canAccessAllOfficeRoutes', false,
      'canImpersonateForMutations', false,
      'expiresAt', null,
      'reason', 'unauthenticated'
    );
  end if;

  select *
  into v_row
  from public.developer_access_overrides dao
  where dao.user_id = v_actor_id
  limit 1;

  if not found then
    return jsonb_build_object(
      'actorUserId', v_actor_id,
      'actorRole', null,
      'entitlement', null,
      'authorizationSource', 'none',
      'isEnabled', false,
      'isActive', false,
      'allowedRoles', jsonb_build_array(),
      'activeEffectiveRole', null,
      'canAccessAllOfficeRoutes', false,
      'canImpersonateForMutations', false,
      'expiresAt', null,
      'reason', 'entitlement_missing'
    );
  end if;

  v_active_effective_role :=
    nullif(lower(trim(coalesce(v_row.active_effective_role, ''))), '');
  v_is_entitled :=
    v_row.entitlement = 'platform_developer'
    and v_row.is_enabled
    and v_row.can_access_all_office_routes
    and (v_row.expires_at is null or v_row.expires_at > now());
  v_is_active :=
    v_is_entitled
    and v_active_effective_role is not null
    and v_active_effective_role = any(v_row.allowed_roles);

  if v_row.is_enabled and v_row.expires_at is not null and v_row.expires_at <= now() then
    perform public.developer_override_write_audit_v1(
      v_actor_id,
      v_active_effective_role,
      false,
      'developer_override_expired',
      null,
      jsonb_build_object('expiresAt', v_row.expires_at)
    );
  end if;

  return jsonb_build_object(
    'actorUserId', v_actor_id,
    'actorRole', case when v_is_entitled then 'platform_developer' else null end,
    'entitlement', case when v_is_entitled then 'platform_developer' else null end,
    'authorizationSource', case when v_is_entitled then 'server_entitlement' else 'none' end,
    'isEnabled', v_is_entitled,
    'isActive', v_is_active,
    'allowedRoles', case
      when v_is_entitled
        then coalesce(to_jsonb(v_row.allowed_roles), jsonb_build_array())
      else jsonb_build_array()
    end,
    'activeEffectiveRole', case when v_is_active then v_active_effective_role else null end,
    'canAccessAllOfficeRoutes', v_is_entitled,
    'canImpersonateForMutations', v_is_entitled and v_row.can_impersonate_for_mutations,
    'expiresAt', v_row.expires_at,
    'reason', v_row.reason
  );
end;
$$;

revoke all on function public.developer_override_context_v1() from public, anon;
grant execute on function public.developer_override_context_v1()
to authenticated, service_role;

create or replace function public.developer_set_effective_role_v1(
  p_effective_role text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_role text := nullif(lower(trim(coalesce(p_effective_role, ''))), '');
  v_row public.developer_access_overrides%rowtype;
begin
  if v_actor_id is null then
    raise exception 'developer_set_effective_role_v1: unauthenticated'
      using errcode = '42501';
  end if;

  select *
  into v_row
  from public.developer_access_overrides dao
  where dao.user_id = v_actor_id
  limit 1;

  if
    not found
    or v_row.entitlement is distinct from 'platform_developer'
    or not v_row.is_enabled
    or not v_row.can_access_all_office_routes
  then
    perform public.developer_override_write_audit_v1(
      v_actor_id,
      v_role,
      false,
      'developer_override_denied',
      null,
      jsonb_build_object('reason', 'platform_developer_entitlement_required')
    );
    raise exception 'developer_set_effective_role_v1: platform_developer entitlement required'
      using errcode = '42501';
  end if;

  if v_row.expires_at is not null and v_row.expires_at <= now() then
    perform public.developer_override_write_audit_v1(
      v_actor_id,
      v_role,
      false,
      'developer_override_expired',
      null,
      jsonb_build_object('expiresAt', v_row.expires_at)
    );
    raise exception 'developer_set_effective_role_v1: override expired'
      using errcode = '42501';
  end if;

  if v_role is null or not (v_role = any(v_row.allowed_roles)) then
    perform public.developer_override_write_audit_v1(
      v_actor_id,
      v_role,
      false,
      'developer_override_denied',
      null,
      jsonb_build_object('reason', 'role_not_allowed')
    );
    raise exception 'developer_set_effective_role_v1: role not allowed'
      using errcode = '42501';
  end if;

  update public.developer_access_overrides
  set active_effective_role = v_role
  where user_id = v_actor_id
    and entitlement = 'platform_developer';

  perform public.developer_override_write_audit_v1(
    v_actor_id,
    v_role,
    true,
    'developer_effective_role_selected',
    null,
    jsonb_build_object(
      'actor_role', 'platform_developer',
      'effective_role', v_role,
      'allowedRoles', v_row.allowed_roles
    )
  );

  return public.developer_override_context_v1();
end;
$$;

revoke all on function public.developer_set_effective_role_v1(text)
from public, anon;
grant execute on function public.developer_set_effective_role_v1(text)
to authenticated, service_role;

create or replace function public.developer_clear_effective_role_v1()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_previous_role text := null;
begin
  if v_actor_id is null then
    raise exception 'developer_clear_effective_role_v1: unauthenticated'
      using errcode = '42501';
  end if;
  if not public.platform_developer_entitled_v1() then
    raise exception 'developer_clear_effective_role_v1: platform_developer entitlement required'
      using errcode = '42501';
  end if;

  select active_effective_role
  into v_previous_role
  from public.developer_access_overrides dao
  where dao.user_id = v_actor_id
    and dao.entitlement = 'platform_developer'
  limit 1;

  update public.developer_access_overrides
  set active_effective_role = null
  where user_id = v_actor_id
    and entitlement = 'platform_developer';

  perform public.developer_override_write_audit_v1(
    v_actor_id,
    v_previous_role,
    false,
    'developer_override_disabled',
    null,
    jsonb_build_object(
      'actor_role', 'platform_developer',
      'effective_role', v_previous_role
    )
  );

  return public.developer_override_context_v1();
end;
$$;

revoke all on function public.developer_clear_effective_role_v1()
from public, anon;
grant execute on function public.developer_clear_effective_role_v1()
to authenticated, service_role;

create or replace function public.app_actor_role_context_v1(
  p_allowed_roles text[] default array[]::text[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_allowed text[] := coalesce(p_allowed_roles, array[]::text[]);
  v_base jsonb := public.app_actor_base_role_context_v1(v_allowed);
  v_override jsonb := public.developer_override_context_v1();
  v_override_role text :=
    nullif(lower(trim(coalesce(v_override ->> 'activeEffectiveRole', ''))), '');
  v_override_active boolean :=
    coalesce((v_override ->> 'isActive')::boolean, false);
  v_can_impersonate boolean :=
    coalesce((v_override ->> 'canImpersonateForMutations')::boolean, false);
  v_actor_role text := v_override ->> 'actorRole';
begin
  if v_actor_id is null then
    return v_base;
  end if;

  if
    v_actor_role = 'platform_developer'
    and v_override_active
    and v_can_impersonate
    and v_override_role is not null
  then
    if v_override_role = any(v_allowed) then
      perform public.developer_override_write_audit_v1(
        v_actor_id,
        v_override_role,
        true,
        'developer_override_rpc_action',
        null,
        jsonb_build_object(
          'actor_role', 'platform_developer',
          'effective_role', v_override_role,
          'allowedRoles', v_allowed,
          'baseRole', v_base ->> 'role',
          'baseSource', v_base ->> 'source'
        )
      );

      return jsonb_build_object(
        'actorUserId', v_actor_id,
        'actorRole', 'platform_developer',
        'effectiveRole', v_override_role,
        'role', v_override_role,
        'source', 'platform_developer_entitlement',
        'allowed', true,
        'override', true,
        'baseRole', v_base ->> 'role',
        'baseSource', v_base ->> 'source'
      );
    end if;

    perform public.developer_override_write_audit_v1(
      v_actor_id,
      v_override_role,
      false,
      'developer_override_denied',
      null,
      jsonb_build_object(
        'actor_role', 'platform_developer',
        'effective_role', v_override_role,
        'allowedRoles', v_allowed,
        'reason', 'effective_role_not_allowed_for_action'
      )
    );

    return jsonb_build_object(
      'actorUserId', v_actor_id,
      'actorRole', 'platform_developer',
      'effectiveRole', v_override_role,
      'role', v_override_role,
      'source', 'platform_developer_entitlement',
      'allowed', false,
      'override', true,
      'reason', 'effective_role_not_allowed_for_action',
      'baseRole', v_base ->> 'role',
      'baseSource', v_base ->> 'source'
    );
  end if;

  return v_base;
end;
$$;

comment on function public.app_actor_role_context_v1(text[]) is
'Server-authorized role resolver. platform_developer requires an authenticated, enabled, unexpired protected-table entitlement; every effective-role RPC action is audited with actor_role and effective_role. Ordinary role truth remains unchanged.';

revoke all on function public.app_actor_role_context_v1(text[])
from public, anon;
grant execute on function public.app_actor_role_context_v1(text[])
to authenticated, service_role;
