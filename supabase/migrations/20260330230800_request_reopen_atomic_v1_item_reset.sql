create or replace function public.request_reopen_atomic_v1(p_request_id_text text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $request_reopen_atomic_reset$
declare
  v_request_id_text text := trim(coalesce(p_request_id_text, ''));
  v_request public.requests%rowtype;
  v_result_request public.requests%rowtype;
  v_previous_status text := null;
  v_reset_item_count integer := 0;
begin
  if v_request_id_text = '' then
    return jsonb_build_object(
      'ok', false,
      'operation', 'request_reopen_atomic_v1',
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
      'operation', 'request_reopen_atomic_v1',
      'request_id', v_request_id_text,
      'failure_code', 'request_not_found',
      'failure_message', 'Request not found.'
    );
  end if;

  v_previous_status := public.request_lifecycle_status_norm_v1(v_request.status::text);

  if public.request_lifecycle_is_mutable_v1(v_request.status::text, v_request.submitted_at) then
    return jsonb_build_object(
      'ok', true,
      'operation', 'request_reopen_atomic_v1',
      'request_id', v_request.id::text,
      'transition_path', 'already_draft',
      'restored_item_count', 0,
      'request', to_jsonb(v_request),
      'verification', jsonb_build_object(
        'previous_status', v_previous_status,
        'current_status', public.request_lifecycle_status_norm_v1(v_request.status::text),
        'submitted_at_cleared', v_request.submitted_at is null
      )
    );
  end if;

  perform set_config('app.request_lifecycle_transition', 'request_reopen_atomic_v1', true);

  update public.request_items
     set status = U&'\0427\0435\0440\043D\043E\0432\0438\043A',
         cancelled_at = null
   where request_id = v_request.id;

  get diagnostics v_reset_item_count = row_count;

  update public.requests
     set status = U&'\0427\0435\0440\043D\043E\0432\0438\043A',
         submitted_at = null,
         submitted_by = null
   where id = v_request.id
   returning * into v_result_request;

  if not public.request_lifecycle_is_mutable_v1(v_result_request.status::text, v_result_request.submitted_at) then
    return jsonb_build_object(
      'ok', false,
      'operation', 'request_reopen_atomic_v1',
      'request_id', v_request.id::text,
      'failure_code', 'reopen_transition_failed',
      'failure_message', 'Request reopen did not restore mutable draft state.',
      'verification', jsonb_build_object(
        'previous_status', v_previous_status,
        'current_status', public.request_lifecycle_status_norm_v1(v_result_request.status::text),
        'submitted_at_cleared', v_result_request.submitted_at is null,
        'restored_item_count', v_reset_item_count
      )
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'operation', 'request_reopen_atomic_v1',
    'request_id', v_request.id::text,
    'transition_path', 'rpc_reopen',
    'restored_item_count', v_reset_item_count,
    'request', to_jsonb(v_result_request),
    'verification', jsonb_build_object(
      'previous_status', v_previous_status,
      'current_status', public.request_lifecycle_status_norm_v1(v_result_request.status::text),
      'submitted_at_cleared', v_result_request.submitted_at is null,
      'restored_item_count', v_reset_item_count
    )
  );
end;
$request_reopen_atomic_reset$;
