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
  "e74148e27e060bf0a36eb02ce7e4e93f4d09746975025113f19d7f5ee1950007";
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
type Role = LocalDeveloperPrincipalRole;

type Principal = {
  role: Role;
  email: string;
  password: string;
  user_id: string;
  membership_id: string;
};

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
  role text not null check (role in ('foreman','director','buyer','accountant','warehouse','contractor','security','estimator','engineer','consumer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id),
  unique (tenant_id, role)
);

alter table public.r551_local_developer_membership
  drop constraint if exists r551_local_developer_membership_role_check;
alter table public.r551_local_developer_membership
  add constraint r551_local_developer_membership_role_check
  check (role in ('foreman','director','buyer','accountant','warehouse','contractor','security','estimator','engineer','consumer'));

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
  v_membership public.r551_local_developer_membership%rowtype;
begin
  select * into v_membership
  from public.r551_local_developer_membership membership
  where membership.user_id = v_user_id
    and membership.active
    and membership.role in ('foreman','director','buyer','accountant','warehouse','contractor','security','estimator','engineer')
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
      'reason', 'local_developer_membership_missing'
    );
  end if;

  return jsonb_build_object(
    'actorUserId', v_user_id,
    'actorRole', 'platform_developer',
    'entitlement', 'platform_developer',
    'authorizationSource', 'server_entitlement',
    'isEnabled', true,
    'isActive', true,
    'allowedRoles', jsonb_build_array('foreman','director','buyer','accountant','warehouse','contractor','security','estimator','engineer'),
    'activeEffectiveRole', v_membership.role,
    'canAccessAllOfficeRoutes', true,
    'canImpersonateForMutations', false,
    'expiresAt', null,
    'reason', 'dedicated_local_developer_test_tenant'
  );
end;
$$;

create or replace function public.app_actor_role_context_v1(
  p_allowed_roles text[] default array[]::text[]
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text;
begin
  select membership.role into v_role
  from public.r551_local_developer_membership membership
  where membership.user_id = v_user_id
    and membership.active
    and membership.role in ('foreman','director','buyer','accountant','warehouse','contractor','security','estimator','engineer')
  limit 1;
  return jsonb_build_object(
    'actorUserId', v_user_id,
    'actorRole', case when v_role is not null then 'platform_developer' else null end,
    'effectiveRole', v_role,
    'role', v_role,
    'source', case when v_role is not null then 'local_developer_provider_principal' else 'none' end,
    'allowed', v_role is not null and (cardinality(p_allowed_roles) = 0 or v_role = any(p_allowed_roles)),
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
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.r551_local_developer_membership membership
    where membership.user_id = auth.uid()
      and membership.active
      and membership.role in ('accountant','director')
  ) then
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
revoke all on function public.app_actor_role_context_v1(text[]) from public, anon;
revoke all on function public.r541_current_principal() from public, anon;
revoke all on function public.accountant_inbox_scope_v1(text,integer,integer) from public, anon;
grant execute on function public.ensure_my_profile() to authenticated;
grant execute on function public.get_my_role() to authenticated;
grant execute on function public.developer_override_context_v1() to authenticated;
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

async function provisionPrincipal(
  role: Role,
  existing: Json | undefined,
  keys: ReturnType<typeof providerKeys>,
): Promise<Principal> {
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
    if (check.status === 200) return existing as Principal;
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
      (principal.role === LOCAL_DEVELOPER_CONSUMER_ROLE
        ? developerCapability.body?.authorizationSource === "none" &&
          developerCapability.body?.canAccessAllOfficeRoutes === false
        : developerCapability.body?.authorizationSource === "server_entitlement" &&
          developerCapability.body?.canAccessAllOfficeRoutes === true) &&
      developerCapability.body?.canImpersonateForMutations === false,
    `R551_CAPABILITY_${principal.role}_RED`,
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
    principals.push(await provisionPrincipal(role, existing, keys));
  }

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
  membershipSql.push("notify pgrst, 'reload schema'; commit;");
  runProviderSql(membershipSql.join("\n"));

  const credentialBody = {
    schema_version: "rik-expo-app-r551.local-developer-credentials.v1",
    environment: "local_developer",
    provider_url: PROVIDER_URL,
    publishable_key: keys.publishable,
    test_tenant_id: TEST_TENANT_ID,
    principals,
    created_utc: previous?.created_utc ?? new Date().toISOString(),
    verified_utc: new Date().toISOString(),
  };
  atomicJson(CREDENTIALS, credentialBody);

  const cases = [];
  for (const principal of principals) {
    cases.push(await verifyPrincipal(principal, keys.publishable));
  }
  const receiptBase = {
    schema_version: "rik-expo-app-r555.local-developer-principals.v1",
    generated_utc: new Date().toISOString(),
    master_sha256: MASTER_SHA256,
    status: "GREEN_R555_LOCAL_DEVELOPER_PROVIDER_PRINCIPALS_9_OFFICE_PLUS_1_CONSUMER",
    denominator: PRINCIPAL_ROLES.length,
    green: cases.length,
    office_denominator: ROLES.length,
    office_green: cases.filter((item) => item.role !== LOCAL_DEVELOPER_CONSUMER_ROLE).length,
    consumer_denominator: 1,
    consumer_green: cases.filter((item) => item.role === LOCAL_DEVELOPER_CONSUMER_ROLE).length,
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
      principal_count: principals.length,
      office_principal_count: principals.filter((principal) => principal.role !== LOCAL_DEVELOPER_CONSUMER_ROLE).length,
      consumer_principal_count: principals.filter((principal) => principal.role === LOCAL_DEVELOPER_CONSUMER_ROLE).length,
      director_count: principals.filter((principal) => principal.role === "director").length,
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
      credentials_printed: false,
      production_requests: 0,
    })}\n`,
  );
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
