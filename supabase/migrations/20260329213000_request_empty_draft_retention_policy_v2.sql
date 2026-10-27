begin;

create or replace function public.request_find_reusable_empty_draft_v1(
  p_user_id uuid default auth.uid()
)
returns uuid
language sql
security definer
set search_path = public
as $$
  with request_links as (
    select
      r.id,
      r.created_by,
      coalesce(r.updated_at, r.created_at) as freshness_at,
      (
        r.status = 'Черновик'::public.request_status_enum
        or lower(coalesce(r.status::text, '')) = 'draft'
      ) as is_draft,
      r.submitted_at is not null as has_submit_history,
      exists(
        select 1
        from public.request_items ri
        where ri.request_id = r.id
      ) as has_items,
      exists(
        select 1
        from public.proposals p
        where p.request_id = r.id
      ) as has_proposals,
      exists(
        select 1
        from public.warehouse_issues wi
        where wi.request_id = r.id
      ) as has_warehouse_issues,
      exists(
        select 1
        from public.proposals p
        join public.proposal_payments pp
          on pp.proposal_id = p.id
        where p.request_id = r.id
      ) as has_payment_links
    from public.requests r
    where r.created_by = coalesce(p_user_id, auth.uid())
  )
  select rl.id
  from request_links rl
  where rl.is_draft
    and not rl.has_submit_history
    and not rl.has_items
    and not rl.has_proposals
    and not rl.has_warehouse_issues
    and not rl.has_payment_links
  order by
    rl.freshness_at desc nulls last,
    rl.id desc
  limit 1;
$$;

grant execute on function public.request_find_reusable_empty_draft_v1(uuid) to authenticated;
grant execute on function public.request_find_reusable_empty_draft_v1(uuid) to service_role;

