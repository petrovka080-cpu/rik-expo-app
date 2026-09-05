import { createHash, randomBytes, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

import {
  LOCAL_DEVELOPER_CONSUMER_ROLE,
  LOCAL_DEVELOPER_REVIEW_ROLES,
  type LocalDeveloperPrincipalRole,
} from "../../src/lib/localDeveloperReviewRoles";

type Json = Record<string, any>;

const MASTER_SHA256 =
  "cbb384cf6cfa609b2a7973ddfc29c4935fc730d4b63f4480ad1510feb6942ac1";
const PROVIDER_URL = "http://127.0.0.1:54321";
const DB_CONTAINER = "supabase_db_rik-r52-a7-provider-20260824";
const KONG_CONTAINER = "supabase_kong_rik-r52-a7-provider-20260824";
const TEST_TENANT_ID = "55555555-5555-4555-8555-555555555551";
const CREDENTIALS = resolve(
  ".release-runtime/r551/runtime/local-developer/credentials.json",
);
const RECEIPT = resolve(
  ".release-runtime/r555/evidence/23D_R555_LOCAL_DEVELOPER_PRINCIPALS.json",
);
const ROLES = LOCAL_DEVELOPER_REVIEW_ROLES;
const PRINCIPAL_ROLES: readonly LocalDeveloperPrincipalRole[] = [
  ...ROLES,
  LOCAL_DEVELOPER_CONSUMER_ROLE,
];
const OWNER_ROLE = "platform_developer" as const;
type Role = LocalDeveloperPrincipalRole;

type ProviderPrincipalRole = Role | typeof OWNER_ROLE;

type ProviderPrincipal<T extends ProviderPrincipalRole> = {
  role: T;
  email: string;
  password: string;
  user_id: string;
  membership_id: string;
};

type Principal = ProviderPrincipal<Role>;
type OwnerPrincipal = ProviderPrincipal<typeof OWNER_ROLE>;

const SQL_FOUNDATION = String.raw`
begin;

create table if not exists public.r551_local_developer_tenant (
  id uuid primary key,
  environment text not null check (environment = 'local_developer'),
  created_at timestamptz not null default now()
);

create table if not exists public.r551_local_developer_membership (
  id uuid primary key,
  tenant_id uuid not null references public.r551_local_developer_tenant(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('foreman','director','buyer','accountant','warehouse','contractor','security','estimator','engineer','consumer','platform_developer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id),
  unique (tenant_id, role)
);

alter table public.r551_local_developer_membership
  drop constraint if exists r551_local_developer_membership_role_check;
alter table public.r551_local_developer_membership
  add constraint r551_local_developer_membership_role_check
  check (role in ('foreman','director','buyer','accountant','warehouse','contractor','security','estimator','engineer','consumer','platform_developer'));

create table if not exists public.ref_object_types (
  code text primary key,
  display_name text,
  name_human_ru text,
  name_ru text,
  alias_ru text,
  name text not null
);
create table if not exists public.ref_levels (
  code text primary key,
  display_name text,
  name_human_ru text,
  name_ru text,
  name text not null,
  sort integer
);
create table if not exists public.ref_systems (
  code text primary key,
  display_name text,
  name_human_ru text,
  name_ru text,
  alias_ru text,
  name text not null
);
create table if not exists public.ref_zones (
  code text primary key,
  display_name text,
  name_human_ru text,
  name_ru text,
  name text not null
);

insert into public.ref_object_types(code,display_name,name_human_ru,name_ru,name)
values ('local-building','Здание','Здание','Здание','Здание')
on conflict(code) do update set name=excluded.name,name_ru=excluded.name_ru;
insert into public.ref_levels(code,display_name,name_human_ru,name_ru,name,sort)
values ('local-level','Этаж','Этаж','Этаж','Этаж',1)
on conflict(code) do update set name=excluded.name,name_ru=excluded.name_ru,sort=excluded.sort;
insert into public.ref_systems(code,display_name,name_human_ru,name_ru,name)
values ('local-general','Общестроительная','Общестроительная','Общестроительная','Общестроительная')
on conflict(code) do update set name=excluded.name,name_ru=excluded.name_ru;
insert into public.ref_zones(code,display_name,name_human_ru,name_ru,name)
values ('local-main','Основная зона','Основная зона','Основная зона','Основная зона')
on conflict(code) do update set name=excluded.name,name_ru=excluded.name_ru;

alter table public.r551_local_developer_tenant enable row level security;
alter table public.r551_local_developer_membership enable row level security;
alter table public.r551_local_developer_tenant force row level security;
alter table public.r551_local_developer_membership force row level security;
alter table public.ref_object_types enable row level security;
alter table public.ref_levels enable row level security;
alter table public.ref_systems enable row level security;
alter table public.ref_zones enable row level security;

drop policy if exists r551_local_developer_ref_object_types_read on public.ref_object_types;
create policy r551_local_developer_ref_object_types_read on public.ref_object_types
for select to authenticated using (true);
drop policy if exists r551_local_developer_ref_levels_read on public.ref_levels;
create policy r551_local_developer_ref_levels_read on public.ref_levels
for select to authenticated using (true);
drop policy if exists r551_local_developer_ref_systems_read on public.ref_systems;
create policy r551_local_developer_ref_systems_read on public.ref_systems
for select to authenticated using (true);
drop policy if exists r551_local_developer_ref_zones_read on public.ref_zones;
create policy r551_local_developer_ref_zones_read on public.ref_zones
for select to authenticated using (true);

drop policy if exists r551_local_developer_tenant_self on public.r551_local_developer_tenant;
create policy r551_local_developer_tenant_self
on public.r551_local_developer_tenant for select to authenticated
using (
  exists (
    select 1
    from public.r551_local_developer_membership membership
    where membership.tenant_id = r551_local_developer_tenant.id
      and membership.user_id = auth.uid()
      and membership.active
  )
);

drop policy if exists r551_local_developer_membership_self on public.r551_local_developer_membership;
create policy r551_local_developer_membership_self
on public.r551_local_developer_membership for select to authenticated
using (user_id = auth.uid() and active);

insert into public.r551_local_developer_tenant(id, environment)
values ('${TEST_TENANT_ID}'::uuid, 'local_developer')
on conflict(id) do update set environment = excluded.environment;

create table if not exists public.r541_app_auth_profile (
  user_id uuid primary key,
  resolved_role text not null,
  tenant_id uuid not null,
  membership_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.r541_app_auth_profile enable row level security;

create table if not exists public.developer_access_overrides (
  user_id uuid primary key references auth.users(id) on delete cascade,
  entitlement text null check (entitlement is null or entitlement = 'platform_developer'),
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
      'buyer','director','warehouse','accountant','foreman','contractor',
      'security','engineer','estimator'
    ]::text[]
  ),
  constraint developer_access_overrides_active_role_check check (
    active_effective_role is null or active_effective_role = any(allowed_roles)
  )
);

alter table public.developer_access_overrides
  add column if not exists entitlement text null;
alter table public.developer_access_overrides
  drop constraint if exists developer_access_overrides_entitlement_check;
alter table public.developer_access_overrides
  add constraint developer_access_overrides_entitlement_check
  check (entitlement is null or entitlement = 'platform_developer');
alter table public.developer_access_overrides
  drop constraint if exists developer_access_overrides_allowed_roles_check;
alter table public.developer_access_overrides
  add constraint developer_access_overrides_allowed_roles_check check (
    allowed_roles <@ array[
      'buyer','director','warehouse','accountant','foreman','contractor',
      'security','engineer','estimator'
    ]::text[]
  );

create table if not exists public.developer_override_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  actor_role text not null default 'authenticated_user',
  effective_role text null,
  override_enabled boolean not null default false,
  action_name text not null,
  resource_id text null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.developer_override_audit_log
  add column if not exists actor_role text not null default 'authenticated_user';

alter table public.developer_access_overrides enable row level security;
alter table public.developer_override_audit_log enable row level security;
drop policy if exists developer_access_overrides_own_select on public.developer_access_overrides;
create policy developer_access_overrides_own_select
on public.developer_access_overrides for select to authenticated
using (user_id = auth.uid());
drop policy if exists developer_override_audit_own_select on public.developer_override_audit_log;
create policy developer_override_audit_own_select
on public.developer_override_audit_log for select to authenticated
using (actor_user_id = auth.uid());

create or replace function public.ensure_my_profile()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text := nullif(lower(trim(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', ''))), '');
  v_tenant_id uuid := nullif(trim(coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', '')), '')::uuid;
  v_membership_id uuid := nullif(trim(coalesce(auth.jwt() -> 'app_metadata' ->> 'membership_id', '')), '')::uuid;
  v_valid boolean := false;
begin
  if v_user_id is null or v_role is null or v_tenant_id is null or v_membership_id is null then
    raise exception using errcode = '42501', message = 'provider principal metadata is incomplete';
  end if;

  select
    exists (
      select 1 from public.r551_local_developer_membership membership
      where membership.id = v_membership_id
        and membership.user_id = v_user_id
        and membership.tenant_id = v_tenant_id
        and membership.role = v_role
        and membership.active
    )
    or exists (
      select 1 from public.r541_security_membership membership
      where membership.id = v_membership_id
        and membership.user_id = v_user_id
        and membership.tenant_id = v_tenant_id
        and membership.role = v_role
        and membership.active
    )
  into v_valid;

  if not v_valid then
    raise exception using errcode = '42501', message = 'provider principal membership is stale';
  end if;

  insert into public.r541_app_auth_profile(user_id,resolved_role,tenant_id,membership_id)
  values (v_user_id,v_role,v_tenant_id,v_membership_id)
  on conflict(user_id) do update set
    resolved_role=excluded.resolved_role,
    tenant_id=excluded.tenant_id,
    membership_id=excluded.membership_id,
    updated_at=now();
end;
$$;

create or replace function public.get_my_role()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text := nullif(lower(trim(coalesce(auth.jwt() -> 'app_metadata' ->> 'role', ''))), '');
  v_tenant_id uuid := nullif(trim(coalesce(auth.jwt() -> 'app_metadata' ->> 'tenant_id', '')), '')::uuid;
  v_membership_id uuid := nullif(trim(coalesce(auth.jwt() -> 'app_metadata' ->> 'membership_id', '')), '')::uuid;
begin
  if v_user_id is null or v_role is null or v_tenant_id is null or v_membership_id is null then
    raise exception using errcode = '42501', message = 'provider principal metadata is incomplete';
  end if;
  if not (
    exists (
      select 1 from public.r551_local_developer_membership membership
      where membership.id = v_membership_id
        and membership.user_id = v_user_id
        and membership.tenant_id = v_tenant_id
        and membership.role = v_role
        and membership.active
    )
    or exists (
      select 1 from public.r541_security_membership membership
      where membership.id = v_membership_id
        and membership.user_id = v_user_id
        and membership.tenant_id = v_tenant_id
        and membership.role = v_role
        and membership.active
    )
  ) then
    raise exception using errcode = '42501', message = 'provider principal membership is stale';
  end if;
  return v_role;
end;
$$;

create or replace function public.developer_override_context_v1()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_override public.developer_access_overrides%rowtype;
  v_entitled boolean := false;
  v_active boolean := false;
begin
  select * into v_override
  from public.developer_access_overrides override_row
  where override_row.user_id = v_user_id
  limit 1;

  if not found then
    return jsonb_build_object(
      'actorUserId', v_user_id,
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

  v_entitled :=
    v_override.entitlement = 'platform_developer'
    and v_override.is_enabled
    and v_override.can_access_all_office_routes
    and (v_override.expires_at is null or v_override.expires_at > now());
  v_active :=
    v_entitled
    and v_override.active_effective_role is not null
    and v_override.active_effective_role = any(v_override.allowed_roles);

  return jsonb_build_object(
    'actorUserId', v_user_id,
    'actorRole', case when v_entitled then 'platform_developer' else null end,
    'entitlement', case when v_entitled then 'platform_developer' else null end,
    'authorizationSource', case when v_entitled then 'server_entitlement' else 'none' end,
    'isEnabled', v_entitled,
    'isActive', v_active,
    'allowedRoles', case
      when v_entitled then to_jsonb(v_override.allowed_roles)
      else jsonb_build_array()
    end,
    'activeEffectiveRole', case when v_active then v_override.active_effective_role else null end,
    'canAccessAllOfficeRoutes', v_entitled,
    'canImpersonateForMutations', v_entitled and v_override.can_impersonate_for_mutations,
    'expiresAt', v_override.expires_at,
    'reason', v_override.reason
  );
end;
$$;

create or replace function public.developer_set_effective_role_v1(
  p_effective_role text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text := nullif(lower(trim(coalesce(p_effective_role, ''))), '');
  v_override public.developer_access_overrides%rowtype;
begin
  select * into v_override
  from public.developer_access_overrides override_row
  where override_row.user_id = v_user_id
    and override_row.entitlement = 'platform_developer'
    and override_row.is_enabled
    and override_row.can_access_all_office_routes
    and (override_row.expires_at is null or override_row.expires_at > now())
  limit 1;

  if not found then
    raise exception using errcode = '42501', message = 'platform_developer entitlement required';
  end if;
  if v_role is null or not (v_role = any(v_override.allowed_roles)) then
    insert into public.developer_override_audit_log(
      actor_user_id,actor_role,effective_role,override_enabled,action_name,details
    ) values (
      v_user_id,'platform_developer',v_role,false,'developer_override_denied',
      jsonb_build_object('reason','role_not_allowed')
    );
    raise exception using errcode = '42501', message = 'effective role not allowed';
  end if;

  update public.developer_access_overrides
  set active_effective_role = v_role, updated_at = now()
  where user_id = v_user_id and entitlement = 'platform_developer';
  insert into public.developer_override_audit_log(
    actor_user_id,actor_role,effective_role,override_enabled,action_name,details
  ) values (
    v_user_id,'platform_developer',v_role,true,'developer_effective_role_selected',
    jsonb_build_object('allowedRoles',v_override.allowed_roles)
  );
  return public.developer_override_context_v1();
end;
$$;

create or replace function public.developer_clear_effective_role_v1()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_previous_role text;
begin
  if not exists (
    select 1 from public.developer_access_overrides override_row
    where override_row.user_id = v_user_id
      and override_row.entitlement = 'platform_developer'
      and override_row.is_enabled
      and override_row.can_access_all_office_routes
      and (override_row.expires_at is null or override_row.expires_at > now())
  ) then
    raise exception using errcode = '42501', message = 'platform_developer entitlement required';
  end if;
  select active_effective_role into v_previous_role
  from public.developer_access_overrides
  where user_id = v_user_id;
  update public.developer_access_overrides
  set active_effective_role = null, updated_at = now()
  where user_id = v_user_id and entitlement = 'platform_developer';
  insert into public.developer_override_audit_log(
    actor_user_id,actor_role,effective_role,override_enabled,action_name
  ) values (
    v_user_id,'platform_developer',v_previous_role,false,'developer_override_disabled'
  );
  return public.developer_override_context_v1();
end;
$$;

create or replace function public.app_actor_role_context_v1(
  p_allowed_roles text[] default array[]::text[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
  v_override jsonb := public.developer_override_context_v1();
  v_override_role text := nullif(lower(trim(coalesce(v_override ->> 'activeEffectiveRole', ''))), '');
  v_allowed text[] := coalesce(p_allowed_roles, array[]::text[]);
begin
  if
    v_override ->> 'actorRole' = 'platform_developer'
    and coalesce((v_override ->> 'isActive')::boolean, false)
    and coalesce((v_override ->> 'canImpersonateForMutations')::boolean, false)
    and v_override_role is not null
  then
    if cardinality(v_allowed) = 0 or v_override_role = any(v_allowed) then
      insert into public.developer_override_audit_log(
        actor_user_id,actor_role,effective_role,override_enabled,action_name,details
      ) values (
        v_user_id,'platform_developer',v_override_role,true,'developer_override_rpc_action',
        jsonb_build_object('allowedRoles',v_allowed)
      );
      return jsonb_build_object(
        'actorUserId',v_user_id,
        'actorRole','platform_developer',
        'effectiveRole',v_override_role,
        'role',v_override_role,
        'source','platform_developer_entitlement',
        'allowed',true,
        'override',true
      );
    end if;
    return jsonb_build_object(
      'actorUserId',v_user_id,
      'actorRole','platform_developer',
      'effectiveRole',v_override_role,
      'role',v_override_role,
      'source','platform_developer_entitlement',
      'allowed',false,
      'override',true,
      'reason','effective_role_not_allowed_for_action'
    );
  end if;

  select membership.role into v_role
  from public.r551_local_developer_membership membership
  where membership.user_id = v_user_id
    and membership.active
  limit 1;
  return jsonb_build_object(
    'actorUserId', v_user_id,
    'actorRole', case when v_role is not null then 'authenticated_user' else null end,
    'effectiveRole', v_role,
    'role', v_role,
    'source', case when v_role is not null then 'strict_local_test_principal' else 'none' end,
    'allowed', v_role is not null and (cardinality(v_allowed) = 0 or v_role = any(v_allowed)),
    'override', false
  );
end;
$$;

create or replace function public.r541_current_principal()
returns table(membership_id uuid, tenant_id uuid, resolved_role text)
language sql
stable
set search_path = ''
as $$
  select candidate.membership_id, candidate.tenant_id, candidate.resolved_role
  from (
    select membership.id membership_id,
           membership.tenant_id,
           membership.role resolved_role,
           0 source_order
    from public.r551_local_developer_membership membership
    where membership.user_id = auth.uid() and membership.active
    union all
    select membership.id membership_id,
           membership.tenant_id,
           membership.role resolved_role,
           1 source_order
    from public.r541_security_membership membership
    where membership.user_id = auth.uid() and membership.active
  ) candidate
  order by candidate.source_order, candidate.membership_id
  limit 1
$$;

create or replace function public.accountant_inbox_scope_v1(
  p_tab text default null,
  p_offset integer default 0,
  p_limit integer default 40
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not coalesce((public.app_actor_role_context_v1(array['accountant','director']) ->> 'allowed')::boolean, false) then
    raise exception using errcode = '42501', message = 'local developer accountant scope forbidden';
  end if;
  return jsonb_build_object(
    'document_type', 'accountant_inbox_scope',
    'version', 'v1',
    'rows', jsonb_build_array(),
    'meta', jsonb_build_object(
      'rows_source', 'r551_local_developer_empty_scope',
      'primary_owner', 'rpc_scope_v1',
      'backend_first_primary', true,
      'offset_rows', greatest(0, coalesce(p_offset, 0)),
      'limit_rows', least(200, greatest(1, coalesce(p_limit, 40))),
      'returned_row_count', 0,
      'total_row_count', 0,
      'has_more', false,
      'tab', nullif(trim(coalesce(p_tab, '')), '')
    )
  );
end;
$$;

revoke all on table public.r551_local_developer_tenant from public, anon;
revoke all on table public.r551_local_developer_membership from public, anon;
grant select on table public.r551_local_developer_tenant to authenticated;
grant select on table public.r551_local_developer_membership to authenticated;
revoke all on table public.ref_object_types from public, anon;
revoke all on table public.ref_levels from public, anon;
revoke all on table public.ref_systems from public, anon;
revoke all on table public.ref_zones from public, anon;
grant select on table public.ref_object_types to authenticated;
grant select on table public.ref_levels to authenticated;
grant select on table public.ref_systems to authenticated;
grant select on table public.ref_zones to authenticated;
revoke all on function public.ensure_my_profile() from public, anon;
revoke all on function public.get_my_role() from public, anon;
revoke all on function public.developer_override_context_v1() from public, anon;
revoke all on function public.developer_set_effective_role_v1(text) from public, anon;
revoke all on function public.developer_clear_effective_role_v1() from public, anon;
revoke all on function public.app_actor_role_context_v1(text[]) from public, anon;
revoke all on function public.r541_current_principal() from public, anon;
revoke all on function public.accountant_inbox_scope_v1(text,integer,integer) from public, anon;
grant execute on function public.ensure_my_profile() to authenticated;
grant execute on function public.get_my_role() to authenticated;
grant execute on function public.developer_override_context_v1() to authenticated;
grant execute on function public.developer_set_effective_role_v1(text) to authenticated;
grant execute on function public.developer_clear_effective_role_v1() to authenticated;
grant execute on function public.app_actor_role_context_v1(text[]) to authenticated;
grant execute on function public.r541_current_principal() to authenticated;
grant execute on function public.accountant_inbox_scope_v1(text,integer,integer) to authenticated;

notify pgrst, 'reload schema';
commit;
`;

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function atomicJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function providerKeys(): { publishable: string; secret: string } {
  const kong = execFileSync(
    "docker",
    ["exec", KONG_CONTAINER, "cat", "/home/kong/kong.yml"],
    { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  const publishable = kong.match(/sb_publishable_[A-Za-z0-9_-]+/u)?.[0] ?? "";
  const secret = kong.match(/sb_secret_[A-Za-z0-9_-]+/u)?.[0] ?? "";
  invariant(publishable && secret, "R551_LOCAL_PROVIDER_KEYS_NOT_FOUND");
  return { publishable, secret };
}

async function jsonRequest(url: string, init: RequestInit) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(30_000),
  });
  const body = (await response.json().catch(() => null)) as Json | null;
  return { status: response.status, body };
}

