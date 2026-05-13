-- S_DB_04_AI_ACTION_LEDGER_FORWARD_FIX_AND_RPC_VISIBILITY_CLOSEOUT
-- Bounded additive forward-fix only. Do not use as a blind re-apply path.
-- Forward-fix scope: indexes, RLS policies, grants, and PostgREST schema-cache reload.

begin;

create index if not exists ai_action_ledger_org_hash_status_created_idx
on public.ai_action_ledger (organization_id_hash, status, created_at desc);

create index if not exists ai_action_ledger_status_expires_idx
on public.ai_action_ledger (status, expires_at);

create index if not exists ai_action_ledger_idempotency_key_idx
on public.ai_action_ledger (organization_id, idempotency_key);

alter table public.ai_action_ledger enable row level security;
alter table public.ai_action_ledger force row level security;

grant select, insert on table public.ai_action_ledger to authenticated;
grant update (status, approved_by, approved_by_user_id_hash, executed_at, redacted_payload, updated_at)
on table public.ai_action_ledger to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_action_ledger'
      and policyname = 'ai_action_ledger_select_company_scope'
  ) then
    execute 'create policy ai_action_ledger_select_company_scope on public.ai_action_ledger for select to authenticated using (public.ai_action_ledger_actor_can_view_company_v1(organization_id))';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_action_ledger'
      and policyname = 'ai_action_ledger_insert_pending_company_scope'
  ) then
    execute 'create policy ai_action_ledger_insert_pending_company_scope on public.ai_action_ledger for insert to authenticated with check (auth.uid() is not null and requested_by = auth.uid() and status = ''pending'' and length(btrim(coalesce(idempotency_key, ''''))) >= 16 and jsonb_typeof(evidence_refs) = ''array'' and jsonb_array_length(evidence_refs) between 1 and 20 and public.ai_action_ledger_no_raw_payload_v1(redacted_payload) and public.ai_action_ledger_actor_can_view_company_v1(organization_id))';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_action_ledger'
      and policyname = 'ai_action_ledger_update_approval_company_scope'
  ) then
    execute 'create policy ai_action_ledger_update_approval_company_scope on public.ai_action_ledger for update to authenticated using (public.ai_action_ledger_actor_can_manage_company_v1(organization_id) and status = ''pending'') with check (public.ai_action_ledger_actor_can_manage_company_v1(organization_id) and status in (''approved'', ''rejected'', ''expired'') and jsonb_typeof(evidence_refs) = ''array'' and jsonb_array_length(evidence_refs) between 1 and 20 and public.ai_action_ledger_no_raw_payload_v1(redacted_payload))';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ai_action_ledger'
      and policyname = 'ai_action_ledger_update_executed_company_scope'
  ) then
    execute 'create policy ai_action_ledger_update_executed_company_scope on public.ai_action_ledger for update to authenticated using (public.ai_action_ledger_actor_can_manage_company_v1(organization_id) and status = ''approved'') with check (public.ai_action_ledger_actor_can_manage_company_v1(organization_id) and status = ''executed'' and executed_at is not null and jsonb_typeof(evidence_refs) = ''array'' and jsonb_array_length(evidence_refs) between 1 and 20 and public.ai_action_ledger_no_raw_payload_v1(redacted_payload))';
  end if;
end;
$$;

do $$
begin
  if to_regprocedure('public.ai_action_ledger_actor_can_view_company_v1(uuid)') is not null then
    execute 'grant execute on function public.ai_action_ledger_actor_can_view_company_v1(uuid) to authenticated';
  end if;

  if to_regprocedure('public.ai_action_ledger_actor_can_manage_company_v1(uuid)') is not null then
    execute 'grant execute on function public.ai_action_ledger_actor_can_manage_company_v1(uuid) to authenticated';
  end if;

  if to_regprocedure('public.ai_action_ledger_no_raw_payload_v1(jsonb)') is not null then
    execute 'grant execute on function public.ai_action_ledger_no_raw_payload_v1(jsonb) to authenticated';
  end if;

  if to_regprocedure('public.ai_action_ledger_to_safe_json_v1(public.ai_action_ledger)') is not null then
    execute 'grant execute on function public.ai_action_ledger_to_safe_json_v1(public.ai_action_ledger) to authenticated';
  end if;

  if to_regprocedure('public.ai_action_ledger_submit_for_approval_v1(uuid,text,text,text,text,text,jsonb,jsonb,text,timestamp with time zone,text,text,text,text)') is not null then
    execute 'grant execute on function public.ai_action_ledger_submit_for_approval_v1(uuid, text, text, text, text, text, jsonb, jsonb, text, timestamptz, text, text, text, text) to authenticated';
  end if;

  if to_regprocedure('public.ai_action_ledger_get_status_v1(uuid,text)') is not null then
    execute 'grant execute on function public.ai_action_ledger_get_status_v1(uuid, text) to authenticated';
  end if;

  if to_regprocedure('public.ai_action_ledger_approve_v1(uuid,text,text,text)') is not null then
    execute 'grant execute on function public.ai_action_ledger_approve_v1(uuid, text, text, text) to authenticated';
  end if;

  if to_regprocedure('public.ai_action_ledger_reject_v1(uuid,text,text)') is not null then
    execute 'grant execute on function public.ai_action_ledger_reject_v1(uuid, text, text) to authenticated';
  end if;

  if to_regprocedure('public.ai_action_ledger_execute_approved_v1(uuid,text,text,timestamp with time zone,jsonb)') is not null then
    execute 'grant execute on function public.ai_action_ledger_execute_approved_v1(uuid, text, text, timestamptz, jsonb) to authenticated';
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
