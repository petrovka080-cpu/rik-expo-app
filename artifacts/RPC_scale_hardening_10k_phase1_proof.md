# RPC Scale Hardening 10k Phase 1 Proof

## Wave Status
- Wave: `RPC_SCALE_HARDENING_10K_PHASE_1`
- Status after proof collection: `GREEN`
- Diff type: exact SQL hardening + focused test/script/artifacts
- Runtime semantics changed: `false`

## Shortlist Outcome
- Candidate A - `list_buyer_inbox`: safe future target, but lower production-owner value
- Candidate B - `warehouse_issue_queue_scope_v4` broad pre-pagination rewrite: too wide
- Candidate C - `wh_report_issued_materials_fast`: blocked by broader report coupling
- Candidate D - `warehouse_issue_queue_scope_v4` offset-irrelevant fallback-truth branch: chosen

## Confirmed Before-Slice Signal
- Source: `artifacts/RPC_scale_hardening_10k_phase1_before.json`
- Chosen path: `warehouse_issue_queue_scope_v4`
- Bottleneck type: `offset_irrelevant_fallback_truth_branch`
- Live proof that made the slice safe:
  - `visibleRequestCount=134`
  - `headCount=79`
  - `uiTruthCount=79`
  - `missingUiTruthVisibleCount=89`
  - `missingUiTruthInHeadCount=0`
  - `missingUiTruthFallbackOnlyCount=89`
- Interpretation:
  - none of the missing-UI-truth requests were contributing head-view rows
  - fallback-only requests could still inflate deep-page compute cost

## Exact Hardening Applied
- Apply command:
  - `npx supabase db query --linked --file supabase/migrations/20260422170000_r4_a_warehouse_issue_queue_fallback_scope_pushdown.sql`
- Migration self-checks executed during apply:
  - `warehouse_issue_queue_r3c_cpu_proof_v1()`
  - `warehouse_issue_queue_r3c_parity_v1(0, 25)`
  - `warehouse_issue_queue_r3c_parity_v1(0, 50)`
  - `warehouse_issue_queue_r3c_parity_v1(0, 100)`
  - `warehouse_issue_queue_r3c_parity_v1(300, 100)`
- Apply result: `PASS`

## Explain / Plan Delta
- Before:
  - fallback stock-allocation work was built from the full missing-UI-truth active fallback set
  - this work still ran when `offset > 0`, even though fallback-only rows were not eligible to appear
- After:
  - `fallback_truth_request_ids` limits expensive fallback allocation work to:
    - all active fallback requests for `offset = 0`
    - only `head_view`-relevant request ids for `offset > 0`
  - meta accounting still uses `fallback_active_request_count` from the full active fallback set
- Business/result meaning: unchanged

## Before / After Metrics

| Scenario | Baseline median ms | After median ms | Delta | Baseline max ms | After max ms | Result parity |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `page_0_limit_25` | 865 | 738 | -127 | 879 | 787 | `PASS` |
| `page_0_limit_50` | 857 | 1023 | +166 | 858 | 1441 | `PASS` |
| `page_0_limit_100` | 885 | 730 | -155 | 916 | 739 | `PASS` |
| `deep_page_limit_100` | 879 | 588 | -291 | 918 | 596 | `PASS` |

## Variance Check
- Sources:
  - `artifacts/RPC_scale_hardening_10k_phase1_after_confirm.json`
  - `artifacts/RPC_scale_hardening_10k_phase1_stability_check.json`
- Why this was needed:
  - the first `after` sample for `page_0_limit_50` showed one noisy shared-environment run and a temporarily worse median
- Stability findings:
  - `page_0_limit_50` 10-run stability median: `724ms`
  - `page_0_limit_50` 10-run min/max: `695ms / 1278ms`
  - `page_0_limit_100` 10-run stability median: `715ms`
  - `deep_page_limit_100` 10-run stability median: `566ms`
- Interpretation:
  - the chosen bottleneck improvement is real on the target deep-page path
  - page-0 windows remain parity-safe and show shared-environment latency variance rather than deterministic semantic or contract drift

## Unchanged Semantics Proof
- All collected scenarios returned `diffCount=0`
- All collected scenarios returned `isDriftFree=true`
- Preserved on every collected scenario:
  - `rows`
  - `total`
  - `row_count`
  - `has_more`
  - `repaired_missing_ids_count`
  - `ui_truth_request_count`
  - `fallback_truth_request_count`
- Payload bytes stayed identical for the baseline scenarios
- No business totals, grouping rules, permissions, or response-shape fields changed

## Improvement Conclusion
- The chosen bottleneck was the fixed fallback-truth branch that should not have affected deep pages.
- That exact deep-page scenario improved from:
  - median `879ms` -> `588ms`
  - max `918ms` -> `596ms`
- Confirmed serial after-run data tightened the deep-page median further to `566ms`.
- Result: the narrow hardening slice improved the targeted bottleneck while preserving output semantics.

## Focused Tests
- `npx jest tests/warehouse/warehouseIssueQueueScaleHardeningPhase1Migration.test.ts --runInBand` -> `PASS`
- `npx jest src/screens/warehouse/warehouseIssueQueueCpuEliminationMigration.test.ts --runInBand` -> `PASS`
- `npx jest tests/warehouse_buyer_rpc_scale.contract.test.ts --runInBand` -> `PASS`

## Gates
- `npx tsc --noEmit --pretty false` -> `PASS`
- `npx expo lint` -> `PASS`
- `npm test -- --runInBand` -> `PASS`
- `npm test` -> `PASS`
- `git diff --check` -> `PASS`

## Release Tail Decision
- Commit / push: required after gates
- OTA: `skip`
- Why OTA is skipped:
  - this wave changes SQL, tests, scripts, and artifacts only
  - no runtime JS/TS client bundle behavior changed