function runProviderSql(sql: string): void {
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      DB_CONTAINER,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-X",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    { input: sql, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );
}

function loadExistingCredentials(): Json | null {
  if (!existsSync(CREDENTIALS)) return null;
  try {
    return JSON.parse(readFileSync(CREDENTIALS, "utf8")) as Json;
  } catch {
    return null;
  }
}

async function provisionPrincipal<T extends ProviderPrincipalRole>(
  role: T,
  existing: Json | undefined,
  keys: ReturnType<typeof providerKeys>,
): Promise<ProviderPrincipal<T>> {
  if (
    existing &&
    typeof existing.user_id === "string" &&
    typeof existing.email === "string" &&
    typeof existing.password === "string" &&
    typeof existing.membership_id === "string"
  ) {
    const check = await jsonRequest(`${PROVIDER_URL}/auth/v1/admin/users/${existing.user_id}`, {
      method: "GET",
      headers: { apikey: keys.secret, Authorization: `Bearer ${keys.secret}` },
    });
    if (check.status === 200) return existing as ProviderPrincipal<T>;
  }

  const membershipId = randomUUID();
  const namespace = `${Date.now()}-${randomBytes(6).toString("hex")}`;
  const email = `local-developer-${role}-${namespace}@example.invalid`;
  const password = `Local!${randomBytes(30).toString("base64url")}9z`;
  const created = await jsonRequest(`${PROVIDER_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: keys.secret,
      Authorization: `Bearer ${keys.secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      app_metadata: {
        tenant_id: TEST_TENANT_ID,
        membership_id: membershipId,
        role,
        local_developer_review: true,
      },
    }),
  });
  invariant(created.status === 200 && created.body?.id, `R551_CREATE_${role}_${created.status}`);
  return {
    role,
    email,
    password,
    user_id: String(created.body.id),
    membership_id: membershipId,
  };
}

