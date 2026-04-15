-- ============================================================
-- P4: Director Pipeline Atomic RPC + Idempotency
-- Status: production candidate
-- Rules:
--   - ADDITIVE ONLY — no destructive changes
--   - Existing RPCs remain untouched
--   - Semantic of statuses unchanged
-- ============================================================

-- ============================================================
-- 1. Idempotency ledger table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.approval_ledger (
  id                  bigserial    PRIMARY KEY,
  client_mutation_id  text         NOT NULL,
  proposal_id         text,
  request_id          text,
  actor_id            uuid,
  operation           text         NOT NULL DEFAULT 'director_approve_pipeline_v1',
  result_ok           boolean      NOT NULL,
  result_payload      jsonb,
  created_at          timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT uq_approval_ledger_mutation UNIQUE (client_mutation_id)
);

COMMENT ON TABLE public.approval_ledger IS
  'Idempotency ledger for director approval pipelines. Prevents duplicate side-effects on retry.';

-- ============================================================
-- 2. director_approve_pipeline_v1
--    Wraps the full proposal approval flow in one transaction:
--      approve proposal → create purchase+incoming → seed works → send to accountant
--    Idempotent via client_mutation_id.
-- ============================================================
CREATE OR REPLACE FUNCTION public.director_approve_pipeline_v1(
  p_proposal_id       text,
  p_comment           text     DEFAULT NULL,
  p_invoice_currency  text     DEFAULT 'KGS',
  p_client_mutation_id text    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id         uuid;
  v_proposal         record;
  v_already_sent     boolean := false;
  v_purchase_id      text;
  v_incoming_id      text;
  v_work_seed_ok     boolean := true;
  v_work_seed_error  text;
  v_existing_ledger  jsonb;
  v_purchase_result  jsonb;
  v_result           jsonb;
BEGIN
  -- resolve actor
  v_actor_id := auth.uid();

  -- ── IDEMPOTENCY CHECK ──
  IF p_client_mutation_id IS NOT NULL AND p_client_mutation_id <> '' THEN
    SELECT result_payload INTO v_existing_ledger
    FROM public.approval_ledger
    WHERE client_mutation_id = p_client_mutation_id;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'ok',                  true,
        'status',              'already_applied',
        'proposal_id',         p_proposal_id,
        'client_mutation_id',  p_client_mutation_id,
        'idempotent_replay',   true
      ) || coalesce(v_existing_ledger, '{}'::jsonb);
    END IF;
  END IF;

  -- ── STEP 1: VALIDATE + LOCK ──
  SELECT id, status, submitted_at, sent_to_accountant_at
  INTO v_proposal
  FROM public.proposals
  WHERE id = p_proposal_id::uuid
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok',             false,
      'status',         'error',
      'failure_code',   'proposal_not_found',
      'failure_message','Предложение не найдено',
      'proposal_id',    p_proposal_id
    );
  END IF;

  -- Check if already sent to accountant (idempotent path)
  IF v_proposal.sent_to_accountant_at IS NOT NULL
     AND trim(v_proposal.sent_to_accountant_at::text) <> '' THEN
    v_already_sent := true;
  END IF;

  -- Validate status
  IF NOT v_already_sent THEN
    IF v_proposal.status IS NULL
       OR lower(trim(v_proposal.status)) NOT IN (
         'на утверждении', 'submitted', 'pending'
       ) THEN
      -- Allow already-approved proposals to proceed (re-entrant)
      IF lower(trim(coalesce(v_proposal.status, ''))) NOT IN ('утверждено', 'approved') THEN
        RETURN jsonb_build_object(
          'ok',             false,
          'status',         'error',
          'failure_code',   'invalid_proposal_status',
          'failure_message','Недопустимый статус предложения: ' || coalesce(v_proposal.status, 'null'),
          'proposal_id',    p_proposal_id
        );
      END IF;
    END IF;
  END IF;

  -- ── STEP 2: APPROVE PROPOSAL ──
  IF NOT v_already_sent THEN
    PERFORM public.director_approve_min_auto_v1(
      p_proposal_id := p_proposal_id,
      p_comment     := p_comment
    );
  END IF;

  -- ── STEP 3: ENSURE PURCHASE + INCOMING ──
  -- Check if purchase already exists
  SELECT id::text INTO v_purchase_id
  FROM public.purchases
  WHERE proposal_id::text = p_proposal_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_purchase_id IS NULL THEN
    -- Create purchase + incoming via existing atomic RPC
    v_purchase_result := public.ensure_purchase_and_incoming_strict(
      p_proposal_id := p_proposal_id
    );
    v_purchase_id := coalesce(
      v_purchase_result->>'purchase_id',
      v_purchase_result->>'id'
    );
  ELSE
    -- Check if incoming exists for this purchase
    PERFORM 1 FROM public.wh_incoming WHERE purchase_id::text = v_purchase_id LIMIT 1;
    IF NOT FOUND THEN
      v_purchase_result := public.ensure_purchase_and_incoming_strict(
        p_proposal_id := p_proposal_id
      );
      v_purchase_id := coalesce(
        v_purchase_result->>'purchase_id',
        v_purchase_result->>'id',
        v_purchase_id
      );
    END IF;
  END IF;

  -- ── STEP 4: WORK SEED (non-fatal, via SAVEPOINT) ──
  IF v_purchase_id IS NOT NULL AND v_purchase_id <> '' THEN
    BEGIN
      PERFORM public.work_seed_from_purchase(p_purchase_id := v_purchase_id);
    EXCEPTION WHEN OTHERS THEN
      v_work_seed_ok := false;
      v_work_seed_error := SQLERRM;
    END;
  END IF;

  -- ── STEP 5: SEND TO ACCOUNTANT ──
  IF NOT v_already_sent THEN
    PERFORM public.proposal_send_to_accountant_min(
      p_proposal_id    := p_proposal_id,
      p_invoice_number := '',
      p_invoice_date   := '',
      p_invoice_amount := 0,
      p_invoice_currency := coalesce(p_invoice_currency, 'KGS')
    );
  END IF;

  -- ── STEP 6: BUILD RESULT ──
  v_result := jsonb_build_object(
    'ok',                true,
    'status',            'ok',
    'proposal_id',       p_proposal_id,
    'purchase_id',       v_purchase_id,
    'work_seed_ok',      v_work_seed_ok,
    'work_seed_error',   v_work_seed_error,
    'already_sent',      v_already_sent,
    'client_mutation_id', p_client_mutation_id,
    'idempotent_replay', false
  );

  -- ── STEP 7: RECORD IDEMPOTENCY ──
  IF p_client_mutation_id IS NOT NULL AND p_client_mutation_id <> '' THEN
    INSERT INTO public.approval_ledger (
      client_mutation_id, proposal_id, actor_id, operation, result_ok, result_payload
    ) VALUES (
      p_client_mutation_id, p_proposal_id, v_actor_id,
      'director_approve_pipeline_v1', true, v_result
    )
    ON CONFLICT (client_mutation_id) DO NOTHING;
  END IF;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.director_approve_pipeline_v1 IS
  'Atomic director proposal approval pipeline. Wraps approve→purchase→incoming→work_seed→accountant in one transaction with idempotency.';


