# O2.1 Replay Reconstruction Rules

Status: GREEN

## Reconstruction Order

For each durable draft snapshot field:

1. Try `*_Payload.kind === "compact_v1"`.
2. If compact reconstruction fails, try `*_Payload.kind === "full_v1"`.
3. If payload is missing or invalid, use legacy full field.
4. If all sources are missing, restore `null`.

## Equivalence Rule

Reconstructed snapshot must equal the old full payload byte-for-byte after JSON normalization:

`JSON.stringify(reconstructed) === JSON.stringify(original)`

## Replay Safety

The mutation worker still receives a full `ForemanLocalDraftSnapshot` in memory. Queue ordering, retry, conflict classification, submit, and RPC payload semantics remain unchanged.

## Fallback Rule

Hydration accepts both compact and full payloads. Persisting writes compact when possible; if compact build is unavailable, it writes a full payload marker instead of dropping data.

## Proof Plan

O2.2 must prove:

- compact vs full equivalence
- replay still calls `syncSnapshot` with the full reconstructed snapshot
- missing/invalid compact payload uses full fallback
- large draft persisted payload size is smaller
