begin;

alter function public.warehouse_issue_queue_scope_v4(integer, integer)
  rename to warehouse_issue_queue_scope_v4_source_before_sloadfix4;

revoke all on function public.warehouse_issue_queue_scope_v4_source_before_sloadfix4(integer, integer) from public;
revoke all on function public.warehouse_issue_queue_scope_v4_source_before_sloadfix4(integer, integer) from anon;
revoke all on function public.warehouse_issue_queue_scope_v4_source_before_sloadfix4(integer, integer) from authenticated;

create or replace function public.warehouse_issue_queue_scope_v4(
  p_offset integer default 0,
  p_limit integer default 50
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with normalized_args as (
  select
    greatest(0, coalesce(p_offset, 0))::integer as offset_value,
    least(100, greatest(1, coalesce(p_limit, 50)))::integer as limit_value
),
source_payload as (
  select public.warehouse_issue_queue_scope_v4_source_before_sloadfix4(
    (select offset_value from normalized_args),
    (select limit_value from normalized_args)
  ) as payload
),
bounded_rows as (
  select
    coalesce(jsonb_agg(src.row_value order by src.ordinality), '[]'::jsonb) as rows,
    count(*)::integer as row_count
  from source_payload sp
  cross join lateral jsonb_array_elements(coalesce(sp.payload -> 'rows', '[]'::jsonb))
    with ordinality as src(row_value, ordinality)
  cross join normalized_args na
  where src.ordinality <= na.limit_value
)
select jsonb_set(
  jsonb_set(sp.payload, '{rows}', br.rows, true),
  '{meta,row_count}',
  to_jsonb(br.row_count),
  true
)
from source_payload sp
cross join bounded_rows br;
$$;

create index if not exists idx_request_items_issue_queue_request_text_sloadfix4
on public.request_items ((request_id::text), (id::text))
include (rik_code, uom, status, name_human, qty);

create or replace function public.warehouse_issue_queue_sloadfix4_source_patch_proof_v1()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with defs as (
  select
    pg_get_functiondef('public.warehouse_issue_queue_scope_v4(integer, integer)'::regprocedure) as public_def,
    pg_get_functiondef('public.warehouse_issue_queue_scope_v4_source_before_sloadfix4(integer, integer)'::regprocedure) as source_def
)
select jsonb_build_object(
  'checked_at', timezone('utc', now()),
  'public_signature_preserved', position('function public.warehouse_issue_queue_scope_v4(p_offset integer default 0, p_limit integer default 50)' in lower(public_def)) > 0,
  'source_before_wrapper_exists', source_def is not null,
  'public_calls_source_before_wrapper', position('warehouse_issue_queue_scope_v4_source_before_sloadfix4' in lower(public_def)) > 0,
  'public_clamps_limit_to_100', position('least(100, greatest(1, coalesce(p_limit, 50)))' in lower(public_def)) > 0,
  'public_preserves_offset_floor', position('greatest(0, coalesce(p_offset, 0))' in lower(public_def)) > 0,
  'public_caps_rows_by_ordinality', position('src.ordinality <= na.limit_value' in lower(public_def)) > 0,
  'public_preserves_row_order', position('jsonb_agg(src.row_value order by src.ordinality)' in lower(public_def)) > 0,
  'public_rewrites_row_count', position('{meta,row_count}' in lower(public_def)) > 0,
  'request_items_text_join_index_exists', to_regclass('public.idx_request_items_issue_queue_request_text_sloadfix4') is not null
)
from defs;
$$;

comment on function public.warehouse_issue_queue_scope_v4(integer, integer) is
'S-LOAD-FIX-4 public warehouse issue queue wrapper. Preserves the v4 signature and source order while normalizing direct RPC pagination to 1..100 and enforcing final rows cardinality <= normalized p_limit.';

comment on function public.warehouse_issue_queue_scope_v4_source_before_sloadfix4(integer, integer) is
'S-LOAD-FIX-4 preserved warehouse issue queue source body used by the public bounded wrapper. Execute grants stay revoked from app roles.';

comment on function public.warehouse_issue_queue_sloadfix4_source_patch_proof_v1() is
'S-LOAD-FIX-4 verifier for warehouse_issue_queue_scope_v4 source-level pagination guard and fallback item text-join index readiness.';

comment on index public.idx_request_items_issue_queue_request_text_sloadfix4 is
'S-LOAD-FIX-4 migration-ready index for warehouse_issue_queue_scope_v4 fallback item joins that compare request_items request_id/id through ::text expressions.';

grant execute on function public.warehouse_issue_queue_scope_v4(integer, integer) to authenticated;
grant execute on function public.warehouse_issue_queue_sloadfix4_source_patch_proof_v1() to authenticated;

notify pgrst, 'reload schema';

commit;
