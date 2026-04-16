# O1.1 Version Model

Status: GREEN for first-slice design.

## Scope

O1 targets the foreman draft offline path first:
- foreman local draft snapshot
- foreman mutation queue metadata
- mutation worker remote inspection
- offline restore and conflict classification

Finance, warehouse, reports, and UI redesign are out of scope.

## Current Truth

The existing `ForemanLocalDraftSnapshot.version` is a schema version, not a data revision. The old high-cost comparison path used full snapshot serialization to compare local and remote draft state.

## First Production-Safe Revision Field

O1.2 introduces optional snapshot metadata:

```ts
baseServerRevision?: string | null
```

Meaning:
- server-issued high-water mark last seen by this local snapshot
- derived from `requests.updated_at` and `request_items.updated_at`
- preserved through local edits
- refreshed after successful server sync or remote rehydrate

This is intentionally a bridge field. The target future server contract is a monotonic `draft_revision bigint`, but O1.2 does not require a DB migration.

## Revision Stamp

Runtime compare uses a compact stamp:

```ts
{
  schemaVersion,
  ownerId,
  requestId,
  localUpdatedAt,
  baseServerRevision,
  itemCount,
  pendingDeleteCount,
  submitRequested
}
```

## Source Of Truth

Server remains the source of truth for server revision. The client can store the last seen server revision, but it does not create authoritative server truth.

## Fallback

When revision metadata is missing or inconclusive, semantic snapshot compare stays as fallback. The old mechanism is not removed.
