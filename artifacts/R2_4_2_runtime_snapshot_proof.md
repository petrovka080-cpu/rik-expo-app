# R2.4.2 Runtime Snapshot Proof

Status: GREEN
Target: https://nxrnjywzxxfdpqmzjorh.supabase.co
Started: 2026-04-16T14:08:04.595Z
Completed: 2026-04-16T14:08:15.464Z

## Snapshot

- snapshot_key: 7bedde0705e8b5085842d6f7dd92efee
- projection_version: r2_4_works_snapshot_v1
- row_count: 15
- generated_at: 2026-04-16T14:08:11.038288+00:00
- source_row_count: 122
- source_high_water_mark: 2026-04-01T09:26:27.498056+00:00
- payload_hash: 8b361d462534b64a4dd322c36e82ebe1

## Rebuild

- facts selected_source: projection
- facts fallback_reason: fresh_projection
- no-cost snapshot rebuild: success
- with-cost snapshot rebuild: success
- no-cost duration_ms: 0
- with-cost duration_ms: 0

## Freshness

- is_fresh: true
- selected_source: snapshot
- fallback_reason: none
- version mismatch fallback: version_mismatch
- expired fallback: expired_snapshot

## Drift

- no-cost diff_count: 0
- no-cost is_drift_free: true
- with-cost diff_count: 0
- with-cost is_drift_free: true

## Consuming Path

- latest metric selected_source: snapshot
- latest metric fallback_reason: none
- no-cost total_positions: 122
- no-cost issue_cost_total: 0
- with-cost total_positions: 122
- with-cost issue_cost_total: 360661.39899680804

## Conclusion

- snapshot exists
- snapshot vs facts diff is zero for no-cost and with-cost payloads
- freshness, version mismatch, and expiry are observable
- rebuild status/duration/rows are observable
- consuming path uses snapshot when fresh
- facts/raw fallback remains preserved

No OTA published: SQL migration + test only; client bundle unchanged.
