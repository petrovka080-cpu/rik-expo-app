begin;

create or replace function public.rpc_proposal_submit_v3_existing_replay_h1_4(
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
  v_request_id text := nullif(trim(coalesce(p_request_id, '')), '');
  v_scope_request_ids text[] := '{}';
  v_expected_bucket_count integer := 0;
  v_expected_item_count integer := 0;
  v_replayed_item_count integer := 0;
  v_replayed_proposal_count integer := 0;
  v_replayed_proposals jsonb := '[]'::jsonb;
  v_bucket record;
  v_proposal record;
  v_existing_item_count integer := 0;
begin
  if jsonb_typeof(v_payload) is distinct from 'array' or jsonb_array_length(v_payload) = 0 then
    raise exception using
      errcode = 'P0001',
      message = 'proposal_submit_v3_duplicate_recovery_empty_payload',
      detail = jsonb_build_object('client_mutation_id', v_client_mutation_id)::text;
  end if;

  v_expected_bucket_count := jsonb_array_length(v_payload);

  with raw_buckets as (
    select coalesce(bucket -> 'request_item_ids', '[]'::jsonb) as request_item_ids
    from jsonb_array_elements(v_payload) as t(bucket)
  ),
  raw_items as (
    select trim(item_id.value) as request_item_id
    from raw_buckets rb
    cross join lateral jsonb_array_elements_text(rb.request_item_ids) as item_id(value)
    where trim(item_id.value) <> ''
  )
  select
    coalesce(array_agg(distinct ri.request_id::text) filter (where ri.request_id is not null), '{}'),
    count(*)::integer
  into v_scope_request_ids, v_expected_item_count
  from raw_items raw
  join public.request_items ri
    on ri.id::text = raw.request_item_id;

  if v_request_id is null then
    if coalesce(array_length(v_scope_request_ids, 1), 0) <> 1 then
      raise exception using
        errcode = 'P0001',
        message = 'proposal_submit_v3_duplicate_recovery_request_scope_missing',
        detail = jsonb_build_object(
          'client_mutation_id', v_client_mutation_id,
          'request_ids', v_scope_request_ids
        )::text;
    end if;
    v_request_id := v_scope_request_ids[1];
  end if;

  for v_bucket in
    with raw_buckets as (
      select
        (ord - 1)::integer as bucket_index,
        nullif(trim(coalesce(bucket ->> 'supplier', '')), '') as bucket_supplier,
        coalesce(bucket -> 'request_item_ids', '[]'::jsonb) as request_item_ids
      from jsonb_array_elements(v_payload) with ordinality as t(bucket, ord)
    ),
    raw_items as (
      select
        rb.bucket_index,
        rb.bucket_supplier,
        item_ord::integer as item_ord,
        trim(item_id.value) as request_item_id
      from raw_buckets rb
      cross join lateral jsonb_array_elements_text(rb.request_item_ids) with ordinality as item_id(value, item_ord)
      where trim(item_id.value) <> ''
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
    select
      p.id::text as proposal_id,
      coalesce(
        nullif(trim(coalesce(p.display_no, '')), ''),
        nullif(trim(coalesce(p.proposal_no, '')), ''),
        case when p.id_short is not null then 'PR-' || p.id_short::text else null end
      ) as proposal_no,
      p.status as raw_status,
      p.submitted_at,
      p.sent_to_accountant_at,
      p.supplier
    into v_proposal
    from public.proposals p
    where p.request_id::text = v_request_id
      and coalesce(p.supplier, '') = coalesce(v_bucket.supplier, '')
    order by p.updated_at desc nulls last, p.created_at desc nulls last
    limit 1;

    if v_proposal.proposal_id is null then
      raise exception using
        errcode = 'P0001',
        message = 'proposal_submit_v3_duplicate_recovery_missing_proposal',
        detail = jsonb_build_object(
          'client_mutation_id', v_client_mutation_id,
          'request_id', v_request_id,
          'supplier', v_bucket.supplier
        )::text;
    end if;

    select count(distinct pi.request_item_id)::integer
    into v_existing_item_count
    from public.proposal_items pi
    where pi.proposal_id::text = v_proposal.proposal_id
      and pi.request_item_id::text = any(v_bucket.request_item_ids);

    if v_existing_item_count <> v_bucket.item_count then
      raise exception using
        errcode = 'P0001',
        message = 'proposal_submit_v3_duplicate_recovery_item_mismatch',
        detail = jsonb_build_object(
          'client_mutation_id', v_client_mutation_id,
          'proposal_id', v_proposal.proposal_id,
          'expected_items', v_bucket.item_count,
          'existing_items', v_existing_item_count
        )::text;
    end if;

    if coalesce(p_submit, true) then
      perform public.proposal_submit_text_v1(v_proposal.proposal_id);
    end if;

    select
      coalesce(
        nullif(trim(coalesce(p.display_no, '')), ''),
        nullif(trim(coalesce(p.proposal_no, '')), ''),
        case when p.id_short is not null then 'PR-' || p.id_short::text else null end
      ),
      p.status,
      p.submitted_at,
      p.sent_to_accountant_at,
      p.supplier
    into
      v_proposal.proposal_no,
      v_proposal.raw_status,
      v_proposal.submitted_at,
      v_proposal.sent_to_accountant_at,
      v_proposal.supplier
    from public.proposals p
    where p.id::text = v_proposal.proposal_id;

    v_replayed_proposal_count := v_replayed_proposal_count + 1;
    v_replayed_item_count := v_replayed_item_count + v_bucket.item_count;
    v_replayed_proposals := v_replayed_proposals || jsonb_build_array(
      jsonb_build_object(
        'bucket_index', v_bucket.bucket_index,
        'proposal_id', v_proposal.proposal_id,
        'proposal_no', v_proposal.proposal_no,
        'supplier', coalesce(v_proposal.supplier, v_bucket.supplier),
        'request_item_ids', to_jsonb(v_bucket.request_item_ids),
        'raw_status', v_proposal.raw_status,
        'submitted_at', v_proposal.submitted_at,
        'sent_to_accountant_at', v_proposal.sent_to_accountant_at,
        'submit_source', case when coalesce(p_submit, true) then 'rpc:proposal_submit_text_v1' else null end
      )
    );
  end loop;

  return jsonb_build_object(
    'status', 'ok',
    'proposals', v_replayed_proposals,
    'meta', jsonb_build_object(
      'canonical_path', 'rpc:proposal_submit_v3',
      'client_mutation_id', v_client_mutation_id,
      'request_id', v_request_id,
      'idempotent_replay', true,
      'duplicate_recovery', true,
      'expected_bucket_count', v_expected_bucket_count,
      'expected_item_count', v_expected_item_count,
      'created_proposal_count', v_replayed_proposal_count,
      'created_item_count', v_replayed_item_count,
      'attachment_continuation_ready', true,
      'submit_requested', coalesce(p_submit, true)
    )
  );
end;
$$;

drop function if exists public.rpc_proposal_submit_v3_core_h1_4(
  text,
  jsonb,
  text,
  boolean,
  text,
  text
);

alter function public.rpc_proposal_submit_v3(
  text,
  jsonb,
  text,
  boolean,
  text,
  text
) rename to rpc_proposal_submit_v3_core_h1_4;

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
  v_constraint text := null;
begin
  return public.rpc_proposal_submit_v3_core_h1_4(
    p_client_mutation_id,
    p_buckets,
    p_buyer_fio,
    p_submit,
    p_request_item_status,
    p_request_id
  );
exception when unique_violation then
  get stacked diagnostics v_constraint = constraint_name;
  if v_constraint = 'proposals_uniq_req_supplier' then
    return public.rpc_proposal_submit_v3_existing_replay_h1_4(
      p_client_mutation_id,
      p_buckets,
      p_buyer_fio,
      p_submit,
      p_request_item_status,
      p_request_id
    );
  end if;
  raise;
end;
$$;

comment on function public.rpc_proposal_submit_v3(text, jsonb, text, boolean, text, text) is
'H1.4b recovery wrapper: keeps canonical proposal submit contract and converts request/supplier duplicate retries into existing-proposal replay instead of transport 409.';

revoke execute on function public.rpc_proposal_submit_v3_core_h1_4(text, jsonb, text, boolean, text, text) from anon, authenticated;
grant execute on function public.rpc_proposal_submit_v3(text, jsonb, text, boolean, text, text) to authenticated;
grant execute on function public.rpc_proposal_submit_v3_existing_replay_h1_4(text, jsonb, text, boolean, text, text) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
