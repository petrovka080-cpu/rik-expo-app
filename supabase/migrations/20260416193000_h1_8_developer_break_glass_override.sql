create table if not exists public.developer_access_overrides (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_enabled boolean not null default false,
  allowed_roles text[] not null default array[]::text[],
  active_effective_role text null,
  can_access_all_office_routes boolean not null default false,
  can_impersonate_for_mutations boolean not null default false,
  expires_at timestamptz null,
  reason text null,
  created_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint developer_access_overrides_allowed_roles_check check (
    allowed_roles <@ array[
      'buyer',
      'director',
      'warehouse',
      'accountant',
      'foreman',
      'contractor',
      'security',
      'engineer'
    ]::text[]
  ),
  constraint developer_access_overrides_active_role_check check (
    active_effective_role is null
    or active_effective_role = any(allowed_roles)
  )
);

create table if not exists public.developer_override_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  effective_role text null,
  override_enabled boolean not null default false,
  action_name text not null,
  resource_id text null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.developer_access_overrides enable row level security;
alter table public.developer_override_audit_log enable row level security;

drop policy if exists developer_access_overrides_own_select on public.developer_access_overrides;
create policy developer_access_overrides_own_select
on public.developer_access_overrides
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists developer_override_audit_own_select on public.developer_override_audit_log;
create policy developer_override_audit_own_select
on public.developer_override_audit_log
for select
to authenticated
using (actor_user_id = auth.uid());

revoke all on public.developer_access_overrides from anon, authenticated;
revoke all on public.developer_override_audit_log from anon, authenticated;
grant select on public.developer_access_overrides to authenticated;
grant select on public.developer_override_audit_log to authenticated;

create or replace function public.touch_developer_access_overrides_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists developer_access_overrides_touch_updated_at on public.developer_access_overrides;
create trigger developer_access_overrides_touch_updated_at
before update on public.developer_access_overrides
for each row execute function public.touch_developer_access_overrides_updated_at();

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
begin
  insert into public.developer_override_audit_log (
    actor_user_id,
    effective_role,
    override_enabled,
    action_name,
    resource_id,
    details
  )
  values (
    p_actor_user_id,
    nullif(lower(trim(coalesce(p_effective_role, ''))), ''),
    coalesce(p_override_enabled, false),
    nullif(trim(coalesce(p_action_name, '')), ''),
    nullif(trim(coalesce(p_resource_id, '')), ''),
    coalesce(p_details, '{}'::jsonb)
  );
end;
$$;

grant execute on function public.developer_override_write_audit_v1(uuid, text, boolean, text, text, jsonb) to authenticated, service_role;

create or replace function public.developer_override_context_v1()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_row public.developer_access_overrides%rowtype;
  v_is_active boolean := false;
  v_active_effective_role text := null;
begin
  if v_actor_id is null then
    return jsonb_build_object(
      'actorUserId', null,
      'isEnabled', false,
      'isActive', false,
      'allowedRoles', jsonb_build_array(),
      'activeEffectiveRole', null,
      'canAccessAllOfficeRoutes', false,
      'canImpersonateForMutations', false,
      'expiresAt', null,
      'reason', null
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
      'isEnabled', false,
      'isActive', false,
      'allowedRoles', jsonb_build_array(),
      'activeEffectiveRole', null,
      'canAccessAllOfficeRoutes', false,
      'canImpersonateForMutations', false,
      'expiresAt', null,
      'reason', null
    );
  end if;

  v_active_effective_role := nullif(lower(trim(coalesce(v_row.active_effective_role, ''))), '');
  v_is_active :=
    v_row.is_enabled
    and (v_row.expires_at is null or v_row.expires_at > now())
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
    'isEnabled', v_row.is_enabled,
    'isActive', v_is_active,
    'allowedRoles', coalesce(to_jsonb(v_row.allowed_roles), jsonb_build_array()),
    'activeEffectiveRole', case when v_is_active then v_active_effective_role else null end,
    'canAccessAllOfficeRoutes', v_row.can_access_all_office_routes,
    'canImpersonateForMutations', v_row.can_impersonate_for_mutations,
    'expiresAt', v_row.expires_at,
    'reason', v_row.reason
  );
end;
$$;

grant execute on function public.developer_override_context_v1() to authenticated, service_role;

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

  if not found or not v_row.is_enabled then
    perform public.developer_override_write_audit_v1(
      v_actor_id,
      v_role,
      false,
      'developer_override_denied',
      null,
      jsonb_build_object('reason', 'override_missing_or_disabled')
    );
    raise exception 'developer_set_effective_role_v1: override disabled'
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
  where user_id = v_actor_id;

  perform public.developer_override_write_audit_v1(
    v_actor_id,
    v_role,
    true,
    'developer_effective_role_selected',
    null,
    jsonb_build_object('allowedRoles', v_row.allowed_roles)
  );

  return public.developer_override_context_v1();
end;
$$;

grant execute on function public.developer_set_effective_role_v1(text) to authenticated, service_role;

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

  select active_effective_role
  into v_previous_role
  from public.developer_access_overrides dao
  where dao.user_id = v_actor_id
  limit 1;

  update public.developer_access_overrides
  set active_effective_role = null
  where user_id = v_actor_id;

  perform public.developer_override_write_audit_v1(
    v_actor_id,
    v_previous_role,
    false,
    'developer_override_disabled',
    null,
    '{}'::jsonb
  );

  return public.developer_override_context_v1();
end;
$$;

grant execute on function public.developer_clear_effective_role_v1() to authenticated, service_role;

