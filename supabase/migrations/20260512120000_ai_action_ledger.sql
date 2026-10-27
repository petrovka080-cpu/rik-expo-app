-- S_AI_MAGIC_06_PERSISTENT_APPROVAL_ACTION_LEDGER
-- Additive schema proposal only. Do not apply to production without an explicit migration approval gate.

create table if not exists public.ai_action_ledger (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  requested_by uuid not null,
  approved_by uuid null,

  action_type text not null,
  status text not null,
  risk_level text not null,
  screen_id text not null,
  domain text not null,

  summary text not null,
  redacted_payload jsonb not null default '{}'::jsonb,
  evidence_refs jsonb not null default '[]'::jsonb,

  idempotency_key text not null,
  expires_at timestamptz not null,
  executed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ai_action_ledger_status_check check (
    status in ('draft', 'pending', 'approved', 'rejected', 'executed', 'expired', 'blocked')
  ),
  constraint ai_action_ledger_risk_level_check check (
    risk_level in ('safe_read', 'draft_only', 'approval_required', 'forbidden')
  ),
  constraint ai_action_ledger_payload_object_check check (jsonb_typeof(redacted_payload) = 'object'),
  constraint ai_action_ledger_evidence_array_check check (jsonb_typeof(evidence_refs) = 'array'),
  unique (organization_id, idempotency_key)
);

create index if not exists ai_action_ledger_org_status_created_idx
on public.ai_action_ledger (organization_id, status, created_at desc);

create index if not exists ai_action_ledger_requested_by_status_idx
on public.ai_action_ledger (requested_by, status, created_at desc);

comment on table public.ai_action_ledger is
  'Persistent AI approval/action ledger proposal. Additive only; requires explicit production migration approval before use.';
