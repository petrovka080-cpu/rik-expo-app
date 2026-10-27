begin;

create or replace function public.director_pending_proposals_scope_v1(
  p_offset_heads integer default 0,
  p_limit_heads integer default 10
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with pending_heads as (
  select
    p.id::text as id,
    p.submitted_at,
    nullif(trim(p.proposal_no), '') as proposal_no,
    nullif(trim(p.id_short::text), '') as id_short
  from public.proposals p
  where (
      lower(trim(coalesce(p.status, ''))) in ('pending', 'submitted')
      or trim(coalesce(p.status, '')) = U&'\041D\0430 \0443\0442\0432\0435\0440\0436\0434\0435\043D\0438\0438'
    )
    and p.submitted_at is not null
    and p.sent_to_accountant_at is null
),
proposal_item_counts as (
  select
    pi.proposal_id::text as proposal_id,
    count(*)::integer as items_count
  from public.proposal_items pi
  group by pi.proposal_id::text
),
filtered_heads as (
  select
    ph.id,
    ph.submitted_at,
    case
      when ph.proposal_no is not null then ph.proposal_no
      when ph.id_short is not null then 'PR-' || ph.id_short
      else null
    end as pretty,
    pic.items_count
  from pending_heads ph
  join proposal_item_counts pic
    on pic.proposal_id = ph.id
  where pic.items_count > 0
  order by ph.submitted_at desc, ph.id desc
),
windowed_heads as (
  select *
  from filtered_heads
  offset greatest(coalesce(p_offset_heads, 0), 0)
  limit greatest(coalesce(p_limit_heads, 10), 1)
),
totals as (
  select
    (select count(*)::integer from filtered_heads) as total_head_count,
    coalesce(
      (
        select count(*)::integer
        from public.proposal_items_view piv
        where piv.proposal_id::text in (select id from filtered_heads)
      ),
      0
    ) as total_positions_count
)
select jsonb_build_object(
  'document_type', 'director_pending_proposals_scope',
  'version', 'v1',
  'heads', coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'id', wh.id,
          'submitted_at', wh.submitted_at,
          'pretty', wh.pretty,
          'items_count', wh.items_count
        )
        order by wh.submitted_at desc, wh.id desc
      )
      from windowed_heads wh
    ),
    '[]'::jsonb
  ),
  'meta', jsonb_build_object(
    'offset_heads', greatest(coalesce(p_offset_heads, 0), 0),
    'limit_heads', greatest(coalesce(p_limit_heads, 10), 1),
    'returned_head_count', (select count(*)::integer from windowed_heads),
    'total_head_count', (select total_head_count from totals),
    'total_positions_count', (select total_positions_count from totals),
    'has_more',
      greatest(coalesce(p_offset_heads, 0), 0) + (select count(*)::integer from windowed_heads)
        < (select total_head_count from totals),
    'primary_owner', 'rpc_scope_v1',
    'rows_source', 'director_pending_proposals_scope_v1'
  )
);
$$;

comment on function public.director_pending_proposals_scope_v1(integer, integer) is
'Director pending proposals scope v1. Canonical inbox source for buyer proposals. Treats submitted/pending proposal states as director-visible while preserving item-count and accountant visibility guards.';

grant execute on function public.director_pending_proposals_scope_v1(integer, integer) to authenticated;

commit;
