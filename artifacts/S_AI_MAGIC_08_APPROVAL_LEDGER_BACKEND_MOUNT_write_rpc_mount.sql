-- S_AI_MAGIC_08_APPROVAL_LEDGER_BACKEND_MOUNT_CONTRACT
-- Additive proposal only. Apply only after explicit migration approval.

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

grant update (status, approved_by, approved_by_user_id_hash, updated_at)
on table public.ai_action_ledger to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_action_ledger'
      and policyname = 'ai_action_ledger_update_approval_company_scope'
  ) then
    execute 'create policy ai_action_ledger_update_approval_company_scope on public.ai_action_ledger for update to authenticated using (public.ai_action_ledger_actor_can_manage_company_v1(organization_id) and status = ''pending'') with check (public.ai_action_ledger_actor_can_manage_company_v1(organization_id) and status in (''approved'', ''rejected'', ''expired'') and jsonb_typeof(evidence_refs) = ''array'' and jsonb_array_length(evidence_refs) between 1 and 20 and public.ai_action_ledger_no_raw_payload_v1(redacted_payload))';
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

create or replace function public.ai_action_ledger_submit_for_approval_v1(
  p_organization_id uuid,
  p_action_type text,
  p_risk_level text,
  p_screen_id text,
  p_domain text,
  p_summary text,
  p_redacted_payload jsonb,
  p_evidence_refs jsonb,
  p_idempotency_key text,
  p_expires_at timestamptz,
  p_actor_role text,
  p_requested_by_user_id_hash text,
  p_organization_id_hash text,
  p_audit_reason text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_action public.ai_action_ledger%rowtype;
  v_existing public.ai_action_ledger%rowtype;
  v_evidence_refs jsonb := coalesce(p_evidence_refs, '[]'::jsonb);
  v_evidence_count integer := 0;
begin
  if jsonb_typeof(v_evidence_refs) = 'array' then
    v_evidence_count := jsonb_array_length(v_evidence_refs);
  end if;

  if auth.uid() is null
    or not public.ai_action_ledger_actor_can_view_company_v1(p_organization_id)
    or jsonb_typeof(v_evidence_refs) <> 'array'
    or v_evidence_count < 1
    or v_evidence_count > 20
    or length(btrim(coalesce(p_idempotency_key, ''))) < 16
    or not public.ai_action_ledger_no_raw_payload_v1(coalesce(p_redacted_payload, '{}'::jsonb))
  then
    return jsonb_build_object(
      'status', 'blocked',
      'blocker', 'BLOCKED_APPROVAL_MIGRATION_NOT_APPROVED',
      'reason', 'AI action ledger write RPC scope, evidence, idempotency, or redaction check failed.',
      'finalExecution', false
    );
  end if;

  select *
    into v_existing
  from public.ai_action_ledger
  where organization_id = p_organization_id
    and idempotency_key = btrim(p_idempotency_key)
  limit 1;

  if found then
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
      v_existing.id,
      v_existing.organization_id,
      'ai.action.idempotency_reused',
      v_existing.status,
      auth.uid(),
      btrim(coalesce(p_actor_role, 'unknown')),
      'AI action ledger idempotency key reused; returning existing action.',
      v_existing.evidence_refs,
      '{}'::jsonb
    );

    return public.ai_action_ledger_to_safe_json_v1(v_existing)
      || jsonb_build_object('idempotencyReused', true, 'finalExecution', false);
  end if;

  insert into public.ai_action_ledger (
    organization_id,
    requested_by,
    action_type,
    status,
    risk_level,
    screen_id,
    domain,
    summary,
    redacted_payload,
    evidence_refs,
    idempotency_key,
    expires_at,
    requested_role,
    requested_by_user_id_hash,
    organization_id_hash
  )
  values (
    p_organization_id,
    auth.uid(),
    btrim(p_action_type),
    'pending',
    btrim(p_risk_level),
    btrim(p_screen_id),
    btrim(p_domain),
    btrim(p_summary),
    coalesce(p_redacted_payload, '{}'::jsonb),
    v_evidence_refs,
    btrim(p_idempotency_key),
    p_expires_at,
    btrim(coalesce(p_actor_role, 'unknown')),
    btrim(coalesce(p_requested_by_user_id_hash, '')),
    btrim(coalesce(p_organization_id_hash, ''))
  )
  returning * into v_action;

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
    'ai.action.submitted_for_approval',
    v_action.status,
    auth.uid(),
    btrim(coalesce(p_actor_role, 'unknown')),
    btrim(coalesce(p_audit_reason, 'AI action persisted as pending approval.')),
    v_action.evidence_refs,
    '{}'::jsonb
  );

  return public.ai_action_ledger_to_safe_json_v1(v_action)
    || jsonb_build_object('idempotencyReused', false, 'finalExecution', false);