async function ensureAndroidInputSafeConsumer(
  principal: Principal,
  keys: ReturnType<typeof providerKeys>,
): Promise<Principal> {
  const inputSafe =
    principal.email.length <= 48 &&
    /^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+$/u.test(principal.email) &&
    /^[A-Za-z0-9]+$/u.test(principal.password);
  if (inputSafe) return principal;

  const email = `local-consumer-${randomBytes(5).toString("hex")}@example.test`;
  const password = `Local${randomBytes(18).toString("hex")}9z`;
  const updated = await jsonRequest(
    `${PROVIDER_URL}/auth/v1/admin/users/${principal.user_id}`,
    {
      method: "PUT",
      headers: {
        apikey: keys.secret,
        Authorization: `Bearer ${keys.secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, email_confirm: true }),
    },
  );
  invariant(
    updated.status === 200 && updated.body?.id === principal.user_id,
    `R551_ANDROID_SAFE_CONSUMER_${updated.status}`,
  );
  return { ...principal, email, password };
}

async function verifyPrincipal(principal: Principal, publishable: string) {
  const login = await jsonRequest(`${PROVIDER_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: publishable, "Content-Type": "application/json" },
    body: JSON.stringify({ email: principal.email, password: principal.password }),
  });
  invariant(login.status === 200 && login.body?.access_token, `R551_LOGIN_${principal.role}_RED`);
  const headers = {
    apikey: publishable,
    Authorization: `Bearer ${login.body.access_token}`,
    "Content-Type": "application/json",
  };
  const ensure = await jsonRequest(`${PROVIDER_URL}/rest/v1/rpc/ensure_my_profile`, {
    method: "POST",
    headers,
    body: "{}",
  });
  const role = await jsonRequest(`${PROVIDER_URL}/rest/v1/rpc/get_my_role`, {
    method: "POST",
    headers,
    body: "{}",
  });
  const developerCapability = await jsonRequest(
    `${PROVIDER_URL}/rest/v1/rpc/developer_override_context_v1`,
    { method: "POST", headers, body: "{}" },
  );
  const backendPrincipal = await jsonRequest(
    `${PROVIDER_URL}/rest/v1/rpc/r541_current_principal`,
    { method: "POST", headers, body: "{}" },
  );
  const actorContext = await jsonRequest(
    `${PROVIDER_URL}/rest/v1/rpc/app_actor_role_context_v1`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ p_allowed_roles: [principal.role] }),
    },
  );
  const backendPrincipalRow = Array.isArray(backendPrincipal.body)
    ? backendPrincipal.body[0]
    : null;
  invariant([200, 204].includes(ensure.status), `R551_ENSURE_${principal.role}_${ensure.status}`);
  invariant(
    role.status === 200 && String(role.body ?? "") === principal.role,
    `R551_ROLE_${principal.role}_RED`,
  );
  invariant(
    developerCapability.status === 200 &&
      developerCapability.body?.authorizationSource === "none" &&
      developerCapability.body?.canAccessAllOfficeRoutes === false &&
      developerCapability.body?.canImpersonateForMutations === false,
    `R551_CAPABILITY_${principal.role}_RED`,
  );
  invariant(
    actorContext.status === 200 &&
      actorContext.body?.actorRole === "authenticated_user" &&
      actorContext.body?.role === principal.role &&
      actorContext.body?.allowed === true &&
      actorContext.body?.override === false,
    `R551_STRICT_ROLE_${principal.role}_RED`,
  );
  invariant(
    backendPrincipal.status === 200 &&
      backendPrincipalRow?.membership_id === principal.membership_id &&
      backendPrincipalRow?.tenant_id === TEST_TENANT_ID &&
      backendPrincipalRow?.resolved_role === principal.role,
    `R551_BACKEND_PRINCIPAL_${principal.role}_RED`,
  );
  return { role: principal.role, verdict: "GREEN" };
}

