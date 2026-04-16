# F2.3.1 Rebuild Contract

## Purpose

F2.3 makes rebuilds observable. It does not change what rebuilds compute.

## Rebuild Events

Each rebuild helper should write append-only events to `finance_rollup_rebuild_events_v1`.

Required fields:

- `id`
- `rebuild_id`
- `layer`: `supplier`, `object`, or `combined`
- `status`: `started`, `success`, or `failed`
- `started_at`
- `finished_at`
- `duration_ms`
- `before_count`
- `after_count`
- `proposal_summary_count`
- `error_message`
- `payload`

## Success Payload

Existing rebuild return payloads must keep the F2.2 fields:

- `status`
- `before_count`
- `after_count`
- `duration_ms`
- `rebuilt_at`
- `strategy`

F2.3 may add:

- `rebuild_id`
- `layer`
- `proposal_summary_count`

## Failure Payload

Failures must be observable through:

- a `failed` rebuild event
- `error_message`
- a returned JSON payload with `status = failed`

No failure should be silently swallowed. The failure payload is explicit so the
event can persist in the same transaction and the operator can inspect the
error without guessing from an opaque exception.

## Combined Rebuild Order

Combined rebuild remains:

1. `finance_proposal_summary_rebuild_all_v1()`
2. `finance_supplier_rollup_rebuild_v1()`
3. `finance_object_rollup_rebuild_v1()`

This order preserves the F2.2 source dependency contract.

## Runtime Consumption

`director_finance_panel_scope_v4` must not rebuild rollups. It only reads validation signals and chooses:

- rollup path for unfiltered, fresh, populated, expected-version rollups
- runtime fallback for filtered, stale, missing, version mismatch, or rebuild incomplete cases

## Non-Goals

- No scheduler.
- No auto-heal.
- No retry logic.
- No write-path changes.
