begin;

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
set search_path = public
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
  'Idempotent warehouse receive UI apply boundary v2. Validates the whole receive intent before applying lines, records deterministic replay state, and relies on server rollback for partial-success prevention.';

grant execute on function public.wh_receive_apply_ui(text, jsonb, text, text, text) to authenticated;

commit;