async function verifyOwner(owner: OwnerPrincipal, publishable: string) {
  const login = await jsonRequest(`${PROVIDER_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: publishable, "Content-Type": "application/json" },
    body: JSON.stringify({ email: owner.email, password: owner.password }),
  });
  invariant(login.status === 200 && login.body?.access_token, "R551_OWNER_LOGIN_RED");
  const headers = {
    apikey: publishable,
    Authorization: `Bearer ${login.body.access_token}`,
    "Content-Type": "application/json",
  };
  const ensure = await jsonRequest(`${PROVIDER_URL}/rest/v1/rpc/ensure_my_profile`, {
    method: "POST",
    headers,
    body: "{}",
  });
  const role = await jsonRequest(`${PROVIDER_URL}/rest/v1/rpc/get_my_role`, {
    method: "POST",
    headers,
    body: "{}",
  });
  const capability = await jsonRequest(
    `${PROVIDER_URL}/rest/v1/rpc/developer_override_context_v1`,
    { method: "POST", headers, body: "{}" },
  );
  const backendPrincipal = await jsonRequest(
    `${PROVIDER_URL}/rest/v1/rpc/r541_current_principal`,
    { method: "POST", headers, body: "{}" },
  );
  const backendPrincipalRow = Array.isArray(backendPrincipal.body)
    ? backendPrincipal.body[0]
    : null;

  invariant([200, 204].includes(ensure.status), `R551_OWNER_ENSURE_${ensure.status}`);
  invariant(
    role.status === 200 && String(role.body ?? "") === OWNER_ROLE,
    "R551_OWNER_ROLE_RED",
  );
  invariant(
    capability.status === 200 &&
      capability.body?.actorRole === OWNER_ROLE &&
      capability.body?.entitlement === OWNER_ROLE &&
      capability.body?.authorizationSource === "server_entitlement" &&
      capability.body?.canAccessAllOfficeRoutes === true &&
      capability.body?.canImpersonateForMutations === true &&
      Array.isArray(capability.body?.allowedRoles) &&
      capability.body.allowedRoles.length === ROLES.length,
    "R551_OWNER_CAPABILITY_RED",
  );
  invariant(
    backendPrincipal.status === 200 &&
      backendPrincipalRow?.membership_id === owner.membership_id &&
      backendPrincipalRow?.tenant_id === TEST_TENANT_ID &&
      backendPrincipalRow?.resolved_role === OWNER_ROLE,
    "R551_OWNER_BACKEND_PRINCIPAL_RED",
  );

  const roleCases = [];
  for (const effectiveRole of ROLES) {
    const selected = await jsonRequest(
      `${PROVIDER_URL}/rest/v1/rpc/developer_set_effective_role_v1`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ p_effective_role: effectiveRole }),
      },
    );
    const actorContext = await jsonRequest(
      `${PROVIDER_URL}/rest/v1/rpc/app_actor_role_context_v1`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ p_allowed_roles: [effectiveRole] }),
      },
    );
    invariant(
      selected.status === 200 &&
        selected.body?.activeEffectiveRole === effectiveRole &&
        selected.body?.actorRole === OWNER_ROLE,
      `R551_OWNER_SELECT_${effectiveRole}_RED`,
    );
    invariant(
      actorContext.status === 200 &&
        actorContext.body?.actorRole === OWNER_ROLE &&
        actorContext.body?.role === effectiveRole &&
        actorContext.body?.allowed === true &&
        actorContext.body?.override === true,
      `R551_OWNER_ACTION_${effectiveRole}_RED`,
    );
    roleCases.push({ role: effectiveRole, verdict: "GREEN" });
  }

  const denied = await jsonRequest(
    `${PROVIDER_URL}/rest/v1/rpc/developer_set_effective_role_v1`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ p_effective_role: "admin" }),
    },
  );
  invariant(denied.status >= 400, "R551_OWNER_UNKNOWN_ROLE_ACCEPTED_RED");
  const reset = await jsonRequest(
    `${PROVIDER_URL}/rest/v1/rpc/developer_set_effective_role_v1`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ p_effective_role: "director" }),
    },
  );
  invariant(reset.status === 200, "R551_OWNER_ROLE_RESET_RED");

  return {
    actor_role: OWNER_ROLE,
    entitlement: OWNER_ROLE,
    effective_role_denominator: ROLES.length,
    effective_role_green: roleCases.length,
    unknown_role_denied: true,
    role_cases: roleCases,
    verdict: "GREEN",
  };
}

async function main(): Promise<void> {
  const health = await fetch(`${PROVIDER_URL}/auth/v1/health`, {
    signal: AbortSignal.timeout(5_000),
  });
  invariant(health.ok, "R551_LOCAL_PROVIDER_HEALTH_RED");
  const keys = providerKeys();
  runProviderSql(SQL_FOUNDATION);

  const previous = loadExistingCredentials();
  const principals: Principal[] = [];
  for (const role of PRINCIPAL_ROLES) {
    const existing = Array.isArray(previous?.principals)
      ? previous.principals.find((candidate: Json) => candidate.role === role)
      : undefined;
    const principal = await provisionPrincipal(role, existing, keys);
    principals.push(
      role === LOCAL_DEVELOPER_CONSUMER_ROLE
        ? await ensureAndroidInputSafeConsumer(principal, keys)
        : principal,
    );
  }
  const owner = await provisionPrincipal(
    OWNER_ROLE,
    previous?.owner && previous.owner.role === OWNER_ROLE
      ? previous.owner
      : undefined,
    keys,
  );

  const membershipSql = ["begin;"];
  for (const principal of principals) {
    invariant(/^[0-9a-f-]{36}$/iu.test(principal.user_id), `R551_USER_ID_${principal.role}_RED`);
    invariant(/^[0-9a-f-]{36}$/iu.test(principal.membership_id), `R551_MEMBERSHIP_ID_${principal.role}_RED`);
    membershipSql.push(`
      insert into public.r551_local_developer_membership(id,tenant_id,user_id,role,active)
      values ('${principal.membership_id}'::uuid,'${TEST_TENANT_ID}'::uuid,'${principal.user_id}'::uuid,'${principal.role}',true)
      on conflict(tenant_id,role) do update set
        id=excluded.id,user_id=excluded.user_id,active=true;
    `);
  }
  invariant(/^[0-9a-f-]{36}$/iu.test(owner.user_id), "R551_OWNER_USER_ID_RED");
  invariant(/^[0-9a-f-]{36}$/iu.test(owner.membership_id), "R551_OWNER_MEMBERSHIP_ID_RED");
  const strictPrincipalIds = principals.map((principal) => `'${principal.user_id}'::uuid`).join(",");
  membershipSql.push(`
    insert into public.r551_local_developer_membership(id,tenant_id,user_id,role,active)
    values ('${owner.membership_id}'::uuid,'${TEST_TENANT_ID}'::uuid,'${owner.user_id}'::uuid,'${OWNER_ROLE}',true)
    on conflict(tenant_id,role) do update set
      id=excluded.id,user_id=excluded.user_id,active=true;

    update public.developer_access_overrides
    set entitlement=null,is_enabled=false,active_effective_role=null,
        can_access_all_office_routes=false,can_impersonate_for_mutations=false,
        expires_at=now(),updated_at=now(),
        reason='Strict local role principal; developer entitlement forbidden'
    where user_id in (${strictPrincipalIds});

    insert into public.developer_access_overrides(
      user_id,entitlement,is_enabled,allowed_roles,active_effective_role,
      can_access_all_office_routes,can_impersonate_for_mutations,expires_at,
      reason,created_by,updated_at
    ) values (
      '${owner.user_id}'::uuid,'platform_developer',true,
      array['foreman','director','buyer','accountant','warehouse','contractor','security','estimator','engineer']::text[],
      'director',true,true,null,
      'Dedicated local owner with server-authorized platform developer entitlement',
      '${owner.user_id}'::uuid,now()
    ) on conflict(user_id) do update set
      entitlement=excluded.entitlement,
      is_enabled=excluded.is_enabled,
      allowed_roles=excluded.allowed_roles,
      active_effective_role=excluded.active_effective_role,
      can_access_all_office_routes=excluded.can_access_all_office_routes,
      can_impersonate_for_mutations=excluded.can_impersonate_for_mutations,
      expires_at=excluded.expires_at,
      reason=excluded.reason,
      updated_at=now();
  `);
  membershipSql.push("notify pgrst, 'reload schema'; commit;");
  runProviderSql(membershipSql.join("\n"));

  const credentialBody = {
    schema_version: "rik-expo-app-r551.local-developer-credentials.v1",
    environment: "local_developer",
    provider_url: PROVIDER_URL,
    publishable_key: keys.publishable,
    test_tenant_id: TEST_TENANT_ID,
    principals,
    owner,
    created_utc: previous?.created_utc ?? new Date().toISOString(),
    verified_utc: new Date().toISOString(),
  };
  atomicJson(CREDENTIALS, credentialBody);

  const cases = [];
  for (const principal of principals) {
    cases.push(await verifyPrincipal(principal, keys.publishable));
  }
  const ownerCase = await verifyOwner(owner, keys.publishable);
  const receiptBase = {
    schema_version: "rik-expo-app-r555.local-developer-principals.v1",
    generated_utc: new Date().toISOString(),
    master_sha256: MASTER_SHA256,
    status: "GREEN_R555_LOCAL_DEVELOPER_PROVIDER_PRINCIPALS_9_OFFICE_PLUS_1_CONSUMER",
    denominator: PRINCIPAL_ROLES.length + 1,
    green: cases.length + 1,
    office_denominator: ROLES.length,
    office_green: cases.filter((item) => item.role !== LOCAL_DEVELOPER_CONSUMER_ROLE).length,
    consumer_denominator: 1,
    consumer_green: cases.filter((item) => item.role === LOCAL_DEVELOPER_CONSUMER_ROLE).length,
    owner_denominator: 1,
    owner_green: ownerCase.verdict === "GREEN" ? 1 : 0,
    owner: ownerCase,
    roles: [...ROLES],
    cases,
    provider: {
      url_class: "loopback",
      project: "rik-r52-a7-provider-20260824",
      publishable_key_sha256: sha256(keys.publishable),
      service_key_in_browser: false,
      production_requests: 0,
    },
    tenant: {
      class: "dedicated_local_test_tenant",
      principal_count: principals.length + 1,
      office_principal_count: principals.filter((principal) => principal.role !== LOCAL_DEVELOPER_CONSUMER_ROLE).length,
      consumer_principal_count: principals.filter((principal) => principal.role === LOCAL_DEVELOPER_CONSUMER_ROLE).length,
      director_count: principals.filter((principal) => principal.role === "director").length,
      owner_count: 1,
    },
    credentials: {
      runtime_path: ".release-runtime/r551/runtime/local-developer/credentials.json",
      sha256: sha256(readFileSync(CREDENTIALS)),
      contains_secrets: true,
      bundled: false,
      cleanup_required: true,
    },
    scope: {
      local_only: true,
      production_accessed: false,
      deployed: false,
      released: false,
      merged: false,
      ota: false,
    },
  };
  atomicJson(RECEIPT, {
    ...receiptBase,
    payload_sha256: sha256(JSON.stringify(receiptBase)),
  });
  process.stdout.write(
    `${JSON.stringify({
      status: receiptBase.status,
      denominator: receiptBase.denominator,
      green: receiptBase.green,
      office_denominator: receiptBase.office_denominator,
      office_green: receiptBase.office_green,
      consumer_denominator: receiptBase.consumer_denominator,
      consumer_green: receiptBase.consumer_green,
      owner_denominator: receiptBase.owner_denominator,
      owner_green: receiptBase.owner_green,
      owner_effective_role_denominator: ownerCase.effective_role_denominator,
      owner_effective_role_green: ownerCase.effective_role_green,
      credentials_printed: false,
      production_requests: 0,
    })}\n`,
  );
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
