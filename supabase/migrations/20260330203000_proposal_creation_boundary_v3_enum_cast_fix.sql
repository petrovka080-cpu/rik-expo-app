begin;

create table if not exists public.proposal_submit_mutations_v1 (
  client_mutation_id text primary key,
  buyer_user_id uuid null,
  request_id text not null,
  payload_fingerprint text not null,
  response jsonb not null,
  created_proposal_count integer not null default 0,
  created_item_count integer not null default 0,
  replay_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_replayed_at timestamptz null
);

create index if not exists proposal_submit_mutations_v1_request_id_idx
  on public.proposal_submit_mutations_v1(request_id);

create index if not exists proposal_submit_mutations_v1_created_at_idx
  on public.proposal_submit_mutations_v1(created_at desc);

revoke all on table public.proposal_submit_mutations_v1 from anon, authenticated;
alter table public.proposal_submit_mutations_v1 enable row level security;

comment on table public.proposal_submit_mutations_v1 is
'Idempotency ledger for the canonical buyer proposal atomic boundary. Stores the final committed response for replay-safe submit.';

create or replace function public.rpc_proposal_submit_v3(
  p_client_mutation_id text,
  p_buckets jsonb,
  p_buyer_fio text default null,
  p_submit boolean default true,
  p_request_item_status text default null,
  p_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_mutation_id text := nullif(trim(coalesce(p_client_mutation_id, '')), '');
  v_payload jsonb := coalesce(p_buckets, '[]'::jsonb);
  v_buyer_fio text := nullif(trim(coalesce(p_buyer_fio, '')), '');
  v_status_after text := nullif(trim(coalesce(p_request_item_status, '')), '');
  v_request_id text := nullif(trim(coalesce(p_request_id, '')), '');
  v_payload_fingerprint text;
  v_existing_response jsonb;
  v_existing_request_id text;
  v_existing_payload_fingerprint text;
  v_existing_replay_count integer := 0;
  v_actor_id uuid := auth.uid();
  v_expected_bucket_count integer := 0;
  v_expected_item_count integer := 0;
  v_created_proposal_count integer := 0;
  v_created_item_count integer := 0;
  v_created_proposals jsonb := '[]'::jsonb;
  v_empty_bucket_indexes integer[] := '{}';
  v_duplicate_request_item_ids text[] := '{}';
  v_duplicate_meta_ids text[] := '{}';
  v_missing_request_item_ids text[] := '{}';
  v_invalid_request_item_ids text[] := '{}';
  v_invalid_price_ids text[] := '{}';
  v_invalid_qty_ids text[] := '{}';
  v_scope_request_ids text[] := '{}';
  v_bucket record;
  v_proposal_id text;
  v_proposal_no text;
  v_raw_status text;
  v_submitted_at timestamptz;
  v_sent_to_accountant_at timestamptz;
  v_supplier text;
  v_bucket_request_item_ids text[] := '{}';
  v_bucket_items_count integer := 0;
  v_response jsonb;
begin
  if v_client_mutation_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'proposal_submit_v3_missing_client_mutation_id',
      hint = 'Buyer submit must pass a stable client_mutation_id for idempotency.';
  end if;

  if jsonb_typeof(v_payload) is distinct from 'array' or jsonb_array_length(v_payload) = 0 then
    raise exception using
      errcode = 'P0001',
      message = 'proposal_submit_v3_empty_payload',
      detail = jsonb_build_object('client_mutation_id', v_client_mutation_id)::text;
  end if;

  v_expected_bucket_count := jsonb_array_length(v_payload);

  perform pg_advisory_xact_lock(hashtext('rpc_proposal_submit_v3:' || v_client_mutation_id));

  v_payload_fingerprint := md5(
    jsonb_build_object(
      'buckets', v_payload,
      'buyer_fio', v_buyer_fio,
      'submit', coalesce(p_submit, true),
      'request_item_status', v_status_after,
      'request_id', v_request_id
    )::text
  );

  select
    response,
    request_id,
    payload_fingerprint,
    replay_count
  into
    v_existing_response,
    v_existing_request_id,
    v_existing_payload_fingerprint,
    v_existing_replay_count
  from public.proposal_submit_mutations_v1
  where client_mutation_id = v_client_mutation_id;

  if v_existing_response is not null then
    if v_existing_payload_fingerprint <> v_payload_fingerprint then
      raise exception using
        errcode = 'P0001',
        message = 'proposal_submit_v3_idempotency_conflict',
        detail = jsonb_build_object(
          'client_mutation_id', v_client_mutation_id,
          'existing_request_id', v_existing_request_id,
          'incoming_request_id', v_request_id
        )::text,
        hint = 'Reuse the same client_mutation_id only for the exact same proposal submit intent.';
    end if;

    update public.proposal_submit_mutations_v1
    set
      replay_count = coalesce(replay_count, 0) + 1,
      last_replayed_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
    where client_mutation_id = v_client_mutation_id;

    return jsonb_set(
      v_existing_response,
      '{meta}',
      coalesce(v_existing_response -> 'meta', '{}'::jsonb) || jsonb_build_object(
        'canonical_path', 'rpc:proposal_submit_v3',
        'idempotent_replay', true,
        'replay_count', coalesce(v_existing_replay_count, 0) + 1
      ),
      true
    );
  end if;

  with raw_buckets as (
    select
      (ord - 1)::integer as bucket_index,
      coalesce(bucket, '{}'::jsonb) as bucket,
      coalesce(bucket -> 'request_item_ids', '[]'::jsonb) as request_item_ids
    from jsonb_array_elements(v_payload) with ordinality as t(bucket, ord)
  )
  select coalesce(array_agg(bucket_index order by bucket_index), '{}')
  into v_empty_bucket_indexes
  from raw_buckets
  where jsonb_typeof(request_item_ids) is distinct from 'array'
    or jsonb_array_length(request_item_ids) = 0;

  if coalesce(array_length(v_empty_bucket_indexes, 1), 0) > 0 then
    raise exception using
      errcode = 'P0001',
      message = 'proposal_submit_v3_empty_bucket',
      detail = jsonb_build_object(
        'client_mutation_id', v_client_mutation_id,
        'bucket_indexes', v_empty_bucket_indexes
      )::text;
  end if;

  with raw_buckets as (
    select
      (ord - 1)::integer as bucket_index,
      coalesce(bucket -> 'request_item_ids', '[]'::jsonb) as request_item_ids
    from jsonb_array_elements(v_payload) with ordinality as t(bucket, ord)
  ),
  raw_items as (
    select
      rb.bucket_index,
      trim(item_id.value) as request_item_id
    from raw_buckets rb
    cross join lateral jsonb_array_elements_text(rb.request_item_ids) as item_id(value)
  )
  select coalesce(array_agg(request_item_id order by request_item_id), '{}')
  into v_duplicate_request_item_ids
  from (
    select request_item_id
    from raw_items
    where request_item_id <> ''
    group by request_item_id
    having count(*) > 1
  ) duplicates;

  if coalesce(array_length(v_duplicate_request_item_ids, 1), 0) > 0 then
    raise exception using
      errcode = 'P0001',
      message = 'proposal_submit_v3_duplicate_request_items',
      detail = jsonb_build_object(
        'client_mutation_id', v_client_mutation_id,
        'request_item_ids', v_duplicate_request_item_ids
      )::text;
  end if;

  with raw_buckets as (
    select
      (ord - 1)::integer as bucket_index,
      coalesce(bucket -> 'meta', '[]'::jsonb) as meta_rows
    from jsonb_array_elements(v_payload) with ordinality as t(bucket, ord)
  ),
  raw_meta as (
    select
      rb.bucket_index,
      trim(coalesce(meta_row ->> 'request_item_id', '')) as request_item_id
    from raw_buckets rb
    cross join lateral jsonb_array_elements(rb.meta_rows) as meta(meta_row)
  )
  select coalesce(array_agg(request_item_id order by request_item_id), '{}')
  into v_duplicate_meta_ids
  from (
    select request_item_id
    from raw_meta
    where request_item_id <> ''
    group by bucket_index, request_item_id
    having count(*) > 1
  ) duplicates;

  if coalesce(array_length(v_duplicate_meta_ids, 1), 0) > 0 then
    raise exception using
      errcode = 'P0001',
      message = 'proposal_submit_v3_duplicate_meta_rows',
      detail = jsonb_build_object(
        'client_mutation_id', v_client_mutation_id,
        'request_item_ids', v_duplicate_meta_ids
      )::text;
  end if;

  with raw_buckets as (
    select
      (ord - 1)::integer as bucket_index,
      nullif(trim(coalesce(bucket ->> 'supplier', '')), '') as bucket_supplier,
      coalesce(bucket -> 'request_item_ids', '[]'::jsonb) as request_item_ids,
      coalesce(bucket -> 'meta', '[]'::jsonb) as meta_rows
    from jsonb_array_elements(v_payload) with ordinality as t(bucket, ord)
  ),
  raw_items as (
    select
      rb.bucket_index,
      item_ord::integer as item_ord,
      rb.bucket_supplier,
      trim(item_id.value) as request_item_id
    from raw_buckets rb
    cross join lateral jsonb_array_elements_text(rb.request_item_ids) with ordinality as item_id(value, item_ord)
  ),
  raw_meta as (
    select
      rb.bucket_index,
      trim(coalesce(meta_row ->> 'request_item_id', '')) as request_item_id,
      nullif(trim(coalesce(meta_row ->> 'price', '')), '') as price_text,
      nullif(trim(coalesce(meta_row ->> 'supplier', '')), '') as meta_supplier,
      nullif(coalesce(meta_row ->> 'note', ''), '') as note
    from raw_buckets rb
    cross join lateral jsonb_array_elements(rb.meta_rows) as meta(meta_row)
  ),
  normalized as (
    select
      ri.bucket_index,
      ri.item_ord,
      ri.request_item_id,
      coalesce(rm.meta_supplier, ri.bucket_supplier) as supplier,
      rm.note,
      rm.price_text,
      case
        when rm.price_text is null then null
        when replace(rm.price_text, ',', '.') ~ '^[0-9]+(\\.[0-9]+)?$'
          then replace(rm.price_text, ',', '.')::numeric
        else null
      end as price_num,
      src.id::text as found_request_item_id,
      src.request_id::text as request_id,
      src.qty,
      src.name_human,
      src.uom,
      src.app_code,
      src.rik_code,
      src.status as request_item_status,
      src.cancelled_at,
      src.director_reject_at,
      src.director_reject_note,
      req.status as request_status,
      case
        when src.id is null then false
        when src.cancelled_at is not null then false
        when lower(trim(coalesce(src.status::text, ''))) in ('cancelled', 'canceled', 'отменена', 'отменено') then false
        when src.director_reject_at is not null or nullif(trim(coalesce(src.director_reject_note, '')), '') is not null then true
        when (
          case
            when strpos(regexp_replace(lower(trim(coalesce(req.status::text, ''))), '\\s+', ' ', 'g'), 'на утверждении') > 0 then false
            when strpos(regexp_replace(lower(trim(coalesce(req.status::text, ''))), '\\s+', ' ', 'g'), 'pending') > 0 then false
            when regexp_replace(lower(trim(coalesce(req.status::text, ''))), '\\s+', ' ', 'g') = 'approved' then true
            when strpos(regexp_replace(lower(trim(coalesce(req.status::text, ''))), '\\s+', ' ', 'g'), 'утвержден') > 0 then true
            when strpos(regexp_replace(lower(trim(coalesce(req.status::text, ''))), '\\s+', ' ', 'g'), 'утверждён') > 0 then true
            when strpos(regexp_replace(lower(trim(coalesce(req.status::text, ''))), '\\s+', ' ', 'g'), 'закуп') > 0 then true
            else false
          end
        ) then true
        when (
          case
            when strpos(regexp_replace(lower(trim(coalesce(src.status::text, ''))), '\\s+', ' ', 'g'), 'на утверждении') > 0 then false
            when strpos(regexp_replace(lower(trim(coalesce(src.status::text, ''))), '\\s+', ' ', 'g'), 'pending') > 0 then false
            when regexp_replace(lower(trim(coalesce(src.status::text, ''))), '\\s+', ' ', 'g') = 'approved' then true
            when strpos(regexp_replace(lower(trim(coalesce(src.status::text, ''))), '\\s+', ' ', 'g'), 'утвержден') > 0 then true
            when strpos(regexp_replace(lower(trim(coalesce(src.status::text, ''))), '\\s+', ' ', 'g'), 'утверждён') > 0 then true
            when strpos(regexp_replace(lower(trim(coalesce(src.status::text, ''))), '\\s+', ' ', 'g'), 'закуп') > 0 then true
            else false
          end
        ) then true
        else false
      end as item_allowed
    from raw_items ri
    left join raw_meta rm
      on rm.bucket_index = ri.bucket_index
     and rm.request_item_id = ri.request_item_id
    left join public.request_items src
      on src.id::text = ri.request_item_id
    left join public.requests req
      on req.id::text = src.request_id::text
  )
  select
    coalesce(array_agg(request_item_id order by request_item_id) filter (where found_request_item_id is null), '{}'),
    coalesce(array_agg(request_item_id order by request_item_id) filter (where found_request_item_id is not null and item_allowed = false), '{}'),
    coalesce(array_agg(request_item_id order by request_item_id) filter (where price_num is null or price_num <= 0), '{}'),
    coalesce(array_agg(request_item_id order by request_item_id) filter (where qty is null or qty <= 0), '{}'),
    coalesce(array_agg(distinct request_id) filter (where request_id is not null), '{}'),
    count(*)::integer
  into
    v_missing_request_item_ids,
    v_invalid_request_item_ids,
    v_invalid_price_ids,
    v_invalid_qty_ids,
    v_scope_request_ids,
    v_expected_item_count
  from normalized;

  if coalesce(array_length(v_missing_request_item_ids, 1), 0) > 0 then
    raise exception using
      errcode = 'P0001',
      message = 'proposal_submit_v3_missing_request_items',
      detail = jsonb_build_object(
        'client_mutation_id', v_client_mutation_id,
        'request_item_ids', v_missing_request_item_ids
      )::text;
  end if;

  if coalesce(array_length(v_invalid_request_item_ids, 1), 0) > 0 then
    raise exception using
      errcode = 'P0001',
      message = 'proposal_submit_v3_invalid_request_item_state',
      detail = jsonb_build_object(
        'client_mutation_id', v_client_mutation_id,
        'request_item_ids', v_invalid_request_item_ids
      )::text,
      hint = 'Only approved or buyer-rework request_items may be proposed.';
  end if;

  if coalesce(array_length(v_invalid_price_ids, 1), 0) > 0 then
    raise exception using
      errcode = 'P0001',
      message = 'proposal_submit_v3_invalid_price',
      detail = jsonb_build_object(
        'client_mutation_id', v_client_mutation_id,
        'request_item_ids', v_invalid_price_ids
      )::text;
  end if;

  if coalesce(array_length(v_invalid_qty_ids, 1), 0) > 0 then
    raise exception using
      errcode = 'P0001',
      message = 'proposal_submit_v3_invalid_qty',
      detail = jsonb_build_object(
        'client_mutation_id', v_client_mutation_id,
        'request_item_ids', v_invalid_qty_ids
      )::text;
  end if;

  if coalesce(array_length(v_scope_request_ids, 1), 0) = 0 then
    raise exception using
      errcode = 'P0001',
      message = 'proposal_submit_v3_request_scope_missing',
      detail = jsonb_build_object('client_mutation_id', v_client_mutation_id)::text;
  end if;

  if coalesce(array_length(v_scope_request_ids, 1), 0) > 1 then
    raise exception using
      errcode = 'P0001',
      message = 'proposal_submit_v3_cross_request_scope',
      detail = jsonb_build_object(
        'client_mutation_id', v_client_mutation_id,
        'request_ids', v_scope_request_ids
      )::text;
  end if;

  if v_request_id is not null and v_scope_request_ids[1] is distinct from v_request_id then
    raise exception using
      errcode = 'P0001',
      message = 'proposal_submit_v3_request_scope_mismatch',
      detail = jsonb_build_object(
        'client_mutation_id', v_client_mutation_id,
        'expected_request_id', v_request_id,
        'actual_request_id', v_scope_request_ids[1]
      )::text;
  end if;

  v_request_id := coalesce(v_request_id, v_scope_request_ids[1]);

  for v_bucket in
    with raw_buckets as (
      select
        (ord - 1)::integer as bucket_index,
        nullif(trim(coalesce(bucket ->> 'supplier', '')), '') as bucket_supplier,
        coalesce(bucket -> 'request_item_ids', '[]'::jsonb) as request_item_ids,
        coalesce(bucket -> 'meta', '[]'::jsonb) as meta_rows
      from jsonb_array_elements(v_payload) with ordinality as t(bucket, ord)
    ),
    raw_items as (
      select
        rb.bucket_index,
        item_ord::integer as item_ord,
        rb.bucket_supplier,
        trim(item_id.value) as request_item_id
      from raw_buckets rb
      cross join lateral jsonb_array_elements_text(rb.request_item_ids) with ordinality as item_id(value, item_ord)
    )
    select
      bucket_index,
      max(bucket_supplier) as supplier,
      array_agg(request_item_id order by item_ord) as request_item_ids,
      count(*)::integer as item_count
    from raw_items
    group by bucket_index
    order by bucket_index
  loop
    select public.proposal_create() into v_proposal_id;

    if nullif(trim(coalesce(v_proposal_id, '')), '') is null then
      raise exception using
        errcode = 'P0001',
        message = 'proposal_submit_v3_empty_proposal_id',
        detail = jsonb_build_object(
          'client_mutation_id', v_client_mutation_id,
          'bucket_index', v_bucket.bucket_index
        )::text;
    end if;

    update public.proposals
    set
      buyer_fio = coalesce(v_buyer_fio, buyer_fio),
      supplier = v_bucket.supplier,
      request_id = v_request_id,
      display_no = coalesce(display_no, proposal_no),
      updated_at = timezone('utc', now())
    where id = v_proposal_id;

    with raw_buckets as (
      select
        (ord - 1)::integer as bucket_index,
        nullif(trim(coalesce(bucket ->> 'supplier', '')), '') as bucket_supplier,
        coalesce(bucket -> 'request_item_ids', '[]'::jsonb) as request_item_ids,
        coalesce(bucket -> 'meta', '[]'::jsonb) as meta_rows
      from jsonb_array_elements(v_payload) with ordinality as t(bucket, ord)
    ),
    raw_items as (
      select
        rb.bucket_index,
        item_ord::integer as item_ord,
        rb.bucket_supplier,
        trim(item_id.value) as request_item_id
      from raw_buckets rb
      cross join lateral jsonb_array_elements_text(rb.request_item_ids) with ordinality as item_id(value, item_ord)
    ),
    raw_meta as (
      select
        rb.bucket_index,
        trim(coalesce(meta_row ->> 'request_item_id', '')) as request_item_id,
        nullif(trim(coalesce(meta_row ->> 'price', '')), '') as price_text,
        nullif(trim(coalesce(meta_row ->> 'supplier', '')), '') as meta_supplier,
        nullif(coalesce(meta_row ->> 'note', ''), '') as note
      from raw_buckets rb
      cross join lateral jsonb_array_elements(rb.meta_rows) as meta(meta_row)
    ),
    normalized as (
      select
        ri.bucket_index,
        ri.item_ord,
        ri.request_item_id,
        coalesce(rm.meta_supplier, ri.bucket_supplier) as supplier,
        rm.note,
        replace(rm.price_text, ',', '.')::numeric as price_num,
        src.qty,
        src.name_human,
        src.uom,
        src.app_code,
        src.rik_code
      from raw_items ri
      join raw_meta rm
        on rm.bucket_index = ri.bucket_index
       and rm.request_item_id = ri.request_item_id
      join public.request_items src
        on src.id::text = ri.request_item_id
      where ri.bucket_index = v_bucket.bucket_index
    )
    insert into public.proposal_items (
      proposal_id,
      proposal_id_text,
      request_item_id,
      name_human,
      uom,
      qty,
      total_qty,
      app_code,
      rik_code,
      price,
      supplier,
      note
    )
    select
      v_proposal_id,
      v_proposal_id,
      request_item_id,
      name_human,
      uom,
      qty,
      qty,
      app_code,
      rik_code,
      price_num,
      supplier,
      note
    from normalized
    order by item_ord;

    get diagnostics v_bucket_items_count = row_count;
    v_bucket_request_item_ids := v_bucket.request_item_ids;

    if v_bucket_items_count <> coalesce(array_length(v_bucket_request_item_ids, 1), 0) then
      raise exception using
        errcode = 'P0001',
        message = 'proposal_submit_v3_partial_insert_detected',
        detail = jsonb_build_object(
          'client_mutation_id', v_client_mutation_id,
          'bucket_index', v_bucket.bucket_index,
          'expected_items', coalesce(array_length(v_bucket_request_item_ids, 1), 0),
          'actual_items', v_bucket_items_count
        )::text;
    end if;

    if coalesce(p_submit, true) then
      perform public.proposal_submit_text_v1(v_proposal_id);
    end if;

    if v_status_after is not null then
      perform public.request_items_set_status(
        p_request_item_ids => v_bucket_request_item_ids,
        p_status => v_status_after
      );
    end if;

    select
      coalesce(
        nullif(trim(coalesce(display_no, '')), ''),
        nullif(trim(coalesce(proposal_no, '')), ''),
        case when id_short is not null then 'PR-' || id_short::text else null end
      ),
      status,
      submitted_at,
      sent_to_accountant_at,
      supplier
    into
      v_proposal_no,
      v_raw_status,
      v_submitted_at,
      v_sent_to_accountant_at,
      v_supplier
    from public.proposals
    where id = v_proposal_id;

    v_created_proposal_count := v_created_proposal_count + 1;
    v_created_item_count := v_created_item_count + v_bucket_items_count;
    v_created_proposals := v_created_proposals || jsonb_build_array(
      jsonb_build_object(
        'bucket_index', v_bucket.bucket_index,
        'proposal_id', v_proposal_id,
        'proposal_no', v_proposal_no,
        'supplier', coalesce(v_supplier, v_bucket.supplier),
        'request_item_ids', to_jsonb(v_bucket_request_item_ids),
        'raw_status', v_raw_status,
        'submitted_at', v_submitted_at,
        'sent_to_accountant_at', v_sent_to_accountant_at,
        'submit_source', case when coalesce(p_submit, true) then 'rpc:proposal_submit_text_v1' else null end
      )
    );
  end loop;

  if v_created_proposal_count <> v_expected_bucket_count or v_created_item_count <> v_expected_item_count then
    raise exception using
      errcode = 'P0001',
      message = 'proposal_submit_v3_result_mismatch',
      detail = jsonb_build_object(
        'client_mutation_id', v_client_mutation_id,
        'expected_bucket_count', v_expected_bucket_count,
        'expected_item_count', v_expected_item_count,
        'created_proposal_count', v_created_proposal_count,
        'created_item_count', v_created_item_count
      )::text;
  end if;

  v_response := jsonb_build_object(
    'status', 'ok',
    'proposals', v_created_proposals,
    'meta', jsonb_build_object(
      'canonical_path', 'rpc:proposal_submit_v3',
      'client_mutation_id', v_client_mutation_id,
      'request_id', v_request_id,
      'idempotent_replay', false,
      'expected_bucket_count', v_expected_bucket_count,
      'expected_item_count', v_expected_item_count,
      'created_proposal_count', v_created_proposal_count,
      'created_item_count', v_created_item_count,
      'attachment_continuation_ready', true,
      'submit_requested', coalesce(p_submit, true)
    )
  );

  insert into public.proposal_submit_mutations_v1 (
    client_mutation_id,
    buyer_user_id,
    request_id,
    payload_fingerprint,
    response,
    created_proposal_count,
    created_item_count,
    replay_count,
    created_at,
    updated_at
  )
  values (
    v_client_mutation_id,
    v_actor_id,
    v_request_id,
    v_payload_fingerprint,
    v_response,
    v_created_proposal_count,
    v_created_item_count,
    0,
    timezone('utc', now()),
    timezone('utc', now())
  );

  return v_response;
end;
$$;

comment on function public.rpc_proposal_submit_v3(text, jsonb, text, boolean, text, text) is
'Canonical server-owned proposal create/submit boundary. Validates the full buyer payload, writes head/items atomically, applies submit state inside the same transaction, and supports idempotent replay by client_mutation_id.';

grant execute on function public.rpc_proposal_submit_v3(text, jsonb, text, boolean, text, text) to authenticated;

commit;
