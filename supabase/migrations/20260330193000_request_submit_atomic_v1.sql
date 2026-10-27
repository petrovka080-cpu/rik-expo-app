create or replace function public.request_submit_atomic_v1(p_request_id_text text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $request_submit_atomic$
declare
  v_request_id_text text := trim(coalesce(p_request_id_text, ''));
  v_request public.requests%rowtype;
  v_result_request public.requests%rowtype;
  v_before_head_status text := null;
  v_after_head_status text := null;
  v_submit_path text := 'rpc_submit';
  v_item_count integer := 0;
  v_has_post_draft_items boolean := false;
  v_reconciled boolean := false;
  v_expectation_mode text := 'unknown';
  v_expectation_verifiable boolean := false;
  v_allowed_head_statuses text[] := array[]::text[];
  v_has_draft boolean := false;
  v_has_pending boolean := false;
  v_has_approved boolean := false;
  v_has_rejected boolean := false;
  v_has_unknown boolean := false;
  v_item_status text;
  v_item_status_norm text;
  v_invalid_item_ids text[] := array[]::text[];
begin
  if v_request_id_text = '' then
    return jsonb_build_object(
      'ok', false,
      'operation', 'request_submit_atomic_v1',
      'request_id', v_request_id_text,
      'failure_code', 'missing_request_id',
      'failure_message', 'Request id is required.'
    );
  end if;

  select *
  into v_request
  from public.requests r
  where r.id::text = v_request_id_text
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'operation', 'request_submit_atomic_v1',
      'request_id', v_request_id_text,
      'failure_code', 'request_not_found',
      'failure_message', 'Request not found.'
    );
  end if;

  v_before_head_status := lower(regexp_replace(trim(coalesce(v_request.status::text, '')), '\s+', ' ', 'g'));

  perform 1
  from public.request_items ri
  where ri.request_id = v_request.id
  for update;

  for v_item_status in
    select coalesce(ri.status::text, '')
    from public.request_items ri
    where ri.request_id = v_request.id
    order by ri.id
  loop
    v_item_count := v_item_count + 1;
    v_item_status_norm := lower(regexp_replace(trim(coalesce(v_item_status, '')), '\s+', ' ', 'g'));

    if v_item_status_norm = ''
       or v_item_status_norm = 'draft'
       or position(U&'\0427\0435\0440\043D\043E\0432' in v_item_status_norm) > 0 then
      v_has_draft := true;
    elsif v_item_status_norm = 'pending'
       or position(U&'\041D\0430 \0443\0442\0432\0435\0440\0436\0434\0435\043D\0438\0438' in v_item_status_norm) > 0 then
      v_has_pending := true;
    elsif v_item_status_norm = 'approved'
       or v_item_status_norm = lower(U&'\0423\0442\0432\0435\0440\0436\0434\0435\043D\043E') then
      v_has_approved := true;
      v_has_post_draft_items := true;
    elsif v_item_status_norm = 'rejected'
       or v_item_status_norm = lower(U&'\041E\0442\043A\043B\043E\043D\0435\043D\043E') then
      v_has_rejected := true;
      v_has_post_draft_items := true;
    else
      v_has_unknown := true;
      v_has_post_draft_items := true;
    end if;
  end loop;

  if not v_has_post_draft_items then
    select *
    into v_result_request
    from public.request_submit(v_request.id::text);

    if not found or v_result_request.id is null then
      return jsonb_build_object(
        'ok', false,
        'operation', 'request_submit_atomic_v1',
        'request_id', v_request.id::text,
        'failure_code', 'empty_submit_payload',
        'failure_message', 'request_submit returned empty payload.',
        'validation', jsonb_build_object(
          'submit_path', 'rpc_submit',
          'item_count', v_item_count
        )
      );
    end if;

    v_after_head_status := lower(regexp_replace(trim(coalesce(v_result_request.status::text, '')), '\s+', ' ', 'g'));

    if v_after_head_status not in ('pending', lower(U&'\041D\0430 \0443\0442\0432\0435\0440\0436\0434\0435\043D\0438\0438')) then
      return jsonb_build_object(
        'ok', false,
        'operation', 'request_submit_atomic_v1',
        'request_id', v_request.id::text,
        'failure_code', 'head_status_mismatch_after_submit',
        'failure_message', 'Request head status did not transition to pending.',
        'validation', jsonb_build_object(
          'submit_path', 'rpc_submit',
          'head_status_before', v_before_head_status,
          'head_status_after', v_after_head_status,
          'item_count', v_item_count
        )
      );
    end if;

    select coalesce(array_agg(ri.id::text order by ri.id), array[]::text[])
    into v_invalid_item_ids
    from public.request_items ri
    where ri.request_id = v_request.id
      and lower(regexp_replace(trim(coalesce(ri.status::text, '')), '\s+', ' ', 'g')) not in (
        'pending',
        lower(U&'\041D\0430 \0443\0442\0432\0435\0440\0436\0434\0435\043D\0438\0438'),
        'approved',
        lower(U&'\0423\0442\0432\0435\0440\0436\0434\0435\043D\043E'),
        'rejected',
        lower(U&'\041E\0442\043A\043B\043E\043D\0435\043D\043E')
      );

    if coalesce(array_length(v_invalid_item_ids, 1), 0) > 0 then
      return jsonb_build_object(
        'ok', false,
        'operation', 'request_submit_atomic_v1',
        'request_id', v_request.id::text,
        'failure_code', 'item_status_transition_failed',
        'failure_message', 'Request items did not transition from draft after submit.',
        'invalid_item_ids', to_jsonb(v_invalid_item_ids),
        'validation', jsonb_build_object(
          'submit_path', 'rpc_submit',
          'item_count', v_item_count
        )
      );
    end if;

    return jsonb_build_object(
      'ok', true,
      'operation', 'request_submit_atomic_v1',
      'request_id', v_request.id::text,
      'submit_path', 'rpc_submit',
      'has_post_draft_items', false,
      'reconciled', true,
      'request', to_jsonb(v_result_request),
      'verification', jsonb_build_object(
        'head_status_before', v_before_head_status,
        'head_status_after', v_after_head_status,
        'item_count', v_item_count
      )
    );
  end if;

  v_submit_path := 'server_reconcile_existing';

  if v_item_count = 0 or v_has_unknown then
    v_expectation_mode := 'unknown';
    v_expectation_verifiable := false;
  elsif v_has_draft or v_has_pending then
    v_expectation_mode := 'mixed_with_inflight';
    v_expectation_verifiable := true;
    v_allowed_head_statuses := array['pending', lower(U&'\041D\0430 \0443\0442\0432\0435\0440\0436\0434\0435\043D\0438\0438')];
  elsif v_has_approved and not v_has_rejected then
    v_expectation_mode := 'all_approved';
    v_expectation_verifiable := true;
    v_allowed_head_statuses := array['approved', lower(U&'\0423\0442\0432\0435\0440\0436\0434\0435\043D\043E')];
  elsif v_has_rejected and not v_has_approved then
    v_expectation_mode := 'all_rejected';
    v_expectation_verifiable := true;
    v_allowed_head_statuses := array['rejected', lower(U&'\041E\0442\043A\043B\043E\043D\0435\043D\043E')];
  else
    v_expectation_mode := 'mixed_terminal';
    v_expectation_verifiable := true;
    v_allowed_head_statuses := array[
      'approved',
      lower(U&'\0423\0442\0432\0435\0440\0436\0434\0435\043D\043E'),
      'rejected',
      lower(U&'\041E\0442\043A\043B\043E\043D\0435\043D\043E')
    ];
  end if;

  perform public.request_recalc_status(v_request.id);

  select *
  into v_result_request
  from public.requests r
  where r.id = v_request.id;

  v_after_head_status := lower(regexp_replace(trim(coalesce(v_result_request.status::text, '')), '\s+', ' ', 'g'));

  if (
    v_expectation_verifiable
    and v_after_head_status = any(v_allowed_head_statuses)
  ) or (
    not v_expectation_verifiable
    and v_after_head_status <> v_before_head_status
  ) then
    v_reconciled := true;
  else
    perform public.request_update_status_from_items(v_request.id);

    select *
    into v_result_request
    from public.requests r
    where r.id = v_request.id;

    v_after_head_status := lower(regexp_replace(trim(coalesce(v_result_request.status::text, '')), '\s+', ' ', 'g'));

    if (
      v_expectation_verifiable
      and v_after_head_status = any(v_allowed_head_statuses)
    ) or (
      not v_expectation_verifiable
      and v_after_head_status <> v_before_head_status
    ) then
      v_reconciled := true;
    end if;
  end if;

  if not v_reconciled then
    return jsonb_build_object(
      'ok', false,
      'operation', 'request_submit_atomic_v1',
      'request_id', v_request.id::text,
      'failure_code', 'reconcile_failed',
      'failure_message', 'Server-side request status reconcile failed.',
      'validation', jsonb_build_object(
        'submit_path', v_submit_path,
        'head_status_before', v_before_head_status,
        'head_status_after', v_after_head_status,
        'expectation_mode', v_expectation_mode,
        'allowed_head_statuses', to_jsonb(v_allowed_head_statuses),
        'expectation_verifiable', v_expectation_verifiable,
        'has_post_draft_items', v_has_post_draft_items,
        'item_count', v_item_count
      )
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'operation', 'request_submit_atomic_v1',
    'request_id', v_request.id::text,
    'submit_path', v_submit_path,
    'has_post_draft_items', v_has_post_draft_items,
    'reconciled', true,
    'request', to_jsonb(v_result_request),
    'verification', jsonb_build_object(
      'head_status_before', v_before_head_status,
      'head_status_after', v_after_head_status,
      'expectation_mode', v_expectation_mode,
      'allowed_head_statuses', to_jsonb(v_allowed_head_statuses),
      'expectation_verifiable', v_expectation_verifiable,
      'item_count', v_item_count
    )
  );
end;
$request_submit_atomic$;
