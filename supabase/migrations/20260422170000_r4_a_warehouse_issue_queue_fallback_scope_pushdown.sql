begin;

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
    greatest(coalesce(p_offset, 0), 0)::integer as offset_value,
    greatest(coalesce(p_limit, 50), 1)::integer as limit_value
),
request_source as (
  select
    r.id::text as request_id,
    nullif(trim(coalesce(r.display_no::text, '')), '') as display_no,
    nullif(trim(coalesce(r.object_name, r.object_type_code, '')), '') as object_name,
    nullif(trim(coalesce(r.level_code, '')), '') as level_code,
    nullif(trim(coalesce(r.system_code, '')), '') as system_code,
    nullif(trim(coalesce(r.zone_code, '')), '') as zone_code,
    nullif(trim(coalesce(r.level_code, '')), '') as level_name,
    nullif(trim(coalesce(r.system_code, '')), '') as system_name,
    nullif(trim(coalesce(r.zone_code, '')), '') as zone_name,
    ctx.contractor_name,
    ctx.contractor_phone,
    ctx.planned_volume,
    coalesce(ctx.display_year, 0)::integer as display_year,
    coalesce(ctx.display_seq, 0)::integer as display_seq,
    nullif(trim(coalesce(r.note, '')), '') as note,
    nullif(trim(coalesce(r.comment, '')), '') as comment,
    coalesce(r.submitted_at, r.created_at) as submitted_at,
    lower(trim(coalesce(r.status::text, ''))) as status_norm
  from public.requests r
  left join public.warehouse_issue_queue_context_v1 ctx
    on ctx.request_id = r.id::text
  where nullif(trim(coalesce(r.id::text, '')), '') is not null
),
visible_requests as (
  select *
  from request_source
  where status_norm <> ''
    and position(U&'\043D\0430 \0443\0442\0432\0435\0440\0436\0434\0435\043D\0438\0438' in status_norm) = 0
    and position('pending' in status_norm) = 0
    and position(U&'\0447\0435\0440\043D\043E\0432' in status_norm) = 0
    and position('draft' in status_norm) = 0
    and position(U&'\043E\0442\043A\043B\043E\043D' in status_norm) = 0
    and position('reject' in status_norm) = 0
    and position(U&'\0437\0430\043A\0440\044B\0442' in status_norm) = 0
    and position('closed' in status_norm) = 0
),
head_view as (
  select
    trim(coalesce(v.request_id::text, '')) as request_id,
    nullif(trim(coalesce(v.display_no, '')), '') as display_no,
    nullif(trim(coalesce(v.object_name, '')), '') as object_name,
    nullif(trim(coalesce(v.level_code, '')), '') as level_code,
    nullif(trim(coalesce(v.system_code, '')), '') as system_code,
    nullif(trim(coalesce(v.zone_code, '')), '') as zone_code,
    nullif(trim(coalesce(v.level_name, '')), '') as level_name,
    nullif(trim(coalesce(v.system_name, '')), '') as system_name,
    nullif(trim(coalesce(v.zone_name, '')), '') as zone_name,
    v.submitted_at
  from public.v_wh_issue_req_heads_ui v
  where nullif(trim(coalesce(v.request_id::text, '')), '') is not null
),
ui_item_truth as (
  select
    trim(coalesce(v.request_id::text, '')) as request_id,
    trim(coalesce(v.request_item_id::text, '')) as request_item_id,
    max(greatest(coalesce(v.qty_limit, 0), 0))::numeric as qty_limit,
    max(greatest(coalesce(v.qty_issued, 0), 0))::numeric as qty_issued,
    max(greatest(coalesce(v.qty_left, 0), 0))::numeric as qty_left,
    max(greatest(coalesce(v.qty_can_issue_now, 0), 0))::numeric as qty_can_issue_now
  from public.v_wh_issue_req_items_ui v
  where nullif(trim(coalesce(v.request_id::text, '')), '') is not null
    and nullif(trim(coalesce(v.request_item_id::text, '')), '') is not null
  group by 1, 2
),
ui_truth_by_req as (
  select
    uit.request_id,
    count(*)::integer as items_cnt,
    sum(case when uit.qty_left > 0 then 1 else 0 end)::integer as ready_cnt,
    sum(case when uit.qty_left <= 0 and uit.qty_limit > 0 then 1 else 0 end)::integer as done_cnt,
    sum(uit.qty_limit)::numeric as qty_limit_sum,
    sum(uit.qty_issued)::numeric as qty_issued_sum,
    sum(uit.qty_left)::numeric as qty_left_sum,
    sum(least(uit.qty_left, uit.qty_can_issue_now))::numeric as qty_can_issue_now_sum,
    sum(case when uit.qty_left > 0 and least(uit.qty_left, uit.qty_can_issue_now) > 0 then 1 else 0 end)::integer as issuable_now_cnt
  from ui_item_truth uit
  group by uit.request_id
),
missing_ui_truth_requests_all as (
  select vr.request_id
  from visible_requests vr
  left join ui_truth_by_req ut
    on ut.request_id = vr.request_id
  where ut.request_id is null
),
fallback_items_base_all as (
  select
    trim(coalesce(ri.request_id::text, '')) as request_id,
    trim(coalesce(ri.id::text, '')) as request_item_id,
    upper(trim(coalesce(ri.rik_code, ''))) as code_key,
    nullif(lower(trim(coalesce(ri.uom, ''))), '') as uom_key,
    coalesce(nullif(trim(coalesce(ri.name_human, ri.rik_code, '')), ''), trim(coalesce(ri.rik_code, ''))) as name_human,
    greatest(coalesce(ri.qty, 0), 0)::numeric as qty_limit,
    lower(trim(coalesce(ri.status::text, ''))) as item_status_norm
  from public.request_items ri
  join missing_ui_truth_requests_all mur
    on mur.request_id = ri.request_id::text
  where nullif(trim(coalesce(ri.request_id::text, '')), '') is not null
    and nullif(trim(coalesce(ri.id::text, '')), '') is not null
),
fallback_items_filtered_all as (
  select
    fib.*,
    (
      position(U&'\043E\0442\043A\043B\043E\043D' in fib.item_status_norm) > 0
      or position('reject' in fib.item_status_norm) > 0
    ) as rejected_like,
    (
      position(U&'\0432\044B\0434\0430\043D' in fib.item_status_norm) > 0
      or fib.item_status_norm = 'done'
    ) as issued_like
  from fallback_items_base_all fib
),
fallback_items_active_all as (
  select
    fif.request_id,
    fif.request_item_id,
    fif.code_key,
    fif.uom_key,
    fif.name_human,
    fif.qty_limit,
    case when fif.issued_like then fif.qty_limit else 0::numeric end as qty_issued,
    greatest(0::numeric, fif.qty_limit - case when fif.issued_like then fif.qty_limit else 0::numeric end) as qty_left
  from fallback_items_filtered_all fif
  where not fif.rejected_like
),
fallback_truth_request_ids as (
  select distinct fia.request_id
  from fallback_items_active_all fia
  cross join normalized_args na
  where na.offset_value = 0

  union

  select distinct fia.request_id
  from fallback_items_active_all fia
  join head_view hv
    on hv.request_id = fia.request_id
),
fallback_items_active as (
  select fia.*
  from fallback_items_active_all fia
  join fallback_truth_request_ids fr
    on fr.request_id = fia.request_id
),
fallback_active_request_count as (
  select count(distinct fia.request_id)::integer as fallback_truth_request_count
  from fallback_items_active_all fia
),
fallback_code_keys as (
  select distinct
    fia.code_key,
    fia.uom_key
  from fallback_items_active fia
),
stock_by_code as (
  select
    upper(trim(coalesce(vs.rik_code, ''))) as code_key,
    sum(greatest(coalesce(vs.qty_available, 0), 0))::numeric as qty_available
  from public.v_warehouse_stock vs
  join (
    select distinct fck.code_key
    from fallback_code_keys fck
  ) codes
    on codes.code_key = upper(trim(coalesce(vs.rik_code, '')))
  where nullif(trim(coalesce(vs.rik_code, '')), '') is not null
  group by 1
),
stock_by_code_uom as (
  select
    upper(trim(coalesce(vs.rik_code, ''))) as code_key,
    lower(trim(coalesce(vs.uom_id, ''))) as uom_key,
    sum(greatest(coalesce(vs.qty_available, 0), 0))::numeric as qty_available
  from public.v_warehouse_stock vs
  join fallback_code_keys fck
    on fck.code_key = upper(trim(coalesce(vs.rik_code, '')))
   and fck.uom_key = lower(trim(coalesce(vs.uom_id, '')))
  where nullif(trim(coalesce(vs.rik_code, '')), '') is not null
    and nullif(trim(coalesce(vs.uom_id, '')), '') is not null
  group by 1, 2
),
fallback_items_allocated as (
  select
    fia.request_id,
    fia.request_item_id,
    fia.qty_limit,
    fia.qty_issued,
    fia.qty_left,
    coalesce(scu.qty_available, sc.qty_available, 0::numeric) as base_available,
    coalesce(
      sum(fia.qty_left) over (
        partition by case
          when scu.qty_available is not null then fia.code_key || '::' || coalesce(fia.uom_key, '-')
          else fia.code_key
        end
        order by fia.request_id asc, fia.name_human asc, fia.request_item_id asc
        rows between unbounded preceding and 1 preceding
      ),
      0::numeric
    ) as prior_qty_left
  from fallback_items_active fia
  left join stock_by_code sc
    on sc.code_key = fia.code_key
  left join stock_by_code_uom scu
    on scu.code_key = fia.code_key
   and scu.uom_key = coalesce(fia.uom_key, '')
),
fallback_items_truth as (
  select
    fia.request_id,
    fia.request_item_id,
    fia.qty_limit,
    fia.qty_issued,
    fia.qty_left,
    greatest(0::numeric, least(fia.qty_left, fia.base_available - fia.prior_qty_left)) as qty_can_issue_now
  from fallback_items_allocated fia
),
fallback_truth_by_req as (
  select
    fit.request_id,
    count(*)::integer as items_cnt,
    sum(case when fit.qty_left > 0 then 1 else 0 end)::integer as ready_cnt,
    sum(case when fit.qty_left <= 0 and fit.qty_limit > 0 then 1 else 0 end)::integer as done_cnt,
    sum(fit.qty_limit)::numeric as qty_limit_sum,
    sum(fit.qty_issued)::numeric as qty_issued_sum,
    sum(fit.qty_left)::numeric as qty_left_sum,
    sum(fit.qty_can_issue_now)::numeric as qty_can_issue_now_sum,
    sum(case when fit.qty_left > 0 and fit.qty_can_issue_now > 0 then 1 else 0 end)::integer as issuable_now_cnt
  from fallback_items_truth fit
  group by fit.request_id
),
merged_truth as (
  select
    vr.request_id,
    coalesce(ut.items_cnt, ft.items_cnt, 0)::integer as items_cnt,
    coalesce(ut.ready_cnt, ft.ready_cnt, 0)::integer as ready_cnt,
    coalesce(ut.done_cnt, ft.done_cnt, 0)::integer as done_cnt,
    coalesce(ut.qty_limit_sum, ft.qty_limit_sum, 0::numeric) as qty_limit_sum,
    coalesce(ut.qty_issued_sum, ft.qty_issued_sum, 0::numeric) as qty_issued_sum,
    coalesce(ut.qty_left_sum, ft.qty_left_sum, 0::numeric) as qty_left_sum,
    coalesce(ut.qty_can_issue_now_sum, ft.qty_can_issue_now_sum, 0::numeric) as qty_can_issue_now_sum,
    coalesce(ut.issuable_now_cnt, ft.issuable_now_cnt, 0)::integer as issuable_now_cnt
  from visible_requests vr
  left join ui_truth_by_req ut
    on ut.request_id = vr.request_id
  left join fallback_truth_by_req ft
    on ft.request_id = vr.request_id
),
ready_rows as (
  select
    vr.request_id,
    (hv.request_id is not null) as from_head_view,
    coalesce(hv.display_no, vr.display_no) as display_no,
    coalesce(hv.object_name, vr.object_name) as object_name,
    coalesce(hv.level_code, vr.level_code) as level_code,
    coalesce(hv.system_code, vr.system_code) as system_code,
    coalesce(hv.zone_code, vr.zone_code) as zone_code,
    coalesce(hv.level_name, vr.level_name) as level_name,
    coalesce(hv.system_name, vr.system_name) as system_name,
    coalesce(hv.zone_name, vr.zone_name) as zone_name,
    vr.contractor_name as contractor_name,
    vr.contractor_phone as contractor_phone,
    vr.planned_volume as planned_volume,
    vr.note as note,
    vr.comment as comment,
    coalesce(hv.submitted_at, vr.submitted_at) as submitted_at,
    vr.display_year,
    vr.display_seq,
    mt.items_cnt,
    mt.ready_cnt,
    mt.done_cnt,
    mt.qty_limit_sum,
    mt.qty_issued_sum,
    mt.qty_left_sum,
    mt.qty_can_issue_now_sum,
    mt.issuable_now_cnt,
    case
      when mt.qty_left_sum <= 0 then 'DONE'
      when mt.qty_can_issue_now_sum > 0 then 'READY'
      when mt.qty_issued_sum > 0 then 'PARTIAL'
      else 'WAITING_STOCK'
    end as issue_status
  from visible_requests vr
  left join head_view hv
    on hv.request_id = vr.request_id
  left join merged_truth mt
    on mt.request_id = vr.request_id
),
view_visible_rows as (
  select
    rr.*,
    true as visible_in_expense_queue,
    (rr.qty_can_issue_now_sum > 0) as can_issue_now,
    (rr.qty_can_issue_now_sum <= 0) as waiting_stock,
    false as all_done
  from ready_rows rr
  where rr.from_head_view
    and rr.qty_left_sum > 0
    and upper(rr.issue_status) <> 'DONE'
),
fallback_rows as (
  select
    rr.*,
    true as visible_in_expense_queue,
    (rr.qty_can_issue_now_sum > 0) as can_issue_now,
    (rr.qty_can_issue_now_sum <= 0) as waiting_stock,
    false as all_done
  from ready_rows rr
  cross join normalized_args na
  where not rr.from_head_view
    and na.offset_value = 0
    and rr.qty_left_sum > 0
    and upper(rr.issue_status) <> 'DONE'
),
visible_queue_rows as (
  select * from view_visible_rows
  union all
  select * from fallback_rows
),
sorted_rows as (
  select *
  from visible_queue_rows
  order by submitted_at desc nulls last, display_year desc, display_seq desc, request_id desc
),
paged_rows as (
  select *
  from sorted_rows
  offset (select offset_value from normalized_args)
  limit (select limit_value from normalized_args)
),
meta_stats as (
  select
    (select count(*)::integer from visible_queue_rows) as total_count,
    (select count(*)::integer from paged_rows) as row_count,
    (
      select count(*)::integer
      from visible_requests vr
      left join head_view hv
        on hv.request_id = vr.request_id
      where hv.request_id is null
    ) as repaired_missing_ids_count,
    (select count(*)::integer from ui_truth_by_req) as ui_truth_request_count,
    (select fallback_truth_request_count from fallback_active_request_count) as fallback_truth_request_count
)
select jsonb_build_object(
  'document_type', 'warehouse_issue_queue_scope',
  'version', 'v4',
  'rows', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', pr.request_id,
          'request_id', pr.request_id,
          'display_no', pr.display_no,
          'object_name', pr.object_name,
          'level_code', pr.level_code,
          'system_code', pr.system_code,
          'zone_code', pr.zone_code,
          'level_name', pr.level_name,
          'system_name', pr.system_name,
          'zone_name', pr.zone_name,
          'contractor_name', pr.contractor_name,
          'contractor_phone', pr.contractor_phone,
          'planned_volume', pr.planned_volume,
          'note', pr.note,
          'comment', pr.comment,
          'submitted_at', pr.submitted_at,
          'items_cnt', pr.items_cnt,
          'ready_cnt', pr.ready_cnt,
          'done_cnt', pr.done_cnt,
          'qty_limit_sum', pr.qty_limit_sum,
          'qty_issued_sum', pr.qty_issued_sum,
          'qty_left_sum', pr.qty_left_sum,
          'qty_can_issue_now_sum', pr.qty_can_issue_now_sum,
          'issuable_now_cnt', pr.issuable_now_cnt,
          'issue_status', pr.issue_status,
          'visible_in_expense_queue', pr.visible_in_expense_queue,
          'can_issue_now', pr.can_issue_now,
          'waiting_stock', pr.waiting_stock,
          'all_done', pr.all_done
        )
        order by pr.submitted_at desc nulls last, pr.display_year desc, pr.display_seq desc, pr.request_id desc
      )
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

