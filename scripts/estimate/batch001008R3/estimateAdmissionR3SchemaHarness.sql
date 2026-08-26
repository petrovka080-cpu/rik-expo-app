create role anon nologin;
create role authenticated nologin;
create role service_role nologin;

create table public.estimate_definition_release (
  id uuid primary key,
  status text not null,
  activated_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.estimate_search_index_release (
  id uuid primary key,
  status text not null
);

create table public.estimate_definition_version (
  id uuid primary key,
  release_id uuid not null references public.estimate_definition_release(id),
  catalog_id text not null,
  source_metadata jsonb not null default '{}'::jsonb
);

create table public.estimate_cumulative_manifest_entry (
  release_id uuid not null references public.estimate_definition_release(id),
  catalog_id text not null,
  definition_version_id uuid not null references public.estimate_definition_version(id),
  source_batch text not null,
  source_release_id uuid not null references public.estimate_definition_release(id),
  domain_id text not null,
  publication_state text not null check (publication_state in ('ACCEPTED_INHERITED','CANONICAL_SUCCESSOR')),
  approved_template_baseline_id uuid,
  baseline_ready boolean not null default false,
  scenario_ready boolean not null default false,
  definition_hash text not null,
  entry_sha256 text not null,
  created_at timestamptz not null default now(),
  primary key(release_id,catalog_id)
);

create table public.estimate_revision (
  id uuid primary key,
  release_id uuid not null references public.estimate_definition_release(id),
  catalog_id text not null,
  definition_version_id uuid not null references public.estimate_definition_version(id)
);

create table public.estimate_search_document (
  search_release_id uuid not null references public.estimate_search_index_release(id),
  catalog_id text not null,
  definition_version_id uuid references public.estimate_definition_version(id),
  adjudication_class text not null,
  selectable boolean not null default false,
  canonical_target_catalog_id text,
  replacement_catalog_id text,
  primary key(search_release_id,catalog_id)
);

create table public.estimate_compile_job (
  id uuid primary key default gen_random_uuid(),
  operation text not null,
  parent_revision_id uuid,
  target_release_id uuid,
  catalog_id text not null,
  organization_id uuid,
  input_payload jsonb not null default '{}'::jsonb
);
