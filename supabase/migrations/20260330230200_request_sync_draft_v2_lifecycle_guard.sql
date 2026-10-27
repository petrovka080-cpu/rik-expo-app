create or replace function public.request_sync_draft_v2(
  p_request_id uuid default null,
  p_submit boolean default false,
  p_foreman_name text default null,
  p_need_by date default null,
  p_comment text default null,
  p_object_type_code text default null,
  p_level_code text default null,
  p_system_code text default null,
  p_zone_code text default null,
  p_subcontract_id text default null,
  p_contractor_job_id text default null,
  p_object_name text default null,
  p_level_name text default null,
  p_system_name text default null,
  p_zone_name text default null,
  p_items jsonb default '[]'::jsonb,
  p_pending_delete_ids text[] default array[]::text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $request_sync_draft_v2_lifecycle$
declare
  v_request public.requests;
  v_item jsonb;
  v_item_id uuid;
  v_existing_item_id uuid;
  v_subcontract_id uuid;
  v_contractor_job_id uuid;
  v_qty numeric;
  v_rik_code text;
  v_note text;
  v_app_code text;
  v_kind text;
  v_name_human text;
  v_uom text;
  v_created boolean := false;
  v_items_payload jsonb := '[]'::jsonb;
  v_consumed_item_ids uuid[] := array[]::uuid[];
  v_submit_result jsonb := null;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'request_sync_draft_v2: p_items must be a JSON array';
  end if;

  v_subcontract_id :=
    case
      when nullif(btrim(coalesce(p_subcontract_id, '')), '') is null then null
      when btrim(p_subcontract_id) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then btrim(p_subcontract_id)::uuid
      else null
    end;
  v_contractor_job_id :=
    case
      when nullif(btrim(coalesce(p_contractor_job_id, '')), '') is null then null
      when btrim(p_contractor_job_id) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then btrim(p_contractor_job_id)::uuid
      else null
    end;

  if p_request_id is null then
    select *
      into v_request
    from public.request_create_draft(
      p_foreman_name => p_foreman_name,
      p_need_by => p_need_by,
      p_comment => p_comment,
      p_object_type_code => p_object_type_code,
      p_level_code => p_level_code,
      p_system_code => p_system_code,
      p_zone_code => p_zone_code
    );
    v_created := true;

    if p_subcontract_id is not null or p_contractor_job_id is not null or p_object_name is not null then
      update public.requests
         set subcontract_id = coalesce(v_subcontract_id, subcontract_id),
             contractor_job_id = coalesce(v_contractor_job_id, contractor_job_id),
             object_name = coalesce(nullif(btrim(coalesce(p_object_name, '')), ''), object_name)
       where id = v_request.id
       returning * into v_request;
    end if;
  else
    select *
      into v_request
    from public.requests
    where id = p_request_id
    for update;

    if not found then
      raise exception 'request_sync_draft_v2: request % not found', p_request_id;
    end if;

    if not public.request_lifecycle_is_mutable_v1(v_request.status::text, v_request.submitted_at) then
      raise exception using
        errcode = 'P0001',
        message = 'request_sync_draft_v2: stale_draft_against_submitted_request',
        detail = coalesce(v_request.id::text, ''),
        hint = 'Submitted requests are immutable; reopen or rework requires a canonical server transition.';
    end if;

    update public.requests
       set foreman_name = p_foreman_name,
           need_by = p_need_by,
           comment = p_comment,
           object_type_code = nullif(btrim(coalesce(p_object_type_code, '')), ''),
           level_code = nullif(btrim(coalesce(p_level_code, '')), ''),
           system_code = nullif(btrim(coalesce(p_system_code, '')), ''),
           zone_code = nullif(btrim(coalesce(p_zone_code, '')), ''),
           subcontract_id = coalesce(v_subcontract_id, subcontract_id),
           contractor_job_id = coalesce(v_contractor_job_id, contractor_job_id),
           object_name = coalesce(nullif(btrim(coalesce(p_object_name, '')), ''), object_name)
     where id = v_request.id
     returning * into v_request;
  end if;

  if coalesce(array_length(p_pending_delete_ids, 1), 0) > 0 then
    update public.request_items
       set status = 'cancelled',
           cancelled_at = coalesce(cancelled_at, now())
     where request_id = v_request.id
       and id::text = any(p_pending_delete_ids);
  end if;

  for v_item in
    select value
    from jsonb_array_elements(p_items) as item(value)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'request_sync_draft_v2: every item must be an object';
    end if;

    v_item_id :=
      case
        when nullif(btrim(coalesce(v_item ->> 'request_item_id', '')), '') is null then null
        when btrim(v_item ->> 'request_item_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then (v_item ->> 'request_item_id')::uuid
        else null
      end;
    v_rik_code := nullif(btrim(coalesce(v_item ->> 'rik_code', '')), '');
    v_qty := nullif(btrim(coalesce(v_item ->> 'qty', '')), '')::numeric;
    v_note := nullif(btrim(coalesce(v_item ->> 'note', '')), '');
    v_app_code := nullif(btrim(coalesce(v_item ->> 'app_code', '')), '');
    v_kind := nullif(btrim(coalesce(v_item ->> 'kind', '')), '');
    v_name_human := nullif(btrim(coalesce(v_item ->> 'name_human', '')), '');
    v_uom := nullif(btrim(coalesce(v_item ->> 'uom', '')), '');

    if v_qty is null or v_qty <= 0 then
      raise exception 'request_sync_draft_v2: qty must be > 0';
    end if;

    if v_item_id is not null then
      perform public.request_item_update_qty(v_item_id, v_qty);
    else
      select ri.id
        into v_existing_item_id
      from public.request_items ri
      where ri.request_id = v_request.id
        and ri.cancelled_at is null
        and v_rik_code is not null
        and upper(btrim(coalesce(ri.rik_code, ''))) = upper(v_rik_code)
        and not (ri.id = any(v_consumed_item_ids))
      order by ri.position_order asc, ri.row_no asc, ri.created_at asc, ri.id asc
      limit 1
      for update;

      if v_existing_item_id is not null then
        v_item_id := v_existing_item_id;
        perform public.request_item_update_qty(v_item_id, v_qty);
      else
        if v_rik_code is null then
          raise exception 'request_sync_draft_v2: rik_code is required for new items';
        end if;

        v_item_id := nullif(
          btrim(
            public.request_item_add_or_inc(
              p_request_id => v_request.id,
              p_rik_code => v_rik_code,
              p_qty_add => v_qty
            )::text
          ),
          ''
        )::uuid;
      end if;
    end if;

    if v_item_id is null then
      raise exception 'request_sync_draft_v2: item mutation returned empty id';
    end if;

    update public.request_items
       set status = 'draft',
           note = v_note,
           app_code = v_app_code,
           kind = v_kind,
           name_human = coalesce(v_name_human, name_human),
           uom = coalesce(v_uom, uom)
     where id = v_item_id
       and request_id = v_request.id;

    v_consumed_item_ids := array_append(v_consumed_item_ids, v_item_id);
    v_existing_item_id := null;
  end loop;

  if p_submit then
    v_submit_result := public.request_submit_atomic_v1(v_request.id::text);
    if coalesce((v_submit_result ->> 'ok')::boolean, false) is not true then
      raise exception using
        errcode = 'P0001',
        message = format(
          'request_sync_draft_v2: submit_transition_failed:%s',
          coalesce(v_submit_result ->> 'failure_code', 'unknown')
        ),
        detail = coalesce(v_submit_result ->> 'failure_message', 'request submit failed'),
        hint = 'Submit requires a valid mutable draft with at least one active request item.';
    end if;
  end if;

  select *
    into v_request
  from public.requests
  where id = v_request.id;

  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'id', ri.id,
               'request_id', ri.request_id,
               'rik_code', ri.rik_code,
               'name_human', ri.name_human,
               'qty', ri.qty,
               'uom', ri.uom,
               'status', ri.status,
               'supplier_hint', ri.supplier_hint,
               'app_code', ri.app_code,
               'note', ri.note,
               'line_no', ri.row_no
             )
             order by ri.position_order asc, ri.row_no asc, ri.created_at asc, ri.id asc
           ),
           '[]'::jsonb
         )
    into v_items_payload
  from public.request_items ri
  where ri.request_id = v_request.id
    and lower(coalesce(ri.status, '')) <> 'cancelled';

  return jsonb_build_object(
    'document_type', 'request_draft_sync',
    'version', 'v2',
    'generated_at', timezone('utc', now()),
    'request_payload', to_jsonb(v_request),
    'items_payload', v_items_payload,
    'submitted', p_submit,
    'request_created', v_created,
    'meta', jsonb_build_object(
      'line_count', jsonb_array_length(p_items),
      'pending_delete_count', coalesce(array_length(p_pending_delete_ids, 1), 0),
      'submit_owner', case when p_submit then 'request_submit_atomic_v1' else null end,
      'submit_path', case when p_submit then v_submit_result ->> 'submit_path' else null end,
      'submit_verification', case when p_submit then coalesce(v_submit_result -> 'verification', 'null'::jsonb) else null end
    )
  );
end;
$request_sync_draft_v2_lifecycle$;