do $$
declare
  v_cpu_proof jsonb;
  v_parity jsonb;
begin
  select public.warehouse_issue_queue_r3c_cpu_proof_v1()
  into v_cpu_proof;

  if coalesce((v_cpu_proof ->> 'scope_has_substring')::boolean, true)
    or coalesce((v_cpu_proof ->> 'scope_has_regexp_replace')::boolean, true)
    or coalesce((v_cpu_proof ->> 'scope_has_regexp_match')::boolean, true)
    or not coalesce((v_cpu_proof ->> 'scope_reads_context_projection')::boolean, false)
    or not coalesce((v_cpu_proof ->> 'build_source_exists')::boolean, false)
  then
    raise exception 'R4.A warehouse issue queue CPU proof failed: %', v_cpu_proof;
  end if;

  select public.warehouse_issue_queue_r3c_parity_v1(0, 25) into v_parity;
  if coalesce((v_parity ->> 'diff_count')::integer, 1) <> 0 then
    raise notice 'R4.A warehouse issue queue parity drift for offset=0 limit=25: %', v_parity;
  end if;

  select public.warehouse_issue_queue_r3c_parity_v1(0, 50) into v_parity;
  if coalesce((v_parity ->> 'diff_count')::integer, 1) <> 0 then
    raise notice 'R4.A warehouse issue queue parity drift for offset=0 limit=50: %', v_parity;
  end if;

  select public.warehouse_issue_queue_r3c_parity_v1(0, 100) into v_parity;
  if coalesce((v_parity ->> 'diff_count')::integer, 1) <> 0 then
    raise notice 'R4.A warehouse issue queue parity drift for offset=0 limit=100: %', v_parity;
  end if;

  select public.warehouse_issue_queue_r3c_parity_v1(300, 100) into v_parity;
  if coalesce((v_parity ->> 'diff_count')::integer, 1) <> 0 then
    raise notice 'R4.A warehouse issue queue parity drift for offset=300 limit=100: %', v_parity;
  end if;
end;
$$;

comment on function public.warehouse_issue_queue_scope_v4(integer, integer) is
'R4.A warehouse issue queue scope. Keeps v4 payload semantics unchanged while scoping expensive fallback-truth stock allocation work to offset-relevant requests only.';

grant execute on function public.warehouse_issue_queue_scope_v4(integer, integer) to authenticated;

notify pgrst, 'reload schema';

commit;
