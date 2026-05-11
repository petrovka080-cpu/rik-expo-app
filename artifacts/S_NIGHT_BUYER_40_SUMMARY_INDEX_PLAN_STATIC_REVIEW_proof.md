# WAVE 40 ? Buyer Summary Index Plan Static Review

Status: GREEN_BUYER_SUMMARY_INDEX_PLAN_STATIC_REVIEWED

Plan reviewed: `docs/migration-plans/20260511093000_buyer_summary_inbox_page25_index_plan.sql`

Findings:
- Both proposed indexes have explicit names, exact table `public.proposal_items`, exact expression/column shapes, and rollback `DROP INDEX CONCURRENTLY IF EXISTS` statements.
- The target query/RPC is documented as `public.buyer_summary_inbox_scope_v1(p_offset := 0, p_limit := 25, p_search := null, p_company_id := null)`.
- The `request_item_id::text` expression index shape is present in both proposed indexes.
- No executable destructive DML/DDL, table rewrite statement, production apply command, production DB URL, or env write was found.
- The contract test now rejects `DROP TABLE`, `DELETE`, `UPDATE`, destructive `ALTER TABLE`, and unbounded mutation patterns.

Safety:
- DB writes: no
- Migration apply: no
- Production calls: no
- Env writes: no
- Raw secrets/values printed: no
