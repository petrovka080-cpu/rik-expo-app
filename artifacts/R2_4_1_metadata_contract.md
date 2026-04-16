# R2.4.1 Metadata Contract

Wave: R2.4 - Director Snapshot Envelope

## Trust Metadata

Every snapshot row records enough metadata to decide whether it can be trusted for runtime reads and export-oriented workflows.

Required fields:

- `generated_at`: UTC timestamp when the payload was produced.
- `source_high_water_mark`: source watermark returned by `director_report_issue_facts_source_stats_v1()`.
- `source_row_count`: source row count returned by `director_report_issue_facts_source_stats_v1()`.
- `projection_version`: snapshot projection version, expected `r2_4_works_snapshot_v1`.
- `fact_projection_version`: fact projection version seen during snapshot build.
- `fact_selected_source`: `projection` or `raw_fallback` as classified by R2.3.
- `fact_fallback_reason`: explicit R2.3 fact fallback reason.
- `fact_rebuilt_at`: last fact rebuild timestamp seen during snapshot build.
- `fact_projected_row_count`: fact projected row count seen during snapshot build.
- `rebuild_status`: `success`, `started`, or `failed`.
- `rebuild_duration_ms`: rebuild duration.
- `row_count`: top-level works rows in the snapshot payload.
- `payload_hash`: hash of the JSONB payload.

## Freshness Rules

A snapshot is fresh only when all are true:

- snapshot row exists
- `projection_version = r2_4_works_snapshot_v1`
- `rebuild_status = success`
- payload has expected JSON object shape
- stored `source_row_count` equals current source row count
- stored `source_high_water_mark` equals current source high water mark
- optional max-age budget is not exceeded

Default runtime max age: 900 seconds.

## Fallback Reasons

Snapshot fallback reasons:

- `none`
- `missing_snapshot`
- `version_mismatch`
- `rebuild_failed`
- `snapshot_incomplete`
- `stale_snapshot`
- `expired_snapshot`

When snapshot is not fresh, `director_report_fetch_works_v1` falls through to the pre-R2.4 facts path. The facts path can still use projection or raw fallback through `director_report_issue_facts_scope_v1`.

## Runtime Observability

Runtime metrics record:

- `selected_source = snapshot` when the wrapper returns cached payload.
- `selected_source = facts` when snapshot is bypassed and R2.3 facts projection is fresh.
- `selected_source = raw_fallback` when snapshot is bypassed and the R2.3 fact scope classifies raw fallback.

The report output JSON is not changed to include this metadata. Metadata is exposed through helper functions and metrics tables.
