-- WAVE 2C: repair warehouse request issue RPC chain by aligning the internal
-- request identifiers with the canonical legacy function signatures. This keeps
-- the idempotent wh_issue_request_atomic_v1 boundary, validation, and business
-- semantics unchanged while eliminating the 42883 text->uuid call mismatch.

create or replace function public.wh_issue_request_atomic_v1(
  p_who text,
  p_note text,
  p_request_id text,
  p_object_name text default null,
  p_work_name text default null,
  p_lines jsonb default '[]'::jsonb,
  p_client_mutation_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_client_mutation_id text := nullif(trim(coalesce(p_client_mutation_id, '')), '');
  v_request_id text := nullif(trim(coalesce(p_request_id, '')), '');
  v_who text := nullif(trim(coalesce(p_who, '')), '');
  v_note text := trim(coalesce(p_note, ''));
  v_payload_fingerprint text;
  v_existing public.warehouse_issue_request_mutations_v1%rowtype;
  v_issue_id bigint;
  v_response jsonb;
  v_line jsonb;
  v_rik_code text;
  v_uom_id text;
  v_request_item_id text;
  v_qty numeric;
begin
  if v_client_mutation_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'wh_issue_request_atomic_v1_missing_client_mutation_id',
      hint = 'Warehouse request issue must pass a stable client mutation id for retry safety.';
  end if;

  if v_request_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'wh_issue_request_atomic_v1_missing_request_id',
      detail = jsonb_build_object('client_mutation_id', v_client_mutation_id)::text;
  end if;

  if v_who is null then
    raise exception using
      errcode = 'P0001',
      message = 'wh_issue_request_atomic_v1_missing_recipient',
      detail = jsonb_build_object('client_mutation_id', v_client_mutation_id, 'request_id', v_request_id)::text;
  end if;

  if p_lines is null or jsonb_typeof(p_lines) is distinct from 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception using
      errcode = 'P0001',
      message = 'wh_issue_request_atomic_v1_empty_payload',
      detail = jsonb_build_object('client_mutation_id', v_client_mutation_id, 'request_id', v_request_id)::text;
  end if;

  perform 1
  from public.requests r
  where r.id::text = v_request_id;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'wh_issue_request_atomic_v1_request_not_found',
      detail = jsonb_build_object('client_mutation_id', v_client_mutation_id, 'request_id', v_request_id)::text;
  end if;

  for v_line in select value from jsonb_array_elements(p_lines)
  loop
    v_rik_code := nullif(trim(coalesce(v_line ->> 'rik_code', '')), '');
    v_uom_id := nullif(trim(coalesce(v_line ->> 'uom_id', '')), '');
    v_request_item_id := nullif(trim(coalesce(v_line ->> 'request_item_id', '')), '');
    v_qty := nullif(trim(coalesce(v_line ->> 'qty', '')), '')::numeric;

    if v_rik_code is null or v_uom_id is null or v_qty is null or v_qty <= 0 then
      raise exception using
        errcode = 'P0001',
        message = 'wh_issue_request_atomic_v1_invalid_line',
        detail = jsonb_build_object('client_mutation_id', v_client_mutation_id, 'request_id', v_request_id)::text;
    end if;

    if v_request_item_id is not null then
      perform 1
      from public.request_items ri
      where ri.id::text = v_request_item_id
        and ri.request_id::text = v_request_id;

      if not found then
        raise exception using
          errcode = 'P0001',
          message = 'wh_issue_request_atomic_v1_request_item_mismatch',
          detail = jsonb_build_object(
            'client_mutation_id', v_client_mutation_id,
            'request_id', v_request_id,
            'request_item_id', v_request_item_id
          )::text;
      end if;
    end if;
  end loop;

  v_payload_fingerprint := md5(
    jsonb_build_object(
      'request_id', v_request_id,
      'who', v_who,
      'note', v_note,
      'object_name', nullif(trim(coalesce(p_object_name, '')), ''),
      'work_name', nullif(trim(coalesce(p_work_name, '')), ''),
      'lines', p_lines
    )::text
  );

  perform pg_advisory_xact_lock(hashtext('wh_issue_request_atomic_v1:' || v_client_mutation_id));

  select *
  into v_existing
  from public.warehouse_issue_request_mutations_v1
  where client_mutation_id = v_client_mutation_id;

  if found then
    if v_existing.payload_fingerprint <> v_payload_fingerprint then
      raise exception using
        errcode = 'P0001',
        message = 'wh_issue_request_atomic_v1_idempotency_conflict',
        detail = jsonb_build_object(
          'client_mutation_id', v_client_mutation_id,
          'existing_request_id', v_existing.request_id,
          'request_id', v_request_id
        )::text,
        hint = 'Reuse the same client mutation id only for the exact same warehouse issue intent.';
    end if;

    return v_existing.response || jsonb_build_object(
      'client_mutation_id', v_client_mutation_id,
      'idempotent_replay', true
    );
  end if;

  v_issue_id := public.issue_via_ui(
    p_who => v_who,
    p_note => v_note,
    p_request_id => v_request_id::uuid,
    p_object_name => p_object_name,
    p_work_name => p_work_name
  );

  for v_line in select value from jsonb_array_elements(p_lines)
  loop
    perform public.issue_add_item_via_ui(
      p_issue_id => v_issue_id::integer,
      p_rik_code => trim(v_line ->> 'rik_code'),
      p_uom_id => trim(v_line ->> 'uom_id'),
      p_qty => (v_line ->> 'qty')::numeric,
      p_request_item_id => nullif(trim(coalesce(v_line ->> 'request_item_id', '')), '')::uuid
    );
  end loop;

  perform public.acc_issue_commit_ledger(p_issue_id => v_issue_id::integer);

  v_response := jsonb_build_object(
    'issue_id', v_issue_id,
    'request_id', v_request_id
  );

  insert into public.warehouse_issue_request_mutations_v1 (
    client_mutation_id,
    request_id,
    payload_fingerprint,
    issue_id,
    response,
    created_at,
    updated_at
  )
  values (
    v_client_mutation_id,
    v_request_id,
    v_payload_fingerprint,
    v_issue_id,
    v_response,
    now(),
    now()
  );

  return v_response || jsonb_build_object(
    'client_mutation_id', v_client_mutation_id,
    'idempotent_replay', false
  );
end;
$function$;

comment on function public.wh_issue_request_atomic_v1(text, text, text, text, text, jsonb, text) is
  'WAVE 2C RPC chain repair: preserves the idempotent warehouse request issue boundary while aligning internal request ids with canonical uuid legacy functions.';

grant execute on function public.wh_issue_request_atomic_v1(text, text, text, text, text, jsonb, text) to authenticated;

notify pgrst, 'reload schema';
