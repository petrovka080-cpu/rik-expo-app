begin;

create table if not exists public.warehouse_receive_apply_idempotency_v1 (
  client_mutation_id text primary key,
  incoming_id text not null,
  payload_fingerprint text not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.warehouse_receive_apply_idempotency_v1 enable row level security;

comment on table public.warehouse_receive_apply_idempotency_v1 is
  'Idempotency ledger for warehouse receive UI apply boundary. Used only by the security-definer RPC wrapper.';

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
  v_payload_fingerprint text;
  v_existing public.warehouse_receive_apply_idempotency_v1%rowtype;
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

  v_payload_fingerprint := md5(
    jsonb_build_object(
      'incoming_id', v_incoming_id,
      'items', p_items,
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

  v_response := public.wh_receive_apply_ui(
    p_incoming_id => v_incoming_id,
    p_items => p_items,
    p_note => p_note,
    p_warehouseman_fio => p_warehouseman_fio
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
    coalesce(v_response, '{}'::jsonb),
    now(),
    now()
  );

  return coalesce(v_response, '{}'::jsonb) || jsonb_build_object(
    'client_mutation_id', v_client_mutation_id,
    'idempotent_replay', false
  );
end;
$$;

comment on function public.wh_receive_apply_ui(text, jsonb, text, text, text) is
  'Idempotent warehouse receive UI apply boundary. Replays by client mutation id without applying stock impact twice.';

grant execute on function public.wh_receive_apply_ui(text, jsonb, text, text, text) to authenticated;

commit;
