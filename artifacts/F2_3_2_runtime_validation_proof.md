# F2.3.2 Runtime Validation Proof

Target: https://nxrnjywzxxfdpqmzjorh.supabase.co
Started: 2026-04-16T13:44:02.633Z
Completed: 2026-04-16T13:44:14.976Z

## Rebuild

- status: ok
- rebuild_id: e942ec39-3ccc-4933-beec-2fbdbb3cd560
- duration_ms: 71
- supplier after_count: 26
- object after_count: 12

## Drift

- status: GREEN
- supplier_drift_count: 0
- object_drift_count: 0
- supplier rows rollup/runtime: 26 / 26
- object rows rollup/runtime: 12 / 12

## Freshness

- status: FRESH
- is_fresh: true
- supplier_age_seconds: 1
- object_age_seconds: 1
- tight budget status: STALE_ROLLUP
- version mismatch status: VERSION_MISMATCH

## Usage / Fallback

- unfiltered supplier source: finance_supplier_rollup_v1
- unfiltered object source: finance_object_rollup_v1
- unfiltered fallback reasons: none / none
- filtered supplier source: classified_finance_runtime
- filtered object source: classified_finance_runtime
- filtered fallback reasons: filtered_scope / filtered_scope

Overall: GREEN
