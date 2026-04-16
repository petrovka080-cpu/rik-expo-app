# O1.1 Conflict Strategy

Status: GREEN for first-slice design.

## Conflict Classes

O1 keeps the existing classes:
- `retryable_sync_failure`
- `stale_local_snapshot`
- `server_terminal_conflict`
- `validation_conflict`
- `remote_divergence_requires_attention`

## First-Slice Change

The remote divergence check now asks whether the server advanced beyond the local base revision before doing expensive semantic fallback.

This prevents a common false positive:

```text
local has unsynced edits
remote is still at the same server revision
network sync failed
```

Old behavior could see `local != remote` and mark remote divergence. New behavior sees matching server revision and keeps the failure retryable.

## Fallback Contract

If either side lacks revision metadata, or revisions differ but the semantic meaning may still match, the worker keeps the existing snapshot comparison fallback.

## No Magic Merge

O1.2 does not merge local and remote changes. If remote divergence is detected, recovery remains explicit.
