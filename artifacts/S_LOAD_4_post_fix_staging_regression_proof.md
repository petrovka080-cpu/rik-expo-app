# S-LOAD-4 Post-Fix Staging Regression Proof

Owner goal: 10K/50K+ readiness.
Target: staging only.
Status: `GREEN_STAGING_EXECUTED_STILL_OPTIMIZE_NEXT`.

This is a regression proof after S-PAG-7, S-PAG-8, and S-RT-5. It reused the existing bounded read-only staging harness and did not expand target count, repeated runs, or concurrency.

## Commands Run

```bash
npm test -- --runInBand stagingLoadCore
node --import tsx scripts/load/staging-load-test.ts
```

## Environment

- `STAGING_SUPABASE_URL`: PRESENT
- `STAGING_SUPABASE_READONLY_KEY`: PRESENT
- `STAGING_LOAD_ENABLED`: TRUE
- Secret values printed: NO
- Production fallback used: NO

## Baseline Recommendations From S-LOAD-3

- `warehouse_issue_queue_page_25`: `optimize_next`
- `warehouse_incoming_queue_page_30`: `safe_now`
- `warehouse_stock_page_60`: `watch`
- `buyer_summary_inbox_page_25`: `optimize_next`
- `buyer_summary_buckets_fixed_scope`: `safe_now`

## S-LOAD-4 Post-Fix Recommendations

- `warehouse_issue_queue_page_25`: `optimize_next`
- `warehouse_incoming_queue_page_30`: `watch`
- `warehouse_stock_page_60`: `watch`
- `buyer_summary_inbox_page_25`: `optimize_next`
- `buyer_summary_buckets_fixed_scope`: `watch`

## Target Comparison

| Target | S-LOAD-3 | S-LOAD-4 | Comparison |
| --- | --- | --- | --- |
| `warehouse_issue_queue_page_25` | maxLatency 3739ms, rows 25, payload 18777b, `optimize_next` | maxLatency 3127ms, rows 25, payload 18777b, `optimize_next` | Max latency improved, but still above 1500ms. Status remains `still_optimize_next`. |
| `warehouse_incoming_queue_page_30` | maxLatency 798ms, rows 14, payload 6366b, `safe_now` | maxLatency 1459ms, rows 14, payload 6366b, `watch` | Regressed to `watch` because of one max-latency sample. Rows and payload stayed stable. |
| `warehouse_stock_page_60` | maxLatency 1356ms, rows 60, payload 16791b, `watch` | maxLatency 1352ms, rows 60, payload 16791b, `watch` | Stable watch-only. |
| `buyer_summary_inbox_page_25` | maxLatency 1454ms, rows 26, payload 14738b, `optimize_next` | maxLatency 1517ms, rows 26, payload 14725b, `optimize_next` | Still `optimize_next`; 26 rows for expected 25 and max latency crossed 1500ms by 17ms. |
| `buyer_summary_buckets_fixed_scope` | maxLatency 798ms, rows 132, payload 28333b, `safe_now` | maxLatency 1472ms, rows 132, payload 28333b, `watch` | Regressed to `watch` because of one max-latency sample. Rows and payload stayed stable. |

## Hotspot Status

- `warehouse_issue_queue_page_25`: partially improved on max latency, but still `optimize_next`.
- `buyer_summary_inbox_page_25`: still `optimize_next`; row overrun remains and max latency is now over threshold.
- `warehouse_stock_page_60`: remained `watch`, not worsened.
- Previously safe targets did not remain safe: both moved to `watch` due max-latency samples only.

Recommended next wave if continuing from this proof: `S-LOAD-FIX-2 TARGETED HOTSPOT OPTIMIZATION`.

## Artifacts

- `artifacts/S_LOAD_4_post_fix_staging_regression_matrix.json`
- `artifacts/S_LOAD_4_post_fix_staging_regression_proof.md`
- Legacy harness artifacts updated by the bounded run:
  - `artifacts/S_LOAD_1_staging_load_test_matrix.json`
  - `artifacts/S_LOAD_1_staging_load_test_proof.md`

## Gates

- Env boolean preflight: PASS
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
- SQL/RPC/RLS/storage changed: NO
- Package/native config changed: NO
- Business logic changed: NO
- OTA/EAS/Play Market touched: NO
- Secrets printed/committed: NO
- Raw staging payloads/logs committed: NO
