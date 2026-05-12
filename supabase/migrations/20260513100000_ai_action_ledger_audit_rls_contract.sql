-- S_AI_MAGIC_06B_ACTION_LEDGER_BACKEND_READINESS
-- Additive proposal only. Apply only after explicit migration approval.

begin;

create table if not exists public.ai_action_ledger_audit (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null,
  organization_id uuid not null,
  event_type text not null,
  action_status text not null,
  actor_user_id uuid null,
  actor_role text not null,
  reason text not null,
  evidence_refs jsonb not null default '[]'::jsonb,
  redacted_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint ai_action_ledger_audit_event_type_check check (
    event_type in (
      'ai.action.submitted_for_approval',
      'ai.action.approved',
      'ai.action.rejected',
      'ai.action.execute_requested',
      'ai.action.executed',
      'ai.action.execution_blocked',
      'ai.action.expired',
      'ai.action.idempotency_reused'
    )
  ),
  constraint ai_action_ledger_audit_status_check check (
    action_status in ('draft', 'pending', 'approved', 'rejected', 'executed', 'expired', 'blocked')
  ),
  constraint ai_action_ledger_audit_evidence_array_check check (jsonb_typeof(evidence_refs) = 'array'),
  constraint ai_action_ledger_audit_payload_object_check check (jsonb_typeof(redacted_payload) = 'object'),
  constraint ai_action_ledger_audit_payload_redacted_check check (
    not (
      redacted_payload ? 'raw_prompt'
      or redacted_payload ? 'provider_payload'
      or redacted_payload ? 'raw_db_rows'
      or redacted_payload ? 'authorization'
      or redacted_payload ? 'token'
      or redacted_payload ? 'secret'
      or redacted_payload ? 'credential'
    )
  )
);

create index if not exists ai_action_ledger_audit_action_created_idx
on public.ai_action_ledger_audit (action_id, created_at desc);

create index if not exists ai_action_ledger_audit_org_created_idx
on public.ai_action_ledger_audit (organization_id, created_at desc);

