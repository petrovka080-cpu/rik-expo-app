# S-RPC-3 Runtime Validation Proof

Owner goal: 10K/50K+ readiness.
Play Market / Android submit: DEFERRED_BY_OWNER, not touched.
SQL/RPC implementation changed: NO.
Runtime validation added: YES.
Raw payload logged: NO.
PII logged: NO.
Production touched: NO.
OTA/EAS triggered: NO.

## Baseline

- Starting commit: `e177abc4519458e40e07dc7deab335aa9d6c3587`
- Starting `HEAD == origin/main`: YES
- Starting worktree clean: YES
- Baseline `npm run release:verify -- --json`: PASS
- S-RPC-1 artifacts read:
  - `artifacts/S_RPC_1_runtime_validation_matrix.json`
  - `artifacts/S_RPC_1_runtime_validation_proof.md`
- S-RPC-2 artifacts read:
  - `artifacts/S_RPC_2_runtime_validation_matrix.json`
  - `artifacts/S_RPC_2_runtime_validation_proof.md`

## Count Summary

- Pre-wave local count:
  - RPC files: 55
  - RPC calls: 120
  - Files with `validateRpcResponse`: 10
- Post-implementation local count:
  - RPC files: 55
  - RPC calls: 120
  - Files with `validateRpcResponse`: 17

The wave does not add or remove RPC calls. It adds runtime validation at selected existing high-risk call-sites.

## RPC Call-Sites Validated

1. `src/screens/warehouse/warehouse.requests.read.canonical.ts:apiFetchReqHeadsCanonicalRaw`
   - RPC: `warehouse_issue_queue_scope_v4`
   - Shape: rows envelope with `rows[]` and optional `meta`
   - Guard: `isRpcRowsEnvelope`
   - Risk: warehouse issue queue list can fan out and malformed envelopes previously reached adapters.

2. `src/screens/warehouse/warehouse.requests.read.canonical.ts:apiFetchReqItemsCanonicalRaw`
   - RPC: `warehouse_issue_items_scope_v1`
   - Shape: rows envelope with `rows[]` and optional `meta`
   - Guard: `isRpcRowsEnvelope`
   - Risk: warehouse item details must fail closed on invalid envelope shape.

3. `src/screens/warehouse/warehouse.incoming.repo.ts:fetchWarehouseIncomingHeadsWindow`
   - RPC: `warehouse_incoming_queue_scope_v1`
   - Shape: rows envelope with `rows[]` and optional `meta`
   - Guard: `isRpcRowsEnvelope`
   - Risk: incoming queue list is high-volume warehouse UI data.

4. `src/screens/warehouse/warehouse.incoming.repo.ts:fetchWarehouseIncomingItemsWindow`
   - RPC: `warehouse_incoming_items_scope_v1`
   - Shape: rows envelope with `rows[]` and optional `meta`
   - Guard: `isRpcRowsEnvelope`
   - Risk: incoming item rows affect receive flow correctness.

5. `src/screens/accountant/accountant.inbox.service.ts:loadAccountantInboxWindowData`
   - RPC: `accountant_inbox_scope_v1`
   - Shape: rows envelope with `rows[]` and optional `meta`
   - Guard: `isRpcRowsEnvelope`
   - Risk: accountant invoice/payment inbox is finance-sensitive list data.

6. `src/screens/accountant/accountant.history.service.ts:loadAccountantHistoryRows`
   - RPC: `list_accountant_payments_history_v2`
   - Shape: array response
   - Guard: `isRpcArrayResponse`
   - Risk: legacy payment history list previously treated non-arrays as empty arrays.

7. `src/screens/accountant/accountant.history.service.ts:loadAccountantHistoryWindowData`
   - RPC: `accountant_history_scope_v1`
   - Shape: rows envelope with `rows[]` and optional `meta`
   - Guard: `isRpcRowsEnvelope`
   - Risk: accountant history window is finance-sensitive list data.

8. `src/screens/director/director.proposals.repo.ts:fetchDirectorPendingProposalWindow`
   - RPC: `director_pending_proposals_scope_v1`
   - Shape: `director_pending_proposals_scope` document envelope with `heads[]`
   - Guard: `isDirectorPendingProposalsScopeResponse`
   - Risk: director dashboard/pending list should not silently accept malformed proposal scope.

9. `src/features/market/market.repository.ts:loadMarketHomePage`
   - RPC: `marketplace_items_scope_page_v1`
   - Shape: array response
   - Guard: `isRpcArrayResponse`
   - Risk: marketplace catalog page is a high-volume read flow and future BFF boundary.

10. `src/features/market/market.repository.ts:loadMarketListingById`
    - RPC: `marketplace_item_scope_detail_v1`
    - Shape: object response after existing `maybeSingle()` null handling
    - Guard: `isRpcRecord`
    - Risk: marketplace detail payload should fail closed if the RPC returns an array or primitive.

11. `src/lib/infra/jobQueue.ts:claimSubmitJobsWithClient.primary`
    - RPC: `submit_jobs_claim`
    - Shape: array of queue rows with non-empty `id`, non-empty `job_type`, and known `status`
    - Guard: `isSubmitJobsClaimRpcResponse`
    - Risk: queue claim must not silently discard malformed retry work.

12. `src/lib/infra/jobQueue.ts:claimSubmitJobsWithClient.legacy`
    - RPC: `submit_jobs_claim`
    - Shape: same queue row array for legacy compatibility path
    - Guard: `isSubmitJobsClaimRpcResponse`
    - Risk: legacy queue compatibility path must preserve the same fail-closed shape contract.

13. `src/lib/infra/jobQueue.ts:recoverStuckSubmitJobsWithClient`
    - RPC: `submit_jobs_recover_stuck`
    - Shape: number-like response
    - Guard: `isSubmitJobsRecoverStuckRpcResponse`
    - Risk: queue recovery count must not accept arbitrary objects.