exception
  when unique_violation then
    select *
      into v_existing
    from public.ai_action_ledger
    where organization_id = p_organization_id
      and idempotency_key = btrim(p_idempotency_key)
    limit 1;

    if found then
      return public.ai_action_ledger_to_safe_json_v1(v_existing)
        || jsonb_build_object('idempotencyReused', true, 'finalExecution', false);
    end if;

    return jsonb_build_object(
      'status', 'blocked',
      'blocker', 'BLOCKED_APPROVAL_MIGRATION_NOT_APPROVED',
      'reason', 'AI action ledger idempotency conflict could not be resolved.',
      'finalExecution', false
    );
end;
$$;

create or replace function public.ai_action_ledger_get_status_v1(
  p_action_id uuid,
  p_actor_role text default 'unknown'
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    (
      select public.ai_action_ledger_to_safe_json_v1(al)
        || jsonb_build_object('actorRole', btrim(coalesce(p_actor_role, 'unknown')), 'finalExecution', false)
      from public.ai_action_ledger al
      where al.id = p_action_id
        and public.ai_action_ledger_actor_can_view_company_v1(al.organization_id)
      limit 1
    ),
    jsonb_build_object(
      'status', 'not_found',
      'actionId', p_action_id,
      'actorRole', btrim(coalesce(p_actor_role, 'unknown')),
      'finalExecution', false
    )
  );
$$;

create or replace function public.ai_action_ledger_find_by_idempotency_key_v1(
  p_organization_id uuid,
  p_idempotency_key text,
  p_actor_role text default 'unknown'
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    (
      select public.ai_action_ledger_to_safe_json_v1(al)
        || jsonb_build_object('actorRole', btrim(coalesce(p_actor_role, 'unknown')), 'finalExecution', false)
      from public.ai_action_ledger al
      where al.organization_id = p_organization_id
        and al.idempotency_key = btrim(coalesce(p_idempotency_key, ''))
        and public.ai_action_ledger_actor_can_view_company_v1(al.organization_id)
      limit 1
    ),
    jsonb_build_object(
      'status', 'not_found',
      'actorRole', btrim(coalesce(p_actor_role, 'unknown')),
      'finalExecution', false
    )
  );
$$;

create or replace function public.ai_action_ledger_list_by_org_v1(
  p_organization_id uuid,
  p_limit integer default 20,
  p_offset integer default 0,
  p_actor_role text default 'unknown'
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 20);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_records jsonb := '[]'::jsonb;
  v_has_next boolean := false;
begin
  if auth.uid() is null
    or not public.ai_action_ledger_actor_can_view_company_v1(p_organization_id)
  then
    return jsonb_build_object(
      'status', 'blocked',
      'blocker', 'BLOCKED_APPROVAL_MIGRATION_NOT_APPROVED',
      'reason', 'AI action ledger list RPC scope check failed.',
      'records', '[]'::jsonb,
      'nextCursor', null,
      'finalExecution', false
    );
  end if;

  select coalesce(jsonb_agg(public.ai_action_ledger_to_safe_json_v1(page.al)), '[]'::jsonb)
    into v_records
  from (
    select al
    from public.ai_action_ledger al
    where al.organization_id = p_organization_id
      and public.ai_action_ledger_actor_can_view_company_v1(al.organization_id)
    order by al.created_at desc
    offset v_offset
    limit v_limit
  ) page;

  select exists (
    select 1
    from public.ai_action_ledger al
    where al.organization_id = p_organization_id
      and public.ai_action_ledger_actor_can_view_company_v1(al.organization_id)
    order by al.created_at desc
    offset (v_offset + v_limit)
    limit 1
  )
  into v_has_next;

  return jsonb_build_object(
    'status', case when jsonb_array_length(v_records) > 0 then 'loaded' else 'empty' end,
    'actorRole', btrim(coalesce(p_actor_role, 'unknown')),
    'records', v_records,
    'nextCursor', case when v_has_next then (v_offset + v_limit)::text else null end,
    'finalExecution', false
  );
