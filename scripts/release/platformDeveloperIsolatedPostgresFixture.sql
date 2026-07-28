\set ON_ERROR_STOP on

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end
$$;

create schema auth;

create table auth.users (
  id uuid primary key,
  email text null
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

grant usage on schema auth to authenticated, service_role;
grant execute on function auth.uid() to authenticated, service_role;

create table public.developer_access_overrides (
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

create table public.developer_override_audit_log (
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

create policy developer_access_overrides_own_select
on public.developer_access_overrides
for select
to authenticated
using (user_id = auth.uid());

create policy developer_override_audit_own_select
on public.developer_override_audit_log
for select
to authenticated
using (actor_user_id = auth.uid());

revoke all on public.developer_access_overrides from anon, authenticated;
revoke all on public.developer_override_audit_log from anon, authenticated;
grant select on public.developer_access_overrides to authenticated;
grant select on public.developer_override_audit_log to authenticated;

create table public.isolated_base_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null
);

create or replace function public.app_actor_base_role_context_v1(
  p_allowed_roles text[] default array[]::text[]
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'actorUserId', auth.uid(),
    'role', r.role,
    'source', 'isolated_base_role',
    'allowed', r.role = any(coalesce(p_allowed_roles, array[]::text[])),
    'override', false
  )
  from public.isolated_base_roles r
  where r.user_id = auth.uid();
$$;

insert into auth.users (id, email)
values
  ('00000000-0000-4000-8000-000000000001', 'ordinary@example.invalid'),
  ('00000000-0000-4000-8000-000000000002', 'director@example.invalid'),
  ('00000000-0000-4000-8000-000000000003', 'protected@example.invalid'),
  ('00000000-0000-4000-8000-000000000004', 'legacy-one@example.invalid'),
  ('00000000-0000-4000-8000-000000000005', 'legacy-two@example.invalid');

insert into public.isolated_base_roles (user_id, role)
values
  ('00000000-0000-4000-8000-000000000001', 'buyer'),
  ('00000000-0000-4000-8000-000000000002', 'director'),
  ('00000000-0000-4000-8000-000000000003', 'buyer'),
  ('00000000-0000-4000-8000-000000000004', 'buyer'),
  ('00000000-0000-4000-8000-000000000005', 'buyer');

insert into public.developer_access_overrides (
  user_id,
  is_enabled,
  allowed_roles,
  active_effective_role,
  can_access_all_office_routes,
  can_impersonate_for_mutations,
  expires_at,
  reason
)
values
  (
    '00000000-0000-4000-8000-000000000003',
    true,
    array['buyer', 'director', 'warehouse', 'accountant', 'foreman', 'contractor', 'security', 'engineer'],
    'director',
    true,
    true,
    now() + interval '30 days',
    'Security-reviewed protected full-office grant'
  ),
  (
    '00000000-0000-4000-8000-000000000004',
    true,
    array['buyer', 'director', 'warehouse', 'accountant', 'foreman', 'contractor'],
    null,
    true,
    true,
    now() + interval '30 days',
    'H1.8 developer verification break-glass for historical identity'
  ),
  (
    '00000000-0000-4000-8000-000000000005',
    true,
    array['buyer', 'director', 'warehouse', 'accountant', 'foreman', 'contractor', 'security', 'engineer'],
    'director',
    true,
    false,
    now() + interval '180 days',
    'Developer full-office access restored for pre-release web/iOS/Android verification'
  );

do $$
begin
  if (select count(*) from public.developer_access_overrides where is_enabled) <> 3 then
    raise exception 'fixture_pre_migration_enabled_override_count';
  end if;
end
$$;
