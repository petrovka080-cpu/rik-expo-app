# S-LOAD-FIX-1 Hotspot Optimization Proof

Status: PARTIAL_NEEDS_DB_OR_RPC_WAVE

Owner goal: 10K/50K+ readiness.

## Source recommendations used

- `warehouse_issue_queue_page_25`: S-LOAD-3 recommendation `optimize_next`; RPC `warehouse_issue_queue_scope_v4`; p_limit 25; max rows 25; median latency 2586 ms; max latency 3739 ms.
- `buyer_summary_inbox_page_25`: S-LOAD-3 recommendation `optimize_next`; RPC `buyer_summary_inbox_scope_v1`; p_limit 25; max rows 26; median latency 466 ms; max latency 1454 ms.
- `warehouse_stock_page_60`: left as watch only.

## Files inspected

- `artifacts/S_LOAD_3_live_staging_load_matrix.json`
- `artifacts/S_LOAD_3_live_staging_load_proof.md`
- `artifacts/S_LOAD_1_staging_load_test_matrix.json`
- `artifacts/S_LOAD_1_staging_load_test_proof.md`
- `scripts/load/stagingLoadCore.ts`
- `src/screens/warehouse/warehouse.requests.read.canonical.ts`
- `src/screens/warehouse/warehouse.requests.read.shared.ts`
- `src/screens/warehouse/warehouse.requests.read.ts`
- `src/screens/buyer/buyer.fetchers.ts`
- `src/screens/buyer/buyer.summary.service.ts`
- `src/lib/api/queryBoundary.ts`
- `src/screens/buyer/buyer.fetchers.data.ts`

## Files changed

- `src/screens/warehouse/warehouse.requests.read.canonical.ts`
- `src/screens/warehouse/warehouse.requests.read.test.ts`
- `src/screens/buyer/buyer.fetchers.ts`
- `src/screens/buyer/buyer.fetchers.test.ts`
- `tests/load/sLoadFix1Hotspots.contract.test.ts`
- `artifacts/S_LOAD_FIX_1_hotspot_optimization_matrix.json`
- `artifacts/S_LOAD_FIX_1_hotspot_optimization_proof.md`

## Hotspot fixes

### warehouse_issue_queue_page_25

- Fix type: `rpc_validation`.
- Added a fail-closed guard that rejects `warehouse_issue_queue_scope_v4` envelopes when `rows.length > p_limit`.
- Existing bounded RPC args were preserved: `p_offset` and `p_limit`.
- No silent cap was added.
- Semantics preserved for valid RPC responses.
- Remaining blocker: S-LOAD-3 latency is produced by the RPC/DB path, so real latency optimization needs a separate DB/RPC wave.

### buyer_summary_inbox_page_25

- Fix type: `rpc_validation`.
- Added `validateRpcResponse(data, isRpcRowsEnvelope, ...)` before adapting `buyer_summary_inbox_scope_v1`.
- Existing bounded RPC args were preserved: `p_offset`, `p_limit`, `p_search`, and `p_company_id`.
- Existing full-scan compatibility path remains page-through-all and does not silently cap required reads.
- Semantics preserved for valid RPC responses.
- Remaining blocker: S-LOAD-3 row-count/latency source is the RPC response itself; fixing that without silent caps requires a separate DB/RPC wave.

### warehouse_stock_page_60

- Status: watch only / unchanged.
- Reason: S-LOAD-3 classified it as `watch`, not `optimize_next`; this wave was scoped to two exact hotspots.

## Safety

- SQL/RPC changed: NO
- RLS/storage changed: NO
- Package/native config changed: NO
- Business logic changed: NO
- App behavior changed: NO for valid responses; malformed RPC envelopes now fail closed.
- Production access: NO
- Production writes: NO
- Staging writes: NO
- Secrets printed: NO
- Secrets committed: NO
- Raw logs committed: NO
- OTA/EAS/Play Market touched: NO

## Commands run

- `git status --short`
- `git rev-parse HEAD`
- `git rev-parse origin/main`
- `git diff --check`
- `cat artifacts/S_LOAD_3_live_staging_load_matrix.json`
- `cat artifacts/S_LOAD_3_live_staging_load_proof.md`
- `cat artifacts/S_LOAD_1_staging_load_test_matrix.json`
- `cat artifacts/S_LOAD_1_staging_load_test_proof.md`
- `rg "warehouse_issue_queue_page_25|buyer_summary_inbox_page_25|warehouse_stock_page_60" scripts tests artifacts src`
- `rg "warehouse.*issue|issue.*queue|wh_issue|warehouse_issue|warehouse.*queue" src scripts tests -g "*.ts" -g "*.tsx"`
- `rg "buyer.*summary|summary.*inbox|buyer_summary|inbox.*summary" src scripts tests -g "*.ts" -g "*.tsx"`
- `rg "\.select\(|\.rpc\(|Promise\.all|mapWithConcurrencyLimit|range\(|limit\(" src/screens src/lib src/components src/workers -g "*.ts" -g "*.tsx"`
- `rg "warehouse_issue_queue_scope_v4|warehouse_issue_queue" src/screens src/lib tests scripts -g "*.ts" -g "*.tsx"`
- `rg "validateRpcResponse|runContainedRpc|RpcValidation|rpc validation|contained rpc" src tests scripts -g "*.ts" -g "*.tsx"`
- `npm test -- --runInBand sLoadFix1Hotspots` (PASS)
- `npm test -- --runInBand buyer.fetchers warehouse.requests.read` (PASS)
- `npm test -- --runInBand stagingLoadCore` (PASS)
- `npm test -- --runInBand pagination` (PASS)
- `npm test -- --runInBand rpc` (PASS)
- `npx tsc --noEmit --pretty false` (PASS)
- `npx expo lint` (PASS)
- `npm test -- --runInBand` (PASS: 496 suites passed, 1 skipped; 3134 tests passed, 1 skipped)
- `npm test` (PASS: 496 suites passed, 1 skipped; 3134 tests passed, 1 skipped)
- `npm run release:verify -- --json` (PRECOMMIT BLOCKED: internal gates passed, release guard requires clean worktree; rerun required after commit/push)

## Full gates

- `git diff --check`: PASS
- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `npm test -- --runInBand`: PASS
- `npm test`: PASS
- `npm run release:verify -- --json`: PRECOMMIT BLOCKED by dirty worktree after internal gates passed; clean HEAD rerun pending after push

## Optional staging rerun

- Not performed.
- Reason: the safe code-only guards do not change staging RPC latency or payload generation, and this wave did not need staging access or writes.

## Readiness impact

- Client runtime now fails closed on malformed or oversized hotspot RPC envelopes.
- The two S-LOAD-3 optimize_next hotspots are not falsely marked green because the measured pressure is in the RPC/DB path and this wave is forbidden from SQL/RPC changes.

## Next recommended wave

- Create a separate S-DB-6 or S-RPC-4 targeted wave for `warehouse_issue_queue_scope_v4` latency and `buyer_summary_inbox_scope_v1` row-count/latency optimization.
