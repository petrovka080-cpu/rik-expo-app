-- S_AI_APPROVAL_09_LEDGER_MIGRATION_APPLY_PACKAGE
-- Additive only. Apply only after explicit migration approval flags are present.
-- Forward-fix plan: ship another additive migration that replaces functions or adds policies.
-- Rollback plan: disable callers by env/config and leave additive schema objects inert.
-- Verify query: select public.ai_action_ledger_verify_apply_v1();

begin;

alter table public.ai_action_ledger
  add column if not exists requested_role text not null default 'unknown';

alter table public.ai_action_ledger
  add column if not exists requested_by_user_id_hash text not null default '';

alter table public.ai_action_ledger
  add column if not exists organization_id_hash text not null default '';

alter table public.ai_action_ledger
  add column if not exists approved_by_user_id_hash text null;

create index if not exists ai_action_ledger_org_hash_status_created_idx
on public.ai_action_ledger (organization_id_hash, status, created_at desc);

create index if not exists ai_action_ledger_status_expires_idx
on public.ai_action_ledger (status, expires_at);

grant update (status, approved_by, approved_by_user_id_hash, executed_at, redacted_payload, updated_at)
on table public.ai_action_ledger to authenticated;

create or replace function public.ai_action_ledger_lifecycle_guard_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.status = old.status then
    return new;
  end if;

  if old.status = 'pending' and new.status in ('approved', 'rejected', 'expired') then
    null;
  elsif old.status = 'approved' and new.status in ('executed', 'expired') then
    null;
  else
    raise exception 'ai_action_ledger: status transition is blocked';
  end if;

  if not public.ai_action_ledger_actor_can_manage_company_v1(old.organization_id) then
    raise exception 'ai_action_ledger: approval actor is outside company management scope';
  end if;

  if new.status = 'executed' and (
    new.executed_at is null
    or not public.ai_action_ledger_no_raw_payload_v1(new.redacted_payload)
  ) then
    raise exception 'ai_action_ledger: executed transition requires executed_at and redacted payload';
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'ai_action_ledger_updated_at_trigger'
  ) then
    execute 'create trigger ai_action_ledger_updated_at_trigger before update on public.ai_action_ledger for each row execute function public.ai_action_ledger_updated_at_v1()';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'ai_action_ledger_lifecycle_guard_trigger'
  ) then
    execute 'create trigger ai_action_ledger_lifecycle_guard_trigger before update on public.ai_action_ledger for each row execute function public.ai_action_ledger_lifecycle_guard_v1()';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_action_ledger'
      and policyname = 'ai_action_ledger_update_executed_company_scope'
  ) then
    execute 'create policy ai_action_ledger_update_executed_company_scope on public.ai_action_ledger for update to authenticated using (public.ai_action_ledger_actor_can_manage_company_v1(organization_id) and status = ''approved'') with check (public.ai_action_ledger_actor_can_manage_company_v1(organization_id) and status = ''executed'' and executed_at is not null and jsonb_typeof(evidence_refs) = ''array'' and jsonb_array_length(evidence_refs) between 1 and 20 and public.ai_action_ledger_no_raw_payload_v1(redacted_payload))';
  end if;
end;
$$;

create or replace function public.ai_action_ledger_to_safe_json_v1(p_action public.ai_action_ledger)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'actionId', p_action.id,
    'actionType', p_action.action_type,
    'status', p_action.status,
    'riskLevel', p_action.risk_level,
    'role', p_action.requested_role,
    'screenId', p_action.screen_id,
    'domain', p_action.domain,
    'summary', p_action.summary,
    'redactedPayload', coalesce(p_action.redacted_payload, '{}'::jsonb),
    'evidenceRefs', coalesce(p_action.evidence_refs, '[]'::jsonb),
    'idempotencyKey', p_action.idempotency_key,
    'requestedByUserIdHash', p_action.requested_by_user_id_hash,
    'organizationIdHash', p_action.organization_id_hash,
    'createdAt', p_action.created_at,
    'expiresAt', p_action.expires_at,
    'approvedByUserIdHash', p_action.approved_by_user_id_hash,
    'executedAt', p_action.executed_at,
    'requiresApproval', true,
    'finalExecution', false
  );
$$;

create or replace function public.ai_action_ledger_execute_approved_v1(
  p_action_id uuid,
  p_actor_role text,
  p_reason text default null,
  p_executed_at timestamptz default now(),
  p_redacted_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_action public.ai_action_ledger%rowtype;
begin
  update public.ai_action_ledger
  set
    status = 'executed',
    executed_at = coalesce(p_executed_at, now()),
    redacted_payload = coalesce(p_redacted_payload, '{}'::jsonb),
    updated_at = now()
  where id = p_action_id
    and status = 'approved'
    and public.ai_action_ledger_actor_can_manage_company_v1(organization_id)
    and public.ai_action_ledger_no_raw_payload_v1(coalesce(p_redacted_payload, '{}'::jsonb))
  returning * into v_action;

  if not found then
    return jsonb_build_object(
      'status', 'blocked',
      'actionId', p_action_id,
      'blocker', 'BLOCKED_DOMAIN_EXECUTOR_NOT_READY',
      'reason', 'AI action execution requires approved status, management scope, and redacted payload.',
      'finalExecution', false
    );
  end if;

  insert into public.ai_action_ledger_audit (
    action_id,
    organization_id,
    event_type,
    action_status,
    actor_user_id,
    actor_role,
    reason,
    evidence_refs,
    redacted_payload
  )
  values (
    v_action.id,
    v_action.organization_id,
    'ai.action.executed',
    v_action.status,
    auth.uid(),
    btrim(coalesce(p_actor_role, 'unknown')),
    btrim(coalesce(p_reason, 'AI action executed through approved executor gate.')),
    v_action.evidence_refs,
    '{}'::jsonb
  );

  return public.ai_action_ledger_to_safe_json_v1(v_action)
    || jsonb_build_object('finalExecution', false);
end;
$$;

revoke all on function public.ai_action_ledger_execute_approved_v1(uuid, text, text, timestamptz, jsonb) from public;
grant execute on function public.ai_action_ledger_execute_approved_v1(uuid, text, text, timestamptz, jsonb) to authenticated;

create or replace function public.ai_action_ledger_verify_apply_v1()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'status', 'GREEN_AI_ACTION_LEDGER_MIGRATION_APPLIED_AND_VERIFIED',
    'ledgerTablePresent', to_regclass('public.ai_action_ledger') is not null,
    'auditTablePresent', to_regclass('public.ai_action_ledger_audit') is not null,
    'executeApprovedRpcPresent', to_regprocedure('public.ai_action_ledger_execute_approved_v1(uuid,text,text,timestamp with time zone,jsonb)') is not null,
    'verifyQueryPresent', true,
    'rawRowsPrinted', false,
    'secretsPrinted', false
  );
$$;

revoke all on function public.ai_action_ledger_verify_apply_v1() from public;
grant execute on function public.ai_action_ledger_verify_apply_v1() to authenticated;

comment on function public.ai_action_ledger_execute_approved_v1(uuid, text, text, timestamptz, jsonb) is
  'Approved AI action executed-status mount. Bounded by approved status, management scope, redacted payload, audit, and idempotent gateway.';

comment on function public.ai_action_ledger_verify_apply_v1() is
  'Redacted verification query for S_AI_APPROVAL_09_LEDGER_MIGRATION_APPLY_PACKAGE.';

notify pgrst, 'reload schema';

commit;
