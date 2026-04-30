# S-LOAD-5 Post-Fix Hotspot Regression Proof

Status: PARTIAL_STAGING_EXECUTED_RPC_ROW_OVERRUN_REMAINS

Owner goal: 10K/50K+ readiness.

## Scope

- Ran the existing bounded staging load harness only.
- Used the same 5 read-only targets as S-LOAD-4.
- Did not expand target count, concurrency, duration, or payload logging.
- Did not touch production.

## Environment

- `STAGING_SUPABASE_URL` present: YES
- `STAGING_SUPABASE_READONLY_KEY` present: YES
- `STAGING_LOAD_ENABLED=true`: YES
- Secret values printed: NO

## Commands

- `npm test -- --runInBand stagingLoadCore`: PASS
- `node --import tsx scripts/load/staging-load-test.ts`: PASS, 5/5 targets collected

## Target Comparison

| Target | S-LOAD-4 | S-LOAD-5 | Result |
| --- | --- | --- | --- |
| `warehouse_issue_queue_page_25` | `optimize_next`, max 3127 ms, rows 25 | `optimize_next`, max 3005 ms, rows 25 | Slight max-latency improvement, still above 1500 ms threshold |
| `buyer_summary_inbox_page_25` | `optimize_next`, max 1517 ms, rows 26 | `optimize_next`, max 840 ms, rows 26 | Latency improved, direct RPC row overrun remains |
| `warehouse_stock_page_60` | `watch`, max 1352 ms, rows 60 | `safe_now`, max 797 ms, rows 60 | Improved |
| `warehouse_incoming_queue_page_30` | `watch`, max 1459 ms, rows 14 | `safe_now`, max 793 ms, rows 14 | Improved |
| `buyer_summary_buckets_fixed_scope` | `watch`, max 1472 ms, rows 132 | `watch`, max 848 ms, rows 132 | Improved latency, still watch |

## Hotspot Findings

### buyer_summary_inbox_page_25

- S-LOAD-FIX-2 fixed the client publish path with a final `slice(0, normalizedLimitGroups)`.
- The existing staging harness invokes `buyer_summary_inbox_scope_v1` directly.
- Direct staging RPC still returned 26 rows for `p_limit=25`.
- Therefore the S-LOAD-5 harness row overrun criterion is not satisfied.
- Recommendation remains `optimize_next` because of row overrun, not latency.

### warehouse_issue_queue_page_25

- Rows stayed bounded at 25/25.
- Max latency improved from 3127 ms to 3005 ms.
- Recommendation remains `optimize_next` because max latency is still above 1500 ms.

### Watch Targets

- `warehouse_incoming_queue_page_30` improved from `watch` to `safe_now`.
- `warehouse_stock_page_60` improved from `watch` to `safe_now`.
- `buyer_summary_buckets_fixed_scope` stayed `watch`, but max latency improved from 1472 ms to 848 ms.
- No watch target worsened.

## Artifacts

- `artifacts/S_LOAD_1_staging_load_test_matrix.json`
- `artifacts/S_LOAD_1_staging_load_test_proof.md`
- `artifacts/S_LOAD_5_post_fix_hotspot_regression_matrix.json`
- `artifacts/S_LOAD_5_post_fix_hotspot_regression_proof.md`

## Gates

- env boolean preflight: PASS
- `npm test -- --runInBand stagingLoadCore`: PASS
- `node --import tsx scripts/load/staging-load-test.ts`: PASS
- JSON artifact parse check: PASS
- `git diff --check`: PASS
- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `npm test -- --runInBand`: PASS
- `npm test`: PASS
- `npm run release:verify -- --json`: pending final post-commit check

## Safety

- Production touched: NO
- Staging touched: YES, read-only bounded
- Writes: NO
- Service-role used: NO
- SQL/RPC/RLS/storage changed: NO
- Package/native config changed: NO
- Business logic changed: NO
- OTA/EAS/Play Market touched: NO
- Secrets printed/committed: NO
- Raw staging payloads/logs committed: NO

## Next Step

Because direct staging RPC still returns 26 rows for `buyer_summary_inbox_page_25`, the next code wave should be `S-LOAD-FIX-3 TARGETED HOTSPOT OPTIMIZATION` rather than `S-READINESS-10K-PROOF`.
