create table if not exists public.warehouse_issue_free_mutations_v1 (
  client_mutation_id text primary key,
  payload_fingerprint text not null,
  issue_id bigint not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.warehouse_issue_free_mutations_v1 enable row level security;

comment on table public.warehouse_issue_free_mutations_v1 is
  'Idempotency ledger for warehouse free issue boundary. Used only by the security-definer RPC wrapper.';

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
set search_path = public
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
