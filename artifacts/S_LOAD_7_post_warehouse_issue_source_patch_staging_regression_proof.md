# S-LOAD-7 Post Warehouse Issue Source Patch Staging Regression Proof

Status: PARTIAL_STAGING_EXECUTED_WAREHOUSE_ISSUE_STILL_OPTIMIZE_NEXT

S-LOAD-FIX-4 was already applied to staging in `S-STAGING-WAREHOUSE-ISSUE-SOURCE-PATCH-APPLY-1`. This wave ran the same bounded read-only staging harness as S-LOAD-6. It did not apply migrations and did not touch production.

## Environment

- `STAGING_SUPABASE_URL`: present
- `STAGING_SUPABASE_READONLY_KEY`: present
- `STAGING_LOAD_ENABLED=true`: yes
- Production credentials present but not used: YES
- Secret values printed: NO

## Target Comparison

| Target | S-LOAD-6 | S-LOAD-7 | Result |
| --- | --- | --- | --- |
| `warehouse_issue_queue_page_25` | `optimize_next`, max 3382 ms, rows 25 | `optimize_next`, max 2950 ms, rows 25 | improved but still optimize_next |
| `warehouse_incoming_queue_page_30` | `watch`, max 833 ms, rows 14 | `safe_now`, max 752 ms, rows 14 | improved to safe_now |
| `warehouse_stock_page_60` | `watch`, max 1426 ms, rows 60 | `safe_now`, max 720 ms, rows 60 | improved to safe_now |
| `buyer_summary_inbox_page_25` | `watch`, max 914 ms, rows 25 | `safe_now`, max 794 ms, rows 25 | row overrun remains fixed and latency is safe_now |
| `buyer_summary_buckets_fixed_scope` | `watch`, max 860 ms, rows 132 | `watch`, max 1282 ms, rows 132 | still watch, one-sample latency regressed |

## Main Finding

`warehouse_issue_queue_page_25` improved after the source patch:

- max latency: `3382 ms -> 2950 ms`
- median latency: `2883 ms -> 2630 ms`
- rows: `25 -> 25`
- payload: stable at `18777 bytes`

But it remains above the `1500 ms` optimize_next threshold, so the correct status is PARTIAL, not GREEN_LOAD_VERIFIED and not 10K readiness.

## Positive Regressions Cleared

- `buyer_summary_inbox_page_25`: row overrun remains fixed, rows `25`, and recommendation improved to `safe_now`.
- `warehouse_stock_page_60`: improved from `watch` to `safe_now`.
- `warehouse_incoming_queue_page_30`: improved from `watch` to `safe_now`.

## Remaining Risk

- `warehouse_issue_queue_page_25` remains the only optimize_next target.
- `buyer_summary_buckets_fixed_scope` remains watch due one-sample max latency `1282 ms`.

Recommended next wave:

- `S-LOAD-FIX-5 WAREHOUSE ISSUE QUEUE SOURCE PLAN / TOTAL-COUNT REDUCTION`

That wave should focus on the warehouse issue queue source plan, especially total-count/fallback truth work, without changing queue visibility, ordering, permissions, warehouse stock math, or business semantics.

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
- Migrations applied: NO
- SQL/RPC/RLS/storage changed: NO
- Package/native config changed: NO
- Business logic changed: NO
- OTA/EAS/Play Market touched: NO
- Raw payload/PII/secrets logged: NO
- Secrets printed/committed: NO
