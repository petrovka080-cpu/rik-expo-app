# O2.1 Queue Payload Inventory

Status: GREEN

## Exact Slice

Chosen slice: foreman durable draft replay payload stored under `foreman_durable_draft_store_v2`.

This slice is used by the foreman mutation worker when it reconstructs the latest local draft for offline replay/retry. It is the heavy storage path after O1.

## Current Shape

`offline_mutation_queue_v2` already stores compact queue intent metadata:

- `draftKey`
- `requestId`
- `snapshotUpdatedAt`
- `mutationKind`
- line counts
- submit flag
- trigger source

It does not store the full draft snapshot.

The heavy whole-array payload is in the durable draft store:

- `snapshot.items[]`
- `snapshot.qtyDrafts`
- `snapshot.pendingDeletes[]`
- `recoverableLocalSnapshot`, when conflict recovery needs a preserved local copy

## Why This Slice

The durable snapshot is the replay source of truth for pending foreman draft sync. Compacting this persisted representation reduces storage and hydration cost without changing queue ordering, worker replay, submit behavior, or server truth.

## Out Of Scope

- RPC delta protocol
- server-side draft revision fields
- submit semantics
- queue ordering and retry policy
- finance, warehouse, reports

## Risk

If compact reconstruction loses a field, replay can silently drift. O2.2 must prove compact-to-full equivalence and keep legacy/full payload fallback.
