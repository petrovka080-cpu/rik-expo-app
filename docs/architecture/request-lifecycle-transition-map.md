# Request Lifecycle Transition Map

## Scope

This map covers only the production-relevant foreman request lifecycle boundary for Wave 1C:

- UI entrypoint: `src/screens/foreman/foreman.localDraft.ts`
- Draft sync adapter: `src/screens/foreman/foreman.draftSync.repository.ts`
- RPC client boundary: `src/lib/api/requestDraftSync.service.ts`
- Canonical submit transition: `public.request_submit_atomic_v1`
- Active draft sync carrier: `public.request_sync_draft_v2`
- Post-submit immutability guards:
  - `public.guard_request_post_submit_mutation_v1`
  - `public.guard_request_item_post_submit_mutation_v1`

## States

### `DRAFT`

Owner of truth:
- Server-owned rows in `public.requests` + `public.request_items`
- Client may hold a local snapshot, but only as a draft adapter, not as lifecycle truth

Primary production path:
- `resolveForemanDraftBootstrap()` / `loadForemanRemoteDraftSnapshot()`
- `syncForemanLocalDraftSnapshot()`
- `syncForemanAtomicDraft()`
- `syncRequestDraftViaRpc()`
- `public.request_sync_draft_v2`

Allowed operations:
- create draft
- edit draft header fields
- add/update/remove draft items
- submit draft

Forbidden operations:
- none beyond existing draft validation

### `SUBMITTED` / non-draft foreman terminal state

Current observed head state after submit:
- request head: `pending`
- request item states: non-draft (`pending` / later server-owned downstream states)

Owner of truth:
- Server / DB lifecycle boundary

Primary production path:
- submit still enters through active foreman RPC carrier `public.request_sync_draft_v2`
- actual lifecycle transition is delegated to `public.request_submit_atomic_v1`

Allowed operations:
- read request/history
- downstream non-foreman server status progression

Forbidden operations for foreman draft paths:
- edit submitted request header content
- delete submitted request
- insert/update/delete submitted `request_items`
- downgrade request back to draft through direct writes
- stale draft sync against submitted request

Guards:
- `public.request_lifecycle_is_mutable_v1`
- `public.guard_request_post_submit_mutation_v1`
- `public.guard_request_item_post_submit_mutation_v1`

## Transition Rules

### `DRAFT -> SUBMITTED`

Canonical owner:
- `public.request_submit_atomic_v1`

Carrier path:
- `public.request_sync_draft_v2(... p_submit => true ...)`

Validation:
- request exists
- request is still mutable (`draft` + `submitted_at is null`)
- payload is valid
- request contains at least one active item

Result:
- request head transitions server-side
- item discipline becomes server-owned
- response includes verification and canonical submit metadata

### `SUBMITTED -> mutable draft`

Current canonical status:
- allowed only through explicit server-owned reopen path

Canonical owner:
- `public.request_reopen_atomic_v1`

UI entrypoint:
- `app/(tabs)/foreman.tsx` -> `handleHistoryReopen()`
- `src/lib/api/request.repository.ts` -> `reopenRequestDraft()`
- `src/lib/api/requests.ts` -> `requestReopen()`

Rule:
- submitted requests must not become mutable again through local restore, stale sync, direct writes, or bootstrap
- explicit reopen is allowed only through `public.request_reopen_atomic_v1`
- canonical reopen clears `submitted_at` and returns head + items to draft

## Restore / Bootstrap Rules

### Durable local snapshot

Files:
- `src/screens/foreman/foreman.localDraft.ts`
- `src/screens/foreman/foreman.durableDraft.store.ts`

Rule:
- if remote request is already non-draft, bootstrap clears the local mutable snapshot instead of reviving it

### Remote draft bootstrap

Rule:
- `loadForemanRemoteDraftSnapshot()` returns `isTerminal: true` for submitted/non-draft requests
- no mutable snapshot is rebuilt for submitted entities

### Second-device / stale sync

Rule:
- any later `request_sync_draft_v2` attempt against a submitted request must fail with:
  - `request_sync_draft_v2: stale_draft_against_submitted_request`

## Allowed / Forbidden Operation Matrix

### Allowed

- Draft create via `public.request_sync_draft_v2`
- Draft edit via `public.request_sync_draft_v2`
- Draft item qty mutation via `public.request_item_update_qty` while request is still mutable
- Draft submit via `public.request_submit_atomic_v1`
- Explicit reopen via `public.request_reopen_atomic_v1`

### Forbidden

- direct `requests` content update after submit
- direct `request_items` delete after submit
- direct `request_items` content update after submit
- stale `request_sync_draft_v2` replay after submit
- second-device overwrite of submitted request/items

## Owner Boundary Summary

- Client owner before submit: draft intent assembly only
- Server owner before submit: actual persisted draft rows
- Server owner at submit: `public.request_submit_atomic_v1`
- Server owner after submit: lifecycle state + immutability guards
- Client after submit: read/display only

## Explicit Non-Goals For Wave 1C

- no foreman UI change
- no AI/catalog/template change
- no buyer/director/accountant change
- no object identity reform
- no broader reopen/rework redesign beyond the existing explicit foreman action
