# F2.3.1 Freshness Signal Design

## Goal

Freshness must tell the operator whether `finance_supplier_rollup_v1` and `finance_object_rollup_v1` are safe to use for unfiltered director panel rollup sections.

## Default Freshness Budget

The default maximum rollup age is `15 minutes`.

This is an operational threshold, not a money rule. It can be overridden by helper arguments and does not change stored totals.

## Freshness Signals

The freshness helper must report:

- `status`: `FRESH`, `STALE_ROLLUP`, `MISSING_ROLLUP`, `VERSION_MISMATCH`, or `REBUILD_INCOMPLETE`
- `is_fresh`: boolean
- `checked_at`: UTC timestamp
- `max_age_seconds`: threshold used
- `supplier_rollup_row_count`
- `object_rollup_row_count`
- `source_proposal_summary_row_count`
- `supplier_last_rebuilt_at`
- `object_last_rebuilt_at`
- `supplier_age_seconds`
- `object_age_seconds`
- `supplier_projection_version_min`
- `supplier_projection_version_max`
- `object_projection_version_min`
- `object_projection_version_max`
- `expected_projection_version`
- `last_successful_rebuild_at`
- `last_rebuild_duration_ms`
- `last_rebuild_status`
- `last_rebuild_error`

## Status Rules

`MISSING_ROLLUP`:

- supplier rollup has zero rows, or object rollup has zero rows, while proposal summary has rows.

`VERSION_MISMATCH`:

- any supplier/object rollup row has a projection version different from the expected version.

`REBUILD_INCOMPLETE`:

- the latest combined rebuild event is `started` without a later `success` or `failed`, or the latest combined status is not `success` after events exist.

`STALE_ROLLUP`:

- max supplier/object `rebuilt_at` age exceeds the threshold.

`FRESH`:

- rollups exist when source summary has rows
- projection versions match
- latest combined rebuild status is healthy when rebuild events exist
- age is within threshold

## Runtime vs Verifier

Runtime panel metadata should expose:

- rollup freshness status
- whether rollup was fresh
- supplier/object fallback reasons

Verifier proof should persist the full freshness helper payload.

## Non-Goals

- No automatic rebuild from panel calls.
- No hidden stale read masking.
- No new truth source.
