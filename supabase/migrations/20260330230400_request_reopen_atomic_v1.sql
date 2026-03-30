create or replace function public.guard_request_post_submit_mutation_v1()
returns trigger
language plpgsql
set search_path = public
as $request_head_lifecycle_guard_reopen$
declare
  v_old_mutable boolean := public.request_lifecycle_is_mutable_v1(old.status::text, old.submitted_at);
  v_new_status_norm text;
  v_protected_old jsonb;
  v_protected_new jsonb;
  v_transition text := current_setting('app.request_lifecycle_transition', true);
begin
  if v_old_mutable or v_transition = 'request_reopen_atomic_v1' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'DELETE' then
    raise exception using
      errcode = 'P0001',
      message = 'request_lifecycle_guard: submitted_request_delete_blocked',
      detail = coalesce(old.id::text, ''),
      hint = 'Submitted requests must stay immutable outside canonical server lifecycle transitions.';
  end if;

  v_protected_old := jsonb_build_object(
    'foreman_name', old.foreman_name,
    'need_by', old.need_by,
    'comment', old.comment,
    'object_type_code', old.object_type_code,
    'level_code', old.level_code,
    'system_code', old.system_code,
    'zone_code', old.zone_code,
    'subcontract_id', old.subcontract_id,
    'contractor_job_id', old.contractor_job_id,
    'object_name', old.object_name
  );
  v_protected_new := jsonb_build_object(
    'foreman_name', new.foreman_name,
    'need_by', new.need_by,
    'comment', new.comment,
    'object_type_code', new.object_type_code,
    'level_code', new.level_code,
    'system_code', new.system_code,
    'zone_code', new.zone_code,
    'subcontract_id', new.subcontract_id,
    'contractor_job_id', new.contractor_job_id,
    'object_name', new.object_name
  );

  if v_protected_old is distinct from v_protected_new then
    raise exception using
      errcode = 'P0001',
      message = 'request_lifecycle_guard: submitted_request_content_immutable',
      detail = coalesce(old.id::text, ''),
      hint = 'Submitted request content must not be edited through draft or direct table paths.';
  end if;

  v_new_status_norm := public.request_lifecycle_status_norm_v1(new.status::text);
  if new.submitted_at is null and old.submitted_at is not null then
    raise exception using
      errcode = 'P0001',
      message = 'request_lifecycle_guard: submitted_request_submit_marker_immutable',
      detail = coalesce(old.id::text, ''),
      hint = 'Submitted requests must keep their submit marker after lifecycle transition.';
  end if;

  if v_new_status_norm in (
    '',
    'draft',
    lower(U&'\0427\0435\0440\043D\043E\0432\0438\043A')
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'request_lifecycle_guard: submitted_request_draft_downgrade_blocked',
      detail = coalesce(old.id::text, ''),
      hint = 'Submitted requests cannot be downgraded back to draft through legacy client paths.';
  end if;

  return new;
end;
$request_head_lifecycle_guard_reopen$;

create or replace function public.guard_request_item_post_submit_mutation_v1()
returns trigger
language plpgsql
set search_path = public
as $request_item_lifecycle_guard_reopen$
declare
  v_request_id uuid;
  v_request_status text;
  v_request_submitted_at timestamptz;
  v_request_mutable boolean;
  v_new_status_norm text;
  v_protected_old jsonb;
  v_protected_new jsonb;
  v_transition text := current_setting('app.request_lifecycle_transition', true);
begin
  v_request_id := case when tg_op = 'INSERT' then new.request_id else old.request_id end;

  select r.status::text, r.submitted_at
    into v_request_status, v_request_submitted_at
  from public.requests r
  where r.id = v_request_id;

  if not found then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  v_request_mutable := public.request_lifecycle_is_mutable_v1(v_request_status, v_request_submitted_at);
  if v_request_mutable or v_transition = 'request_reopen_atomic_v1' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'INSERT' then
    raise exception using
      errcode = 'P0001',
      message = 'request_lifecycle_guard: submitted_request_item_insert_blocked',
      detail = coalesce(v_request_id::text, ''),
      hint = 'Submitted requests cannot receive new request_items through stale draft or direct insert paths.';
  end if;

  if tg_op = 'DELETE' then
    raise exception using
      errcode = 'P0001',
      message = 'request_lifecycle_guard: submitted_request_item_delete_blocked',
      detail = coalesce(v_request_id::text, ''),
      hint = 'Submitted request_items cannot be deleted through legacy draft paths.';
  end if;

  v_protected_old := jsonb_build_object(
    'request_id', old.request_id,
    'rik_code', old.rik_code,
    'qty', old.qty,
    'name_human', old.name_human,
    'uom', old.uom,
    'note', old.note,
    'app_code', old.app_code,
    'kind', old.kind,
    'row_no', old.row_no,
    'position_order', old.position_order,
    'cancelled_at', old.cancelled_at
  );
  v_protected_new := jsonb_build_object(
    'request_id', new.request_id,
    'rik_code', new.rik_code,
    'qty', new.qty,
    'name_human', new.name_human,
    'uom', new.uom,
    'note', new.note,
    'app_code', new.app_code,
    'kind', new.kind,
    'row_no', new.row_no,
    'position_order', new.position_order,
    'cancelled_at', new.cancelled_at
  );

  if v_protected_old is distinct from v_protected_new then
    raise exception using
      errcode = 'P0001',
      message = 'request_lifecycle_guard: submitted_request_item_content_immutable',
      detail = coalesce(old.id::text, ''),
      hint = 'Submitted request_items must not have qty or composition mutated through legacy client paths.';
  end if;

  v_new_status_norm := public.request_lifecycle_status_norm_v1(new.status::text);
  if v_new_status_norm in (
    '',
    'draft',
    lower(U&'\0427\0435\0440\043D\043E\0432\0438\043A'),
    'cancelled',
    'canceled',
    lower(U&'\041E\0442\043C\0435\043D\0435\043D\0430'),
    lower(U&'\041E\0442\043C\0435\043D\0435\043D\043E')
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'request_lifecycle_guard: submitted_request_item_invalid_transition',
      detail = coalesce(old.id::text, ''),
      hint = 'Submitted request_items cannot be returned to draft or cancelled through foreman draft paths.';
  end if;

  return new;
end;
$request_item_lifecycle_guard_reopen$;