create or replace function public.request_gc_empty_drafts_v1(
  p_older_than_days integer default 7,
  p_limit integer default 500
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(coalesce(p_older_than_days, 7), 1);
  v_limit integer := greatest(least(coalesce(p_limit, 500), 5000), 1);
  v_cutoff timestamptz := now() - make_interval(days => v_days);
  v_deleted_ids uuid[] := '{}'::uuid[];
  v_inspected_draft_count integer := 0;
  v_truly_empty_count integer := 0;
  v_candidate_count integer := 0;
  v_deleted_count integer := 0;
  v_skipped_request_items_count integer := 0;
  v_skipped_submitted_history_count integer := 0;
  v_skipped_proposals_count integer := 0;
  v_skipped_warehouse_issues_count integer := 0;
  v_skipped_payment_links_count integer := 0;
  v_skipped_kept_latest_count integer := 0;
  v_skipped_recent_count integer := 0;
  v_guardrail_proposal_links_count integer := 0;
  v_guardrail_warehouse_issue_links_count integer := 0;
  v_guardrail_payment_links_count integer := 0;
begin
  with classified as (
    select
      r.id,
      r.created_by,
      coalesce(r.updated_at, r.created_at) as freshness_at,
      (
        r.status = 'Черновик'::public.request_status_enum
        or lower(coalesce(r.status::text, '')) = 'draft'
      ) as is_draft,
      r.submitted_at is not null as has_submit_history,
      exists(
        select 1
        from public.request_items ri
        where ri.request_id = r.id
      ) as has_items,
      exists(
        select 1
        from public.proposals p
        where p.request_id = r.id
      ) as has_proposals,
      exists(
        select 1
        from public.warehouse_issues wi
        where wi.request_id = r.id
      ) as has_warehouse_issues,
      exists(
        select 1
        from public.proposals p
        join public.proposal_payments pp
          on pp.proposal_id = p.id
        where p.request_id = r.id
      ) as has_payment_links
    from public.requests r
  ),
  guarded as (
    select
      c.*,
      case
        when not c.is_draft then 'not_draft'
        when c.has_submit_history then 'submitted_history'
        when c.has_items then 'request_items'
        when c.has_proposals then 'proposals'
        when c.has_warehouse_issues then 'warehouse_issues'
        when c.has_payment_links then 'payment_links'
        else 'truly_empty'
      end as lifecycle_state
    from classified c
  ),
  truly_empty_ranked as (
    select
      g.id,
      g.created_by,
      g.freshness_at,
      row_number() over (
        partition by g.created_by
        order by
          g.freshness_at desc nulls last,
          g.id desc
      ) as creator_rank
    from guarded g
    where g.lifecycle_state = 'truly_empty'
  ),
  decisions as (
    select
      t.id,
      t.freshness_at,
      t.creator_rank,
      case
        when t.creator_rank = 1 then 'kept_latest_owner_draft'
        when coalesce(t.freshness_at, now()) >= v_cutoff then 'within_retention_window'
        else 'cleanup_candidate'
      end as cleanup_state
    from truly_empty_ranked t
  ),
  limited_candidates as (
    select d.id
    from decisions d
    where d.cleanup_state = 'cleanup_candidate'
    order by d.freshness_at asc nulls first, d.id asc
    limit v_limit
  ),
  deleted as (
    delete from public.requests r
    using limited_candidates c
    where r.id = c.id
    returning r.id
  )
  select
    coalesce((select count(*) from guarded where is_draft), 0)::integer,
    coalesce((select count(*) from guarded where lifecycle_state = 'truly_empty'), 0)::integer,
    coalesce((select count(*) from decisions where cleanup_state = 'cleanup_candidate'), 0)::integer,
    coalesce((select count(*) from deleted), 0)::integer,
    coalesce((select count(*) from guarded where lifecycle_state = 'request_items'), 0)::integer,
    coalesce((select count(*) from guarded where lifecycle_state = 'submitted_history'), 0)::integer,
    coalesce((select count(*) from guarded where lifecycle_state = 'proposals'), 0)::integer,
    coalesce((select count(*) from guarded where lifecycle_state = 'warehouse_issues'), 0)::integer,
    coalesce((select count(*) from guarded where lifecycle_state = 'payment_links'), 0)::integer,
    coalesce((select count(*) from decisions where cleanup_state = 'kept_latest_owner_draft'), 0)::integer,
    coalesce((select count(*) from decisions where cleanup_state = 'within_retention_window'), 0)::integer,
    coalesce((select count(*) from classified where is_draft and has_proposals), 0)::integer,
    coalesce((select count(*) from classified where is_draft and has_warehouse_issues), 0)::integer,
    coalesce((select count(*) from classified where is_draft and has_payment_links), 0)::integer,
    coalesce((select array_agg(d.id order by d.id) from deleted d), '{}'::uuid[])
  into
    v_inspected_draft_count,
    v_truly_empty_count,
    v_candidate_count,
    v_deleted_count,
    v_skipped_request_items_count,
    v_skipped_submitted_history_count,
    v_skipped_proposals_count,
    v_skipped_warehouse_issues_count,
    v_skipped_payment_links_count,
    v_skipped_kept_latest_count,
    v_skipped_recent_count,
    v_guardrail_proposal_links_count,
    v_guardrail_warehouse_issue_links_count,
    v_guardrail_payment_links_count,
    v_deleted_ids;

  return jsonb_build_object(
    'older_than_days', v_days,
    'limit', v_limit,
    'cutoff_before', v_cutoff,
    'inspected_draft_count', v_inspected_draft_count,
    'truly_empty_count', v_truly_empty_count,
    'candidate_count', v_candidate_count,
    'deleted_count', v_deleted_count,
    'deleted_ids', to_jsonb(v_deleted_ids),
    'skipped', jsonb_build_object(
      'request_items', v_skipped_request_items_count,
      'submitted_history', v_skipped_submitted_history_count,
      'proposals', v_skipped_proposals_count,
      'warehouse_issues', v_skipped_warehouse_issues_count,
      'payment_links', v_skipped_payment_links_count,
      'kept_latest_owner_draft', v_skipped_kept_latest_count,
      'within_retention_window', v_skipped_recent_count
    ),
    'linked_guardrails', jsonb_build_object(
      'proposal_links', v_guardrail_proposal_links_count,
      'warehouse_issue_links', v_guardrail_warehouse_issue_links_count,
      'payment_links', v_guardrail_payment_links_count
    )
  );
end;
$$;

grant execute on function public.request_gc_empty_drafts_v1(integer, integer) to service_role;

comment on function public.request_find_reusable_empty_draft_v1(uuid) is
'Returns the newest truly empty draft for the current foreman user. Protects drafts linked to request_items, proposals, warehouse_issues, payment lineage, or submit history from reuse.';

comment on function public.request_gc_empty_drafts_v1(integer, integer) is
'Retention policy for truly empty request drafts. Deletes only old reusable drafts while keeping the latest empty draft per owner, exposing telemetry for deleted and skipped rows.';

commit;
