# S-DB-2 Index Query Plan Proof

HEAD before: 28728cf51e2de286eff1af81ee28b41d0916b530
HEAD after: PENDING_COMMIT

Migration file:
- supabase/migrations/20260428154000_s_db_2_query_plan_indexes.sql

Indexes added:
1. idx_requests_submitted_display_id_sdb2
2. idx_request_items_request_row_position_id_sdb2
3. idx_request_items_request_status_sdb2
4. idx_proposals_director_pending_submitted_sdb2
5. idx_proposals_request_supplier_updated_sdb2
6. idx_proposal_items_proposal_id_id_sdb2
7. idx_market_listings_company_status_created_sdb2
8. idx_market_listings_user_status_created_sdb2
9. idx_work_progress_log_progress_created_sdb2
10. idx_wh_ledger_direction_moved_at_sdb2

Per-index mapping:

1. requests
- Query file: src/lib/api/requestCanonical.read.ts
- Filters/order: ordered window by submitted_at/display_no/id
- Why it helps: supports deterministic paginated request list order.
- EXPLAIN: NOT AVAILABLE

2. request_items request detail order
- Query file: src/lib/catalog/catalog.request.service.ts
- Filters/order: request_id = ?, row_no ASC, position_order ASC, id ASC
- Why it helps: avoids full scans/sorts for request detail item lists.
- EXPLAIN: NOT AVAILABLE

3. request_items pending fan-in
- Query file: src/screens/director/director.repository.ts
- Filters/order: request_id IN (...), status IN (...)
- Why it helps: supports director pending item joins by request/status.
- EXPLAIN: NOT AVAILABLE

4. proposals director pending queue
- Query file: src/lib/api/proposals.ts
- Filters/order: submitted_at IS NOT NULL, sent_to_accountant_at IS NULL, submitted_at DESC
- Why it helps: supports pending proposal queue without scanning completed accounting rows.
- EXPLAIN: NOT AVAILABLE

5. proposals request/supplier lookup
- Query file: src/lib/catalog/catalog.proposalCreation.service.ts
- Filters/order: request_id = ?, supplier = ? or supplier IS NULL, updated_at DESC
- Why it helps: supports recent proposal lookup for a request/supplier pair.
- EXPLAIN: NOT AVAILABLE

6. proposal_items detail list
- Query file: src/lib/api/proposals.ts
- Filters/order: proposal_id = ?, id ASC
- Why it helps: supports proposal detail/PDF item ordering by proposal.
- EXPLAIN: NOT AVAILABLE

7. market_listings company feed
- Query file: src/features/supplierShowcase/supplierShowcase.data.ts
- Filters/order: company_id = ?, status = ?, created_at DESC
- Why it helps: supports company supplier showcase slices.
- EXPLAIN: NOT AVAILABLE

8. market_listings user feed
- Query file: src/features/supplierShowcase/supplierShowcase.data.ts
- Filters/order: user_id = ?, status = ?, created_at DESC
- Why it helps: supports owner/user supplier showcase slices.
- EXPLAIN: NOT AVAILABLE

9. work_progress_log progress history
- Query files: src/screens/contractor/contractor.data.ts, src/screens/contractor/contractor.workModalService.ts
- Filters/order: progress_id = ?, created_at ASC/DESC
- Why it helps: supports contractor progress history/latest-log reads.
- EXPLAIN: NOT AVAILABLE

10. wh_ledger incoming date range
- Query file: src/screens/warehouse/warehouse.api.repo.ts
- Filters/order: direction = ?, moved_at range
- Why it helps: supports warehouse incoming ledger date-window reads.
- EXPLAIN: NOT AVAILABLE

Safety:
- Destructive SQL used: NO
- Table drops: NO
- Index drops: NO
- Alter table: NO
- SQL/RPC function changed: NO
- RLS changed: NO
- Business logic changed: NO
- UI changed: NO
- Maestro YAML changed: NO
- Production SQL deployed: NO
- OTA published: NO
- EAS build triggered: NO

Gate results:
- targeted migration test: PASS (`npm test -- --runInBand sDb2QueryPlanIndexesMigration`)
- tsc: PASS (`npx tsc --noEmit --pretty false`)
- lint: PASS (`npx expo lint`)
- npm test -- --runInBand: PASS
- npm test: PASS after rerun. First parallel run hit a transient warehouse duplicate-key test fixture collision; isolated rerun and full rerun both passed.
- git diff --check: PASS
- release:verify: PENDING POST-COMMIT
