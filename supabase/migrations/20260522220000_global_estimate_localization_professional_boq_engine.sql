create table if not exists public.global_work_types (
  id uuid primary key default gen_random_uuid(),
  work_key text not null unique,
  category text not null,
  names jsonb not null,
  default_measure_unit text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.global_work_aliases (
  id uuid primary key default gen_random_uuid(),
  work_key text not null references public.global_work_types(work_key) on delete cascade,
  language text not null,
  alias text not null,
  normalized_alias text not null,
  created_at timestamptz not null default now(),
  unique(language, normalized_alias)
);

create table if not exists public.global_estimate_templates (
  id uuid primary key default gen_random_uuid(),
  work_key text not null references public.global_work_types(work_key) on delete cascade,
  country_code varchar(2) null,
  unit_system text not null check (unit_system in ('metric', 'imperial', 'mixed')),
  template jsonb not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.global_estimate_template_rows (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.global_estimate_templates(id) on delete cascade,
  work_key text not null,
  section_type text not null check (section_type in ('materials', 'labor', 'equipment', 'delivery', 'tax')),
  section_number text not null,
  row_number text not null,
  code text not null,
  names jsonb not null,
  quantity_formula text not null,
  unit_metric text not null,
  unit_imperial text null,
  rate_key text not null,
  required boolean not null default true,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.global_rate_materials (
  id uuid primary key default gen_random_uuid(),
  material_key text not null,
  names jsonb not null default '{}'::jsonb,
  country_code varchar(2) not null,
  state_or_region text null,
  county text null,
  city text null,
  postal_code text null,
  unit text not null,
  price_min numeric not null,
  price_max numeric not null,
  price_default numeric not null,
  currency varchar(3) not null,
  price_tier text not null default 'standard'
    check (price_tier in ('budget', 'standard', 'premium')),
  source_type text not null
    check (source_type in (
      'internal_marketplace',
      'external_marketplace',
      'configured_reference',
      'manual_admin_rate'
    )),
  source_label text not null,
  source_url text null,
  effective_from date not null default current_date,
  effective_to date null,
  checked_at timestamptz not null default now(),
  active boolean not null default true
);

create table if not exists public.global_rate_works (
  id uuid primary key default gen_random_uuid(),
  work_key text not null,
  country_code varchar(2) not null,
  state_or_region text null,
  county text null,
  city text null,
  postal_code text null,
  unit text not null,
  price_min numeric not null,
  price_max numeric not null,
  price_default numeric not null,
  currency varchar(3) not null,
  price_tier text not null default 'standard'
    check (price_tier in ('budget', 'standard', 'premium')),
  source_type text not null
    check (source_type in (
      'internal_marketplace',
      'external_marketplace',
      'configured_reference',
      'manual_admin_rate'
    )),
  source_label text not null,
  source_url text null,
  effective_from date not null default current_date,
  effective_to date null,
  checked_at timestamptz not null default now(),
  active boolean not null default true
);

create table if not exists public.global_tax_jurisdictions (
  id uuid primary key default gen_random_uuid(),
  country_code varchar(2) not null,
  state_or_region text null,
  county text null,
  city text null,
  postal_code text null,
  precision_level text not null
    check (precision_level in (
      'country',
      'state_or_region',
      'county',
      'city',
      'postal_code',
      'street_address'
    )),
  tax_mode text not null
    check (tax_mode in ('sales_tax', 'vat', 'gst', 'nds', 'no_tax', 'unknown')),
  label text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.global_tax_rules (
  id uuid primary key default gen_random_uuid(),
  country_code varchar(2) not null,
  state_or_region text null,
  county text null,
  city text null,
  postal_code text null,
  tax_type text not null
    check (tax_type in ('sales_tax', 'vat', 'gst', 'nds', 'none', 'unknown')),
  tax_label text not null,
  tax_rate numeric not null default 0,
  applies_to text not null default 'all'
    check (applies_to in ('materials', 'labor', 'equipment', 'delivery', 'all', 'none')),
  customer_type text not null default 'unknown'
    check (customer_type in ('b2c', 'b2b', 'unknown')),
  project_type text not null default 'unknown'
    check (project_type in ('residential', 'commercial', 'industrial', 'unknown')),
  included_in_price boolean not null default false,
  requires_precise_address boolean not null default false,
  source_type text not null default 'configured_reference'
    check (source_type in (
      'official_tax_source',
      'tax_provider',
      'configured_reference',
      'manual_admin_rate'
    )),
  source_label text not null,
  source_url text null,
  effective_from date not null default current_date,
  effective_to date null,
  checked_at timestamptz not null default now(),
  active boolean not null default true
);

create table if not exists public.global_unit_conversions (
  id uuid primary key default gen_random_uuid(),
  from_unit text not null,
  to_unit text not null,
  multiplier numeric not null,
  dimension text not null,
  active boolean not null default true,
  unique(from_unit, to_unit)
);

create table if not exists public.global_price_sources (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_label text not null,
  country_code varchar(2) null,
  url text null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.global_price_source_cache (
  id uuid primary key default gen_random_uuid(),
  source_id uuid null references public.global_price_sources(id) on delete set null,
  cache_key text not null unique,
  payload jsonb not null,
  checked_at timestamptz not null default now(),
  expires_at timestamptz null
);

create table if not exists public.global_estimate_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  work_key text not null,
  country_code varchar(2) not null,
  state_or_region text null,
  county text null,
  city text null,
  postal_code text null,
  language text not null,
  locale text not null,
  currency varchar(3) not null,
  unit_system text not null,
  input jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.global_estimate_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  estimate_snapshot_id uuid null references public.global_estimate_snapshots(id) on delete cascade,
  rating int null check (rating between 1 and 5),
  comment text null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_global_work_aliases_lookup
  on public.global_work_aliases (language, normalized_alias);

create index if not exists idx_global_estimate_templates_lookup
  on public.global_estimate_templates (work_key, unit_system, country_code, active);

create index if not exists idx_global_estimate_template_rows_lookup
  on public.global_estimate_template_rows (work_key, section_type, active, sort_order);

create index if not exists idx_global_rate_materials_lookup
  on public.global_rate_materials (
    material_key,
    country_code,
    state_or_region,
    county,
    city,
    postal_code,
    unit,
    active
  );

create index if not exists idx_global_rate_works_lookup
  on public.global_rate_works (
    work_key,
    country_code,
    state_or_region,
    county,
    city,
    postal_code,
    unit,
    active
  );

create index if not exists idx_global_tax_rules_lookup
  on public.global_tax_rules (
    country_code,
    state_or_region,
    county,
    city,
    postal_code,
    active
  );

create index if not exists idx_global_estimate_snapshots_user_created
  on public.global_estimate_snapshots (user_id, created_at desc);
