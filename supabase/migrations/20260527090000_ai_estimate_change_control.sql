create table if not exists public.ai_estimate_config_changes (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  entity_version text not null,
  status text not null check (status in ('draft', 'validated', 'approved', 'active', 'archived', 'rolled_back')),
  old_payload jsonb,
  new_payload jsonb not null,
  diff_summary jsonb not null default '{}'::jsonb,
  impact_scope jsonb not null default '{}'::jsonb,
  actor_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_estimate_config_validation_runs (
  id uuid primary key default gen_random_uuid(),
  change_id uuid not null references public.ai_estimate_config_changes(id) on delete cascade,
  validation_type text not null,
  status text not null check (status in ('passed', 'failed')),
  input_payload jsonb not null default '{}'::jsonb,
  result_payload jsonb not null default '{}'::jsonb,
  artifacts jsonb not null default '[]'::jsonb,
  failures jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.ai_estimate_config_approvals (
  id uuid primary key default gen_random_uuid(),
  change_id uuid not null references public.ai_estimate_config_changes(id) on delete cascade,
  approved_by text not null,
  approval_status text not null check (approval_status in ('approved', 'rejected')),
  approval_comment text,
  approved_at timestamptz not null default now()
);

create table if not exists public.ai_estimate_config_rollback_events (
  id uuid primary key default gen_random_uuid(),
  change_id uuid not null references public.ai_estimate_config_changes(id) on delete cascade,
  rolled_back_by text not null,
  rollback_to_change_id uuid references public.ai_estimate_config_changes(id),
  rollback_reason text not null,
  rollback_result jsonb not null default '{}'::jsonb,
  rolled_back_at timestamptz not null default now()
);

create table if not exists public.ai_estimate_config_active_versions (
  entity_type text not null,
  entity_id text not null,
  active_change_id uuid not null references public.ai_estimate_config_changes(id),
  active_version text not null,
  activated_at timestamptz not null default now(),
  activated_by text not null,
  primary key (entity_type, entity_id)
);

create index if not exists ai_estimate_config_changes_entity_idx
  on public.ai_estimate_config_changes (entity_type, entity_id, entity_version);

create index if not exists ai_estimate_config_changes_status_idx
  on public.ai_estimate_config_changes (status);

create index if not exists ai_estimate_config_validation_change_idx
  on public.ai_estimate_config_validation_runs (change_id, status);

create index if not exists ai_estimate_config_approval_change_idx
  on public.ai_estimate_config_approvals (change_id, approval_status);

create index if not exists ai_estimate_config_rollback_change_idx
  on public.ai_estimate_config_rollback_events (change_id);
