# F2.3.1 Exec Summary

F2.3 makes the F2.2 finance supplier/object rollups trustworthy in production by adding observation and validation around drift, freshness, fallback usage, and rebuild health.

## What Is Observed

- Drift between supplier/object rollups and runtime aggregation from `finance_proposal_summary_v1`
- Freshness age and projection version of both rollups
- Rebuild status, duration, row counts, and errors
- Runtime usage of rollup path versus fallback path in `director_finance_panel_scope_v4`

## What Stays Unchanged

- Money semantics
- Rounding
- Supplier/object total meanings
- Finance write paths
- Runtime fallback path
- Director finance document shape

## Fallback Reasons

F2.3 explicitly distinguishes:

- `none`
- `filtered_scope`
- `stale_rollup`
- `missing_rollup`
- `version_mismatch`
- `rebuild_incomplete`

## Runtime vs Proof

Runtime gets compact metadata:

- source selected
- fallback reason
- freshness status
- drift status

Verifier proof gets full snapshots:

- drift helper payload
- freshness helper payload
- rebuild helper payload
- unfiltered and filtered panel metadata

## Green Criteria

F2.3 is GREEN only when:

- signals are documented
- SQL validation helpers exist
- panel metadata reports rollup versus fallback usage
- targeted and full gates pass
- remote drift/freshness/rebuild/usage proof is captured
- commit and push are complete
