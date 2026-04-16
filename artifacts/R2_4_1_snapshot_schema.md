# R2.4.1 Snapshot Schema

Wave: R2.4 - Director Snapshot Envelope

Chosen consuming path: `director_report_fetch_works_v1(date,date,text,boolean)`.

## Goal

Add a stable snapshot envelope above `director_report_issue_facts_v1` for the works report without changing report semantics, visibility, totals, grouping, rounding, or price behavior.

The snapshot is derived. It is not source-of-truth.

## Source Layers

- Source-of-truth remains warehouse issue/request/reference data.
- Fact projection remains `director_report_issue_facts_v1`.
- Fact scope remains `director_report_issue_facts_scope_v1(date,date,text)`.
- Raw fallback remains inside the fact scope.

## Snapshot Table

Table: `director_report_works_snapshots_v1`

Physical identity:

- `snapshot_key text primary key`
- key is deterministic over `(date_from, date_to, object_name, include_costs)`

Business identity fields:

- `date_from date`
- `date_to date`
- `object_name text`
- `object_name_key text`
- `include_costs boolean`

Payload fields:

- `payload jsonb`
- `summary jsonb`
- `works jsonb`

The payload shape is exactly the current `director_report_fetch_works_v1` output:

- top-level `summary`
- top-level `works`

No PDF payload is materialized.

## Metadata Fields

- `generated_at`
- `source_high_water_mark`
- `source_row_count`
- `projection_version`
- `fact_projection_version`
- `fact_selected_source`
- `fact_fallback_reason`
- `fact_rebuilt_at`
- `fact_projected_row_count`
- `rebuild_status`
- `rebuild_duration_ms`
- `row_count`
- `payload_hash`
- `updated_at`

`row_count` means top-level works rows in the snapshot payload. Fact row counts are recorded separately.

## Runtime Metrics

Table: `director_report_works_snapshot_runtime_metrics_v1`

Purpose: observe whether `director_report_fetch_works_v1` used snapshot or fell back to facts/raw.

Minimum fields:

- event name
- selected source
- fallback reason
- freshness boolean
- snapshot key and identity
- generated timestamp
- projection version
- source watermark comparison
- fact fallback status

## Rebuild Events

Table: `director_report_works_snapshot_rebuild_events_v1`

Purpose: make rebuild start/success/failure observable even when the snapshot row cannot be written.

Minimum fields:

- started/finished timestamps
- status
- error
- duration
- row count
- payload hash
- source watermark
- fact selected source

## Non-Goals

- No new totals.
- No new grouping rules.
- No PDF materialization.
- No finance/warehouse/report-family rewrite.
- No removal of facts/raw fallback.
