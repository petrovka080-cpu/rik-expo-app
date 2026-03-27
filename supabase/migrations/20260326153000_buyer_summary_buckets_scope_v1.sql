begin;

create or replace function public.buyer_summary_buckets_scope_v1()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with status_constants as (
  select
    U&'\041D\0430 \0443\0442\0432\0435\0440\0436\0434\0435\043D\0438\0438'::text as pending_status,
    U&'\0423\0442\0432\0435\0440\0436\0434\0435\043D\043E'::text as approved_status,
    U&'\041D\0430 \0434\043E\0440\0430\0431\043E\0442\043A\0435'::text as rework_status
),
summary_rows as (
  select
    v.proposal_id::text as id,
    nullif(trim(v.status), '') as status,
    v.submitted_at,
    v.sent_to_accountant_at,
    coalesce(v.total_sum, 0)::numeric as total_sum,
    coalesce(v.items_cnt, 0)::integer as items_cnt
  from public.v_proposals_summary v
  where nullif(trim(v.proposal_id::text), '') is not null
    and coalesce(v.items_cnt, 0) > 0
),
pending_rows as (
  select sr.*
  from summary_rows sr
  cross join status_constants sc
  where sr.status = sc.pending_status
),
approved_rows as (
  select sr.*
  from summary_rows sr
  cross join status_constants sc
  where sr.status = sc.approved_status
),
rejected_rows as (
  select
    p.id::text as id,
    nullif(trim(p.payment_status), '') as status,
    coalesce(p.submitted_at, p.created_at) as submitted_at
  from public.proposals p
  cross join status_constants sc
  where nullif(trim(p.id::text), '') is not null
    and nullif(trim(coalesce(p.payment_status, '')), '') is not null
    and p.payment_status ilike ('%' || sc.rework_status || '%')
    and exists (
      select 1
      from public.proposal_items pi
      where pi.proposal_id = p.id
    )
),
proposal_ids as (
  select id from pending_rows
  union
  select id from approved_rows
  union
  select id from rejected_rows
)
select jsonb_build_object(
  'document_type', 'buyer_summary_buckets_scope',
  'version', 'v1',
  'pending', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', pr.id,
          'status', pr.status,
          'submitted_at', pr.submitted_at,
          'total_sum', pr.total_sum,
          'sent_to_accountant_at', pr.sent_to_accountant_at,
          'items_cnt', pr.items_cnt
        )
        order by pr.submitted_at desc nulls last, pr.id asc
      )
      from pending_rows pr
    ),
    '[]'::jsonb
  ),
  'approved', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', ar.id,
          'status', ar.status,
          'submitted_at', ar.submitted_at,
          'total_sum', ar.total_sum,
          'sent_to_accountant_at', ar.sent_to_accountant_at,
          'items_cnt', ar.items_cnt
        )
        order by ar.submitted_at desc nulls last, ar.id asc
      )
      from approved_rows ar
    ),
    '[]'::jsonb
  ),
  'rejected', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', rr.id,
          'status', rr.status,
          'submitted_at', rr.submitted_at
        )
        order by rr.submitted_at desc nulls last, rr.id asc
      )
      from rejected_rows rr
    ),
    '[]'::jsonb
  ),
  'meta', jsonb_build_object(
    'rows_source', 'buyer_summary_buckets_scope_v1',
    'legacy_rows_source', 'v_proposals_summary+proposals+proposal_items',
    'payload_shape_version', 'v1',
    'primary_owner', 'rpc_scope_v1',
    'bucket_count', 3,
    'proposal_ids_count', (select count(*)::integer from proposal_ids),
    'pending_count', (select count(*)::integer from pending_rows),
    'approved_count', (select count(*)::integer from approved_rows),
    'rejected_count', (select count(*)::integer from rejected_rows),
    'pending_total_sum', coalesce((select sum(pr.total_sum) from pending_rows pr), 0),
    'approved_total_sum', coalesce((select sum(ar.total_sum) from approved_rows ar), 0),
    'rejected_total_sum', 0,
    'pending_status', (select pending_status from status_constants),
    'approved_status', (select approved_status from status_constants),
    'rework_status', (select rework_status from status_constants)
  )
);
$$;

comment on function public.buyer_summary_buckets_scope_v1() is
'Buyer summary buckets scope v1. Moves buyer pending/approved/rejected summary bucket ownership into a single backend read contract while preserving current bucket semantics and proposal-item presence filtering.';

grant execute on function public.buyer_summary_buckets_scope_v1() to authenticated;

commit;