create or replace function public.ai_action_ledger_actor_can_view_company_v1(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and (
      exists (
        select 1
        from public.companies c
        where c.id = p_organization_id
          and c.owner_user_id = auth.uid()
      )
      or exists (
        select 1
        from public.company_members cm
        where cm.company_id = p_organization_id
          and cm.user_id = auth.uid()
      )
    );
$$;

create or replace function public.ai_action_ledger_actor_can_manage_company_v1(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    auth.uid() is not null
    and (
      exists (
        select 1
        from public.companies c
        where c.id = p_organization_id
          and c.owner_user_id = auth.uid()
      )
      or exists (
        select 1
        from public.company_members cm
        where cm.company_id = p_organization_id
          and cm.user_id = auth.uid()
          and lower(trim(coalesce(cm.role, ''))) in ('director', 'control')
      )
    );
$$;

create or replace function public.ai_action_ledger_no_raw_payload_v1(p_payload jsonb)
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  select jsonb_typeof(coalesce(p_payload, '{}'::jsonb)) = 'object'
    and not (
      coalesce(p_payload, '{}'::jsonb) ? 'raw_prompt'
      or coalesce(p_payload, '{}'::jsonb) ? 'provider_payload'
      or coalesce(p_payload, '{}'::jsonb) ? 'raw_db_rows'
      or coalesce(p_payload, '{}'::jsonb) ? 'authorization'
      or coalesce(p_payload, '{}'::jsonb) ? 'token'
      or coalesce(p_payload, '{}'::jsonb) ? 'secret'
      or coalesce(p_payload, '{}'::jsonb) ? 'credential'
    );
$$;

create or replace function public.ai_action_ledger_updated_at_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

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
  elsif old.status = 'approved' and new.status = 'expired' then
    null;
  else
    raise exception 'ai_action_ledger: status transition is blocked';
  end if;

  if not public.ai_action_ledger_actor_can_manage_company_v1(old.organization_id) then
    raise exception 'ai_action_ledger: approval actor is outside company management scope';
  end if;

  return new;
end;
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
  p_actor_role text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_action_id uuid;
  v_event_type text := 'ai.action.submitted_for_approval';
begin
  if auth.uid() is null then
    raise exception 'ai_action_ledger: auth required';
  end if;

  if not public.ai_action_ledger_actor_can_view_company_v1(p_organization_id) then
    raise exception 'ai_action_ledger: organization scope denied';
  end if;

  if length(btrim(coalesce(p_idempotency_key, ''))) < 16 then
    raise exception 'ai_action_ledger: idempotency required';
  end if;

  if jsonb_typeof(coalesce(p_evidence_refs, '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(p_evidence_refs, '[]'::jsonb)) < 1
    or jsonb_array_length(coalesce(p_evidence_refs, '[]'::jsonb)) > 20 then
    raise exception 'ai_action_ledger: evidence required';
  end if;

  if not public.ai_action_ledger_no_raw_payload_v1(coalesce(p_redacted_payload, '{}'::jsonb)) then
    raise exception 'ai_action_ledger: redacted payload required';
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
    expires_at
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
    coalesce(p_evidence_refs, '[]'::jsonb),
    btrim(p_idempotency_key),
    p_expires_at
  )
  on conflict (organization_id, idempotency_key) do nothing
  returning id into v_action_id;

  if v_action_id is null then
    select al.id
    into v_action_id
    from public.ai_action_ledger al
    where al.organization_id = p_organization_id
      and al.idempotency_key = btrim(p_idempotency_key);

    v_event_type := 'ai.action.idempotency_reused';
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
    v_action_id,
    p_organization_id,
    v_event_type,
    'pending',
    auth.uid(),
    btrim(p_actor_role),
    case
      when v_event_type = 'ai.action.idempotency_reused'
      then 'AI action idempotency key reused; existing pending action returned.'
      else 'AI action persisted as pending approval.'
    end,
    coalesce(p_evidence_refs, '[]'::jsonb),
    '{}'::jsonb
  );

  return jsonb_build_object(
    'status', 'pending',
    'actionId', v_action_id,
    'requiresApproval', true,
    'finalExecution', false,
    'idempotencyReused', v_event_type = 'ai.action.idempotency_reused'
  );
end;
$$;

create or replace function public.ai_action_ledger_get_status_v1(p_action_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'status', al.status,
    'actionId', al.id,
    'actionType', al.action_type,
    'riskLevel', al.risk_level,
    'screenId', al.screen_id,
    'domain', al.domain,
    'summary', al.summary,
    'evidenceRefs', al.evidence_refs,
    'requiresApproval', true,
    'finalExecution', false
  )
  from public.ai_action_ledger al
  where al.id = p_action_id
    and public.ai_action_ledger_actor_can_view_company_v1(al.organization_id);
$$;

create or replace function public.ai_action_ledger_approve_v1(
  p_action_id uuid,
  p_actor_role text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_record public.ai_action_ledger%rowtype;
begin
  select *
  into v_record
  from public.ai_action_ledger
  where id = p_action_id;

  if v_record.id is null then
    raise exception 'ai_action_ledger: action not found';
  end if;

  if not public.ai_action_ledger_actor_can_manage_company_v1(v_record.organization_id) then
    raise exception 'ai_action_ledger: approve scope denied';
  end if;

  update public.ai_action_ledger
  set status = 'approved',
      approved_by = auth.uid()
  where id = p_action_id
  returning * into v_record;

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
    v_record.id,
    v_record.organization_id,
    'ai.action.approved',
    v_record.status,
    auth.uid(),
    btrim(p_actor_role),
    'AI action approved through persistent ledger.',
    v_record.evidence_refs,
    '{}'::jsonb
  );

  return public.ai_action_ledger_get_status_v1(v_record.id);
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
  v_record public.ai_action_ledger%rowtype;
begin
  select *
  into v_record
  from public.ai_action_ledger
  where id = p_action_id;

  if v_record.id is null then
    raise exception 'ai_action_ledger: action not found';
  end if;

  if not public.ai_action_ledger_actor_can_manage_company_v1(v_record.organization_id) then
    raise exception 'ai_action_ledger: reject scope denied';
  end if;

  update public.ai_action_ledger
  set status = 'rejected'
  where id = p_action_id
  returning * into v_record;

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
    v_record.id,
    v_record.organization_id,
    'ai.action.rejected',
    v_record.status,
    auth.uid(),
    btrim(p_actor_role),
    left(btrim(coalesce(p_reason, 'AI action rejected through persistent ledger.')), 600),
    v_record.evidence_refs,
    '{}'::jsonb
  );

  return public.ai_action_ledger_get_status_v1(v_record.id);
end;
$$;

create or replace function public.ai_action_ledger_execute_approved_v1(
  p_action_id uuid,
  p_actor_role text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_record public.ai_action_ledger%rowtype;
begin
  select *
  into v_record
  from public.ai_action_ledger
  where id = p_action_id;

  if v_record.id is null then
    raise exception 'ai_action_ledger: action not found';
  end if;

  if not public.ai_action_ledger_actor_can_manage_company_v1(v_record.organization_id) then
    raise exception 'ai_action_ledger: execute scope denied';
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
    v_record.id,
    v_record.organization_id,
    'ai.action.execution_blocked',
    v_record.status,
    auth.uid(),
    btrim(p_actor_role),
    'BLOCKED_DOMAIN_EXECUTOR_NOT_READY',
    v_record.evidence_refs,
    '{}'::jsonb
  );

  return jsonb_build_object(
    'status', 'blocked',
    'actionId', v_record.id,
    'blocker', 'BLOCKED_DOMAIN_EXECUTOR_NOT_READY',
    'domainExecutorReady', false,
    'finalExecution', false
  );
end;
$$;

revoke all on function public.ai_action_ledger_actor_can_view_company_v1(uuid) from public;
revoke all on function public.ai_action_ledger_actor_can_manage_company_v1(uuid) from public;
revoke all on function public.ai_action_ledger_no_raw_payload_v1(jsonb) from public;
revoke all on function public.ai_action_ledger_submit_for_approval_v1(uuid, text, text, text, text, text, jsonb, jsonb, text, timestamptz, text) from public;
revoke all on function public.ai_action_ledger_get_status_v1(uuid) from public;
revoke all on function public.ai_action_ledger_approve_v1(uuid, text) from public;
revoke all on function public.ai_action_ledger_reject_v1(uuid, text, text) from public;
revoke all on function public.ai_action_ledger_execute_approved_v1(uuid, text) from public;

grant execute on function public.ai_action_ledger_actor_can_view_company_v1(uuid) to authenticated;
grant execute on function public.ai_action_ledger_actor_can_manage_company_v1(uuid) to authenticated;
grant execute on function public.ai_action_ledger_no_raw_payload_v1(jsonb) to authenticated;
grant execute on function public.ai_action_ledger_submit_for_approval_v1(uuid, text, text, text, text, text, jsonb, jsonb, text, timestamptz, text) to authenticated;
grant execute on function public.ai_action_ledger_get_status_v1(uuid) to authenticated;
grant execute on function public.ai_action_ledger_approve_v1(uuid, text) to authenticated;
grant execute on function public.ai_action_ledger_reject_v1(uuid, text, text) to authenticated;
grant execute on function public.ai_action_ledger_execute_approved_v1(uuid, text) to authenticated;

alter table public.ai_action_ledger enable row level security;
alter table public.ai_action_ledger force row level security;
alter table public.ai_action_ledger_audit enable row level security;
alter table public.ai_action_ledger_audit force row level security;

revoke all on table public.ai_action_ledger from anon;
revoke all on table public.ai_action_ledger_audit from anon;
revoke all on table public.ai_action_ledger from authenticated;
revoke all on table public.ai_action_ledger_audit from authenticated;
grant select, insert on table public.ai_action_ledger to authenticated;
grant update (status, approved_by, executed_at, updated_at) on table public.ai_action_ledger to authenticated;
grant select, insert on table public.ai_action_ledger_audit to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_action_ledger'
      and policyname = 'ai_action_ledger_select_company_scope'
  ) then
    execute 'create policy ai_action_ledger_select_company_scope on public.ai_action_ledger for select to authenticated using (public.ai_action_ledger_actor_can_view_company_v1(organization_id))';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_action_ledger'
      and policyname = 'ai_action_ledger_insert_pending_company_scope'
  ) then
    execute 'create policy ai_action_ledger_insert_pending_company_scope on public.ai_action_ledger for insert to authenticated with check (auth.uid() is not null and requested_by = auth.uid() and status = ''pending'' and length(btrim(coalesce(idempotency_key, ''''))) >= 16 and jsonb_typeof(evidence_refs) = ''array'' and jsonb_array_length(evidence_refs) between 1 and 20 and public.ai_action_ledger_no_raw_payload_v1(redacted_payload) and public.ai_action_ledger_actor_can_view_company_v1(organization_id))';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_action_ledger'
      and policyname = 'ai_action_ledger_update_manage_scope'
  ) then
    execute 'create policy ai_action_ledger_update_manage_scope on public.ai_action_ledger for update to authenticated using (public.ai_action_ledger_actor_can_manage_company_v1(organization_id)) with check (public.ai_action_ledger_actor_can_manage_company_v1(organization_id))';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_action_ledger_audit'
      and policyname = 'ai_action_ledger_audit_select_company_scope'
  ) then
    execute 'create policy ai_action_ledger_audit_select_company_scope on public.ai_action_ledger_audit for select to authenticated using (public.ai_action_ledger_actor_can_view_company_v1(organization_id))';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_action_ledger_audit'
      and policyname = 'ai_action_ledger_audit_insert_company_scope'
  ) then
    execute 'create policy ai_action_ledger_audit_insert_company_scope on public.ai_action_ledger_audit for insert to authenticated with check (auth.uid() is not null and actor_user_id = auth.uid() and jsonb_typeof(evidence_refs) = ''array'' and public.ai_action_ledger_no_raw_payload_v1(redacted_payload) and public.ai_action_ledger_actor_can_view_company_v1(organization_id))';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_ai_action_ledger_updated_at_v1'
  ) then
    create trigger trg_ai_action_ledger_updated_at_v1
    before update on public.ai_action_ledger
    for each row
    execute function public.ai_action_ledger_updated_at_v1();
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_ai_action_ledger_lifecycle_guard_v1'
  ) then
    create trigger trg_ai_action_ledger_lifecycle_guard_v1
    before update on public.ai_action_ledger
    for each row
    execute function public.ai_action_ledger_lifecycle_guard_v1();
  end if;
end;
$$;

comment on table public.ai_action_ledger_audit is
  'Persistent AI action ledger audit proposal. Stores redacted audit events for approval lifecycle and idempotency reuse.';

comment on function public.ai_action_ledger_execute_approved_v1(uuid, text) is
  'Route contract only until a domain executor is mounted. It records execution_blocked audit and returns BLOCKED_DOMAIN_EXECUTOR_NOT_READY.';

notify pgrst, 'reload schema';

commit;
