# Request Lifecycle Boundary Proof

## What Was Weak Before

The active foreman submit path did not go through `requestSubmitMutation()` as the primary UI path. It went through:

`src/screens/foreman/foreman.localDraft.ts`
-> `syncForemanAtomicDraft()`
-> `syncRequestDraftViaRpc()`
-> `public.request_sync_draft_v2`

That meant the active production carrier could still:

- mutate an existing request head directly
- mutate `request_items` directly
- submit in the same RPC without an explicit immutable post-submit boundary

This left three production risks:

1. stale local draft replay against an already submitted request
2. second-device overwrite of submitted request/items
3. direct table-write drift after submit

## What Is Canonical Now

The active foreman UI path is preserved, but the lifecycle owner changed:

- draft sync carrier remains `public.request_sync_draft_v2`
- submit transition inside that carrier is now delegated to `public.request_submit_atomic_v1`
- post-submit mutability is protected by DB-level guards on `public.requests` and `public.request_items`

Canonical boundary:

`foreman local draft -> request_sync_draft_v2 -> request_submit_atomic_v1 -> immutable submitted request`

## Exact Files / DB Objects Changed

Code / tests / verify:

- `src/lib/api/requestDraftSync.service.test.ts`
- `src/screens/foreman/foreman.localDraft.lifecycle.test.ts`
- `scripts/request_lifecycle_boundary_verify.ts`
- `docs/architecture/request-lifecycle-transition-map.md`

SQL / DB lifecycle boundary:

- `supabase/migrations/20260330230000_request_lifecycle_boundary_v1.sql`
- `supabase/migrations/20260330230100_request_submit_atomic_v1_empty_guard.sql`
- `supabase/migrations/20260330230200_request_sync_draft_v2_lifecycle_guard.sql`
- `supabase/migrations/20260330230300_request_lifecycle_head_guard_field_fix.sql`

Key DB objects:

- `public.request_lifecycle_status_norm_v1`
- `public.request_lifecycle_is_mutable_v1`
- `public.request_submit_atomic_v1`
- `public.request_sync_draft_v2`
- `public.guard_request_post_submit_mutation_v1`
- `public.guard_request_item_post_submit_mutation_v1`

## Why Submitted Requests Are No Longer Mutable

### Submit is server-owned

`request_sync_draft_v2` no longer owns the submit lifecycle transition itself. On `p_submit = true`, it now calls `public.request_submit_atomic_v1` and surfaces a controlled error if that transition fails.

### Stale draft sync is blocked

When an existing request is already non-draft / submitted, `request_sync_draft_v2` now raises:

- `request_sync_draft_v2: stale_draft_against_submitted_request`

This prevents local restore/bootstrap or a second device from silently re-opening a submitted request through the old draft path.

### Direct post-submit writes are blocked

DB guards now reject:

- submitted request head content edits
- submitted request delete
- submitted request item insert/update/delete
- draft downgrade of submitted requests/items through old paths

### Explicit reopen is no longer a direct-write loophole

The foreman history UI already had an explicit reopen action:

- `app/(tabs)/foreman.tsx` -> `handleHistoryReopen()`
- `src/lib/api/request.repository.ts` -> `reopenRequestDraft()`
- `src/lib/api/requests.ts` -> `requestReopen()`

Before this batch, that path used direct client writes.

Now it goes through:

- `public.request_reopen_atomic_v1`

That canonical server path:

- clears `submitted_at`
- restores request head to draft
- restores request items to draft
- bypasses immutability guards only inside the explicit lifecycle transition

## How It Was Verified

### Targeted unit tests

- `src/lib/api/requestDraftSync.service.test.ts`
- `src/screens/foreman/foreman.localDraft.lifecycle.test.ts`

Covered:

- stale submitted-request sync surfaces a controlled lifecycle error
- bootstrap clears local snapshot when the remote request is already terminal
- submitted remote request is treated as terminal and is not rebuilt as a mutable snapshot

### Live lifecycle smoke

Artifact:

- `artifacts/request-lifecycle-boundary-smoke.json`

Proved:

- draft create succeeds
- submit succeeds through `request_submit_atomic_v1`
- post-submit head edit is blocked
- post-submit item delete is blocked
- stale sync replay is blocked
- second-device mutation attempt is blocked
- head/item statuses remain non-draft after submit
- explicit reopen succeeds through `request_reopen_atomic_v1`
- reopened request returns to draft with `submitted_at = null`
- reopened request items return to draft as well

## What Was Deliberately Not Changed

- foreman UI and UX
- buyer/director/accountant paths
- AI/catalog/template flows
- request reopen/rework redesign
- object identity and other Wave families

## Honest Batch Conclusion

Wave 1C is green only because the active foreman submit path is still intact for RN, lifecycle truth after submit is server-owned, post-submit mutation attempts are rejected at the database boundary, and the existing explicit reopen action now goes through a canonical server-owned transition instead of direct client writes.
