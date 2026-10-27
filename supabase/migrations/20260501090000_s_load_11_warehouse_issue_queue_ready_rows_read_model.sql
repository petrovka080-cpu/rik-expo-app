begin;

alter function public.warehouse_issue_queue_scope_v4_source_before_sloadfix4(integer, integer)
  rename to warehouse_issue_queue_scope_v4_build_ready_rows_source_v1;

revoke all on function public.warehouse_issue_queue_scope_v4_build_ready_rows_source_v1(integer, integer) from public;
revoke all on function public.warehouse_issue_queue_scope_v4_build_ready_rows_source_v1(integer, integer) from anon;
revoke all on function public.warehouse_issue_queue_scope_v4_build_ready_rows_source_v1(integer, integer) from authenticated;

create table if not exists public.warehouse_issue_queue_ready_rows_v1 (
  request_id text primary key,
  source_ordinality integer not null,
  row_value jsonb not null,
  projected_at timestamptz not null default timezone('utc', now()),
  projection_version text not null default 's_load_11_warehouse_issue_queue_ready_rows_v1'
);

create table if not exists public.warehouse_issue_queue_ready_rows_meta_v1 (
  id boolean primary key default true check (id),
  projection_version text not null default 's_load_11_warehouse_issue_queue_ready_rows_v1',
  rebuilt_at timestamptz,
  projected_row_count bigint not null default 0,
  source_total_count bigint not null default 0,
  source_row_count bigint not null default 0,
  source_has_more boolean not null default false,
  repaired_missing_ids_count integer not null default 0,
  ui_truth_request_count integer not null default 0,
  fallback_truth_request_count integer not null default 0,
  last_rebuild_started_at timestamptz,
  last_rebuild_finished_at timestamptz,
  last_rebuild_duration_ms integer,
  last_rebuild_status text not null default 'never',
  last_rebuild_error text
);

insert into public.warehouse_issue_queue_ready_rows_meta_v1 (id)
values (true)
on conflict (id) do nothing;

create index if not exists idx_warehouse_issue_queue_ready_rows_order_v1
on public.warehouse_issue_queue_ready_rows_v1 (source_ordinality, request_id);

create or replace function public.warehouse_issue_queue_ready_rows_status_v1()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'projection_version', m.projection_version,
    'rebuilt_at', m.rebuilt_at,
    'projected_row_count', m.projected_row_count,
    'source_total_count', m.source_total_count,
    'source_row_count', m.source_row_count,
    'source_has_more', m.source_has_more,
    'repaired_missing_ids_count', m.repaired_missing_ids_count,
    'ui_truth_request_count', m.ui_truth_request_count,
    'fallback_truth_request_count', m.fallback_truth_request_count,
    'last_rebuild_started_at', m.last_rebuild_started_at,
    'last_rebuild_finished_at', m.last_rebuild_finished_at,
    'last_rebuild_duration_ms', m.last_rebuild_duration_ms,
    'last_rebuild_status', m.last_rebuild_status,
    'last_rebuild_error_code', m.last_rebuild_error,
    'current_ready_row_count', (select count(*)::bigint from public.warehouse_issue_queue_ready_rows_v1),
    'checked_at', timezone('utc', now())
  )
  from public.warehouse_issue_queue_ready_rows_meta_v1 m
  where m.id;
$$;

create or replace function public.warehouse_issue_queue_ready_rows_rebuild_v1()
returns jsonb
language plpgsql
security definer
set search_path = public
set statement_timeout = '120s'
as $$
declare
  v_started_at timestamptz := clock_timestamp();
  v_finished_at timestamptz;
  v_payload jsonb;
  v_inserted integer := 0;
