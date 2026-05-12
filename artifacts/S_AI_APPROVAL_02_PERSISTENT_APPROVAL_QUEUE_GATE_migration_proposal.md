# S_AI_APPROVAL_02 Persistent Approval Queue Migration Proposal

PROPOSAL ONLY - do not run automatically, do not apply to production from this wave.

Required storage shape for a future green wave:

```sql
create table if not exists public.agent_action_approvals (
  id uuid primary key default gen_random_uuid(),
  action_id text not null,
  action_type text not null,
  status text not null check (status in ('pending', 'approved', 'rejected', 'expired', 'executed', 'blocked')),
  risk_level text not null check (risk_level = 'approval_required'),
  screen_id text not null,
  domain text not null,
  requested_by_role text not null,
  requested_by_user_id_hash text,
  organization_id_hash text,
  summary text not null,
  redacted_payload jsonb not null,
  evidence_refs text[] not null default array[]::text[],
  idempotency_key text not null,
  audit_event text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  decided_at timestamptz,
  decided_by_user_id_hash text,
  decision_reason text,
  executed_at timestamptz,
  execution_audit_event text,
  constraint ux_agent_action_approvals_action_id unique (action_id),
  constraint ux_agent_action_approvals_idempotency_key unique (idempotency_key)
);
```

Future BFF requirements:
- `POST /agent/action/submit-for-approval` inserts `pending` only with `idempotency_key` and `audit_event`.
- `GET /agent/action/:id/status` reads the redacted status envelope only.
- `POST /agent/action/:id/approve` transitions `pending` to `approved` with audit.
- `POST /agent/action/:id/reject` transitions `pending` to `rejected` with audit.
- `pending`, `rejected`, `expired`, and `blocked` cannot execute.
- Execution requires `approved`, non-expired status, idempotency key, and audit event.

This proposal intentionally avoids changing `supabase/migrations` in W13.
