# O2.1 Compact Payload Schema

Status: GREEN

## Storage Contract

Persisted durable draft records may contain:

- `snapshotPayload`
- `recoverableLocalSnapshotPayload`
- `payloadSchemaVersion`
- `snapshotStorageMode`
- `recoverableSnapshotStorageMode`

## Payload Kinds

### Compact

`{ kind: "compact_v1", snapshot: CompactForemanLocalDraftSnapshotV1 }`

The compact snapshot stores the same data with shorter keys and tuple rows:

- header as `[foreman, comment, objectType, level, system, zone]`
- items as tuple rows
- pending deletes as tuple rows
- `qtyDrafts` preserved as-is for exact behavior parity

### Full Fallback

`{ kind: "full_v1", snapshot: ForemanLocalDraftSnapshot }`

Used when compact reconstruction is unavailable, invalid, or intentionally seeded by legacy tests/tools.

### Legacy Fallback

Older records with raw `snapshot` and `recoverableLocalSnapshot` remain readable.

## Non-Goals

The schema does not change the in-memory `ForemanLocalDraftSnapshot` shape. It only changes the persisted representation.