end;
$$;

create or replace function public.ai_action_ledger_approve_v1(
  p_action_id uuid,
  p_actor_role text,
  p_reason text default null,
  p_approved_by_user_id_hash text default null
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
    status = 'approved',
    approved_by = auth.uid(),
    approved_by_user_id_hash = btrim(coalesce(p_approved_by_user_id_hash, '')),
    updated_at = now()
  where id = p_action_id
    and status = 'pending'
    and public.ai_action_ledger_actor_can_manage_company_v1(organization_id)
  returning * into v_action;

  if not found then
    return jsonb_build_object(
      'status', 'blocked',
      'actionId', p_action_id,
      'blocker', 'BLOCKED_APPROVAL_ACTION_TRANSITION_DENIED',
      'reason', 'AI action approval requires pending status and management scope.',
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
    'ai.action.approved',
    v_action.status,
    auth.uid(),
    btrim(coalesce(p_actor_role, 'unknown')),
    btrim(coalesce(p_reason, 'AI action approved through persistent ledger.')),
    v_action.evidence_refs,
    '{}'::jsonb
  );

  return public.ai_action_ledger_to_safe_json_v1(v_action)
    || jsonb_build_object('finalExecution', false);
end;
$$;

create or replace function public.ai_action_ledger_reject_v1(
  p_action_id uuid,
  p_reason text,
  p_actor_role text
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
    status = 'rejected',
    updated_at = now()
  where id = p_action_id
    and status = 'pending'
    and public.ai_action_ledger_actor_can_manage_company_v1(organization_id)
  returning * into v_action;

  if not found then
    return jsonb_build_object(
      'status', 'blocked',
      'actionId', p_action_id,
      'blocker', 'BLOCKED_APPROVAL_ACTION_TRANSITION_DENIED',
      'reason', 'AI action rejection requires pending status and management scope.',
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
    'ai.action.rejected',
    v_action.status,
    auth.uid(),
    btrim(coalesce(p_actor_role, 'unknown')),
    btrim(coalesce(p_reason, 'AI action rejected through persistent ledger.')),
    v_action.evidence_refs,
    '{}'::jsonb
  );

  return public.ai_action_ledger_to_safe_json_v1(v_action)
    || jsonb_build_object('finalExecution', false);
end;
$$;

revoke all on function public.ai_action_ledger_to_safe_json_v1(public.ai_action_ledger) from public;
revoke all on function public.ai_action_ledger_submit_for_approval_v1(uuid, text, text, text, text, text, jsonb, jsonb, text, timestamptz, text, text, text, text) from public;
revoke all on function public.ai_action_ledger_get_status_v1(uuid, text) from public;
revoke all on function public.ai_action_ledger_find_by_idempotency_key_v1(uuid, text, text) from public;
revoke all on function public.ai_action_ledger_list_by_org_v1(uuid, integer, integer, text) from public;
revoke all on function public.ai_action_ledger_approve_v1(uuid, text, text, text) from public;
revoke all on function public.ai_action_ledger_reject_v1(uuid, text, text) from public;

grant execute on function public.ai_action_ledger_to_safe_json_v1(public.ai_action_ledger) to authenticated;
grant execute on function public.ai_action_ledger_submit_for_approval_v1(uuid, text, text, text, text, text, jsonb, jsonb, text, timestamptz, text, text, text, text) to authenticated;
grant execute on function public.ai_action_ledger_get_status_v1(uuid, text) to authenticated;
grant execute on function public.ai_action_ledger_find_by_idempotency_key_v1(uuid, text, text) to authenticated;
grant execute on function public.ai_action_ledger_list_by_org_v1(uuid, integer, integer, text) to authenticated;
grant execute on function public.ai_action_ledger_approve_v1(uuid, text, text, text) to authenticated;
grant execute on function public.ai_action_ledger_reject_v1(uuid, text, text) to authenticated;

comment on function public.ai_action_ledger_submit_for_approval_v1(uuid, text, text, text, text, text, jsonb, jsonb, text, timestamptz, text, text, text, text) is
  'Persistent AI action ledger submit RPC. Creates or reuses a pending approval record with evidence, audit, and idempotency.';

comment on function public.ai_action_ledger_list_by_org_v1(uuid, integer, integer, text) is
  'Persistent AI action ledger list RPC for Approval Inbox. Returns redacted bounded records only.';

notify pgrst, 'reload schema';

commit;
