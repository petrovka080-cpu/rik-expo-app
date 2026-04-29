# S-RPC-4 Runtime Validation Proof

Status: GREEN.

Owner goal: 10K/50K+ readiness.

Mode: production-safe code work. No production or staging data was used. No ENV was inspected. SQL/RPC implementations, RLS/storage, package/native config, Play Market, OTA, and EAS were not touched.

## Baseline

- Pre-wave RPC calls in `src`: 120.
- Pre-wave files with RPC calls: 55.
- Pre-wave `validateRpcResponse` references in `src`: 57.
- Pre-wave files with `validateRpcResponse`: 19.
- S-RPC-1 status: GREEN, 5 call-sites.
- S-RPC-2 status: GREEN, 10 call-sites.
- S-RPC-3 status: GREEN, 18 call-sites.
- S-PAG-6 status before this wave: GREEN.

## Validated Call-Sites

1. `src/screens/subcontracts/subcontracts.shared.ts` / `subcontract_create_v1`
   - Function: `runCanonicalSubcontractCreate`.
   - Guard: `isSubcontractCreateRpcResponse`.
   - Risk: subcontract create mutation can otherwise accept malformed create JSON.

2. `src/screens/subcontracts/subcontracts.shared.ts` / `subcontract_create_draft`
   - Function: `runLegacySubcontractCreateCompat`.
   - Guard: `isSubcontractCreateRpcResponse`.
   - Risk: legacy create compatibility path must share the same fail-closed contract.

3. `src/screens/subcontracts/subcontracts.shared.ts` / `subcontract_approve_v1`
   - Function: `runSubcontractStatusMutation`.
   - Guard: `isSubcontractApproveRpcResponse`.
   - Risk: director subcontract approval should not treat malformed status JSON as success.

4. `src/screens/subcontracts/subcontracts.shared.ts` / `subcontract_reject_v1`
   - Function: `runSubcontractStatusMutation`.
   - Guard: `isSubcontractRejectRpcResponse`.
   - Risk: director subcontract rejection should fail closed on malformed status JSON.

5. `src/lib/api/requests.ts` / `request_find_reusable_empty_draft_v1`
   - Function: `findReusableEmptyDraftRequestId`.
   - Guard: `isRpcNullableNonEmptyStringResponse`.
   - Risk: invalid draft id payload must not be converted into a string id.

6. `src/lib/api/requests.ts` / `request_items_by_request`
   - Function: `listRequestItems`.
   - Guard: `isRpcArrayResponse`.
   - Risk: request item list data should not silently consume non-array RPC output.

7. `src/lib/api/requests.ts` / `request_item_add_or_inc`
   - Function: `addRequestItemFromRikDetailed`.
   - Guard: `isRpcNonEmptyStringResponse`.
   - Risk: request item mutation must return a usable item id before patching metadata.

8. `src/lib/api/requests.ts` / `request_submit_atomic_v1`
   - Function: `runRequestSubmitAtomicStage`.
   - Guard: `isRequestSubmitAtomicRpcResponse`.
   - Risk: submit mutation must preserve existing success/failure contract and fail closed on malformed envelopes.

9. `src/lib/api/requests.ts` / `request_reopen_atomic_v1`
   - Function: `requestReopen`.
   - Guard: `isRequestReopenAtomicRpcResponse`.
   - Risk: request reopen mutation must not hydrate state from malformed RPC JSON.

10. `src/lib/api/proposalAttachmentEvidence.api.ts` / `proposal_attachment_evidence_attach_v1`
    - Function: `attachProposalAttachmentEvidence`.
    - Guard: `isProposalAttachmentEvidenceAttachRpcResponse`.
    - Risk: attachment evidence mutation requires stable attachment/proposal/storage identifiers.

11. `src/lib/api/proposalAttachments.service.ts` / `proposal_attachment_evidence_scope_v1`
    - Function: `loadCanonicalRows`.
    - Guard: `isRpcRecordArray`.
    - Risk: canonical attachment scope should fall back or fail closed instead of treating non-array data as empty canonical truth.

