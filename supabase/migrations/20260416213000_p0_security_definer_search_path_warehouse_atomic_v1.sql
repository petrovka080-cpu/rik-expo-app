-- P0 security-definer hardening: remove public search_path from active warehouse
-- issue/receive atomic RPCs. Business behavior and idempotency contracts are kept
-- 1:1 with the current production definitions.

begin;

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
    p_request_id => v_request_id,
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
      p_request_item_id => nullif(trim(coalesce(v_line ->> 'request_item_id', '')), '')
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
  'P0 security-definer hardening: preserves the idempotent warehouse request issue boundary while running with an empty search_path.';

grant execute on function public.wh_issue_request_atomic_v1(text, text, text, text, text, jsonb, text) to authenticated;

create or replace function public.wh_issue_free_atomic_v5(
  p_who text,
  p_object_name text default null,
  p_work_name text default null,
  p_note text default null,
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
  v_who text := nullif(trim(coalesce(p_who, '')), '');
  v_payload_fingerprint text;
  v_existing public.warehouse_issue_free_mutations_v1%rowtype;
  v_issue_id bigint;
  v_response jsonb;
  v_line jsonb;
  v_rik_code text;
  v_uom_id text;
  v_qty numeric;
begin
  if v_client_mutation_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'wh_issue_free_atomic_v5_missing_client_mutation_id',
      hint = 'Warehouse free issue must pass a stable client mutation id for retry safety.';
  end if;

  if v_who is null then
    raise exception using
      errcode = 'P0001',
      message = 'wh_issue_free_atomic_v5_missing_recipient',
      detail = jsonb_build_object('client_mutation_id', v_client_mutation_id)::text;
  end if;

  if p_lines is null or jsonb_typeof(p_lines) is distinct from 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception using
      errcode = 'P0001',
      message = 'wh_issue_free_atomic_v5_empty_payload',
      detail = jsonb_build_object('client_mutation_id', v_client_mutation_id)::text;
  end if;

  for v_line in select value from jsonb_array_elements(p_lines)
  loop
    v_rik_code := nullif(trim(coalesce(v_line ->> 'rik_code', '')), '');
    v_uom_id := nullif(trim(coalesce(v_line ->> 'uom_id', '')), '');
    v_qty := nullif(trim(coalesce(v_line ->> 'qty', '')), '')::numeric;

    if v_rik_code is null or v_uom_id is null or v_qty is null or v_qty <= 0 then
      raise exception using
        errcode = 'P0001',
        message = 'wh_issue_free_atomic_v5_invalid_line',
        detail = jsonb_build_object('client_mutation_id', v_client_mutation_id)::text;
    end if;
  end loop;

  v_payload_fingerprint := md5(
    jsonb_build_object(
      'who', v_who,
      'note', nullif(trim(coalesce(p_note, '')), ''),
      'object_name', nullif(trim(coalesce(p_object_name, '')), ''),
      'work_name', nullif(trim(coalesce(p_work_name, '')), ''),
      'lines', p_lines
    )::text
  );

  perform pg_advisory_xact_lock(hashtext('wh_issue_free_atomic_v5:' || v_client_mutation_id));

  select *
  into v_existing
  from public.warehouse_issue_free_mutations_v1
  where client_mutation_id = v_client_mutation_id;

  if found then
    if v_existing.payload_fingerprint <> v_payload_fingerprint then
      raise exception using
        errcode = 'P0001',
        message = 'wh_issue_free_atomic_v5_idempotency_conflict',
        detail = jsonb_build_object(
          'client_mutation_id', v_client_mutation_id,
          'issue_id', v_existing.issue_id
        )::text,
        hint = 'Reuse the same client mutation id only for the exact same warehouse free issue intent.';
    end if;

    return v_existing.response || jsonb_build_object(
      'client_mutation_id', v_client_mutation_id,
      'idempotent_replay', true
    );
  end if;

  v_issue_id := public.wh_issue_free_atomic_v4(
    p_who => v_who,
    p_object_name => p_object_name,
    p_work_name => p_work_name,
    p_note => p_note,
    p_lines => p_lines
  );

  v_response := jsonb_build_object('issue_id', v_issue_id);

  insert into public.warehouse_issue_free_mutations_v1 (
    client_mutation_id,
    payload_fingerprint,
    issue_id,
    response,
    created_at,
    updated_at
  )
  values (
    v_client_mutation_id,
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

comment on function public.wh_issue_free_atomic_v5(text, text, text, text, jsonb, text) is
  'P0 security-definer hardening: preserves the idempotent warehouse free issue boundary while running with an empty search_path.';

grant execute on function public.wh_issue_free_atomic_v5(text, text, text, text, jsonb, text) to authenticated;

create or replace function public.wh_receive_apply_ui(
  p_incoming_id text,
  p_items jsonb,
  p_client_mutation_id text,
  p_warehouseman_fio text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client_mutation_id text := nullif(trim(coalesce(p_client_mutation_id, '')), '');
  v_incoming_id text := nullif(trim(coalesce(p_incoming_id, '')), '');
  v_note text := nullif(
    trim(
      concat_ws(
        ' | ',
        nullif(trim(coalesce(p_note, '')), ''),
        case
          when nullif(trim(coalesce(p_warehouseman_fio, '')), '') is null
            then null
          else 'warehouseman: ' || trim(p_warehouseman_fio)
        end
      )
    ),
    ''
  );
  v_normalized_items jsonb;
  v_payload_fingerprint text;
  v_existing public.warehouse_receive_apply_idempotency_v1%rowtype;
  v_line jsonb;
  v_purchase_item_id text;
  v_incoming_item_id text;
  v_qty numeric;
  v_ok_count integer := 0;
  v_fail_count integer := 0;
  v_left_after integer := 0;
  v_line_ok boolean;
  v_line_left numeric;
  v_response jsonb;
begin
  if v_client_mutation_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'wh_receive_apply_ui_missing_client_mutation_id',
      hint = 'Warehouse receive apply must pass a stable client mutation id for retry safety.';
  end if;

  if v_incoming_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'wh_receive_apply_ui_missing_incoming_id',
      detail = jsonb_build_object('client_mutation_id', v_client_mutation_id)::text;
  end if;

  if p_items is null or jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception using
      errcode = 'P0001',
      message = 'wh_receive_apply_ui_empty_payload',
      detail = jsonb_build_object(
        'client_mutation_id', v_client_mutation_id,
        'incoming_id', v_incoming_id
      )::text;
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'purchase_item_id', purchase_item_id,
      'qty', qty
    )
    order by purchase_item_id
  )
  into v_normalized_items
  from (
    select
      nullif(trim(value ->> 'purchase_item_id'), '') as purchase_item_id,
      sum((nullif(trim(value ->> 'qty'), ''))::numeric) as qty
    from jsonb_array_elements(p_items)
    group by 1
  ) normalized
  where purchase_item_id is not null
    and qty > 0;

  if v_normalized_items is null or jsonb_array_length(v_normalized_items) = 0 then
    raise exception using
      errcode = 'P0001',
      message = 'wh_receive_apply_ui_invalid_payload',
      detail = jsonb_build_object(
        'client_mutation_id', v_client_mutation_id,
        'incoming_id', v_incoming_id
      )::text;
  end if;

  for v_line in select value from jsonb_array_elements(v_normalized_items)
  loop
    v_purchase_item_id := nullif(trim(v_line ->> 'purchase_item_id'), '');
    v_qty := (v_line ->> 'qty')::numeric;

    select wii.id::text
    into v_incoming_item_id
    from public.wh_incoming_items wii
    where wii.incoming_id::text = v_incoming_id
      and wii.purchase_item_id::text = v_purchase_item_id
    order by wii.id::text
    limit 1;

    if v_incoming_item_id is null then
      raise exception using
        errcode = 'P0001',
        message = 'wh_receive_apply_ui_item_not_found',
        detail = jsonb_build_object(
          'client_mutation_id', v_client_mutation_id,
          'incoming_id', v_incoming_id,
          'purchase_item_id', v_purchase_item_id
        )::text;
    end if;

    if v_qty is null or v_qty <= 0 then
      raise exception using
        errcode = 'P0001',
        message = 'wh_receive_apply_ui_invalid_line_qty',
        detail = jsonb_build_object(
          'client_mutation_id', v_client_mutation_id,
          'incoming_id', v_incoming_id,
          'purchase_item_id', v_purchase_item_id
        )::text;
    end if;
  end loop;

  v_payload_fingerprint := md5(
    jsonb_build_object(
      'incoming_id', v_incoming_id,
      'items', v_normalized_items,
      'warehouseman_fio', nullif(trim(coalesce(p_warehouseman_fio, '')), ''),
      'note', nullif(trim(coalesce(p_note, '')), '')
    )::text
  );

  perform pg_advisory_xact_lock(hashtext('wh_receive_apply_ui:' || v_client_mutation_id));

  select *
  into v_existing
  from public.warehouse_receive_apply_idempotency_v1
  where client_mutation_id = v_client_mutation_id;

  if found then
    if v_existing.payload_fingerprint <> v_payload_fingerprint then
      raise exception using
        errcode = 'P0001',
        message = 'wh_receive_apply_ui_idempotency_conflict',
        detail = jsonb_build_object(
          'client_mutation_id', v_client_mutation_id,
          'existing_incoming_id', v_existing.incoming_id,
          'incoming_id', v_incoming_id
        )::text,
        hint = 'Reuse the same client mutation id only for the exact same warehouse receive intent.';
    end if;

    return v_existing.response || jsonb_build_object(
      'client_mutation_id', v_client_mutation_id,
      'idempotent_replay', true
    );
  end if;

  for v_line in select value from jsonb_array_elements(v_normalized_items)
  loop
    v_purchase_item_id := nullif(trim(v_line ->> 'purchase_item_id'), '');
    v_qty := (v_line ->> 'qty')::numeric;

    select wii.id::text
    into v_incoming_item_id
    from public.wh_incoming_items wii
    where wii.incoming_id::text = v_incoming_id
      and wii.purchase_item_id::text = v_purchase_item_id
    order by wii.id::text
    limit 1;

    select coalesce(bool_or(result.ok), false), coalesce(sum(result.qty_left), 0)
    into v_line_ok, v_line_left
    from public.wh_receive_item_v2(
      p_incoming_item_id => v_incoming_item_id,
      p_qty => v_qty,
      p_note => v_note
    ) as result;

    if not coalesce(v_line_ok, false) then
      raise exception using
        errcode = 'P0001',
        message = 'wh_receive_apply_ui_line_failed',
        detail = jsonb_build_object(
          'client_mutation_id', v_client_mutation_id,
          'incoming_id', v_incoming_id,
          'purchase_item_id', v_purchase_item_id
        )::text;
    end if;

    v_ok_count := v_ok_count + 1;
  end loop;

  select count(*)::integer
  into v_left_after
  from public.v_wh_incoming_items_ui v
  where v.incoming_id::text = v_incoming_id
    and greatest(coalesce(v.qty_left, 0), 0) > 0;

  v_response := jsonb_build_object(
    'ok', v_ok_count,
    'fail', v_fail_count,
    'left_after', coalesce(v_left_after, 0)
  );

  insert into public.warehouse_receive_apply_idempotency_v1 (
    client_mutation_id,
    incoming_id,
    payload_fingerprint,
    response,
    created_at,
    updated_at
  )
  values (
    v_client_mutation_id,
    v_incoming_id,
    v_payload_fingerprint,
    v_response,
    now(),
    now()
  );

  return v_response || jsonb_build_object(
    'client_mutation_id', v_client_mutation_id,
    'idempotent_replay', false
  );
end;
$$;

comment on function public.wh_receive_apply_ui(text, jsonb, text, text, text) is
  'P0 security-definer hardening: preserves the idempotent warehouse receive apply boundary while running with an empty search_path.';

grant execute on function public.wh_receive_apply_ui(text, jsonb, text, text, text) to authenticated;

notify pgrst, 'reload schema';

commit;
