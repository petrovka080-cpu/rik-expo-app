# Identity Solidification Proof

Status: GREEN

## What changed

- Construction object identity now resolves through server-owned sources:
  - `public.ref_object_types.code`
  - `public.request_object_identity_shadow_v1`
  - `public.request_object_identity_scope_v1`
- Director scope options now fill stable object keys from canonical lookup instead of leaving identity null.
- Request-linked director context now prefers stable construction object keys over legacy display strings.
- Legacy direct UUID object handoff remains compatibility-only; legacy fast RPC no longer receives non-UUID stable keys as fake object ids.

## Why this closes the identity hole

- Construction object identity is no longer primarily reconstructed from `object_name` string cleanup on the client.
- Request -> proposal -> finance linkage can now derive object scope through request-owned stable identity.
- Conflict cases remain explicit:
  - ambiguous alias rows are reported, not silently assigned
  - unresolved legacy-name rows remain visible in conflict reporting

## What was intentionally not changed

- No UI changes
- No buyer/proposal business logic redesign
- No request lifecycle redesign
- No finance semantics redesign
- No early removal of legacy fields

## Proof highlights

- Requests stable coverage: 76/96
- Proposal item stable coverage: 192/194
- Finance stable coverage: 93/97
- Transport option names resolved to stable keys: 8/8
- Ambiguous alias conflicts: 0
