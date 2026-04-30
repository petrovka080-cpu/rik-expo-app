# S-LOAD-FIX-5 Warehouse Issue Queue Total Count Reduction Proof

Status: GREEN_SOURCE_PATCH_READY

S-LOAD-7 left one optimize_next target: `warehouse_issue_queue_page_25`, max `2950 ms`, rows `25`. This wave does not touch production or staging and does not run load. It prepares the next repo-only source patch for staging apply.

## Patch

- Migration: `supabase/migrations/20260430114500_s_load_fix_5_warehouse_issue_queue_total_count_reduction.sql`
- Target RPC: `warehouse_issue_queue_scope_v4`
- Patched body: private `warehouse_issue_queue_scope_v4_source_before_sloadfix4`
- Public wrapper/signature: preserved
- Rows/order/page bound: preserved
- Warehouse stock math: unchanged
- Visibility filters: unchanged

## What Changed

- Replaces exact `count(*) from visible_queue_rows` with a `limit + 1` pagination probe.
- Keeps returned rows capped to normalized `p_limit`.
- Keeps existing row order: `submitted_at desc nulls last, display_year desc, display_seq desc, request_id desc`.
- Adds `meta.has_more` from the probe.
- Documents `meta.total` as lower-bound metadata with `total_exact=false` and `total_kind=lower_bound`.
- Uses scoped fallback diagnostic count from `fallback_truth_by_req`.
- Adds additive request order index `idx_requests_issue_queue_order_sloadfix5`, with `status` as an included column instead of an enum-to-text expression so the index is migration-safe.

## Why This Is Narrow

The patch avoids changing issue queue visibility, row payload fields, ordering, warehouse stock calculations, issue mutation semantics, RLS, or grants on the public RPC. It only removes a diagnostic exact-count path that was not needed to return the visible page and keeps pagination behavior through `has_more`.

## Skipped

- `warehouse_stock_scope_v2`: S-LOAD-7 is `safe_now`; stock math excluded.
- `warehouse_incoming_queue_scope_v1`: S-LOAD-7 is `safe_now`.
- `buyer_summary_inbox_scope_v1`: S-LOAD-7 is `safe_now`, rows `25`.
- `buyer_summary_buckets_scope_v1`: still `watch`, but not the remaining optimize_next target.

## Gates

- targeted SQL contract test: PASS
- JSON artifact parse check: PASS
- `git diff --check`: PASS
- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `npm test -- --runInBand`: PASS
- `npm test`: PASS
- `npm run release:verify -- --json`: pending final post-commit check

## Next Required Waves

- `S-STAGING-WAREHOUSE-ISSUE-SOURCE-PATCH-APPLY-2 is required`
- `S-LOAD-8 POST-WAREHOUSE-ISSUE-TOTAL-COUNT-REDUCTION STAGING REGRESSION`

Do not claim 10K readiness until this migration is applied to staging and S-LOAD-8 verifies the hotspot behavior.

## Safety

- Production touched: NO
- Staging touched: NO
- Load tests run: NO
- Migrations applied to live env: NO
- Writes: NO
- Service-role used: NO
- Package/native config changed: NO
- Business logic changed: NO
- Finance/accounting calculations changed: NO
- Warehouse stock math changed: NO
- OTA/EAS/Play Market touched: NO
- Raw payload/PII/secrets logged: NO
- Secrets printed/committed: NO
