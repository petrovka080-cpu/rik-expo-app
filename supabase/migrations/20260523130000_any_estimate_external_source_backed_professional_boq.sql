create table if not exists public.global_external_source_connectors (
  id text primary key,
  source_type text not null,
  label text not null,
  base_url text,
  country_code text,
  enabled boolean not null default true,
  approval_required boolean not null default true,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.global_external_source_runs (
  id text primary key,
  connector_id text not null references public.global_external_source_connectors(id),
  status text not null check (status in ('queued', 'running', 'succeeded', 'failed')),
  started_at timestamptz,
  finished_at timestamptz,
  checked_at timestamptz not null default now(),
  error_message text,
  payload jsonb not null default '{}'::jsonb
);

create table if not exists public.global_external_price_observations (
  id text primary key,
  source_run_id text not null references public.global_external_source_runs(id),
  connector_id text not null references public.global_external_source_connectors(id),
  observed_kind text not null check (observed_kind in ('material', 'labor', 'tax', 'equipment', 'delivery')),
  raw_name text not null,
  normalized_key text not null,
  country_code text,
  state_or_region text,
  city text,
  raw_unit text,
  normalized_unit text,
  currency text not null,
  price_value numeric,
  price_min numeric,
  price_max numeric,
  source_url text,
  source_label text not null,
  observed_at timestamptz not null default now(),
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  payload jsonb not null default '{}'::jsonb
);

create table if not exists public.global_external_rate_candidates (
  id text primary key,
  observation_id text not null references public.global_external_price_observations(id),
  rate_kind text not null,
  rate_key text not null,
  country_code text,
  state_or_region text,
  city text,
  unit text not null,
  currency text not null,
  price_min numeric,
  price_max numeric,
  price_default numeric,
  match_confidence text not null check (match_confidence in ('high', 'medium', 'low')),
  source_quality numeric not null default 0,
  status text not null check (status in ('pending', 'approved', 'rejected', 'archived')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_id uuid,
  payload jsonb not null default '{}'::jsonb
);

create table if not exists public.global_rate_source_links (
  id text primary key,
  rate_table text not null,
  rate_id text not null,
  source_observation_id text not null references public.global_external_price_observations(id),
  source_run_id text not null references public.global_external_source_runs(id),
  connector_id text not null references public.global_external_source_connectors(id),
  source_label text not null,
  source_url text,
  checked_at timestamptz not null,
  freshness text not null check (freshness in ('fresh', 'aging', 'stale', 'expired', 'unknown')),
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  created_at timestamptz not null default now()
);

create table if not exists public.global_estimate_row_source_evidence (
  id text primary key,
  estimate_id text,
  row_number text not null,
  row_code text not null,
  rate_table text not null,
  rate_id text not null,
  source_link_id text references public.global_rate_source_links(id),
  source_id text not null,
  source_type text not null,
  source_label text not null,
  source_url text,
  checked_at timestamptz not null,
  freshness text not null check (freshness in ('fresh', 'aging', 'stale', 'expired', 'unknown')),
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  created_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

create table if not exists public.global_source_refresh_queue (
  id text primary key,
  connector_id text references public.global_external_source_connectors(id),
  rate_key text not null,
  country_code text,
  state_or_region text,
  city text,
  reason text not null,
  status text not null check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  priority integer not null default 100,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  payload jsonb not null default '{}'::jsonb
);

create table if not exists public.global_source_quality_scores (
  id text primary key,
  connector_id text not null references public.global_external_source_connectors(id),
  source_label text not null,
  score numeric not null,
  freshness text not null check (freshness in ('fresh', 'aging', 'stale', 'expired', 'unknown')),
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  checked_at timestamptz not null,
  payload jsonb not null default '{}'::jsonb
);

create table if not exists public.global_work_type_template_gaps (
  id text primary key,
  original_text text not null,
  detected_category text,
  suggested_work_key text,
  language text not null,
  status text not null default 'queued' check (status in ('queued', 'reviewing', 'resolved', 'rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  payload jsonb not null default '{}'::jsonb
);

create table if not exists public.global_estimate_intent_rules (
  id text primary key,
  language text not null,
  rule_kind text not null,
  pattern text not null,
  priority integer not null default 100,
  enabled boolean not null default true,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.global_estimate_category_fallback_templates (
  id text primary key,
  category text not null,
  fallback_work_key text not null,
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  enabled boolean not null default true,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists global_external_price_observations_lookup_idx
  on public.global_external_price_observations (normalized_key, country_code, state_or_region, city);

create index if not exists global_external_rate_candidates_status_idx
  on public.global_external_rate_candidates (status, rate_key, country_code);

create index if not exists global_rate_source_links_rate_idx
  on public.global_rate_source_links (rate_table, rate_id);

create index if not exists global_source_refresh_queue_status_idx
  on public.global_source_refresh_queue (status, priority, created_at);
