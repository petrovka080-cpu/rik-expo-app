# S-LOAD-6 Post-RPC-Source-Patch Staging Regression Proof

Status: `PARTIAL_STAGING_EXECUTED_WAREHOUSE_ISSUE_OPTIMIZE_NEXT_AND_WATCH_REGRESSIONS`

Owner goal: 10K/50K+ readiness.

## Scope

- Ran the existing bounded staging load harness only.
- Used the same 5 read-only targets as S-LOAD-5.
- Did not expand target count, concurrency, duration, or payload logging.
- Did not touch production.
- Did not apply migrations in this wave.

## Environment

- `STAGING_SUPABASE_URL` present: YES
- `STAGING_SUPABASE_READONLY_KEY` present: YES
- `STAGING_LOAD_ENABLED=true`: YES
- Secret values printed: NO
- Production credentials used: NO
- Service-role used: NO

## Commands

- `npm test -- --runInBand stagingLoadCore`: PASS
- `node --import tsx scripts/load/staging-load-test.ts`: PASS, 5/5 targets collected
- targeted `buyer_summary_inbox_scope_v1` meta check: PASS

## Target Comparison

| Target | S-LOAD-5 | S-LOAD-6 | Result |
| --- | --- | --- | --- |
| `warehouse_issue_queue_page_25` | `optimize_next`, max 3005 ms, rows 25 | `optimize_next`, max 3382 ms, rows 25 | Still above 1500 ms threshold; rows bounded |
| `buyer_summary_inbox_page_25` | `optimize_next`, max 840 ms, rows 26 | `watch`, max 914 ms, rows 25, meta 25 | Direct RPC row overrun fixed; still watch latency |
| `warehouse_stock_page_60` | `safe_now`, max 797 ms, rows 60 | `watch`, max 1426 ms, rows 60 | Regressed to watch on max latency |
| `warehouse_incoming_queue_page_30` | `safe_now`, max 793 ms, rows 14 | `watch`, max 833 ms, rows 14 | Regressed to watch on max latency |
| `buyer_summary_buckets_fixed_scope` | `watch`, max 848 ms, rows 132 | `watch`, max 860 ms, rows 132 | Stable watch |

## Hotspot Findings

### buyer_summary_inbox_page_25

- S-LOAD-5 direct staging RPC returned 26 rows for `p_limit=25`.
- S-LOAD-6 direct staging RPC returned 25 rows for `p_limit=25`.
- Targeted meta check returned `meta.returned_row_count=25`.
- The row overrun is resolved on staging after the source patch.
- Recommendation improved from `optimize_next` to `watch` because max latency remains above 800 ms.

### warehouse_issue_queue_page_25

- Rows stayed bounded at 25/25.
- Max latency moved from 3005 ms to 3382 ms.
- Recommendation remains `optimize_next` because max latency is still above 1500 ms.

### Watch / Safe Targets

- `warehouse_stock_page_60` moved `safe_now -> watch` due max latency 1426 ms.
- `warehouse_incoming_queue_page_30` moved `safe_now -> watch` due max latency 833 ms.
- `buyer_summary_buckets_fixed_scope` stayed `watch`.
- No target returned a row overrun after the source patch.

## Artifacts

- `artifacts/S_LOAD_1_staging_load_test_matrix.json`
- `artifacts/S_LOAD_1_staging_load_test_proof.md`
- `artifacts/S_LOAD_6_post_rpc_source_patch_staging_regression_matrix.json`
- `artifacts/S_LOAD_6_post_rpc_source_patch_staging_regression_proof.md`

## Gates

- env boolean preflight: PASS
- `npm test -- --runInBand stagingLoadCore`: PASS
- `node --import tsx scripts/load/staging-load-test.ts`: PASS
- targeted buyer inbox meta check: PASS
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
- Migrations applied: NO
- SQL/RPC/RLS/storage changed: NO
- Package/native config changed: NO
- Business logic changed: NO
- OTA/EAS/Play Market touched: NO
- Secrets printed/committed: NO
- Raw staging payloads/logs committed: NO

## Next Step

Do not claim 10K readiness yet.

The source patch resolved the buyer inbox direct RPC row overrun, but `warehouse_issue_queue_page_25` remains `optimize_next` and two formerly `safe_now` targets are back in `watch`. The next code wave should focus narrowly on warehouse issue queue latency and watch-target stability before another staging regression.
