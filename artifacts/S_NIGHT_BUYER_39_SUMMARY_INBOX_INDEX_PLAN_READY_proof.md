# S_NIGHT_BUYER_39_SUMMARY_INBOX_INDEX_PLAN_READY

final_status: GREEN_BUYER_SUMMARY_INBOX_INDEX_PLAN_READY

## Package
- proposal: docs/migration-plans/20260511093000_buyer_summary_inbox_page25_index_plan.sql
- test: tests/load/buyerSummaryInboxPage25IndexPlan.contract.test.ts
- bounded runner plan: PASS
- live DB apply: false
- supabase/migrations file created: false

## Indexes
- idx_buyer_summary_inbox_pi_req_item_text_proposal_w39 on public.proposal_items(request_item_id::text, proposal_id::text)
- idx_buyer_summary_inbox_pi_req_item_text_context_w39 on public.proposal_items(request_item_id::text, coalesce(updated_at, created_at) desc, id desc) include reject context fields

## Rollback
Rollback SQL is documented in the proposal file using DROP INDEX CONCURRENTLY statements.
