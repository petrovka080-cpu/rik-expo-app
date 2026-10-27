begin;

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
as $buyer_summary_inbox_group_window$
with normalized_args as (
  select
    greatest(0, coalesce(p_offset, 0))::integer as offset_groups,
    least(100, greatest(1, coalesce(p_limit, 12)))::integer as limit_groups,
    nullif(lower(trim(coalesce(p_search, ''))), '') as search_text
),
source_rows as (
  select
    b.request_id,
    b.request_id_old,
    b.request_item_id,
    b.rik_code,
    b.name_human,
    b.qty,
    b.uom,
    b.app_code,
    b.note,
    b.object_name,
    b.status,
    b.created_at,
    b.kind,
    b.director_reject_note,
    b.director_reject_at,
    lower(concat_ws(
      ' ',
      b.request_id::text,
      b.request_id_old::text,
      b.request_item_id::text,
      b.rik_code,
      b.name_human,
      b.app_code,
      b.note,
      b.object_name,
      b.status,
      b.kind
    )) as search_document
  from public.list_buyer_inbox(p_company_id) b
),
filtered_rows as (
  select sr.*
  from source_rows sr
  cross join normalized_args na
  where na.search_text is null
     or sr.search_document like ('%' || na.search_text || '%')
),
group_stats as (
  select
    fr.request_id,
    max(fr.created_at) as group_created_at,
    max(fr.request_id_old) as group_request_no,
    count(*)::integer as item_count
  from filtered_rows fr
  group by fr.request_id
),
ranked_groups as (
  select
    gs.*,
    row_number() over (
      order by
        gs.group_created_at desc nulls last,
        gs.group_request_no desc nulls last,
        gs.request_id::text desc
    )::integer as group_rank,
    count(*) over ()::integer as total_group_count
  from group_stats gs
),
selected_groups as (
  select rg.*
  from ranked_groups rg
  cross join normalized_args na
  where rg.group_rank > na.offset_groups
    and rg.group_rank <= na.offset_groups + na.limit_groups
),
selected_rows as (
  select
    fr.request_id,
    fr.request_id_old,
    fr.request_item_id,
    fr.rik_code,
    fr.name_human,
    fr.qty,
    fr.uom,
    fr.app_code,
    fr.note,
    fr.object_name,
    fr.status,
    fr.created_at,
    fr.kind,
    fr.director_reject_note,
    fr.director_reject_at,
    sg.group_rank
  from filtered_rows fr
  join selected_groups sg
    on sg.request_id = fr.request_id
),
row_payload as (
  select
    coalesce(
      jsonb_agg(
        to_jsonb(sr) - 'group_rank'
        order by sr.group_rank asc, sr.created_at desc nulls last, sr.request_item_id asc
      ),
      '[]'::jsonb
    ) as rows,
    count(*)::integer as returned_row_count
  from selected_rows sr
),
group_payload as (
  select
    count(*)::integer as returned_group_count,
    coalesce(max(sg.total_group_count), (select count(*)::integer from group_stats))::integer as total_group_count
  from selected_groups sg
)
select jsonb_build_object(
  'document_type', 'buyer_summary_inbox_scope_v1',
  'version', '20260626.group-window-from-list-buyer-inbox',
  'rows', rp.rows,
  'meta', jsonb_build_object(
    'offset_groups', na.offset_groups,
    'limit_groups', na.limit_groups,
    'returned_group_count', gp.returned_group_count,
    'total_group_count', gp.total_group_count,
    'returned_row_count', rp.returned_row_count,
    'has_more', na.offset_groups + gp.returned_group_count < gp.total_group_count,
    'search', na.search_text,
    'rows_source', 'list_buyer_inbox',
    'window_contract', 'request_groups'
  )
)
from normalized_args na
cross join row_payload rp
cross join group_payload gp;
$buyer_summary_inbox_group_window$;

create or replace function public.buyer_summary_inbox_group_window_preserve_rows_proof_v1()
returns jsonb
language sql
stable
security definer
set search_path = public
as $buyer_summary_inbox_group_window_proof$
with defs as (
  select pg_get_functiondef('public.buyer_summary_inbox_scope_v1(integer, integer, text, uuid)'::regprocedure) as public_def
)
select jsonb_build_object(
  'checked_at', timezone('utc', now()),
  'public_signature_preserved', position('function public.buyer_summary_inbox_scope_v1(p_offset integer default 0, p_limit integer default 12, p_search text default null::text, p_company_id uuid default null::uuid)' in lower(public_def)) > 0,
  'public_reads_canonical_list_buyer_inbox', position('from public.list_buyer_inbox(p_company_id)' in lower(public_def)) > 0,
  'public_clamps_group_limit_to_100', position('least(100, greatest(1, coalesce(p_limit, 12)))' in lower(public_def)) > 0,
  'public_windows_groups_before_rows', position('selected_groups as' in lower(public_def)) > 0 and position('join selected_groups sg' in lower(public_def)) > 0,
  'public_does_not_cap_child_rows_by_group_limit', position('src.ordinality <= na.limit_groups' in lower(public_def)) = 0 and position('partition by fr.request_id' in lower(public_def)) = 0,
  'public_reports_returned_row_count', position('returned_row_count' in lower(public_def)) > 0
)
from defs;
$buyer_summary_inbox_group_window_proof$;

comment on function public.buyer_summary_inbox_scope_v1(integer, integer, text, uuid) is
'Buyer inbox scope. p_limit limits request groups, never child rows inside a visible request; rows are sourced from list_buyer_inbox so director-approved requests preserve full payloads.';

comment on function public.buyer_summary_inbox_group_window_preserve_rows_proof_v1() is
'Verifier for buyer_summary_inbox_scope_v1 group-window row preservation.';

grant execute on function public.buyer_summary_inbox_scope_v1(integer, integer, text, uuid) to authenticated;
grant execute on function public.buyer_summary_inbox_group_window_preserve_rows_proof_v1() to authenticated;

notify pgrst, 'reload schema';

commit;
