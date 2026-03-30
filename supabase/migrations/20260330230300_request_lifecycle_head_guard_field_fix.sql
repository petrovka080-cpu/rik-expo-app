create or replace function public.guard_request_post_submit_mutation_v1()
returns trigger
language plpgsql
set search_path = public
as $request_head_lifecycle_guard_fix$
declare
  v_old_mutable boolean := public.request_lifecycle_is_mutable_v1(old.status::text, old.submitted_at);
  v_new_status_norm text;
  v_protected_old jsonb;
  v_protected_new jsonb;
begin
  if v_old_mutable then
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
$request_head_lifecycle_guard_fix$;
