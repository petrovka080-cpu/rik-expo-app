begin;

alter function public.buyer_summary_inbox_scope_v1(integer, integer, text, uuid)
  rename to buyer_summary_inbox_scope_v1_source_before_sloadfix3;

revoke all on function public.buyer_summary_inbox_scope_v1_source_before_sloadfix3(integer, integer, text, uuid) from public;
revoke all on function public.buyer_summary_inbox_scope_v1_source_before_sloadfix3(integer, integer, text, uuid) from anon;
revoke all on function public.buyer_summary_inbox_scope_v1_source_before_sloadfix3(integer, integer, text, uuid) from authenticated;

create or replace function public.buyer_summary_inbox_scope_v1(
  p_offset integer default 0,
  p_limit integer default 12,
  p_search text default null,
  p_company_id uuid default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with normalized_args as (
  select
    greatest(0, coalesce(p_offset, 0))::integer as offset_groups,
    least(100, greatest(1, coalesce(p_limit, 12)))::integer as limit_groups,
    nullif(lower(trim(coalesce(p_search, ''))), '') as search_text
),
source_payload as (
  select public.buyer_summary_inbox_scope_v1_source_before_sloadfix3(
    (select offset_groups from normalized_args),
    (select limit_groups from normalized_args),
    (select search_text from normalized_args),
    p_company_id
  ) as payload
),
bounded_rows as (
  select
    coalesce(jsonb_agg(kept.row_value order by kept.ordinality), '[]'::jsonb) as rows,
    count(*)::integer as row_count
  from (
    select
      src.row_value,
      src.ordinality
    from source_payload sp
    cross join lateral jsonb_array_elements(coalesce(sp.payload -> 'rows', '[]'::jsonb))
      with ordinality as src(row_value, ordinality)
    cross join normalized_args na
    where src.ordinality <= na.limit_groups
  ) kept
)
select jsonb_set(
  jsonb_set(sp.payload, '{rows}', br.rows, true),
  '{meta,returned_row_count}',
  to_jsonb(br.row_count),
  true
)
from source_payload sp
cross join bounded_rows br;
$$;

create or replace function public.buyer_summary_inbox_sloadfix3_bound_proof_v1()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with defs as (
  select
    pg_get_functiondef('public.buyer_summary_inbox_scope_v1(integer, integer, text, uuid)'::regprocedure) as public_def,
    pg_get_functiondef('public.buyer_summary_inbox_scope_v1_source_before_sloadfix3(integer, integer, text, uuid)'::regprocedure) as source_def
)
select jsonb_build_object(
  'checked_at', timezone('utc', now()),
  'public_signature_preserved', position('function public.buyer_summary_inbox_scope_v1(p_offset integer default 0, p_limit integer default 12, p_search text default null::text, p_company_id uuid default null::uuid)' in lower(public_def)) > 0,
  'source_before_wrapper_exists', source_def is not null,
  'public_calls_source_before_wrapper', position('buyer_summary_inbox_scope_v1_source_before_sloadfix3' in lower(public_def)) > 0,
  'public_clamps_limit_to_100', position('least(100, greatest(1, coalesce(p_limit, 12)))' in lower(public_def)) > 0,
  'public_caps_rows_by_ordinality', position('src.ordinality <= na.limit_groups' in lower(public_def)) > 0,
  'public_preserves_row_order', position('jsonb_agg(kept.row_value order by kept.ordinality)' in lower(public_def)) > 0,
  'public_rewrites_returned_row_count', position('{meta,returned_row_count}' in lower(public_def)) > 0
)
from defs;
$$;

create index if not exists idx_warehouse_issue_queue_context_order_sloadfix3
on public.warehouse_issue_queue_context_v1 (
  source_submitted_at desc nulls last,
  display_year desc,
  display_seq desc,
  request_id desc
);

create index if not exists idx_request_items_issue_queue_fallback_sloadfix3
on public.request_items (request_id, id)
include (rik_code, uom, status, name_human, qty);

comment on function public.buyer_summary_inbox_scope_v1(integer, integer, text, uuid) is
'S-LOAD-FIX-3 public buyer inbox scope wrapper. Preserves the v1 signature and source order while enforcing final rows cardinality <= normalized p_limit for direct RPC callers.';

comment on function public.buyer_summary_inbox_scope_v1_source_before_sloadfix3(integer, integer, text, uuid) is
'S-LOAD-FIX-3 preserved buyer inbox source body used by the public bounded wrapper. Execute grants stay revoked from app roles.';

comment on function public.buyer_summary_inbox_sloadfix3_bound_proof_v1() is
'S-LOAD-FIX-3 verifier for buyer_summary_inbox_scope_v1 source-level row cardinality clamp.';

comment on index public.idx_warehouse_issue_queue_context_order_sloadfix3 is
'S-LOAD-FIX-3 migration-ready index for warehouse_issue_queue_scope_v4 context-order joins and page ordering.';

comment on index public.idx_request_items_issue_queue_fallback_sloadfix3 is
'S-LOAD-FIX-3 migration-ready covering index for warehouse_issue_queue_scope_v4 fallback item truth reads.';

grant execute on function public.buyer_summary_inbox_scope_v1(integer, integer, text, uuid) to authenticated;
grant execute on function public.buyer_summary_inbox_sloadfix3_bound_proof_v1() to authenticated;

notify pgrst, 'reload schema';

commit;
