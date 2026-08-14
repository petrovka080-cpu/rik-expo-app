begin;

-- MASTER 11 610 R1. Canonical estimate definitions and revisions live on the
-- backend. Clients may read published metadata and their own revisions only.

create table public.estimate_definition_release (
  id uuid primary key default gen_random_uuid(),
  release_key text not null unique,
  schema_version integer not null check (schema_version > 0),
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  source_commit text not null,
  source_tree text not null,
  source_manifest_sha256 text not null check (source_manifest_sha256 ~ '^[0-9a-f]{64}$'),
  definition_count integer not null default 0 check (definition_count >= 0),
  resource_row_count integer not null default 0 check (resource_row_count >= 0),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  sealed_at timestamptz,
  constraint estimate_definition_release_seal_ck check (
    (status = 'draft' and sealed_at is null)
    or (status in ('active', 'retired') and sealed_at is not null)
  )
);

create unique index estimate_definition_release_one_active_idx
  on public.estimate_definition_release ((status)) where status = 'active';

create table public.estimate_work_identity (
  catalog_id text primary key,
  namespace text not null check (namespace in ('global', 'external_reference')),
  domain text not null check (domain ~ '^[a-z][a-z0-9_]*$'),
  source_identity text not null,
  work_key text not null,
  title_ru text not null,
  denominator_eligible boolean not null,
  canonical_owner text not null default 'backend',
  created_at timestamptz not null default now(),
  retired_at timestamptz,
  constraint estimate_work_identity_external_denominator_ck check (
    namespace <> 'external_reference' or denominator_eligible = false
  ),
  constraint estimate_work_identity_backend_owner_ck check (canonical_owner = 'backend'),
  unique (namespace, source_identity)
);

create index estimate_work_identity_search_idx
  on public.estimate_work_identity (domain, lower(title_ru), catalog_id);
create index estimate_work_identity_work_key_idx
  on public.estimate_work_identity (domain, work_key, catalog_id);