-- ============================================================
-- 3. director_approve_request_v1
--    Wraps the request approval in one transaction:
--      lock request → update items → update header
-- ============================================================
CREATE OR REPLACE FUNCTION public.director_approve_request_v1(
  p_request_id          text,
  p_client_mutation_id  text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id       uuid;
  v_request        record;
  v_items_updated  integer;
  v_existing_ledger jsonb;
  v_result         jsonb;
BEGIN
  v_actor_id := auth.uid();

  -- ── IDEMPOTENCY CHECK ──
  IF p_client_mutation_id IS NOT NULL AND p_client_mutation_id <> '' THEN
    SELECT result_payload INTO v_existing_ledger
    FROM public.approval_ledger
    WHERE client_mutation_id = p_client_mutation_id;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'ok',                  true,
        'status',              'already_applied',
        'request_id',          p_request_id,
        'client_mutation_id',  p_client_mutation_id,
        'idempotent_replay',   true
      ) || coalesce(v_existing_ledger, '{}'::jsonb);
    END IF;
  END IF;

  -- ── STEP 1: VALIDATE + LOCK ──
  SELECT id, status
  INTO v_request
  FROM public.requests
  WHERE id = p_request_id::uuid
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok',              false,
      'status',          'error',
      'failure_code',    'request_not_found',
      'failure_message', 'Заявка не найдена',
      'request_id',      p_request_id
    );
  END IF;

  -- Validate status: must be "На утверждении"
  IF lower(trim(coalesce(v_request.status, ''))) NOT IN (
    'на утверждении', 'submitted', 'pending'
  ) THEN
    -- Allow already-approved to be idempotent
    IF lower(trim(coalesce(v_request.status, ''))) IN ('к закупке', 'approved', 'to_purchase') THEN
      RETURN jsonb_build_object(
        'ok',              true,
        'status',          'already_applied',
        'request_id',      p_request_id,
        'items_updated',   0,
        'idempotent_replay', true
      );
    END IF;

    RETURN jsonb_build_object(
      'ok',              false,
      'status',          'error',
      'failure_code',    'invalid_request_status',
      'failure_message', 'Недопустимый статус заявки: ' || coalesce(v_request.status, 'null'),
      'request_id',      p_request_id
    );
  END IF;

  -- ── STEP 2: UPDATE ITEMS (atomic with header) ──
  UPDATE public.request_items
  SET status = 'К закупке'
  WHERE request_id = p_request_id::uuid
    AND coalesce(status, '') <> 'Отклонено';
  GET DIAGNOSTICS v_items_updated = ROW_COUNT;

  -- ── STEP 3: UPDATE REQUEST HEADER ──
  UPDATE public.requests
  SET status = 'К закупке'
  WHERE id = p_request_id::uuid;

  -- ── STEP 4: BUILD RESULT ──
  v_result := jsonb_build_object(
    'ok',                true,
    'status',            'ok',
    'request_id',        p_request_id,
    'items_updated',     v_items_updated,
    'client_mutation_id', p_client_mutation_id,
    'idempotent_replay', false
  );

  -- ── STEP 5: RECORD IDEMPOTENCY ──
  IF p_client_mutation_id IS NOT NULL AND p_client_mutation_id <> '' THEN
    INSERT INTO public.approval_ledger (
      client_mutation_id, request_id, actor_id, operation, result_ok, result_payload
    ) VALUES (
      p_client_mutation_id, p_request_id, v_actor_id,
      'director_approve_request_v1', true, v_result
    )
    ON CONFLICT (client_mutation_id) DO NOTHING;
  END IF;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.director_approve_request_v1 IS
  'Atomic director request approval. Wraps items+header status update in one transaction with FOR UPDATE lock and idempotency.';