begin
  update public.warehouse_issue_queue_ready_rows_meta_v1
  set
    last_rebuild_started_at = v_started_at,
    last_rebuild_finished_at = null,
    last_rebuild_duration_ms = null,
    last_rebuild_status = 'running',
    last_rebuild_error = null
  where id;

  v_payload := public.warehouse_issue_queue_scope_v4_build_ready_rows_source_v1(0, 1000000);

  delete from public.warehouse_issue_queue_ready_rows_v1;

  insert into public.warehouse_issue_queue_ready_rows_v1 (
    request_id,
    source_ordinality,
    row_value,
    projected_at,
    projection_version
  )
  select
    nullif(trim(coalesce(src.row_value ->> 'request_id', src.row_value ->> 'id')), '') as request_id,
    src.ordinality::integer as source_ordinality,
    src.row_value,
    timezone('utc', now()) as projected_at,
    's_load_11_warehouse_issue_queue_ready_rows_v1' as projection_version
  from jsonb_array_elements(coalesce(v_payload -> 'rows', '[]'::jsonb))
    with ordinality as src(row_value, ordinality)
  where nullif(trim(coalesce(src.row_value ->> 'request_id', src.row_value ->> 'id')), '') is not null;

  get diagnostics v_inserted = row_count;
  v_finished_at := clock_timestamp();

  update public.warehouse_issue_queue_ready_rows_meta_v1
  set
    projection_version = 's_load_11_warehouse_issue_queue_ready_rows_v1',
    rebuilt_at = timezone('utc', v_finished_at),
    projected_row_count = v_inserted,
    source_total_count = coalesce(nullif(v_payload #>> '{meta,total}', '')::bigint, v_inserted),
    source_row_count = coalesce(nullif(v_payload #>> '{meta,row_count}', '')::bigint, v_inserted),
    source_has_more = coalesce(nullif(v_payload #>> '{meta,has_more}', '')::boolean, false),
    repaired_missing_ids_count = coalesce(nullif(v_payload #>> '{meta,repaired_missing_ids_count}', '')::integer, 0),
    ui_truth_request_count = coalesce(nullif(v_payload #>> '{meta,ui_truth_request_count}', '')::integer, 0),
    fallback_truth_request_count = coalesce(nullif(v_payload #>> '{meta,fallback_truth_request_count}', '')::integer, 0),
    last_rebuild_finished_at = v_finished_at,
    last_rebuild_duration_ms = greatest(0, floor(extract(epoch from (v_finished_at - v_started_at)) * 1000)::integer),
    last_rebuild_status = 'success',
    last_rebuild_error = null
  where id;

  return public.warehouse_issue_queue_ready_rows_status_v1();
exception
  when others then
    update public.warehouse_issue_queue_ready_rows_meta_v1
    set
      last_rebuild_finished_at = clock_timestamp(),
      last_rebuild_duration_ms = greatest(0, floor(extract(epoch from (clock_timestamp() - v_started_at)) * 1000)::integer),
      last_rebuild_status = 'error',
      last_rebuild_error = sqlstate
    where id;
    raise;
end;
$$;

revoke all on function public.warehouse_issue_queue_ready_rows_rebuild_v1() from public;
revoke all on function public.warehouse_issue_queue_ready_rows_rebuild_v1() from anon;
revoke all on function public.warehouse_issue_queue_ready_rows_rebuild_v1() from authenticated;

create or replace function public.warehouse_issue_queue_scope_v4_source_before_sloadfix4(
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
    greatest(coalesce(p_offset, 0), 0)::integer as offset_value,
    greatest(coalesce(p_limit, 50), 1)::integer as limit_value
),
ready_rows as (
  select
    rr.request_id,
    rr.source_ordinality,
    rr.row_value
  from public.warehouse_issue_queue_ready_rows_v1 rr
),
paged_rows as (
  select *
  from ready_rows
  order by source_ordinality asc, request_id desc
  offset (select offset_value from normalized_args)
  limit (select limit_value from normalized_args)
),
meta_snapshot as (
  select
    coalesce(m.repaired_missing_ids_count, 0) as repaired_missing_ids_count,
    coalesce(m.ui_truth_request_count, 0) as ui_truth_request_count,
    coalesce(m.fallback_truth_request_count, 0) as fallback_truth_request_count
  from public.warehouse_issue_queue_ready_rows_meta_v1 m
  where m.id
),
meta_stats as (
  select
    (select count(*)::integer from ready_rows) as total_count,
    (select count(*)::integer from paged_rows) as row_count,
    coalesce((select repaired_missing_ids_count from meta_snapshot), 0) as repaired_missing_ids_count,
    coalesce((select ui_truth_request_count from meta_snapshot), 0) as ui_truth_request_count,
    coalesce((select fallback_truth_request_count from meta_snapshot), 0) as fallback_truth_request_count
)
select jsonb_build_object(
  'document_type', 'warehouse_issue_queue_scope',
  'version', 'v4',
  'rows', coalesce(
    (
      select jsonb_agg(pr.row_value order by pr.source_ordinality asc, pr.request_id desc)
      from paged_rows pr
    ),
    '[]'::jsonb
  ),
  'meta', jsonb_build_object(
    'rows_source', 'warehouse_issue_queue_scope_v4',
    'payload_shape_version', 'v4',
    'primary_owner', 'rpc_scope_v4',
    'generated_at', timezone('utc', now()),
    'scope_key', concat(
      'warehouse_issue_queue_scope_v4:',
      (select offset_value from normalized_args),
      ':',
      (select limit_value from normalized_args)
    ),
    'offset', (select offset_value from normalized_args),
    'limit', (select limit_value from normalized_args),
    'total', (select total_count from meta_stats),
    'row_count', (select row_count from meta_stats),
    'has_more',
      (
        (select offset_value from normalized_args)
        + (select row_count from meta_stats)
      ) < (select total_count from meta_stats),
    'repaired_missing_ids_count', (select repaired_missing_ids_count from meta_stats),
    'ui_truth_request_count', (select ui_truth_request_count from meta_stats),
    'fallback_truth_request_count', (select fallback_truth_request_count from meta_stats)
  )
);
$$;

revoke all on function public.warehouse_issue_queue_scope_v4_source_before_sloadfix4(integer, integer) from public;
revoke all on function public.warehouse_issue_queue_scope_v4_source_before_sloadfix4(integer, integer) from anon;
revoke all on function public.warehouse_issue_queue_scope_v4_source_before_sloadfix4(integer, integer) from authenticated;

create or replace function public.warehouse_issue_queue_ready_rows_parity_v1(
  p_offset integer default 0,
  p_limit integer default 25
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with old_payload as (
  select public.warehouse_issue_queue_scope_v4_build_ready_rows_source_v1(p_offset, p_limit) as payload
),
new_payload as (
  select public.warehouse_issue_queue_scope_v4_source_before_sloadfix4(p_offset, p_limit) as payload
),
old_rows as (
  select
    src.ordinality::integer as row_index,
    md5(src.row_value::text) as row_hash
  from old_payload op
  cross join lateral jsonb_array_elements(coalesce(op.payload -> 'rows', '[]'::jsonb))
    with ordinality as src(row_value, ordinality)
),
new_rows as (
  select
    src.ordinality::integer as row_index,
    md5(src.row_value::text) as row_hash
  from new_payload np
  cross join lateral jsonb_array_elements(coalesce(np.payload -> 'rows', '[]'::jsonb))
    with ordinality as src(row_value, ordinality)
),
diffs as (
  select row_index from old_rows
  full join new_rows using (row_index)
  where old_rows.row_hash is distinct from new_rows.row_hash
),
meta_hashes as (
  select
    md5((select payload -> 'meta' from old_payload)::text) as old_meta_hash,
    md5((select payload -> 'meta' from new_payload)::text) as new_meta_hash
)
select jsonb_build_object(
  'checked_at', timezone('utc', now()),
  'offset', greatest(coalesce(p_offset, 0), 0),
  'limit', greatest(coalesce(p_limit, 25), 1),
  'old_row_count', (select count(*) from old_rows),
  'new_row_count', (select count(*) from new_rows),
  'row_diff_count', (select count(*) from diffs),
  'meta_hash_equal', (select old_meta_hash = new_meta_hash from meta_hashes)
);
$$;

create or replace function public.warehouse_issue_queue_ready_rows_read_model_proof_v1()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with defs as (
  select
    pg_get_functiondef('public.warehouse_issue_queue_scope_v4(integer, integer)'::regprocedure) as public_def,
    pg_get_functiondef('public.warehouse_issue_queue_scope_v4_source_before_sloadfix4(integer, integer)'::regprocedure) as runtime_source_def,
    pg_get_functiondef('public.warehouse_issue_queue_scope_v4_build_ready_rows_source_v1(integer, integer)'::regprocedure) as build_source_def,
    pg_get_functiondef('public.warehouse_issue_queue_ready_rows_rebuild_v1()'::regprocedure) as rebuild_def
),
normalized as (
  select
    lower(public_def) as public_lower,
    lower(runtime_source_def) as runtime_lower,
    lower(build_source_def) as build_lower,
    lower(rebuild_def) as rebuild_lower
  from defs
)
select jsonb_build_object(
  'checked_at', timezone('utc', now()),
  'public_wrapper_preserved', position('warehouse_issue_queue_scope_v4_source_before_sloadfix4' in public_lower) > 0,
  'build_source_preserved', position('warehouse_issue_queue_scope_v4_build_ready_rows_source_v1' in build_lower) > 0,
  'runtime_source_reads_ready_rows', position('warehouse_issue_queue_ready_rows_v1' in runtime_lower) > 0,
  'runtime_source_reads_ready_rows_meta', position('warehouse_issue_queue_ready_rows_meta_v1' in runtime_lower) > 0,
  'runtime_source_avoids_live_heads_view', position('v_wh_issue_req_heads_ui' in runtime_lower) = 0,
  'runtime_source_avoids_live_items_view', position('v_wh_issue_req_items_ui' in runtime_lower) = 0,
  'runtime_source_avoids_stock_view', position('v_warehouse_stock' in runtime_lower) = 0,
  'runtime_source_avoids_request_items', position('request_items' in runtime_lower) = 0,
  'runtime_source_preserves_meta_shape', position('''total'', (select total_count from meta_stats)' in runtime_lower) > 0
    and position('''row_count'', (select row_count from meta_stats)' in runtime_lower) > 0
    and position('''has_more''' in runtime_lower) > 0
    and position('''ui_truth_request_count''' in runtime_lower) > 0
    and position('''fallback_truth_request_count''' in runtime_lower) > 0,
  'runtime_source_preserves_scope_key', position('warehouse_issue_queue_scope_v4:' in runtime_lower) > 0,
  'runtime_source_preserves_page_bound', position('limit (select limit_value from normalized_args)' in runtime_lower) > 0,
  'runtime_source_preserves_projected_order', position('order by source_ordinality asc, request_id desc' in runtime_lower) > 0,
  'rebuild_uses_build_source_once', position('warehouse_issue_queue_scope_v4_build_ready_rows_source_v1(0, 1000000)' in rebuild_lower) > 0,
  'ready_rows_table_exists', to_regclass('public.warehouse_issue_queue_ready_rows_v1') is not null,
  'ready_rows_meta_exists', to_regclass('public.warehouse_issue_queue_ready_rows_meta_v1') is not null,
  'ready_rows_order_index_exists', to_regclass('public.idx_warehouse_issue_queue_ready_rows_order_v1') is not null
)
from normalized;
$$;

select public.warehouse_issue_queue_ready_rows_rebuild_v1();

do $$
declare
  v_proof jsonb;
  v_status jsonb;
begin
  select public.warehouse_issue_queue_ready_rows_read_model_proof_v1()
  into v_proof;

  if coalesce((v_proof ->> 'public_wrapper_preserved')::boolean, false) is not true
    or coalesce((v_proof ->> 'runtime_source_reads_ready_rows')::boolean, false) is not true
    or coalesce((v_proof ->> 'runtime_source_avoids_live_heads_view')::boolean, false) is not true
    or coalesce((v_proof ->> 'runtime_source_avoids_live_items_view')::boolean, false) is not true
    or coalesce((v_proof ->> 'runtime_source_avoids_stock_view')::boolean, false) is not true
    or coalesce((v_proof ->> 'runtime_source_avoids_request_items')::boolean, false) is not true
    or coalesce((v_proof ->> 'runtime_source_preserves_meta_shape')::boolean, false) is not true
    or coalesce((v_proof ->> 'runtime_source_preserves_page_bound')::boolean, false) is not true
  then
    raise exception 'S-LOAD-11 ready rows read model proof failed';
  end if;

  select public.warehouse_issue_queue_ready_rows_status_v1()
  into v_status;

  if coalesce(v_status ->> 'last_rebuild_status', '') <> 'success'
    or coalesce((v_status ->> 'current_ready_row_count')::bigint, 0) <> coalesce((v_status ->> 'projected_row_count')::bigint, -1)
  then
    raise exception 'S-LOAD-11 ready rows read model status failed';
  end if;
end;
$$;

comment on table public.warehouse_issue_queue_ready_rows_v1 is
'S-LOAD-11 ready-rows read model for warehouse_issue_queue_scope_v4. Stores projected row JSON and source order so runtime reads avoid live heads/items/stock truth joins.';

comment on table public.warehouse_issue_queue_ready_rows_meta_v1 is
'S-LOAD-11 ready-rows read model metadata and rebuild status for warehouse_issue_queue_scope_v4.';

comment on function public.warehouse_issue_queue_scope_v4_build_ready_rows_source_v1(integer, integer) is
'S-LOAD-11 preserved pre-read-model warehouse issue queue source. Used only to rebuild and prove ready rows projection parity.';

comment on function public.warehouse_issue_queue_scope_v4_source_before_sloadfix4(integer, integer) is
'S-LOAD-11 read-model backed source for warehouse_issue_queue_scope_v4. Runtime reads projected ready rows only; public wrapper is preserved.';

comment on function public.warehouse_issue_queue_ready_rows_rebuild_v1() is
'S-LOAD-11 rebuilds the warehouse issue queue ready-rows projection from the preserved source. Staging/proof maintenance path; execute grants stay revoked from app roles.';

comment on function public.warehouse_issue_queue_ready_rows_status_v1() is
'S-LOAD-11 status endpoint for the warehouse issue queue ready-rows projection.';

comment on function public.warehouse_issue_queue_ready_rows_parity_v1(integer, integer) is
'S-LOAD-11 sanitized parity checker comparing preserved source and ready-rows source by row/meta hashes only.';

comment on function public.warehouse_issue_queue_ready_rows_read_model_proof_v1() is
'S-LOAD-11 verifier proving runtime warehouse issue queue source reads the ready-rows model and avoids live truth views.';

grant execute on function public.warehouse_issue_queue_scope_v4(integer, integer) to authenticated;
grant execute on function public.warehouse_issue_queue_ready_rows_status_v1() to authenticated;
grant execute on function public.warehouse_issue_queue_ready_rows_parity_v1(integer, integer) to authenticated;
grant execute on function public.warehouse_issue_queue_ready_rows_read_model_proof_v1() to authenticated;

notify pgrst, 'reload schema';

commit;