12. `src/lib/store_supabase.ts` / `send_request_to_director`
    - Function: `sendRequestToDirector`.
    - Guard: `isSendRequestToDirectorRpcResponse`.
    - Risk: legacy director handoff mutation consumes inserted count.

13. `src/lib/store_supabase.ts` / `approve_or_decline_request_pending`
    - Function: `approvePending`.
    - Guard: `isApproveOrDeclinePendingRpcResponse`.
    - Risk: legacy director pending decision returns user-visible status rows.

14. `src/screens/accountant/accountant.return.service.ts` / `acc_return_min_auto`
    - Function: `runAccountantReturnToBuyerChain`.
    - Guard: `isRpcVoidResponse`.
    - Risk: accountant return fallback mutation should not accept arbitrary success payloads.

15. `src/screens/accountant/accountant.return.service.ts` / `proposal_return_to_buyer_min`
    - Function: `runAccountantReturnToBuyerChain`.
    - Guard: `isRpcVoidResponse`.
    - Risk: final accountant return fallback mutation should fail closed on malformed success payloads.

## Skipped

- `src/screens/director/director.finance.rpc.ts` / `director_finance_*`: skipped for a dedicated finance validation wave because legacy finance payload variants need business-context proof.
- `src/screens/warehouse/warehouse.api.repo.ts` / `acc_report_*` and `wh_report_*`: skipped as report/PDF/export-adjacent reads.
- `src/lib/api/directorPdfSource.service.ts` / `pdf_director_*_source_v1`: skipped as PDF source validation has separate document-specific contracts.
- `src/lib/api/proposals.ts` / legacy `proposal_*`: skipped because compatibility return shapes remain unclear and need a separate wave.

## Safety

- S-RPC-1/S-RPC-2/S-RPC-3 call-sites reopened: NO.
- SQL/RPC implementation changed: NO.
- Migrations changed: NO.
- RLS/storage changed: NO.
- Business logic changed: NO, except invalid RPC response shapes now fail closed.
- Financial calculations changed: NO.
- Warehouse stock math changed: NO.
- Queue semantics changed: NO.
- Raw RPC payload logging added: NO.
- Existing subcontract invalid-payload debug no longer includes raw payload data.
- PII logged: NO.
- Production touched: NO.
- Staging touched: NO.
- Production writes: NO.
- Secrets printed: NO.
- Secrets committed: NO.
- OTA/EAS/Play Market touched: NO.

## Commands Run

- `git status --short`
- `git rev-parse HEAD`
- `git rev-parse origin/main`
- `git diff --check`
- `Get-Content` for S-RPC-1/S-RPC-2/S-RPC-3 proof and matrix artifacts
- `rg "\.rpc\(" src -g "*.ts" -g "*.tsx"`
- `rg "validateRpcResponse|RpcValidationError|isRpc" src tests artifacts -g "*.ts" -g "*.tsx" -g "*.json" -g "*.md"`
- `rg "payment|invoice|warehouse|receive|issue|queue|claim|recover|complete|fail|metrics|approval|director|accountant|proposal|submit|market|job" src -g "*.ts" -g "*.tsx"`
- `rg`/`Get-Content` focused discovery for selected files
- local RPC/validation count scripts for HEAD baseline and current tree

## Gates

- `npm test -- --runInBand sRpc4RuntimeValidation`: PASS, 1 suite / 5 tests.
- `npm test -- --runInBand rpc`: PASS, 7 suites / 29 tests.
- `npm test -- --runInBand subcontracts.shared requests proposalAttachment`: PASS, 8 suites / 38 tests.
- `git diff --check`: PASS.
- `npx tsc --noEmit --pretty false`: PASS.
- `npx expo lint`: PASS.
- `npm test -- --runInBand`: PASS, 497 passed / 1 skipped suites; 3139 passed / 1 skipped tests.
- `npm test`: PASS, 497 passed / 1 skipped suites; 3139 passed / 1 skipped tests.
- `npm run release:verify -- --json`: pending clean-tree rerun after commit; the pre-commit run passed inner tsc/lint/Jest/diff-check gates and was blocked only by the release guard's dirty-worktree requirement.

## Next Recommended Wave

S-QUEUE-1 QUEUE_BACKPRESSURE_HARDENING.
