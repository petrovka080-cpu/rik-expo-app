# Projection Health Runbook

## Scope

This runbook covers the disabled-by-default projection and rollup health boundary for:

- `director_report_issue_facts_v1`
- `director_works_snapshot`
- `warehouse_stock_summary_v1`
- `buyer_inbox_search_projection`
- `finance_supplier_rollup_v1`
- `finance_object_rollup_v1`
- `finance_panel_spend_projection_v1`

The boundary is local contract code only. It does not read production, write production, inspect env, rebuild projections, or change app runtime behavior.

## Health States

- `healthy`: latest build timestamp and row count are present and within the freshness window.
- `stale`: latest build exists but is beyond the stale window, or runtime fallback was observed.
- `critical`: latest build exists but is beyond the critical window.
- `missing`: required build timestamp or row count is absent.
- `building`: rebuild is in progress.
- `failed`: rebuild failed.
- `unknown`: build status is unavailable.

## Support Flow

1. Collect a redacted snapshot for the affected surface: surface name, last build timestamp, row count, build status, and whether fallback was used.
2. Evaluate it with `evaluateProjectionHealth` or batch-evaluate snapshots with `evaluateProjectionHealthSnapshots`.
3. Use `buildProjectionHealthSupportSummary` for a redacted support view.
4. If `stale`, `critical`, `missing`, `failed`, or `unknown`, follow the surface-specific `supportAction`.
5. Do not run production rebuilds or DB writes from this boundary.

## Safety Rules

- Keep the boundary disabled by default.
- Do not include raw rows, emails, phones, addresses, tokens, URLs with signatures, database URLs, or Supabase keys in snapshots or summaries.
- Do not use this boundary to trigger migrations, RPC changes, or rebuild jobs.
- Do not enable live database reads without a separate production-safe wave and explicit readonly credentials.

## Rollback

This boundary has no runtime activation. Rollback is a code revert of the projection-health section in `src/lib/observability/queueBacklogMetrics.ts`, its tests, docs, and artifacts.
