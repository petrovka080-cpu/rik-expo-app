# S-LOAD-FIX-6 Warehouse Issue Queue Explain Index Patch Proof

Status: GREEN_SOURCE_PATCH_READY

Evidence status: REAL_EXPLAIN_ANALYZE_CAPTURED

This resumed wave used the updated local staging Session Pooler URL. It did not touch production, did not apply staging DDL, did not run S-LOAD-8, did not print env values, and did not commit `.env.staging.local`.

## Preflight

- `HEAD == origin/main` before patch: YES
- worktree clean before patch: YES
- `.env.staging.local` ignored: YES
- `STAGING_SUPABASE_DB_URL` exists: YES
- staging DB URL parsed: YES
- staging DB host resolved: YES
- DB connection through Session Pooler: YES
- env values printed: NO

## Bounded RPC Smoke

Read-only staging DB smoke:

- RPC: `warehouse_issue_queue_scope_v4`
- args: `p_offset=0`, `p_limit=25`
- duration: `2832ms`
- rows returned: `25`
- rows <= limit: YES
- `meta.row_count`: `25`
- `meta.has_more`: boolean
- raw payload printed: NO

## Real EXPLAIN / ANALYZE

Two sanitized plans were captured.

Public function call:

- EXPLAIN ANALYZE available: YES
- execution: `2197.888ms`
- node count: `1`
- top node: `Result`
- raw plan printed: NO

The public function call confirms runtime but hides internal SQL function CTE nodes. To identify the bottleneck, the active private source body was extracted and run as read-only SQL with `p_offset=0` and `p_limit=25`.

Private source body:

- EXPLAIN ANALYZE available: YES
- execution: `2593.491ms`
- node count: `197`
- visible queue rows before page: `1197`
- dominant CTE: `ready_rows`
- dominant high-loop node: `Merge Join` under `ready_rows`
- dominant loop count: `1212`
- dominant loop-adjusted time: `2386.428ms`
- repeated aggregate loop count: `1212`
- repeated aggregate loop-adjusted time: `1531.968ms`
- `requests` seq scan: `12.576ms`
- temp blocks: `0`
- raw plan printed: NO

## Decision

The previous draft index patch is not supported by real EXPLAIN evidence.

Reason:

- The `requests` seq scan was around `12.6ms`.
- The measured bottleneck was repeated rebuilding of merged fallback truth under `ready_rows`, around `2386ms` loop-adjusted.
- `request_items` text joins already used existing Fix-3/Fix-4 indexes.

So the index-only draft was replaced.

## Selected Patch

Migration:

- `supabase/migrations/20260430143000_s_load_fix_6_warehouse_issue_queue_explain_index_patch.sql`

Patch type:

- source materialization only

Materialized CTEs:

- `fallback_truth_by_req`
- `merged_truth`

Read-only candidate EXPLAIN:

- baseline active source: `2606ms`
- selected candidate: `826ms`
- rows returned: `25`
- rows <= limit: YES
- row hash parity: YES
- row id order hash parity: YES
- row key-set hash parity: YES
- meta parity: YES
- raw payload printed: NO

The patch does not change:

- public RPC signature
- public wrapper
- exact total-count semantics
- row payload shape
- ordering semantics
- visibility semantics
- warehouse stock math
- package/native config
- OTA/EAS/Play Market

## Skipped

- S-LOAD-8: forbidden in this wave.
- staging migration apply: forbidden in this wave.
- production: forbidden and untouched.
- service-role: not used.
- Fix-5 lower-bound rewrite: skipped because it already caused timeout `57014`.
- warehouse stock math: untouched.

## Required Follow-Up

1. Apply the S-LOAD-FIX-6 materialization patch to staging in a separate staging-only apply wave.
2. Run direct staging RPC smoke after apply.
3. Run S-LOAD-8 as a separate bounded staging regression.

No 10K readiness claim is made by this proof.
