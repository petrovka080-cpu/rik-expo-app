# S-RPC-5 Director Finance / Report-Safe RPC Validation Proof

## Scope

S-RPC-5 validates the next production-safe RPC response shapes after S-RPC-4. The wave focuses on director finance, report-adjacent safe reads, legacy proposal compatibility reads, and legacy director/accountant inbox paths.

No SQL, RPC implementation, RLS, storage, package/native config, production, staging, load test, OTA, EAS, or Play Market surface was touched.

## Baseline From HEAD

- RPC call-sites: 120
- RPC files: 55
- `validateRpcResponse` references in source: 69
- Source files with `validateRpcResponse`: 24

## Post-Wave

- RPC call-sites: 120
- RPC files: 55
- `validateRpcResponse` references in source: 80
- Source files with `validateRpcResponse`: 27
- New validated call-sites: 15
- Already validated S-RPC-1/S-RPC-2/S-RPC-3/S-RPC-4 call-sites reopened: NO

## Validated Call-Sites

1. `src/screens/director/director.finance.rpc.ts` - `director_finance_fetch_summary_v1`
2. `src/screens/director/director.finance.rpc.ts` - `director_finance_summary_v2`
3. `src/screens/director/director.finance.rpc.ts` - `director_finance_panel_scope_v1`
4. `src/screens/director/director.finance.rpc.ts` - `director_finance_panel_scope_v2`
5. `src/screens/director/director.finance.rpc.ts` - `director_finance_panel_scope_v3`
6. `src/screens/director/director.finance.rpc.ts` - `director_finance_panel_scope_v4`
7. `src/screens/director/director.finance.rpc.ts` - `director_finance_supplier_scope_v1`
8. `src/screens/director/director.finance.rpc.ts` - `director_finance_supplier_scope_v2`
9. `src/lib/api/proposals.ts` - `proposal_create`
10. `src/lib/api/proposals.ts` - `proposal_items_for_web`
11. `src/lib/api/proposals.ts` - `list_director_proposals_pending`
12. `src/lib/api/director.ts` - `director_return_min_auto`
13. `src/lib/api/director.ts` - `list_director_inbox`
14. `src/lib/api/accountant.ts` - `list_accountant_inbox_fact`
15. `src/lib/api/accountant.ts` - `list_accountant_inbox`

## Safety Notes

- Valid response behavior is preserved: adapters and existing normalizers still perform the same mapping after validation.
- Invalid response shapes fail closed through `RpcValidationError`.
- Nullable/empty list responses are intentionally allowed only for legacy list fallback RPCs that already treated `null` as an empty result.
- Director finance RPC failures update the existing finance RPC meta state to `failed`, preserving the existing cooldown/fallback behavior.
- Raw RPC payloads, PII, tokens, and secrets are not logged by validation errors.

## Skipped With Reasons

- `pdf_director_*_source_v1`: PDF/report generation source semantics are hard-excluded.
- `pdf_warehouse_*_source_v1`: PDF/export generation semantics are hard-excluded.
- `acc_report_*` / `wh_report_*`: warehouse/accounting report/export semantics intentionally untouched.
- `warehouse_stock_scope_v2`: warehouse stock calculation path requires dedicated stock tests.
- `proposal_submit_text_v1`, `proposal_submit`, `proposal_items_snapshot`: ignored/void return semantics need separate compatibility proof.
- `approve_one`, `reject_one`, `list_pending*`: legacy multi-variant behavior kept unchanged.
- S-RPC-1/S-RPC-2/S-RPC-3/S-RPC-4 validated RPCs: not reopened.

## Proof Artifacts

- `artifacts/S_RPC_5_runtime_validation_matrix.json`
- `artifacts/S_RPC_5_runtime_validation_proof.md`
- `tests/api/sRpc5RuntimeValidation.contract.test.ts`

## Required Gates

To be recorded in closeout:

- `git diff --check`
- `npx tsc --noEmit --pretty false`
- `npx expo lint`
- targeted RPC validation tests
- `npm test -- --runInBand`
- `npm test`
- `npm run release:verify -- --json`

## Safety Confirmation

- production touched: NO
- staging touched: NO
- writes: NO
- SQL/RPC/RLS/storage changed: NO
- package/native config changed: NO
- business logic changed: NO
- finance/accounting calculations changed: NO
- PDF/report/export semantics changed: NO
- OTA/EAS/Play Market touched: NO
- raw payload/PII/secrets logged: NO
- secrets printed/committed: NO
