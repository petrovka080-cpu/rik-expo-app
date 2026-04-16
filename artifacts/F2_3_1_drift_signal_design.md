# F2.3.1 Drift Signal Design

## Scope

F2.3 observes only the F2.2 finance rollup layer:

- `finance_supplier_rollup_v1`
- `finance_object_rollup_v1`
- `finance_proposal_summary_v1` as the source projection
- `director_finance_panel_scope_v4` as the consuming path

F2.3 does not change money semantics, rounding, write-path behavior, or the director finance document contract.

## Drift Signals

The drift helper must report these exact fields:

- `status`: `GREEN` or `DRIFT_DETECTED`
- `checked_at`: UTC timestamp
- `duration_ms`: validation runtime
- `supplier_rollup_row_count`: rows in `finance_supplier_rollup_v1`
- `object_rollup_row_count`: rows in `finance_object_rollup_v1`
- `supplier_runtime_row_count`: rows from direct aggregation over `finance_proposal_summary_v1`
- `object_runtime_row_count`: rows from direct aggregation over `finance_proposal_summary_v1`
- `supplier_drift_count`: supplier rows with missing, extra, or money mismatch
- `object_drift_count`: object rows with missing, extra, or money mismatch
- `source_proposal_summary_row_count`: rows in `finance_proposal_summary_v1`
- `supplier_projection_version_min`
- `supplier_projection_version_max`
- `object_projection_version_min`
- `object_projection_version_max`
- `supplier_last_rebuilt_at`
- `object_last_rebuilt_at`

## Comparison Rules

Supplier runtime basis:

- group `finance_proposal_summary_v1` by `supplier_id`
- ignore rows with null `supplier_id`
- compare `amount_total`, `amount_paid`, `amount_debt`
- count missing and extra rows via full outer comparison

Object runtime basis:

- group `finance_proposal_summary_v1` by the same stable object key used by F2.2
- compare `amount_total`, `amount_paid`, `amount_debt`
- count missing and extra rows via full outer comparison

## Runtime vs Verifier

Runtime observability should expose a compact drift status and counts through SQL helpers and panel metadata.

Verifier proof should capture the full helper payload and assert:

- supplier drift count is `0`
- object drift count is `0`
- supplier runtime row count equals supplier rollup row count
- object runtime row count equals object rollup row count
- money fields match on the helper comparison

## Non-Goals

- No auto-rebuild on drift.
- No hidden healing.
- No changes to payment or proposal truth.
- No new finance aggregate layer.
