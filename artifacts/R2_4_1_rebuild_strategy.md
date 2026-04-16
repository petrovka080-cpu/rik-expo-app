# R2.4.1 Rebuild Strategy

Wave: R2.4 - Director Snapshot Envelope

## Rebuild Function

Function: `director_report_works_snapshot_rebuild_v1(date,date,text,boolean)`

Inputs are the snapshot identity:

- `date_from`
- `date_to`
- `object_name`
- `include_costs`

The function:

1. Computes deterministic `snapshot_key`.
2. Writes a `started` event.
3. Builds the report through the preserved facts implementation.
4. Reads R2.3 fact status and source stats.
5. Upserts the snapshot row.
6. Writes a `success` event with duration, row count, hash, and watermark.
7. On failure, writes a `failed` event and re-raises the error.

## Consuming Path

`director_report_fetch_works_v1` becomes a thin wrapper:

```text
if snapshot is fresh:
  return snapshot payload
else:
  return preserved facts implementation
```

The preserved facts implementation is renamed to:

```text
director_report_fetch_works_from_facts_v1(date,date,text,boolean)
```

This avoids copying the report aggregation body and keeps existing grouping, ordering, price gating, and raw fallback behavior intact.

## Drift Validation

Function: `director_report_works_snapshot_drift_v1(date,date,text,boolean)`

The drift helper compares:

- snapshot `payload`
- live facts-path payload from `director_report_fetch_works_from_facts_v1`

`diff_count = 0` means snapshot and facts payload are equal.

## Rebuild Policy

R2.4 does not introduce auto-heal. Stale snapshots are observable and bypassed at runtime.

Rebuild can be run explicitly:

- after fact rebuild
- before export/share workflows
- during operational maintenance

## Fallback Story

Fallback remains layered:

```text
snapshot if fresh
else facts path
else raw fallback inside director_report_issue_facts_scope_v1
```
