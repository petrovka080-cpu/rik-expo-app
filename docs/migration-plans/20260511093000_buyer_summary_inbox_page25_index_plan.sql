begin;

-- W39 buyer_summary_inbox_page_25 readonly index plan.
-- This is a proposal package, not a live-applied migration in supabase/migrations.
-- Production note: if target tables are already large, apply equivalent indexes
-- with CREATE INDEX CONCURRENTLY in a controlled migration window.
--
-- Query helped:
-- public.buyer_summary_inbox_scope_v1(p_offset := 0, p_limit := 25, p_search := null, p_company_id := null)
-- through the private source body preserved as buyer_summary_inbox_scope_v1_source_before_sloadfix3.
--
-- Hot source clauses:
-- proposal_links filters proposal_items_view by request_item_id::text and emits proposal_id.
-- reject_context_ranked filters proposal_items by request_item_id::text and orders by coalesce(updated_at, created_at), id.
--
-- Rollback SQL for production:
-- drop index concurrently if exists public.idx_buyer_summary_inbox_pi_req_item_text_proposal_w39;
-- drop index concurrently if exists public.idx_buyer_summary_inbox_pi_req_item_text_context_w39;

create index if not exists idx_buyer_summary_inbox_pi_req_item_text_proposal_w39
on public.proposal_items (
  (request_item_id::text),
  (proposal_id::text)
);

create index if not exists idx_buyer_summary_inbox_pi_req_item_text_context_w39
on public.proposal_items (
  (request_item_id::text),
  (coalesce(updated_at, created_at)) desc nulls last,
  id desc
)
include (
  proposal_id,
  director_comment,
  supplier,
  price,
  note,
  updated_at,
  created_at
);

commit;
