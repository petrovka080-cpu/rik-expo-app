# S-LOAD-FIX-6 Warehouse Issue Queue Explain / Index Plan Proof

Status: GREEN_SOURCE_PATCH_READY

This wave prepares a repo-only source-shape patch for the remaining `warehouse_issue_queue_page_25` hotspot. It does not touch production, does not apply migrations to staging, and does not run load.

## Current Active Staging Source

The active staging source is the safety-restored exact-count path from S-STAGING-WAREHOUSE-ISSUE-SOURCE-PATCH-APPLY-2:

- public RPC: `warehouse_issue_queue_scope_v4`
- private source: `warehouse_issue_queue_scope_v4_source_before_sloadfix4`
- safety proof helper: `warehouse_issue_queue_sloadfix5d_restore_exact_count_proof_v1`
- direct read-only smoke: `p_offset=0`, `p_limit=25`
- rows returned: `25`
- `rows <= p_limit`: YES
- `meta.row_count`: `25`
- `meta.has_more`: boolean exists
- `meta.total_exact=false`: not present after restore
- `meta.total_kind=lower_bound`: not present after restore
- raw payload printed: NO

## EXPLAIN Access

Staging read-only PostgREST `.explain()` was attempted with `STAGING_SUPABASE_READONLY_KEY`.

- EXPLAIN available: NO
- Error code: `PGRST107`
- Raw plan printed: NO
- Secrets printed: NO

Because live EXPLAIN was unavailable, this patch is based on source-shape diagnosis plus the bounded staging smoke above. It avoids another blind lower-bound total-count rewrite.

## Diagnosis

S-LOAD-FIX-5 proved that replacing exact total count with the previous `limit + 1` lower-bound probe is unsafe on staging: Fix-5, 5B, and 5C all led to RPC timeout `57014`.

The active exact-count source still does broad work before returning a 25-row page:

- `head_view` reads `v_wh_issue_req_heads_ui` before narrowing to visible request ids.
- `ui_item_truth` aggregates `v_wh_issue_req_items_ui` before narrowing to visible request ids.
- exact `visible_queue_rows` count remains active.
- fallback/stock truth remains required for visibility and warehouse stock semantics.

## Patch

Migration:

- `supabase/migrations/20260430133000_s_load_fix_6_warehouse_issue_queue_visible_truth_pushdown.sql`

Patch behavior:

- preserves public RPC signature
- preserves public wrapper
- patches only private `warehouse_issue_queue_scope_v4_source_before_sloadfix4`
- scopes `head_view` to `visible_requests`
- scopes `ui_item_truth` to `visible_requests`
- preserves exact `visible_queue_rows` total count
- preserves row payload shape
- preserves row order
- preserves page bound
- preserves meta shape
- preserves visibility rules
- preserves warehouse stock truth path
- does not reintroduce `sorted_probe_rows`
- does not reintroduce `total_exact=false` / `total_kind=lower_bound`
- adds no guessed index without EXPLAIN evidence

Proof helper:

- `warehouse_issue_queue_sloadfix6_visible_truth_pushdown_proof_v1`

Boundary contract update:

- `tests/load/sLoadFix1Hotspots.contract.test.ts`
- `tests/load/sLoadFix2Hotspots.contract.test.ts`
- `tests/api/hotspotListPaginationBatch7.contract.test.ts`

These older wave-boundary tests still forbid broad SQL/native/package drift, but now explicitly allow only the S-LOAD-FIX-6 warehouse issue source migration while it is uncommitted.

## Skipped

- Reapply Fix-5 lower-bound total-count patch: skipped because it caused staging timeout `57014`.
- Apply this migration to staging: skipped because this wave is source-patch-ready only.
- Run S-LOAD-8: skipped because load regression must wait until the new source patch is applied.
- Change warehouse stock allocation math: skipped by hard exclusion.

## Gates

- targeted S-LOAD-FIX-6 tests: PASS
- targeted warehouse issue queue source tests: PASS
- JSON artifact parse check: PASS
- `git diff --check`: PASS
- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `npm test -- --runInBand`: PASS
- `npm test`: PASS
- `npm run release:verify -- --json`: pending post-commit

## Next Required Waves

- `S-STAGING-WAREHOUSE-ISSUE-SOURCE-PATCH-APPLY-3`
- `S-LOAD-8 POST-WAREHOUSE-ISSUE-FIX-6 STAGING REGRESSION`

Do not claim 10K readiness until the migration is applied to staging and bounded staging load verifies the hotspot behavior.

## Safety

- Production touched: NO
- Staging touched: YES, read-only only
- Staging DDL/migration applied: NO
- Production DDL/migration applied: NO
- Load tests run: NO
- Data writes: NO
- Service-role used: NO
- Package/native config changed: NO
- Business logic changed: NO
- Visibility semantics changed: NO
- Warehouse stock math changed: NO
- OTA/EAS/Play Market touched: NO
- Raw payload/PII/secrets logged: NO
- Secrets printed/committed: NO