create table public.estimate_definition_version (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.estimate_definition_release(id) on delete restrict,
  catalog_id text not null references public.estimate_work_identity(catalog_id) on delete restrict,
  definition_version integer not null check (definition_version > 0),
  passport jsonb not null check (jsonb_typeof(passport) = 'object'),
  applicability jsonb not null default '{}'::jsonb check (jsonb_typeof(applicability) = 'object'),
  definition_sha256 text not null check (definition_sha256 ~ '^[0-9a-f]{64}$'),
  source_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(source_metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique (release_id, catalog_id),
  unique (catalog_id, definition_version)
);

create index estimate_definition_version_catalog_idx
  on public.estimate_definition_version (catalog_id, release_id);

create table public.estimate_parameter_definition (
  definition_version_id uuid not null references public.estimate_definition_version(id) on delete restrict,
  parameter_id text not null,
  ordinal integer not null check (ordinal >= 0),
  value_type text not null check (value_type in ('decimal', 'integer', 'boolean', 'enum', 'text')),
  unit_id text,
  title_ru text not null,
  required boolean not null default true,
  default_value jsonb,
  constraints_json jsonb not null default '{}'::jsonb check (jsonb_typeof(constraints_json) = 'object'),
  primary key (definition_version_id, parameter_id),
  unique (definition_version_id, ordinal)
);

create table public.estimate_formula_graph (
  definition_version_id uuid not null references public.estimate_definition_version(id) on delete restrict,
  formula_id text not null,
  output_unit_id text not null,
  expression_source text not null,
  ast jsonb not null check (jsonb_typeof(ast) = 'object'),
  input_parameter_ids text[] not null default '{}',
  ast_sha256 text not null check (ast_sha256 ~ '^[0-9a-f]{64}$'),
  primary key (definition_version_id, formula_id)
);

create table public.estimate_resource_spec (
  id uuid primary key default gen_random_uuid(),
  definition_version_id uuid not null references public.estimate_definition_version(id) on delete restrict,
  row_id text not null,
  ordinal integer not null check (ordinal >= 0),
  section text not null,
  category text not null,
  title_ru text not null,
  row_type text not null default 'material' check (row_type in ('material', 'labor', 'equipment', 'service', 'waste', 'other')),
  unit_id text not null,
  formula_id text not null,
  inclusion_ast jsonb not null default '{"kind":"literal","value":true}'::jsonb
    check (jsonb_typeof(inclusion_ast) = 'object'),
  resource_graph jsonb not null check (jsonb_typeof(resource_graph) = 'object'),
  semantic_owner text,
  cost_owner_id text,
  procurement_eligible boolean not null default false,
  source_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(source_metadata) = 'object'),
  row_sha256 text not null check (row_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  unique (definition_version_id, row_id),
  unique (definition_version_id, ordinal),
  foreign key (definition_version_id, formula_id)
    references public.estimate_formula_graph(definition_version_id, formula_id) on delete restrict
);

create index estimate_resource_spec_definition_page_idx
  on public.estimate_resource_spec (definition_version_id, ordinal, id);

create table public.estimate_normative_source (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  title_ru text not null,
  authority text not null,
  official_url text,
  artifact_sha256 text check (artifact_sha256 is null or artifact_sha256 ~ '^[0-9a-f]{64}$'),
  effective_from date,
  effective_to date,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create table public.estimate_normative_locator (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.estimate_normative_source(id) on delete restrict,
  locator_key text not null,
  locator jsonb not null check (jsonb_typeof(locator) = 'object'),
  excerpt_sha256 text check (excerpt_sha256 is null or excerpt_sha256 ~ '^[0-9a-f]{64}$'),
  unique (source_id, locator_key)
);

create table public.estimate_work_normative_binding (
  definition_version_id uuid not null references public.estimate_definition_version(id) on delete restrict,
  resource_spec_id uuid not null references public.estimate_resource_spec(id) on delete restrict,
  locator_id uuid not null references public.estimate_normative_locator(id) on delete restrict,
  applicability jsonb not null default '{}'::jsonb check (jsonb_typeof(applicability) = 'object'),
  primary key (definition_version_id, resource_spec_id, locator_id)
);

create table public.estimate_price_route (
  id uuid primary key default gen_random_uuid(),
  route_key text not null unique,
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  region_code text,
  priority integer not null default 100 check (priority >= 0),
  source_kind text not null check (source_kind in ('supplier', 'catalog', 'manual', 'normative', 'fallback')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  active boolean not null default true
);

create table public.estimate_resource_price_route_binding (
  resource_spec_id uuid not null references public.estimate_resource_spec(id) on delete restrict,
  route_id uuid not null references public.estimate_price_route(id) on delete restrict,
  price_key text not null,
  priority integer not null default 100 check (priority >= 0),
  primary key (resource_spec_id, route_id)
);

create table public.estimate_price_snapshot (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.estimate_price_route(id) on delete restrict,
  snapshot_key text not null unique,
  captured_at timestamptz not null,
  valid_until timestamptz,
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  source_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(source_metadata) = 'object'),
  created_at timestamptz not null default now()
);

create table public.estimate_price_snapshot_item (
  snapshot_id uuid not null references public.estimate_price_snapshot(id) on delete restrict,
  price_key text not null,
  unit_id text not null,
  unit_price numeric(28, 6) not null check (unit_price >= 0),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  source_row jsonb not null default '{}'::jsonb check (jsonb_typeof(source_row) = 'object'),
  primary key (snapshot_id, price_key, unit_id)
);

create table public.estimate_revision (
  id uuid primary key default gen_random_uuid(),
  parent_revision_id uuid references public.estimate_revision(id) on delete restrict,
  organization_id uuid,
  owner_user_id uuid not null default auth.uid(),
  release_id uuid not null references public.estimate_definition_release(id) on delete restrict,
  catalog_id text not null references public.estimate_work_identity(catalog_id) on delete restrict,
  revision_number integer not null check (revision_number > 0),
  status text not null check (status in ('ready', 'failed', 'archived')),
  input_parameters jsonb not null check (jsonb_typeof(input_parameters) = 'object'),
  price_snapshot_ids uuid[] not null default '{}',
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  totals jsonb not null check (jsonb_typeof(totals) = 'object'),
  row_count integer not null check (row_count >= 0),
  checksum_sha256 text not null check (checksum_sha256 ~ '^[0-9a-f]{64}$'),
  compiler_version text not null,
  migration_source jsonb check (migration_source is null or jsonb_typeof(migration_source) = 'object'),
  created_at timestamptz not null default now(),
  unique (owner_user_id, catalog_id, revision_number),
  constraint estimate_revision_parent_not_self_ck check (parent_revision_id is null or parent_revision_id <> id)
);

create index estimate_revision_owner_history_idx
  on public.estimate_revision (owner_user_id, catalog_id, created_at desc, id desc);
create index estimate_revision_org_history_idx
  on public.estimate_revision (organization_id, created_at desc, id desc)
  where organization_id is not null;

create table public.estimate_revision_row (
  revision_id uuid not null references public.estimate_revision(id) on delete restrict,
  row_id text not null,
  ordinal integer not null check (ordinal >= 0),
  resource_spec_id uuid references public.estimate_resource_spec(id) on delete restrict,
  section text not null,
  category text not null,
  title_ru text not null,
  unit_id text not null,
  quantity numeric(28, 9),
  unit_price numeric(28, 6),
  amount numeric(28, 2),
  currency_code text check (currency_code is null or currency_code ~ '^[A-Z]{3}$'),
  procurement_eligible boolean not null,
  calculation_trace jsonb not null check (jsonb_typeof(calculation_trace) = 'object'),
  normative_trace jsonb not null default '[]'::jsonb check (jsonb_typeof(normative_trace) = 'array'),
  legacy_row_payload jsonb check (legacy_row_payload is null or jsonb_typeof(legacy_row_payload) = 'object'),
  row_sha256 text not null check (row_sha256 ~ '^[0-9a-f]{64}$'),
  primary key (revision_id, row_id),
  unique (revision_id, ordinal),
  constraint estimate_revision_row_origin_ck check (
    resource_spec_id is not null or legacy_row_payload is not null
  )
);

create index estimate_revision_row_page_idx
  on public.estimate_revision_row (revision_id, ordinal, row_id);

create table public.estimate_revision_row_price (
  revision_id uuid not null,
  row_id text not null,
  price_snapshot_id uuid references public.estimate_price_snapshot(id) on delete restrict,
  route_id uuid references public.estimate_price_route(id) on delete restrict,
  unit_price numeric(28, 6),
  currency_code text check (currency_code is null or currency_code ~ '^[A-Z]{3}$'),
  resolution_trace jsonb not null default '{}'::jsonb check (jsonb_typeof(resolution_trace) = 'object'),
  primary key (revision_id, row_id),
  foreign key (revision_id, row_id)
    references public.estimate_revision_row(revision_id, row_id) on delete restrict
);

create table public.estimate_revision_artifact (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references public.estimate_revision(id) on delete restrict,
  artifact_kind text not null check (artifact_kind in ('pdf', 'procurement', 'xlsx', 'archive')),
  status text not null check (status in ('queued', 'building', 'ready', 'failed', 'expired')),
  storage_bucket text,
  storage_key text,
  content_type text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  error_code text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ready_at timestamptz,
  unique (revision_id, artifact_kind)
);

create table public.estimate_legacy_revision_import (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default auth.uid(),
  organization_id uuid,
  source_estimate_id text not null,
  source_revision_id text not null,
  source_checksum_sha256 text not null check (source_checksum_sha256 ~ '^[0-9a-f]{64}$'),
  catalog_id text not null references public.estimate_work_identity(catalog_id) on delete restrict,
  job_id uuid,
  revision_id uuid references public.estimate_revision(id) on delete restrict,
  status text not null check (status in ('queued', 'running', 'succeeded', 'failed')),
  row_count integer not null check (row_count between 0 and 5000),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (owner_user_id, source_estimate_id, source_revision_id),
  unique (owner_user_id, source_checksum_sha256)
);

create table public.estimate_compile_job (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null,
  organization_id uuid,
  owner_user_id uuid not null default auth.uid(),
  operation text not null check (operation in ('compile', 'recalculate', 'pdf', 'procurement', 'legacy_revision_migration')),
  catalog_id text references public.estimate_work_identity(catalog_id) on delete restrict,
  parent_revision_id uuid references public.estimate_revision(id) on delete restrict,
  input_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(input_payload) = 'object'),
  status text not null default 'queued' check (status in ('queued', 'running', 'retry_wait', 'succeeded', 'failed', 'cancelled')),
  stage text not null default 'admitted',
  progress smallint not null default 0 check (progress between 0 and 100),
  attempt integer not null default 0 check (attempt >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  available_at timestamptz not null default now(),
  lease_owner text,
  lease_expires_at timestamptz,
  result_revision_id uuid references public.estimate_revision(id) on delete restrict,
  error_code text,
  error_detail jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (owner_user_id, idempotency_key)
);

create index estimate_compile_job_claim_idx
  on public.estimate_compile_job (available_at, created_at, id)
  where status in ('queued', 'retry_wait');

alter table public.estimate_legacy_revision_import
  add constraint estimate_legacy_revision_import_job_fk
  foreign key (job_id) references public.estimate_compile_job(id) on delete restrict;

create index estimate_legacy_revision_import_job_idx
  on public.estimate_legacy_revision_import (job_id);

create table public.estimate_program_control_state (
  singleton boolean primary key default true check (singleton),
  denominator_total integer not null check (denominator_total = 11610),
  admitted_global_count integer not null check (admitted_global_count between 0 and denominator_total),
  queue_remaining integer not null,
  external_reference_count integer not null default 0 check (external_reference_count >= 0),
  batch006_started boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint estimate_program_arithmetic_ck check (queue_remaining = denominator_total - admitted_global_count)
);

insert into public.estimate_program_control_state (
  singleton, denominator_total, admitted_global_count, queue_remaining, external_reference_count, batch006_started
) values (true, 11610, 1160, 10450, 8, false)
on conflict (singleton) do nothing;

create table public.estimate_program_event (
  id bigint generated always as identity primary key,
  event_kind text not null check (event_kind in ('admission', 'migration', 'rollback', 'audit')),
  event_key text not null unique,
  catalog_id text references public.estimate_work_identity(catalog_id) on delete restrict,
  denominator_delta integer not null default 0,
  queue_delta integer not null default 0,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  constraint estimate_program_migration_no_delta_ck check (
    event_kind <> 'migration' or (denominator_delta = 0 and queue_delta = 0)
  )
);

create table public.estimate_migration_import (
  id uuid primary key default gen_random_uuid(),
  import_key text not null unique,
  release_id uuid not null references public.estimate_definition_release(id) on delete restrict,
  domain text not null,
  package_sha256 text not null check (package_sha256 ~ '^[0-9a-f]{64}$'),
  work_count integer not null check (work_count >= 0),
  external_count integer not null default 0 check (external_count >= 0),
  resource_row_count integer not null check (resource_row_count >= 0),
  status text not null check (status in ('dry_run', 'imported', 'rolled_back')),
  source_lineage jsonb not null check (jsonb_typeof(source_lineage) = 'object'),
  imported_at timestamptz,
  rolled_back_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.estimate_reject_mutation_v1()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using
    errcode = '55000',
    message = format('%I is immutable', tg_table_name);
end;
$$;

create or replace function public.estimate_guard_definition_mutation_v1()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_release_id uuid;
  v_sealed_at timestamptz;
begin
  v_release_id := case
    when tg_table_name = 'estimate_definition_release' then old.id
    else (to_jsonb(old) ->> 'release_id')::uuid
  end;
  select r.sealed_at into v_sealed_at
  from public.estimate_definition_release r
  where r.id = v_release_id;
  if v_sealed_at is not null then
    if tg_table_name = 'estimate_definition_release'
      and tg_op = 'UPDATE'
      and old.status = 'active'
      and new.status = 'retired'
      and old.id = new.id
      and old.release_key = new.release_key
      and old.schema_version = new.schema_version
      and old.source_commit = new.source_commit
      and old.source_tree = new.source_tree
      and old.source_manifest_sha256 = new.source_manifest_sha256
      and old.definition_count = new.definition_count
      and old.resource_row_count = new.resource_row_count
      and old.metadata = new.metadata
      and old.created_at = new.created_at
      and old.activated_at is not distinct from new.activated_at
      and old.sealed_at = new.sealed_at
    then
      return new;
    end if;
    raise exception using errcode = '55000', message = 'sealed estimate definition release is immutable';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function public.estimate_guard_definition_child_mutation_v1()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_definition_version_id uuid;
  v_sealed_at timestamptz;
begin
  v_definition_version_id := old.definition_version_id;
  select r.sealed_at into v_sealed_at
  from public.estimate_definition_version v
  join public.estimate_definition_release r on r.id = v.release_id
  where v.id = v_definition_version_id;
  if v_sealed_at is not null then
    raise exception using errcode = '55000', message = 'sealed estimate definition release is immutable';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger estimate_definition_release_immutable_trg
before update or delete on public.estimate_definition_release
for each row execute function public.estimate_guard_definition_mutation_v1();

create trigger estimate_definition_version_immutable_trg
before update or delete on public.estimate_definition_version
for each row execute function public.estimate_guard_definition_mutation_v1();

create trigger estimate_parameter_definition_immutable_trg
before update or delete on public.estimate_parameter_definition
for each row execute function public.estimate_guard_definition_child_mutation_v1();
create trigger estimate_formula_graph_immutable_trg
before update or delete on public.estimate_formula_graph
for each row execute function public.estimate_guard_definition_child_mutation_v1();
create trigger estimate_resource_spec_immutable_trg
before update or delete on public.estimate_resource_spec
for each row execute function public.estimate_guard_definition_child_mutation_v1();
create trigger estimate_work_normative_binding_immutable_trg
before update or delete on public.estimate_work_normative_binding
for each row execute function public.estimate_guard_definition_child_mutation_v1();

create trigger estimate_revision_immutable_trg
before update or delete on public.estimate_revision
for each row execute function public.estimate_reject_mutation_v1();
create trigger estimate_revision_row_immutable_trg
before update or delete on public.estimate_revision_row
for each row execute function public.estimate_reject_mutation_v1();
create trigger estimate_revision_row_price_immutable_trg
before update or delete on public.estimate_revision_row_price
for each row execute function public.estimate_reject_mutation_v1();

create or replace function public.estimate_revision_visible_v1(p_revision_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.estimate_revision r
    where r.id = p_revision_id
      and (
        r.owner_user_id = auth.uid()
        or public.rls_current_user_company_member_v1(r.organization_id)
      )
  );
$$;

create or replace function public.estimate_create_compile_job_v1(
  p_idempotency_key text,
  p_operation text,
  p_catalog_id text,
  p_parent_revision_id uuid,
  p_organization_id uuid,
  p_input_payload jsonb
)
returns table(job_id uuid, job_status text, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_job public.estimate_compile_job%rowtype;
begin
  if v_actor is null then raise exception using errcode = '28000', message = 'authentication required'; end if;
  if nullif(trim(p_idempotency_key), '') is null or length(p_idempotency_key) > 200 then
    raise exception using errcode = '22023', message = 'invalid idempotency key';
  end if;
  if p_organization_id is not null and not public.rls_current_user_company_member_v1(p_organization_id) then
    raise exception using errcode = '42501', message = 'organization access denied';
  end if;
  if p_parent_revision_id is not null and not public.estimate_revision_visible_v1(p_parent_revision_id) then
    raise exception using errcode = '42501', message = 'parent revision access denied';
  end if;
  if not exists (
    select 1 from public.estimate_work_identity wi
    join public.estimate_definition_version dv on dv.catalog_id = wi.catalog_id
    join public.estimate_definition_release dr on dr.id = dv.release_id
    where wi.catalog_id = p_catalog_id and wi.retired_at is null and dr.status = 'active'
  ) then
    raise exception using errcode = '22023', message = 'catalog definition is not active';
  end if;

  insert into public.estimate_compile_job (
    idempotency_key, organization_id, owner_user_id, operation, catalog_id,
    parent_revision_id, input_payload
  ) values (
    trim(p_idempotency_key), p_organization_id, v_actor, p_operation, p_catalog_id,
    p_parent_revision_id, coalesce(p_input_payload, '{}'::jsonb)
  )
  on conflict (owner_user_id, idempotency_key) do nothing
  returning * into v_job;

  if v_job.id is not null then
    return query select v_job.id, v_job.status, true;
  else
    return query
      select j.id, j.status, false
      from public.estimate_compile_job j
      where j.owner_user_id = v_actor and j.idempotency_key = trim(p_idempotency_key);
  end if;
end;
$$;

create or replace function public.estimate_create_legacy_revision_job_v1(
  p_idempotency_key text,
  p_catalog_id text,
  p_organization_id uuid,
  p_source_estimate_id text,
  p_source_revision_id text,
  p_source_checksum_sha256 text,
  p_parent_revision_id uuid,
  p_input_payload jsonb
)
returns table(job_id uuid, job_status text, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_job public.estimate_compile_job%rowtype;
  v_import public.estimate_legacy_revision_import%rowtype;
  v_row_count integer;
begin
  if v_actor is null then raise exception using errcode = '28000', message = 'authentication required'; end if;
  if nullif(trim(p_idempotency_key), '') is null or length(p_idempotency_key) > 200 then
    raise exception using errcode = '22023', message = 'invalid idempotency key';
  end if;
  if nullif(trim(p_source_estimate_id), '') is null or length(p_source_estimate_id) > 240
    or nullif(trim(p_source_revision_id), '') is null or length(p_source_revision_id) > 240
    or p_source_checksum_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'invalid legacy revision identity';
  end if;
  if jsonb_typeof(p_input_payload) <> 'object'
    or jsonb_typeof(p_input_payload -> 'rows') <> 'array'
    or octet_length(p_input_payload::text) > 8388608 then
    raise exception using errcode = '22023', message = 'invalid legacy revision payload';
  end if;
  v_row_count := jsonb_array_length(p_input_payload -> 'rows');
  if v_row_count > 5000 then
    raise exception using errcode = '22023', message = 'legacy revision row limit exceeded';
  end if;
  if p_organization_id is not null and not public.rls_current_user_company_member_v1(p_organization_id) then
    raise exception using errcode = '42501', message = 'organization access denied';
  end if;
  if p_parent_revision_id is not null and not public.estimate_revision_visible_v1(p_parent_revision_id) then
    raise exception using errcode = '42501', message = 'parent revision access denied';
  end if;
  if not exists (
    select 1 from public.estimate_work_identity wi
    join public.estimate_definition_version dv on dv.catalog_id = wi.catalog_id
    join public.estimate_definition_release dr on dr.id = dv.release_id
    where wi.catalog_id = p_catalog_id and wi.retired_at is null and dr.status = 'active'
  ) then
    raise exception using errcode = '22023', message = 'catalog definition is not active';
  end if;

  select * into v_import
  from public.estimate_legacy_revision_import i
  where i.owner_user_id = v_actor
    and i.source_estimate_id = trim(p_source_estimate_id)
    and i.source_revision_id = trim(p_source_revision_id);
  if v_import.id is not null then
    if v_import.source_checksum_sha256 <> p_source_checksum_sha256 or v_import.catalog_id <> p_catalog_id then
      raise exception using errcode = '23505', message = 'legacy revision identity conflicts with imported content';
    end if;
    return query select j.id, j.status, false
    from public.estimate_compile_job j where j.id = v_import.job_id;
    return;
  end if;

  insert into public.estimate_compile_job (
    idempotency_key, organization_id, owner_user_id, operation, catalog_id, parent_revision_id, input_payload
  ) values (
    trim(p_idempotency_key), p_organization_id, v_actor, 'legacy_revision_migration',
    p_catalog_id, p_parent_revision_id, p_input_payload
  )
  on conflict (owner_user_id, idempotency_key) do nothing
  returning * into v_job;
  if v_job.id is null then
    select * into v_job from public.estimate_compile_job j
    where j.owner_user_id = v_actor and j.idempotency_key = trim(p_idempotency_key);
    if v_job.operation <> 'legacy_revision_migration'
      or v_job.catalog_id <> p_catalog_id
      or v_job.input_payload ->> 'sourceChecksumSha256' <> p_source_checksum_sha256 then
      raise exception using errcode = '23505', message = 'idempotency key conflicts with another request';
    end if;
  end if;

  insert into public.estimate_legacy_revision_import (
    owner_user_id, organization_id, source_estimate_id, source_revision_id,
    source_checksum_sha256, catalog_id, job_id, status, row_count
  ) values (
    v_actor, p_organization_id, trim(p_source_estimate_id), trim(p_source_revision_id),
    p_source_checksum_sha256, p_catalog_id, v_job.id, v_job.status,
    v_row_count
  );
  return query select v_job.id, v_job.status, true;
end;
$$;

create or replace function public.estimate_create_artifact_job_v1(
  p_idempotency_key text,
  p_revision_id uuid,
  p_artifact_kind text
)
returns table(job_id uuid, artifact_id uuid, job_status text, artifact_status text, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_revision public.estimate_revision%rowtype;
  v_job public.estimate_compile_job%rowtype;
  v_artifact public.estimate_revision_artifact%rowtype;
begin
  if v_actor is null then raise exception using errcode = '28000', message = 'authentication required'; end if;
  if nullif(trim(p_idempotency_key), '') is null or length(p_idempotency_key) > 200
    or p_artifact_kind not in ('pdf', 'procurement') then
    raise exception using errcode = '22023', message = 'invalid artifact request';
  end if;
  select * into v_revision from public.estimate_revision r
  where r.id = p_revision_id and public.estimate_revision_visible_v1(r.id);
  if v_revision.id is null then raise exception using errcode = '42501', message = 'revision access denied'; end if;

  select * into v_artifact from public.estimate_revision_artifact a
  where a.revision_id = p_revision_id and a.artifact_kind = p_artifact_kind;
  if v_artifact.id is not null and v_artifact.status = 'ready' then
    return query select null::uuid, v_artifact.id, 'succeeded'::text, v_artifact.status, false;
    return;
  end if;

  insert into public.estimate_compile_job (
    idempotency_key, organization_id, owner_user_id, operation, catalog_id,
    parent_revision_id, input_payload
  ) values (
    trim(p_idempotency_key), v_revision.organization_id, v_actor, p_artifact_kind,
    v_revision.catalog_id, p_revision_id,
    jsonb_build_object('revisionId', p_revision_id, 'artifactKind', p_artifact_kind)
  )
  on conflict (owner_user_id, idempotency_key) do nothing
  returning * into v_job;
  if v_job.id is null then
    select * into v_job from public.estimate_compile_job j
    where j.owner_user_id = v_actor and j.idempotency_key = trim(p_idempotency_key);
    if v_job.parent_revision_id is distinct from p_revision_id or v_job.operation <> p_artifact_kind then
      raise exception using errcode = '23505', message = 'idempotency key conflicts with another request';
    end if;
  end if;

  insert into public.estimate_revision_artifact (
    revision_id, artifact_kind, status, metadata
  ) values (
    p_revision_id, p_artifact_kind, 'queued', jsonb_build_object('jobId', v_job.id)
  )
  on conflict (revision_id, artifact_kind) do update
  set status = case when public.estimate_revision_artifact.status = 'ready' then 'ready' else 'queued' end,
      error_code = null, updated_at = now(),
      metadata = public.estimate_revision_artifact.metadata || jsonb_build_object('jobId', v_job.id)
  returning * into v_artifact;
  return query select v_job.id, v_artifact.id, v_job.status, v_artifact.status, true;
end;
$$;

create or replace function public.estimate_claim_compile_jobs_v1(
  p_worker_id text,
  p_limit integer default 1,
  p_lease_seconds integer default 60
)
returns setof public.estimate_compile_job
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_user not in ('postgres', 'service_role') then
    raise exception using errcode = '42501', message = 'worker role required';
  end if;
  if nullif(trim(p_worker_id), '') is null or p_limit not between 1 and 25 or p_lease_seconds not between 15 and 900 then
    raise exception using errcode = '22023', message = 'invalid worker lease request';
  end if;
  return query
  with candidates as (
    select j.id
    from public.estimate_compile_job j
    where (
      (j.status in ('queued', 'retry_wait') and j.available_at <= now())
      or (j.status = 'running' and j.lease_expires_at < now())
    )
    order by j.available_at, j.created_at, j.id
    for update skip locked
    limit p_limit
  )
  update public.estimate_compile_job j
  set status = 'running', stage = 'loading_definition', progress = greatest(j.progress, 1),
      attempt = j.attempt + 1, lease_owner = trim(p_worker_id),
      lease_expires_at = now() + make_interval(secs => p_lease_seconds),
      started_at = coalesce(j.started_at, now()), updated_at = now()
  from candidates c
  where j.id = c.id
  returning j.*;
end;
$$;

create or replace function public.estimate_cancel_compile_job_v1(p_job_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_updated integer;
begin
  if auth.uid() is null then raise exception using errcode = '28000', message = 'authentication required'; end if;
  update public.estimate_compile_job
  set status = 'cancelled', stage = 'cancelled', completed_at = now(), updated_at = now(),
      lease_owner = null, lease_expires_at = null
  where id = p_job_id and owner_user_id = auth.uid() and status in ('queued', 'retry_wait');
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create or replace function public.estimate_commit_compile_job_v1(
  p_job_id uuid,
  p_worker_id text,
  p_revision jsonb,
  p_rows jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.estimate_compile_job%rowtype;
  v_release_id uuid;
  v_definition_version_id uuid;
  v_revision_id uuid := gen_random_uuid();
  v_revision_number integer;
  v_row_count integer;
begin
  if current_user not in ('postgres', 'service_role') then
    raise exception using errcode = '42501', message = 'worker role required';
  end if;
  if jsonb_typeof(p_revision) <> 'object' or jsonb_typeof(p_rows) <> 'array' then
    raise exception using errcode = '22023', message = 'invalid compiler commit payload';
  end if;

  select * into v_job from public.estimate_compile_job where id = p_job_id for update;
  if v_job.id is null then raise exception using errcode = 'P0002', message = 'compile job not found'; end if;
  if v_job.status <> 'running' or v_job.lease_owner is distinct from trim(p_worker_id)
    or v_job.lease_expires_at <= now() then
    raise exception using errcode = '55000', message = 'compile job lease is not owned by worker';
  end if;

  select r.id, v.id into v_release_id, v_definition_version_id
  from public.estimate_definition_release r
  join public.estimate_definition_version v on v.release_id = r.id and v.catalog_id = v_job.catalog_id
  where r.status = 'active';
  if v_definition_version_id is null then
    raise exception using errcode = '22023', message = 'active definition not found';
  end if;

  v_row_count := jsonb_array_length(p_rows);
  if v_row_count <> coalesce((p_revision ->> 'rowCount')::integer, -1) then
    raise exception using errcode = '22023', message = 'revision row count mismatch';
  end if;
  if v_job.operation <> 'legacy_revision_migration' and exists (
    select 1
    from jsonb_to_recordset(p_rows) x(resource_spec_id uuid)
    left join public.estimate_resource_spec s on s.id = x.resource_spec_id
    where s.id is null or s.definition_version_id <> v_definition_version_id
  ) then
    raise exception using errcode = '22023', message = 'revision row is outside active definition';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_job.owner_user_id::text || ':' || v_job.catalog_id, 0));
  select coalesce(max(r.revision_number), 0) + 1 into v_revision_number
  from public.estimate_revision r
  where r.owner_user_id = v_job.owner_user_id and r.catalog_id = v_job.catalog_id;

  insert into public.estimate_revision (
    id, parent_revision_id, organization_id, owner_user_id, release_id, catalog_id,
    revision_number, status, input_parameters, price_snapshot_ids, currency_code,
    totals, row_count, checksum_sha256, compiler_version, migration_source
  ) values (
    v_revision_id, v_job.parent_revision_id, v_job.organization_id, v_job.owner_user_id,
    v_release_id, v_job.catalog_id, v_revision_number, 'ready',
    coalesce(v_job.input_payload -> 'parameters', '{}'::jsonb),
    coalesce(array(select jsonb_array_elements_text(v_job.input_payload -> 'priceSnapshotIds')::uuid), '{}'),
    p_revision ->> 'currencyCode', p_revision -> 'totals', v_row_count,
    p_revision ->> 'checksumSha256', p_revision ->> 'compilerVersion',
    nullif(p_revision -> 'migrationSource', 'null'::jsonb)
  );

  insert into public.estimate_revision_row (
    revision_id, row_id, ordinal, resource_spec_id, section, category, title_ru,
    unit_id, quantity, unit_price, amount, currency_code, procurement_eligible,
    calculation_trace, normative_trace, legacy_row_payload, row_sha256
  )
  select v_revision_id, x.row_id, x.ordinal, x.resource_spec_id, x.section, x.category,
    x.title_ru, x.unit_id, x.quantity, x.unit_price, x.amount, x.currency_code,
    x.procurement_eligible, x.calculation_trace, x.normative_trace, x.legacy_row_payload, x.row_sha256
  from jsonb_to_recordset(p_rows) x(
    row_id text, ordinal integer, resource_spec_id uuid, section text, category text,
    title_ru text, unit_id text, quantity numeric, unit_price numeric, amount numeric,
    currency_code text, procurement_eligible boolean, calculation_trace jsonb,
    normative_trace jsonb, legacy_row_payload jsonb, row_sha256 text
  );

  insert into public.estimate_revision_row_price (
    revision_id, row_id, price_snapshot_id, route_id, unit_price, currency_code, resolution_trace
  )
  select v_revision_id, x.row_id, x.price_snapshot_id, x.price_route_id, x.unit_price,
    x.currency_code, coalesce(x.price_resolution_trace, '{}'::jsonb)
  from jsonb_to_recordset(p_rows) x(
    row_id text, price_snapshot_id uuid, price_route_id uuid, unit_price numeric,
    currency_code text, price_resolution_trace jsonb
  )
  where x.unit_price is not null;

  update public.estimate_compile_job
  set status = 'succeeded', stage = 'complete', progress = 100,
      result_revision_id = v_revision_id, completed_at = now(), updated_at = now(),
      lease_owner = null, lease_expires_at = null, error_code = null, error_detail = null
  where id = p_job_id;

  if v_job.operation = 'legacy_revision_migration' then
    update public.estimate_legacy_revision_import
    set status = 'succeeded', revision_id = v_revision_id, completed_at = now()
    where job_id = p_job_id;
  end if;

  return v_revision_id;
end;
$$;

create or replace function public.estimate_commit_artifact_job_v1(
  p_job_id uuid,
  p_worker_id text,
  p_artifact jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.estimate_compile_job%rowtype;
  v_artifact_id uuid;
begin
  if current_user not in ('postgres', 'service_role') then
    raise exception using errcode = '42501', message = 'worker role required';
  end if;
  if jsonb_typeof(p_artifact) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid artifact commit payload';
  end if;
  select * into v_job from public.estimate_compile_job where id = p_job_id for update;
  if v_job.id is null or v_job.operation not in ('pdf', 'procurement') then
    raise exception using errcode = '22023', message = 'artifact job not found';
  end if;
  if v_job.status <> 'running' or v_job.lease_owner is distinct from trim(p_worker_id)
    or v_job.lease_expires_at <= now() then
    raise exception using errcode = '55000', message = 'artifact job lease is not owned by worker';
  end if;
  if p_artifact ->> 'kind' <> v_job.operation
    or p_artifact ->> 'sha256' !~ '^[0-9a-f]{64}$'
    or coalesce((p_artifact ->> 'byteSize')::bigint, -1) < 0
    or nullif(p_artifact ->> 'storageBucket', '') is null
    or nullif(p_artifact ->> 'storageKey', '') is null then
    raise exception using errcode = '22023', message = 'artifact result is incomplete';
  end if;

  update public.estimate_revision_artifact
  set status = 'ready', storage_bucket = p_artifact ->> 'storageBucket',
      storage_key = p_artifact ->> 'storageKey', content_type = p_artifact ->> 'contentType',
      byte_size = (p_artifact ->> 'byteSize')::bigint, sha256 = p_artifact ->> 'sha256',
      metadata = coalesce(p_artifact -> 'metadata', '{}'::jsonb), error_code = null,
      ready_at = now(), updated_at = now()
  where revision_id = v_job.parent_revision_id and artifact_kind = v_job.operation
  returning id into v_artifact_id;
  if v_artifact_id is null then
    raise exception using errcode = 'P0002', message = 'artifact record not found';
  end if;

  update public.estimate_compile_job
  set status = 'succeeded', stage = 'complete', progress = 100,
      completed_at = now(), updated_at = now(), lease_owner = null,
      lease_expires_at = null, error_code = null, error_detail = null
  where id = p_job_id;
  return v_artifact_id;
end;
$$;

create or replace function public.estimate_fail_compile_job_v1(
  p_job_id uuid,
  p_worker_id text,
  p_error_code text,
  p_error_detail jsonb,
  p_retry_delay_seconds integer default 5
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.estimate_compile_job%rowtype;
  v_next_status text;
begin
  if current_user not in ('postgres', 'service_role') then
    raise exception using errcode = '42501', message = 'worker role required';
  end if;
  select * into v_job from public.estimate_compile_job where id = p_job_id for update;
  if v_job.status <> 'running' or v_job.lease_owner is distinct from trim(p_worker_id) then
    raise exception using errcode = '55000', message = 'compile job lease is not owned by worker';
  end if;
  v_next_status := case when v_job.attempt < v_job.max_attempts then 'retry_wait' else 'failed' end;
  update public.estimate_compile_job
  set status = v_next_status,
      stage = case when v_next_status = 'failed' then 'failed' else 'retry_wait' end,
      available_at = case when v_next_status = 'retry_wait'
        then now() + make_interval(secs => greatest(1, least(p_retry_delay_seconds, 3600))) else available_at end,
      error_code = left(coalesce(nullif(trim(p_error_code), ''), 'COMPILER_FAILED'), 100),
      error_detail = coalesce(p_error_detail, '{}'::jsonb),
      completed_at = case when v_next_status = 'failed' then now() else null end,
      lease_owner = null, lease_expires_at = null, updated_at = now()
  where id = p_job_id;
  if v_job.operation = 'legacy_revision_migration' then
    update public.estimate_legacy_revision_import
    set status = case when v_next_status = 'failed' then 'failed' else 'queued' end,
        completed_at = case when v_next_status = 'failed' then now() else null end
    where job_id = p_job_id;
  elsif v_job.operation in ('pdf', 'procurement') then
    update public.estimate_revision_artifact
    set status = case when v_next_status = 'failed' then 'failed' else 'queued' end,
        error_code = left(coalesce(nullif(trim(p_error_code), ''), 'ARTIFACT_FAILED'), 100),
        updated_at = now()
    where revision_id = v_job.parent_revision_id and artifact_kind = v_job.operation;
  end if;
  return v_next_status;
end;
$$;

create or replace function public.estimate_record_migration_event_v1(
  p_event_key text,
  p_catalog_id text,
  p_payload jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare v_id bigint;
begin
  if current_user not in ('postgres', 'service_role') then
    raise exception using errcode = '42501', message = 'migration role required';
  end if;
  insert into public.estimate_program_event (
    event_kind, event_key, catalog_id, denominator_delta, queue_delta, payload
  ) values (
    'migration', p_event_key, p_catalog_id, 0, 0, coalesce(p_payload, '{}'::jsonb)
  )
  on conflict (event_key) do update set event_key = excluded.event_key
  returning id into v_id;
  return v_id;
end;
$$;

alter table public.estimate_definition_release enable row level security;
alter table public.estimate_work_identity enable row level security;
alter table public.estimate_definition_version enable row level security;
alter table public.estimate_parameter_definition enable row level security;
alter table public.estimate_formula_graph enable row level security;
alter table public.estimate_resource_spec enable row level security;
alter table public.estimate_normative_source enable row level security;
alter table public.estimate_normative_locator enable row level security;
alter table public.estimate_work_normative_binding enable row level security;
alter table public.estimate_price_route enable row level security;
alter table public.estimate_resource_price_route_binding enable row level security;
alter table public.estimate_price_snapshot enable row level security;
alter table public.estimate_price_snapshot_item enable row level security;
alter table public.estimate_revision enable row level security;
alter table public.estimate_revision_row enable row level security;
alter table public.estimate_revision_row_price enable row level security;
alter table public.estimate_revision_artifact enable row level security;
alter table public.estimate_legacy_revision_import enable row level security;
alter table public.estimate_compile_job enable row level security;
alter table public.estimate_program_control_state enable row level security;
alter table public.estimate_program_event enable row level security;
alter table public.estimate_migration_import enable row level security;

create policy estimate_release_published_read_v1 on public.estimate_definition_release
  for select to authenticated using (status in ('active', 'retired'));
create policy estimate_work_identity_read_v1 on public.estimate_work_identity
  for select to authenticated using (retired_at is null);
create policy estimate_definition_version_read_v1 on public.estimate_definition_version
  for select to authenticated using (exists (
    select 1 from public.estimate_definition_release r where r.id = release_id and r.status in ('active', 'retired')
  ));
create policy estimate_parameter_definition_read_v1 on public.estimate_parameter_definition
  for select to authenticated using (exists (
    select 1 from public.estimate_definition_version v
    join public.estimate_definition_release r on r.id = v.release_id
    where v.id = definition_version_id and r.status in ('active', 'retired')
  ));
create policy estimate_formula_graph_backend_only_v1 on public.estimate_formula_graph
  for select to authenticated using (false);
create policy estimate_resource_spec_backend_only_v1 on public.estimate_resource_spec
  for select to authenticated using (false);
create policy estimate_normative_source_read_v1 on public.estimate_normative_source
  for select to authenticated using (true);
create policy estimate_normative_locator_read_v1 on public.estimate_normative_locator
  for select to authenticated using (true);
create policy estimate_work_normative_binding_backend_only_v1 on public.estimate_work_normative_binding
  for select to authenticated using (false);
create policy estimate_price_route_read_v1 on public.estimate_price_route
  for select to authenticated using (active);
create policy estimate_resource_price_route_binding_backend_only_v1 on public.estimate_resource_price_route_binding
  for select to authenticated using (false);
create policy estimate_price_snapshot_backend_only_v1 on public.estimate_price_snapshot
  for select to authenticated using (false);
create policy estimate_price_snapshot_item_backend_only_v1 on public.estimate_price_snapshot_item
  for select to authenticated using (false);
create policy estimate_revision_scope_v1 on public.estimate_revision
  for select to authenticated using (
    owner_user_id = auth.uid() or public.rls_current_user_company_member_v1(organization_id)
  );
create policy estimate_revision_row_scope_v1 on public.estimate_revision_row
  for select to authenticated using (public.estimate_revision_visible_v1(revision_id));
create policy estimate_revision_row_price_scope_v1 on public.estimate_revision_row_price
  for select to authenticated using (public.estimate_revision_visible_v1(revision_id));
create policy estimate_revision_artifact_scope_v1 on public.estimate_revision_artifact
  for select to authenticated using (public.estimate_revision_visible_v1(revision_id));
create policy estimate_legacy_revision_import_scope_v1 on public.estimate_legacy_revision_import
  for select to authenticated using (
    owner_user_id = auth.uid() or public.rls_current_user_company_member_v1(organization_id)
  );
create policy estimate_compile_job_scope_v1 on public.estimate_compile_job
  for select to authenticated using (
    owner_user_id = auth.uid() or public.rls_current_user_company_member_v1(organization_id)
  );

grant select on table
  public.estimate_definition_release,
  public.estimate_work_identity,
  public.estimate_definition_version,
  public.estimate_parameter_definition,
  public.estimate_normative_source,
  public.estimate_normative_locator,
  public.estimate_price_route,
  public.estimate_revision,
  public.estimate_revision_row,
  public.estimate_revision_row_price,
  public.estimate_revision_artifact,
  public.estimate_legacy_revision_import,
  public.estimate_compile_job
to authenticated;
grant all on table
  public.estimate_definition_release,
  public.estimate_work_identity,
  public.estimate_definition_version,
  public.estimate_parameter_definition,
  public.estimate_formula_graph,
  public.estimate_resource_spec,
  public.estimate_normative_source,
  public.estimate_normative_locator,
  public.estimate_work_normative_binding,
  public.estimate_price_route,
  public.estimate_resource_price_route_binding,
  public.estimate_price_snapshot,
  public.estimate_price_snapshot_item,
  public.estimate_revision,
  public.estimate_revision_row,
  public.estimate_revision_row_price,
  public.estimate_revision_artifact,
  public.estimate_legacy_revision_import,
  public.estimate_compile_job,
  public.estimate_program_control_state,
  public.estimate_program_event,
  public.estimate_migration_import
to service_role;
grant usage, select on sequence public.estimate_program_event_id_seq to service_role;

revoke all on function public.estimate_create_compile_job_v1(text, text, text, uuid, uuid, jsonb) from public;
revoke all on function public.estimate_create_legacy_revision_job_v1(text, text, uuid, text, text, text, uuid, jsonb) from public;
revoke all on function public.estimate_create_artifact_job_v1(text, uuid, text) from public;
revoke all on function public.estimate_claim_compile_jobs_v1(text, integer, integer) from public;
revoke all on function public.estimate_cancel_compile_job_v1(uuid) from public;
revoke all on function public.estimate_commit_compile_job_v1(uuid, text, jsonb, jsonb) from public;
revoke all on function public.estimate_commit_artifact_job_v1(uuid, text, jsonb) from public;
revoke all on function public.estimate_fail_compile_job_v1(uuid, text, text, jsonb, integer) from public;
revoke all on function public.estimate_record_migration_event_v1(text, text, jsonb) from public;
revoke all on table public.estimate_program_control_state from anon, authenticated;
revoke all on table public.estimate_program_event from anon, authenticated;
revoke all on table public.estimate_migration_import from anon, authenticated;
grant execute on function public.estimate_create_compile_job_v1(text, text, text, uuid, uuid, jsonb) to authenticated;
grant execute on function public.estimate_create_legacy_revision_job_v1(text, text, uuid, text, text, text, uuid, jsonb) to authenticated;
grant execute on function public.estimate_create_artifact_job_v1(text, uuid, text) to authenticated;
grant execute on function public.estimate_cancel_compile_job_v1(uuid) to authenticated;
grant execute on function public.estimate_claim_compile_jobs_v1(text, integer, integer) to service_role;
grant execute on function public.estimate_commit_compile_job_v1(uuid, text, jsonb, jsonb) to service_role;
grant execute on function public.estimate_commit_artifact_job_v1(uuid, text, jsonb) to service_role;
grant execute on function public.estimate_fail_compile_job_v1(uuid, text, text, jsonb, integer) to service_role;
grant execute on function public.estimate_record_migration_event_v1(text, text, jsonb) to service_role;

comment on table public.estimate_formula_graph is 'Backend-only executable AST. Expression text is retained solely for traceability; it is never evaluated directly.';
comment on table public.estimate_program_event is 'Migration events are constrained to zero denominator and queue deltas.';
comment on table public.estimate_revision is 'Immutable canonical estimate revision. Recalculation inserts a child revision.';

commit;
