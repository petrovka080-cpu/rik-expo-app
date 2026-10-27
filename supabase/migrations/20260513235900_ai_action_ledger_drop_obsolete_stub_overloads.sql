-- S_AI_MAGIC_09_APPROVAL_LEDGER_LIVE_ACTION_E2E
-- Canonical closeout for obsolete action-ledger contract stub overloads.
-- Bounded forward-fix only: no table drops, no data DML, no live function recreation.

begin;

drop function if exists public.ai_action_ledger_submit_for_approval_v1(
  uuid,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb,
  text,
  timestamptz,
  text
);

drop function if exists public.ai_action_ledger_get_status_v1(uuid);

drop function if exists public.ai_action_ledger_approve_v1(uuid, text);

drop function if exists public.ai_action_ledger_execute_approved_v1(uuid, text);

notify pgrst, 'reload schema';

commit;
