# R2.4.1 Exec Summary

R2.4 adds a Director works snapshot envelope above the R2.2/R2.3 issue facts layer.

It does not change business truth. The snapshot is a reproducible read envelope for the current works report payload and is safe to bypass.

Selected path:

- `director_report_fetch_works_v1(date,date,text,boolean)`

Implementation shape:

- preserve the current facts implementation as `director_report_fetch_works_from_facts_v1`
- create `director_report_works_snapshots_v1`
- create rebuild, status, drift, metrics, and event helpers
- wrap `director_report_fetch_works_v1` with snapshot selection

Freshness is based on:

- projection version
- rebuild status
- source row count
- source high water mark
- optional max-age budget

Fallback is preserved:

- stale/missing snapshot falls back to facts path
- stale/missing facts still fall back to raw through R2.3 scope

GREEN criteria for implementation:

- snapshot exists
- snapshot vs facts diff is zero
- freshness is observable
- rebuild is observable
- consuming path can use snapshot
- output JSON contract is unchanged