create or replace function public.app_actor_base_role_context_v1(
  p_allowed_roles text[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_allowed text[] := coalesce(p_allowed_roles, array[]::text[]);
  v_role text := null;
begin
  if v_actor_id is null then
    return jsonb_build_object(
      'actorUserId', null,
      'role', null,
      'source', 'none',
      'allowed', false,
      'reason', 'unauthenticated'
    );
  end if;

  select nullif(lower(trim(coalesce(cm.role, ''))), '')
  into v_role
  from public.company_members cm
  where cm.user_id = v_actor_id
    and nullif(trim(coalesce(cm.role, '')), '') is not null
    and lower(trim(coalesce(cm.role, ''))) = any(v_allowed)
  order by cm.created_at asc
  limit 1;

  if v_role is not null then
    return jsonb_build_object(
      'actorUserId', v_actor_id,
      'role', v_role,
      'source', 'company_members',
      'allowed', true
    );
  end if;

  if exists (
    select 1
    from public.company_members cm
    where cm.user_id = v_actor_id
      and nullif(trim(coalesce(cm.role, '')), '') is not null
  ) then
    select nullif(lower(trim(coalesce(cm.role, ''))), '')
    into v_role
    from public.company_members cm
    where cm.user_id = v_actor_id
      and nullif(trim(coalesce(cm.role, '')), '') is not null
    order by cm.created_at asc
    limit 1;

    return jsonb_build_object(
      'actorUserId', v_actor_id,
      'role', v_role,
      'source', 'company_members',
      'allowed', false,
      'reason', 'source_role_forbidden'
    );
  end if;

  select nullif(lower(trim(coalesce(p.role, ''))), '')
  into v_role
  from public.profiles p
  where p.user_id = v_actor_id
    and nullif(trim(coalesce(p.role, '')), '') is not null
  limit 1;

  if v_role is not null then
    return jsonb_build_object(
      'actorUserId', v_actor_id,
      'role', v_role,
      'source', 'profiles',
      'allowed', v_role = any(v_allowed),
      'reason', case when v_role = any(v_allowed) then null else 'source_role_forbidden' end
    );
  end if;

  v_role := nullif(lower(trim(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', ''))), '');
  if v_role is not null then
    return jsonb_build_object(
      'actorUserId', v_actor_id,
      'role', v_role,
      'source', 'app_metadata',
      'allowed', v_role = any(v_allowed),
      'reason', case when v_role = any(v_allowed) then null else 'source_role_forbidden' end
    );
  end if;

  v_role := nullif(lower(trim(coalesce(public.get_my_role(), ''))), '');
  if v_role is not null then
    return jsonb_build_object(
      'actorUserId', v_actor_id,
      'role', v_role,
      'source', 'get_my_role',
      'allowed', v_role = any(v_allowed),
      'reason', case when v_role = any(v_allowed) then null else 'source_role_forbidden' end
    );
  end if;

  return jsonb_build_object(
    'actorUserId', v_actor_id,
    'role', null,
    'source', 'none',
    'allowed', false,
    'reason', 'no_role_truth'
  );
end;
$$;

grant execute on function public.app_actor_base_role_context_v1(text[]) to authenticated, service_role;

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
  v_override_role text := nullif(lower(trim(coalesce(v_override ->> 'activeEffectiveRole', ''))), '');
  v_override_active boolean := coalesce((v_override ->> 'isActive')::boolean, false);
  v_can_impersonate boolean := coalesce((v_override ->> 'canImpersonateForMutations')::boolean, false);
begin
  if v_actor_id is null then
    return v_base;
  end if;

  if v_override_active and v_can_impersonate and v_override_role is not null then
    if v_override_role = any(v_allowed) then
      perform public.developer_override_write_audit_v1(
        v_actor_id,
        v_override_role,
        true,
        'developer_override_rpc_action',
        null,
        jsonb_build_object(
          'allowedRoles', v_allowed,
          'baseRole', v_base ->> 'role',
          'baseSource', v_base ->> 'source'
        )
      );

      return jsonb_build_object(
        'actorUserId', v_actor_id,
        'role', v_override_role,
        'source', 'developer_override',
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
        'allowedRoles', v_allowed,
        'reason', 'effective_role_not_allowed_for_action'
      )
    );

    return jsonb_build_object(
      'actorUserId', v_actor_id,
      'role', v_override_role,
      'source', 'developer_override',
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
'H1.8/S2 actor role resolver. Developer break-glass override can impersonate an allowed effective role only when enabled, unexpired, and server-side validated; otherwise canonical S2 role truth is used.';

grant execute on function public.app_actor_role_context_v1(text[]) to authenticated, service_role;

insert into public.developer_access_overrides (
  user_id,
  is_enabled,
  allowed_roles,
  active_effective_role,
  can_access_all_office_routes,
  can_impersonate_for_mutations,
  expires_at,
  reason,
  created_by
)
values (
  '9adc5ab1-31fa-41be-8a00-17eadbb37c39'::uuid,
  true,
  array['buyer', 'director', 'warehouse', 'accountant', 'foreman', 'contractor']::text[],
  null,
  true,
  true,
  now() + interval '30 days',
  'H1.8 developer verification break-glass for petrovka080@gmail.com',
  null
)
on conflict (user_id) do update
set
  is_enabled = excluded.is_enabled,
  allowed_roles = excluded.allowed_roles,
  can_access_all_office_routes = excluded.can_access_all_office_routes,
  can_impersonate_for_mutations = excluded.can_impersonate_for_mutations,
  expires_at = excluded.expires_at,
  reason = excluded.reason;
