# S-STAGING-WAREHOUSE-ISSUE-SOURCE-PATCH-APPLY-2 Proof

Status: PARTIAL_STAGING_EXECUTED_FIX5_TIMEOUT_RESTORED_SAFE_SOURCE

This wave attempted to apply the already committed S-LOAD-FIX-5 warehouse issue queue source patch to staging only. It did not touch production, did not run load, and does not claim 10K readiness.

## Git State

- HEAD before apply: `b27567553d3e09c8d2e1731a9a505191630fb899`
- `HEAD == origin/main` before apply: YES
- Worktree clean before apply: YES
- HEAD after safety restore: `415ef2fea4fcefb6341af8988cdf9e4791016e3a`
- `HEAD == origin/main` after safety restore: YES

## Migration Apply

Dry-run before apply showed exactly one pending migration:

- `20260430114500_s_load_fix_5_warehouse_issue_queue_total_count_reduction.sql`

Applied to staging only:

- `20260430114500_s_load_fix_5_warehouse_issue_queue_total_count_reduction.sql`
- `20260430120500_s_load_fix_5b_warehouse_issue_queue_probe_materialization.sql`
- `20260430122500_s_load_fix_5c_warehouse_issue_queue_inline_probe_order.sql`
- `20260430124500_s_load_fix_5d_warehouse_issue_queue_restore_exact_count.sql`

The 5B and 5C migrations were required follow-ups because the requested lower-bound total source patch left `warehouse_issue_queue_scope_v4` timing out during targeted direct staging verification. The 5D migration restored the last safe exact-count source shape so staging was not left with a timing-out direct RPC.

Dry-run after the final apply reported the remote database is up to date.

## Targeted Verification

Targeted read-only RPC verification after the requested S-LOAD-FIX-5 lower-bound total patch:

- RPC: `warehouse_issue_queue_scope_v4`
- Args: `p_offset=0`, `p_limit=25`
- Status: failed timeout
- Error code: `57014`
- Raw rows printed: NO

Targeted read-only RPC verification after 5B probe materialization:

- Status: failed timeout
- Error code: `57014`
- Raw rows printed: NO

Targeted read-only RPC verification after 5C inline probe order:

- Status: failed timeout
- Error code: `57014`
- Raw rows printed: NO

Targeted read-only RPC verification after 5D safety restore:

- RPC: `warehouse_issue_queue_scope_v4`
- Args: `p_offset=0`, `p_limit=25`
- Duration: `2895 ms`
- Rows returned: `25`
- `rows <= p_limit`: YES
- `meta.row_count`: `25`
- `meta.row_count <= p_limit`: YES
- `meta.has_more` exists: YES
- `meta.total_exact=false`: NO, not present after restore
- `meta.total_kind=lower_bound`: NO, not present after restore
- Raw rows printed: NO

Proof helper:

- `warehouse_issue_queue_sloadfix5d_restore_exact_count_proof_v1`

Proof checks:

- public wrapper preserved: YES
- exact visible queue total restored: YES
- sorted page source restored: YES
- lower-bound total metadata removed: YES
- row order preserved: YES
- page bound preserved: YES

## Result

The requested lower-bound total source patch was applied to staging, but it did not pass targeted direct RPC verification. It produced RPC timeouts even after two narrow source-shape follow-ups. The wave therefore cannot be marked `GREEN_STAGING_WAREHOUSE_ISSUE_SOURCE_PATCH_APPLIED`.

Staging was restored to the safe bounded exact-count source. The direct RPC now returns `25` rows for `p_limit=25`, but the S-LOAD-FIX-5 lower-bound total optimization is not active on staging.

The next required wave is:

- `S-LOAD-FIX-6 WAREHOUSE ISSUE QUEUE EXPLAIN / INDEX PLAN PATCH`

Do not run S-LOAD-8 until a new source/index plan patch is prepared and applied. Running S-LOAD-8 now would only re-check the restored exact-count source path.

## Gates

- `git diff --check`: PASS
- JSON artifact parse check: PASS
- targeted staging warehouse issue RPC source verification: PASS after safety restore
- targeted warehouse issue queue contract tests: PASS
- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `npm test -- --runInBand`: PASS
- `npm test`: PASS
- `npm run release:verify -- --json`: pending post-commit

## Safety

- Production touched: NO
- Staging touched: YES
- Staging DDL/migration applied: YES
- Production DDL/migration applied: NO
- Data writes: NO
- Load tests run: NO
- Service-role used: NO
- Package/native config changed: NO
- Business logic changed: NO
- Finance/accounting calculations changed: NO
- Warehouse stock math changed: NO
- OTA/EAS/Play Market touched: NO
- Raw payload/PII/secrets logged: NO
- Secrets printed/committed: NO
