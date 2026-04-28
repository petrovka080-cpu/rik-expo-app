# S-RPC-2 Runtime Validation Proof

## Baseline

- Starting commit: `3d2db7c3d29d6f6ca86b1c88f61df2cc0aef1e30`
- Starting `HEAD == origin/main`: YES
- Starting worktree clean: YES
- Baseline `npm run release:verify -- --json`: PASS
- S-RPC-1 artifacts read:
  - `artifacts/S_RPC_1_runtime_validation_matrix.json`
  - `artifacts/S_RPC_1_runtime_validation_proof.md`

## Candidate Classification

Fixed now:

1. `src/screens/warehouse/warehouse.issue.repo.ts:issueWarehouseFreeAtomic` / `wh_issue_free_atomic_v5` / `FIX_NOW_HIGH_RISK_RPC`
2. `src/screens/warehouse/warehouse.issue.repo.ts:issueWarehouseRequestAtomic` / `wh_issue_request_atomic_v1` / `FIX_NOW_HIGH_RISK_RPC`
3. `src/screens/buyer/buyer.actions.repo.ts:setRequestItemsDirectorStatus` / `request_items_set_status` / `FIX_NOW_HIGH_RISK_RPC`
4. `src/screens/buyer/buyer.actions.repo.ts:publishRfq` / `buyer_rfq_create_and_publish_v1` / `FIX_NOW_HIGH_RISK_RPC`
5. `src/screens/buyer/buyer.actions.repo.ts:sendProposalToAccountingMin` / `proposal_send_to_accountant_min` / `FIX_NOW_HIGH_RISK_RPC`
6. `src/screens/director/director.request.ts:rejectRequestItem` / `reject_request_item` / `FIX_NOW_HIGH_RISK_RPC`
7. `src/screens/director/director.request.ts:deleteRequestAll` / `reject_request_all` / `FIX_NOW_HIGH_RISK_RPC`
8. `src/screens/director/director.request.ts:approveRequestAndSend` / `director_approve_request_v1` / `FIX_NOW_HIGH_RISK_RPC`
9. `src/lib/catalog/catalog.request.service.ts:requestItemUpdateQty` / `request_item_update_qty` / `FIX_NOW_HIGH_RISK_RPC`
10. `src/lib/api/accountant.ts:accountantLoadProposalFinancialState` / `accountant_proposal_financial_state_v1` / `FIX_NOW_HIGH_RISK_RPC`

Skipped:

- `wh_receive_apply_ui`: `ALREADY_VALIDATED_IN_S_RPC_1`
- `accounting_pay_invoice_v1`: `ALREADY_VALIDATED_IN_S_RPC_1`
- `director_approve_pipeline_v1`: `ALREADY_VALIDATED_IN_S_RPC_1`
- `rpc_proposal_submit_v3`: `ALREADY_VALIDATED_IN_S_RPC_1`
- `request_sync_draft_v2`: `ALREADY_VALIDATED_IN_S_RPC_1`
- PDF/report source RPCs: `LOW_RISK_READ_ONLY` for this mutation-first wave; existing PDF/report assertions were not weakened.
- `submit_jobs_*`: `NEEDS_BUSINESS_CONTEXT`, queue retry semantics should be handled in a separate infra wave.

## Implementation

- Added small S-RPC-2 runtime guards to existing `src/lib/api/queryBoundary.ts`; no new source module and no new dependency.
- Reused `validateRpcResponse()` and `RpcValidationError` from the same helper module.
- Validation is performed immediately after successful `.rpc()` responses.
- Existing Supabase error paths remain preserved.
- Invalid response shapes fail closed with deterministic `RpcValidationError` messages containing only RPC name and caller context.
- No raw response payloads are logged or included in thrown validation messages.

## Response Shapes

- `wh_issue_free_atomic_v5`: JSON number or confirmation object with `issue_id`/`issued_count`/`rows_affected`/`client_mutation_id`/`ok`.
- `wh_issue_request_atomic_v1`: same warehouse issue confirmation shape.
- `request_items_set_status`: void response, `null`/`undefined` allowed.
- `buyer_rfq_create_and_publish_v1`: non-empty tender id string.
- `proposal_send_to_accountant_min`: void response, `null`/`undefined` allowed.
- `reject_request_item`: void response, `null`/`undefined` allowed.
- `reject_request_all`: void response, `null`/`undefined` allowed.
- `director_approve_request_v1`: nullable response; if object is returned it must include boolean `ok`, with safe failure fields for `ok: false`.
- `request_item_update_qty`: object row with required `id`, `request_id`, numeric-like `qty`, and `name_human`.
- `accountant_proposal_financial_state_v1`: finance envelope with `proposal.proposal_id`, `totals`, `eligibility`, `allocation_summary`, `items[]`, and `meta`.

## Tests Added Or Updated

- `tests/warehouse/warehouse.issue.repo.test.ts`
  - valid warehouse issue shapes
  - preserved Supabase error path
  - malformed response fails closed
  - raw payload/PII not present in validation message
- `src/screens/buyer/buyer.actions.repo.test.ts`
  - valid void/string responses
  - invalid object response for void/string RPCs fails closed
  - raw payload/PII not present in validation message
- `src/lib/api/accountant.financial.test.ts`
  - malformed financial state response throws `RpcValidationError`
  - raw PII not present in validation message
- `tests/api/rpcRuntimeValidationBatch2.contract.test.ts`
  - valid shape passes
  - missing required field fails
  - wrong primitive type fails
  - array/object mismatch fails
  - nullable response behaves correctly where null is allowed
  - S-RPC-1 call-sites are not reopened
  - selected S-RPC-2 source call-sites contain validation context

Targeted tests run:

```bash
npm test -- --runInBand rpcRuntimeValidationBatch2 warehouse.issue.repo buyer.actions.repo accountant.financial
```

Result: PASS.

Typecheck and whitespace:

```bash
npx tsc --noEmit --pretty false
git diff --check
```

Result: PASS.

Full gates are run after this proof and recorded in final status.

## Safety

- Business logic changed: NO
- App behavior changed: NO, except invalid RPC response shapes now fail closed instead of being treated as success.
- SQL/RPC implementation changed: NO
- Migrations changed: NO
- RLS/storage policies changed: NO
- Package/native/release config changed: NO
- Production touched: NO
- Production writes: NO
- Raw RPC payloads logged: NO
- PII logged: NO
- Secrets committed: NO
- OTA published: NO
- EAS build triggered: NO
- EAS submit triggered: NO