14. `src/lib/infra/jobQueue.ts:markSubmitJobCompletedWithClient.primary`
    - RPC: `submit_jobs_mark_completed`
    - Shape: void response
    - Guard: `isSubmitJobsMarkCompletedRpcResponse`
    - Risk: completion persistence must not accept non-void malformed success payloads.

15. `src/lib/infra/jobQueue.ts:markSubmitJobCompletedWithClient.legacy`
    - RPC: `submit_jobs_mark_completed`
    - Shape: void response
    - Guard: `isSubmitJobsMarkCompletedRpcResponse`
    - Risk: legacy completion compatibility path has the same queue-safety requirement.

16. `src/lib/infra/jobQueue.ts:markSubmitJobFailedWithClient.primary`
    - RPC: `submit_jobs_mark_failed`
    - Shape: nullable row or row array with numeric-like `retry_count` and non-empty `status`
    - Guard: `isSubmitJobsMarkFailedRpcResponse`
    - Risk: retry/dead-letter state must not be poisoned by malformed success payloads.

17. `src/lib/infra/jobQueue.ts:markSubmitJobFailedWithClient.legacy`
    - RPC: `submit_jobs_mark_failed`
    - Shape: same nullable row or row array for legacy compatibility path
    - Guard: `isSubmitJobsMarkFailedRpcResponse`
    - Risk: legacy retry path must preserve the same validation contract.

18. `src/lib/infra/jobQueue.ts:fetchSubmitJobMetricsWithClient`
    - RPC: `submit_jobs_metrics`
    - Shape: metrics object or array row with numeric-like `pending`, `processing`, and `failed`
    - Guard: `isSubmitJobsMetricsRpcResponse`
    - Risk: queue observability should fail closed on malformed metrics.

## Skipped RPCs

- S-RPC-1 call-sites were not reopened:
  - `wh_receive_apply_ui`
  - `accounting_pay_invoice_v1`
  - `director_approve_pipeline_v1`
  - `rpc_proposal_submit_v3`
  - `request_sync_draft_v2`
- S-RPC-2 call-sites were not reopened:
  - `wh_issue_free_atomic_v5`
  - `wh_issue_request_atomic_v1`
  - `request_items_set_status`
  - `buyer_rfq_create_and_publish_v1`
  - `proposal_send_to_accountant_min`
  - `reject_request_item`
  - `reject_request_all`
  - `director_approve_request_v1`
  - `request_item_update_qty`
  - `accountant_proposal_financial_state_v1`
- `director_finance_*`: `NEEDS_BUSINESS_CONTEXT`; finance adapters accept several legacy payload variants and should get a separate finance-focused validation wave.
- `acc_report_*`, `wh_report_*`, `pdf_director_*_source_v1`: `REPORT_OR_PDF_ONLY_DO_NOT_TOUCH`; report/PDF completeness was not capped or changed.
- `proposal_*` legacy RPCs in `src/lib/api/proposals.ts`: `SHAPE_UNCLEAR_DO_NOT_TOUCH`; compatibility return shapes require separate proof.

## Tests Added Or Updated

- Added `tests/api/rpcRuntimeValidationBatch3.contract.test.ts`.
- Updated source files only where selected RPC responses are validated.

Required coverage included:

- valid shape passes
- missing required field fails
- wrong primitive type fails
- array/object mismatch fails
- nullable shape behaves correctly where null is allowed
- existing Supabase error path is preserved by keeping validation after `if (error) throw error`
- existing success return shape is preserved
- invalid shape error does not include raw payload
- invalid shape error does not include PII
- previous S-RPC-1/S-RPC-2 validations are not weakened
- no production env/secrets used

## Gates Run

Targeted tests:

- `npm test -- --runInBand rpcRuntimeValidationBatch3`: PASS
- `npm test -- --runInBand rpc`: PASS
- `npm test -- --runInBand validation`: PASS
- `npm test -- --runInBand warehouse`: PASS
- `npm test -- --runInBand accountant`: PASS
- `npm test -- --runInBand director`: PASS
- `npm test -- --runInBand proposal`: PASS
- `npm test -- --runInBand request`: PASS
- `npm test -- --runInBand payment`: PASS
- `npm test -- --runInBand invoice`: PASS
- `npm test -- --runInBand offline`: PASS
- `npm test -- --runInBand queue`: PASS
- `npm test -- --runInBand market`: PASS

Full gates:

- `git diff --check`: PASS
- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `npm test -- --runInBand`: PASS (`490/491` suites passed, `3088/3089` tests passed, `1` skipped)
- `npm test`: PASS (`490/491` suites passed, `3088/3089` tests passed, `1` skipped)
- `npm run release:verify -- --json`: PASS after push (`readiness.status=pass`, `headMatchesOriginMain=true`)

Note: the same release verification was also run once before push. All gates passed, and the only readiness blocker was the expected pre-push `HEAD does not match origin/main` guard. No OTA/EAS action was triggered.

## Safety Confirmations

- Business logic changed: NO
- App behavior changed: NO, except invalid RPC response shapes now fail closed instead of being treated as valid success data.
- SQL/RPC implementation changed: NO
- Migrations changed: NO
- RLS/storage policies changed: NO
- Package/native/release config changed: NO
- Production touched: NO
- Production writes: NO
- Raw RPC payloads logged: NO
- PII logged: NO
- Secrets printed: NO secret values printed; release tooling may print local env var names only.
- Secrets committed: NO
- OTA published: NO
- EAS build triggered: NO
- EAS submit triggered: NO
- EAS update triggered: NO
- Play Market / Android submit touched: NO
