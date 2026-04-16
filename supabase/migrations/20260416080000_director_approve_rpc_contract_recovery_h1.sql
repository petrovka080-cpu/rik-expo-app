-- H1: Director Approve RPC Contract Recovery
-- Creates the two missing RPC functions that the client calls but never existed in production.
-- Both functions wrap existing production-proven building blocks.
-- This migration must be applied to the production Supabase database.

begin;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. director_approve_request_v1
--    Client: director.request.ts → approveRequestAndSend
--    Semantics: approve all pending items on a request, set request status = "approved"
--    Returns JSON: { ok: true/false, failure_message?: string }
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.director_approve_request_v1(
  p_request_id text,
  p_client_mutation_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_exists boolean;
  v_current_status text;
  v_items_affected integer;
begin
  -- 1. Validate request exists
  select true, trim(coalesce(r.status, ''))
  into v_request_exists, v_current_status
  from public.requests r
  where r.id::text = p_request_id::text
  limit 1;

  if not v_request_exists then
    return jsonb_build_object(
      'ok', false,
      'failure_message', 'Заявка не найдена',
      'failure_code', 'request_not_found',
      'client_mutation_id', p_client_mutation_id
    );
  end if;

  -- 2. Idempotency: if already approved, return success
  if lower(v_current_status) in ('approved', 'утверждена', 'утверждено', 'sent') then
    return jsonb_build_object(
      'ok', true,
      'idempotent_replay', true,
      'client_mutation_id', p_client_mutation_id
    );
  end if;

  -- 3. Approve all pending request_items for this request
  update public.request_items ri
  set
    status = 'approved',
    updated_at = now()
  where ri.request_id::text = p_request_id::text
    and lower(trim(coalesce(ri.status, ''))) not in ('rejected', 'cancelled', 'canceled', 'отклонена', 'отменена', 'отменено');

  get diagnostics v_items_affected = row_count;

  -- 4. Set request status to approved
  update public.requests
  set
    status = 'approved',
    updated_at = now()
  where id::text = p_request_id::text;

  return jsonb_build_object(
    'ok', true,
    'items_approved', v_items_affected,
    'client_mutation_id', p_client_mutation_id
  );
end;
$$;

comment on function public.director_approve_request_v1(text, text) is
'H1 recovery: Director approve all pending items on a request. Idempotent via status check. Client: director.request.ts → approveRequestAndSend.';

grant execute on function public.director_approve_request_v1(text, text) to authenticated;


-- ────────────────────────────────────────────────────────────────────────────
-- 2. director_approve_pipeline_v1
--    Client: director.proposal.ts → approveProposal
--    Semantics: full proposal approval pipeline:
--      1. Integrity guard (reject if source request_items cancelled/missing)
--      2. Director approve (director_approve_min_auto_v1)
--      3. Create purchase + incoming (ensure_purchase_and_incoming_strict)
--      4. Send to accountant (director_send_to_accountant)
--    Returns JSON: { ok: true/false, failure_message?, purchase_id?, work_seed_ok?, ... }
-- ────────────────────────────────────────────────────────────────────────────

create or replace function public.director_approve_pipeline_v1(
  p_proposal_id text,
  p_comment text default null,
  p_invoice_currency text default 'KGS',
  p_client_mutation_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal_exists boolean;
  v_current_status text;
  v_sent_at timestamptz;
  v_purchase_result jsonb;
  v_purchase_id text;
  v_work_seed_ok boolean := true;
  v_work_seed_error text;
begin
  -- 1. Validate proposal exists
  select true, trim(coalesce(p.status, '')), p.sent_to_accountant_at
  into v_proposal_exists, v_current_status, v_sent_at
  from public.proposals p
  where p.id::text = p_proposal_id::text
  limit 1;

  if not v_proposal_exists then
    return jsonb_build_object(
      'ok', false,
      'failure_message', 'Предложение не найдено',
      'failure_code', 'proposal_not_found',
      'client_mutation_id', p_client_mutation_id
    );
  end if;

  -- 2. Idempotency: if already sent to accountant, return success
  if v_sent_at is not null then
    -- Look up existing purchase
    select pu.id::text into v_purchase_id
    from public.purchases pu
    where pu.proposal_id::text = p_proposal_id::text
    order by pu.created_at desc
    limit 1;

    return jsonb_build_object(
      'ok', true,
      'idempotent_replay', true,
      'purchase_id', v_purchase_id,
      'work_seed_ok', true,
      'client_mutation_id', p_client_mutation_id
    );
  end if;

  -- 3. Integrity guard — will raise exception if degraded
  perform public.proposal_request_item_integrity_guard_v1(p_proposal_id);

  -- 4. Director approve
  perform public.director_approve_min_auto(
    p_proposal_id => p_proposal_id,
    p_comment => p_comment
  );

  -- 5. Create purchase + incoming
  begin
    v_purchase_result := public.ensure_purchase_and_incoming_strict(
      p_proposal_id => p_proposal_id
    );
    v_purchase_id := v_purchase_result ->> 'purchase_id';
  exception when others then
    v_work_seed_ok := false;
    v_work_seed_error := sqlerrm;
    -- Try simpler fallback
    begin
      v_purchase_id := public.ensure_purchase_and_incoming_from_proposal(
        p_proposal_id => p_proposal_id
      );
    exception when others then
      v_work_seed_error := coalesce(v_work_seed_error, '') || '; fallback: ' || sqlerrm;
    end;
  end;

  -- 6. Send to accountant
  begin
    perform public.director_send_to_accountant(
      p_proposal_id => p_proposal_id
    );
  exception when others then
    v_work_seed_ok := false;
    v_work_seed_error := coalesce(v_work_seed_error, '') || '; send_to_accountant: ' || sqlerrm;
  end;

  return jsonb_build_object(
    'ok', true,
    'purchase_id', v_purchase_id,
    'work_seed_ok', v_work_seed_ok,
    'work_seed_error', v_work_seed_error,
    'idempotent_replay', false,
    'client_mutation_id', p_client_mutation_id
  );
end;
$$;

comment on function public.director_approve_pipeline_v1(text, text, text, text) is
'H1 recovery: Full director proposal approval pipeline (integrity check → approve → purchase/incoming → accountant). Idempotent via sent_to_accountant_at check. Client: director.proposal.ts → approveProposal.';

grant execute on function public.director_approve_pipeline_v1(text, text, text, text) to authenticated;

commit;
