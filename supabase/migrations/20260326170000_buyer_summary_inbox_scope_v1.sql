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
as $$
with search_input as (
  select
    greatest(0, coalesce(p_offset, 0))::integer as offset_groups,
    greatest(1, coalesce(p_limit, 12))::integer as limit_groups,
    nullif(lower(trim(coalesce(p_search, ''))), '') as search_text
),
status_tokens as (
  select
    U&'\043D\0430 \0443\0442\0432\0435\0440\0436\0434\0435\043D\0438\0438'::text as pending_token,
    'pending'::text as pending_en,
    'approved'::text as approved_en,
    U&'\0443\0442\0432\0435\0440\0436\0434\0435\043D\043E'::text as approved_neutral,
    U&'\0443\0442\0432\0435\0440\0436\0434\0435\043D\0430'::text as approved_feminine,
    U&'\0443\0442\0432\0435\0440\0436\0434\0451\043D\043E'::text as approved_neutral_io,
    U&'\0443\0442\0432\0435\0440\0436\0434\0451\043D\0430'::text as approved_feminine_io,
    U&'\0437\0430\043A\0443\043F'::text as procurement_token,
    U&'\043E\0442\043A\043B\043E\043D'::text as rejected_token,
    'reject'::text as rejected_en,
    U&'\0434\043E\0440\0430\0431\043E\0442'::text as rework_token,
    'rework'::text as rework_en
),
base_rows as (
  select
    trim(coalesce(b.request_id::text, '')) as request_id,
    b.request_id_old,
    trim(coalesce(b.request_item_id::text, '')) as request_item_id,
    nullif(trim(coalesce(b.rik_code, '')), '') as rik_code,
    coalesce(nullif(trim(coalesce(b.name_human, '')), ''), U&'\2014') as name_human,
    coalesce(b.qty, 0)::numeric as qty,
    nullif(trim(coalesce(b.uom, '')), '') as uom,
    nullif(trim(coalesce(b.app_code, '')), '') as app_code,
    nullif(trim(coalesce(b.note, '')), '') as note,
    nullif(trim(coalesce(b.object_name, '')), '') as object_name,
    trim(coalesce(b.status, '')) as status,
    b.created_at,
    nullif(trim(coalesce(b.director_reject_note, '')), '') as director_reject_note,
    b.director_reject_at
  from public.list_buyer_inbox(p_company_id) b
  where nullif(trim(coalesce(b.request_id::text, '')), '') is not null
    and nullif(trim(coalesce(b.request_item_id::text, '')), '') is not null
),
request_status_rows as (
  select
    r.id::text as request_id,
    trim(coalesce(r.status::text, '')) as request_status
  from public.requests r
  where r.id in (
    select distinct br.request_id::uuid
    from base_rows br
    where nullif(trim(coalesce(br.request_id, '')), '') is not null
  )
),
rejected_candidates as (
  select distinct br.request_item_id
  from base_rows br
  cross join status_tokens st
  where br.director_reject_at is not null
    or br.director_reject_note is not null
    or position(st.rejected_token in lower(coalesce(br.status, ''))) > 0
    or position(st.rejected_en in lower(coalesce(br.status, ''))) > 0
),
proposal_links as (
  select
    piv.request_item_id::text as request_item_id,
    piv.proposal_id::text as proposal_id
  from public.proposal_items_view piv
  where piv.request_item_id::text in (select rc.request_item_id from rejected_candidates rc)
    and nullif(trim(coalesce(piv.proposal_id::text, '')), '') is not null
),
proposal_lifecycle_ranked as (
  select
    pl.request_item_id,
    trim(coalesce(vps.status, '')) as latest_proposal_status,
    row_number() over (
      partition by pl.request_item_id
      order by coalesce(vps.sent_to_accountant_at, vps.submitted_at) desc nulls last, pl.proposal_id desc
    ) as rn
  from proposal_links pl
  join public.v_proposals_summary vps
    on vps.proposal_id::text = pl.proposal_id
),
latest_proposal_lifecycle as (
  select
    plr.request_item_id,
    plr.latest_proposal_status
  from proposal_lifecycle_ranked plr
  where plr.rn = 1
),
reject_context_ranked as (
  select
    pi.request_item_id::text as request_item_id,
    nullif(trim(coalesce(pi.director_comment, '')), '') as director_comment,
    nullif(trim(coalesce(pi.supplier, '')), '') as last_offer_supplier,
    pi.price as last_offer_price,
    nullif(trim(coalesce(pi.note, '')), '') as last_offer_note,
    row_number() over (
      partition by pi.request_item_id
      order by coalesce(pi.updated_at, pi.created_at) desc nulls last, pi.id desc
    ) as rn
  from public.proposal_items pi
  where pi.request_item_id::text in (select rc.request_item_id from rejected_candidates rc)
),
reject_context_latest as (
  select
    rcr.request_item_id,
    rcr.director_comment,
    rcr.last_offer_supplier,
    rcr.last_offer_price,
    rcr.last_offer_note
  from reject_context_ranked rcr
  where rcr.rn = 1
),
enriched_rows as (
  select
    br.request_id,
    br.request_id_old,
    br.request_item_id,
    br.rik_code,
    br.name_human,
    br.qty,
    br.uom,
    br.app_code,
    br.note,
    br.object_name,
    br.status,
    br.created_at,
    br.director_reject_note,
    br.director_reject_at,
    rqs.request_status,
    lpl.latest_proposal_status,
    coalesce(br.director_reject_note, rcl.director_comment) as director_reject_reason,
    rcl.last_offer_supplier,
    rcl.last_offer_price,
    rcl.last_offer_note,
    lower(coalesce(rqs.request_status, '')) as request_status_norm,
    lower(coalesce(br.status, '')) as item_status_norm,
    lower(coalesce(lpl.latest_proposal_status, '')) as latest_proposal_status_norm
  from base_rows br
  left join request_status_rows rqs
    on rqs.request_id = br.request_id
  left join latest_proposal_lifecycle lpl
    on lpl.request_item_id = br.request_item_id
  left join reject_context_latest rcl
    on rcl.request_item_id = br.request_item_id
),
classified_rows as (
  select
    er.*,
    (
      er.request_status_norm <> ''
      and position((select pending_token from status_tokens) in er.request_status_norm) = 0
      and position((select pending_en from status_tokens) in er.request_status_norm) = 0
      and (
        er.request_status_norm = (select approved_en from status_tokens)
        or position((select approved_neutral from status_tokens) in er.request_status_norm) > 0
        or position((select approved_feminine from status_tokens) in er.request_status_norm) > 0
        or position((select approved_neutral_io from status_tokens) in er.request_status_norm) > 0
        or position((select approved_feminine_io from status_tokens) in er.request_status_norm) > 0
        or position((select procurement_token from status_tokens) in er.request_status_norm) > 0
      )
    ) as request_ready,
    (
      er.item_status_norm <> ''
      and position((select pending_token from status_tokens) in er.item_status_norm) = 0
      and position((select pending_en from status_tokens) in er.item_status_norm) = 0
      and (
        er.item_status_norm = (select approved_en from status_tokens)
        or position((select approved_neutral from status_tokens) in er.item_status_norm) > 0
        or position((select approved_feminine from status_tokens) in er.item_status_norm) > 0
        or position((select approved_neutral_io from status_tokens) in er.item_status_norm) > 0
        or position((select approved_feminine_io from status_tokens) in er.item_status_norm) > 0
        or position((select procurement_token from status_tokens) in er.item_status_norm) > 0
      )
    ) as item_ready,
    (
      er.director_reject_at is not null
      or er.director_reject_note is not null
      or position((select rejected_token from status_tokens) in er.item_status_norm) > 0
      or position((select rejected_en from status_tokens) in er.item_status_norm) > 0
    ) as rejected_like,
    (
      position((select rework_token from status_tokens) in er.latest_proposal_status_norm) > 0
      or position((select rework_en from status_tokens) in er.latest_proposal_status_norm) > 0
    ) as latest_rework
  from enriched_rows er
),
gated_rows as (
  select cr.*
  from classified_rows cr
  where case
    when cr.rejected_like then
      case
        when nullif(trim(coalesce(cr.latest_proposal_status, '')), '') is not null then cr.latest_rework
        else (not cr.request_ready and not cr.item_ready)
      end
    else (cr.item_ready or cr.request_ready)
  end
),
grouped_rows as (
  select
    gr.request_id,
    max(gr.request_id_old) as request_id_old,
    max(gr.created_at) as latest_created_at,
    count(*)::integer as row_count,
    bool_or(
      (
        (select search_text from search_input) is null
        or lower(coalesce(gr.request_id, '')) like ('%' || (select search_text from search_input) || '%')
        or coalesce(gr.request_id_old::text, '') like ('%' || (select search_text from search_input) || '%')
        or lower(coalesce(gr.name_human, '')) like ('%' || (select search_text from search_input) || '%')
        or lower(coalesce(gr.object_name, '')) like ('%' || (select search_text from search_input) || '%')
        or lower(coalesce(gr.rik_code, '')) like ('%' || (select search_text from search_input) || '%')
        or lower(coalesce(gr.app_code, '')) like ('%' || (select search_text from search_input) || '%')
        or lower(coalesce(gr.note, '')) like ('%' || (select search_text from search_input) || '%')
      )
    ) as matches_search
  from gated_rows gr
  group by gr.request_id
),
filtered_groups as (
  select
    grp.request_id,
    grp.request_id_old,
    grp.latest_created_at,
    grp.row_count
  from grouped_rows grp
  where grp.matches_search
),
ordered_groups as (
  select
    fg.request_id,
    fg.request_id_old,
    fg.latest_created_at,
    fg.row_count,
    row_number() over (
      order by fg.request_id_old desc nulls last, fg.latest_created_at desc nulls last, fg.request_id desc
    ) - 1 as group_index
  from filtered_groups fg
),
page_groups as (
  select
    og.request_id,
    og.group_index
  from ordered_groups og
  cross join search_input si
  where og.group_index >= si.offset_groups
    and og.group_index < (si.offset_groups + si.limit_groups)
),
paged_rows as (
  select
    gr.request_id,
    gr.request_id_old,
    gr.request_item_id,
    gr.rik_code,
    gr.name_human,
    gr.qty,
    gr.uom,
    gr.app_code,
    gr.note,
    gr.object_name,
    gr.status,
    gr.created_at,
    gr.director_reject_note,
    gr.director_reject_at,
    gr.director_reject_reason,
    gr.last_offer_supplier,
    gr.last_offer_price,
    gr.last_offer_note,
    pg.group_index,
    row_number() over (
      partition by gr.request_id
      order by gr.created_at desc nulls last, gr.request_item_id asc
    ) as row_rank
  from gated_rows gr
  join page_groups pg
    on pg.request_id = gr.request_id
),
meta_counts as (
  select
    coalesce((select count(*)::integer from ordered_groups), 0) as total_group_count,
    coalesce((select count(*)::integer from page_groups), 0) as returned_group_count,
    coalesce((select count(*)::integer from paged_rows), 0) as returned_row_count,
    coalesce((select count(*)::integer from gated_rows), 0) as gated_row_count
)
select jsonb_build_object(
  'document_type', 'buyer_summary_inbox_scope',
  'version', 'v1',
  'rows', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'request_id', pr.request_id,
          'request_id_old', pr.request_id_old,
          'request_item_id', pr.request_item_id,
          'rik_code', pr.rik_code,
          'name_human', pr.name_human,
          'qty', pr.qty,
          'uom', pr.uom,
          'app_code', pr.app_code,
          'note', pr.note,
          'object_name', pr.object_name,
          'status', pr.status,
          'created_at', pr.created_at,
          'director_reject_note', pr.director_reject_note,
          'director_reject_at', pr.director_reject_at,
          'director_reject_reason', pr.director_reject_reason,
          'last_offer_supplier', pr.last_offer_supplier,
          'last_offer_price', pr.last_offer_price,
          'last_offer_note', pr.last_offer_note
        )
        order by pr.group_index asc, pr.row_rank asc
      )
      from paged_rows pr
    ),
    '[]'::jsonb
  ),
  'meta', jsonb_build_object(
    'rows_source', 'buyer_summary_inbox_scope_v1',
    'legacy_rows_source', 'list_buyer_inbox+requests+proposal_items_view+v_proposals_summary+proposal_items',
    'payload_shape_version', 'v1',
    'primary_owner', 'rpc_scope_v1',
    'backend_first_primary', true,
    'offset_groups', (select offset_groups from search_input),
    'limit_groups', (select limit_groups from search_input),
    'returned_group_count', (select returned_group_count from meta_counts),
    'total_group_count', (select total_group_count from meta_counts),
    'returned_row_count', (select returned_row_count from meta_counts),
    'gated_row_count', (select gated_row_count from meta_counts),
    'has_more', (
      (select offset_groups from search_input) + (select returned_group_count from meta_counts)
    ) < (select total_group_count from meta_counts),
    'search', (select search_text from search_input)
  )
);
$$;

comment on function public.buyer_summary_inbox_scope_v1(integer, integer, text, uuid) is
'Buyer summary inbox scope v1. Moves buyer inbox request-status gating, latest proposal lifecycle enrichment, rejected context enrichment, and group-level windowing into a single backend-owned read contract.';

grant execute on function public.buyer_summary_inbox_scope_v1(integer, integer, text, uuid) to authenticated;

commit;
