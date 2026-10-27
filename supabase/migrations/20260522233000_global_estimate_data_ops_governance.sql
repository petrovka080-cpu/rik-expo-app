create table if not exists public.global_estimate_data_versions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_key text not null,
  entity_id uuid null,
  version_number int not null,
  status text not null check (status in ('draft', 'pending_review', 'approved', 'archived', 'rejected')),
  payload jsonb not null,
  created_by uuid null references auth.users(id) on delete set null,
  approved_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  approved_at timestamptz null,
  active boolean not null default false
);

create table if not exists public.global_estimate_data_change_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_key text not null,
  entity_id uuid null,
  action text not null,
  before_payload jsonb null,
  after_payload jsonb null,
  actor_id uuid null references auth.users(id) on delete set null,
  reason text null,
  created_at timestamptz not null default now()
);

create table if not exists public.global_estimate_data_approval_queue (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_key text not null,
  entity_id uuid null,
  proposed_payload jsonb not null,
  status text not null check (status in ('pending', 'approved', 'rejected')),
  requested_by uuid null references auth.users(id) on delete set null,
  reviewed_by uuid null references auth.users(id) on delete set null,
  review_note text null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz null
);

create index if not exists idx_global_estimate_data_versions_lookup
  on public.global_estimate_data_versions (entity_type, entity_key, status, active, version_number desc);

create index if not exists idx_global_estimate_data_change_log_lookup
  on public.global_estimate_data_change_log (entity_type, entity_key, created_at desc);

create index if not exists idx_global_estimate_data_approval_queue_status
  on public.global_estimate_data_approval_queue (status, created_at desc);

alter table public.global_estimate_data_versions enable row level security;
alter table public.global_estimate_data_change_log enable row level security;
alter table public.global_estimate_data_approval_queue enable row level security;
