# A3.CLIENT_FALLBACK_BURNDOWN Notes

## Status

GREEN candidate. A3 removes P0 client-side fallback writes for the buyer status transition and submit job queue transitions.

## Fallback Writes Found

### Buyer status path

- Root file: `src/screens/buyer/buyer.actions.repo.ts`
- Caller file required for correctness: `src/screens/buyer/buyer.status.mutation.ts`
- Primary owner: RPC `request_items_set_status`
- Removed/blocked fallback: direct client update of `request_items.status` to `У директора`
- Lost invariant risk: client could mark request items as director-owned without server-side RPC checks.

The root repository fallback is now a hard fail-closed function. The status mutation no longer converts RPC failure into partial success; it returns a stage failure and does not continue to reject-state cleanup.

### Submit job queue path

- Root file: `src/lib/infra/jobQueue.ts`
- Primary owners:
  - `submit_jobs_claim`
  - `submit_jobs_mark_completed`
  - `submit_jobs_mark_failed`
- Removed fallback writes:
  - claim fallback `select pending` plus `update processing`
  - complete fallback `update completed`
  - failed fallback `select retry_count` plus `update pending/failed`
  - completion cleanup direct update after successful RPC

The queue still supports legacy RPC signatures where they are server-owned RPC contracts. If both RPC contracts are unavailable or incompatible, queue transitions fail closed.

## Root Cause Class

P0 client-side business logic fallback writes. The client imitated critical server transitions when RPC contracts were missing or incompatible.

## Production-Safe Fix

- Healthy RPC behavior is unchanged.
- Critical transitions now follow `RPC success => transition` and `RPC failure/unavailable => no transition`.
- No artificial delays, retries, feature flags, ignores, suppressions, or test-only runtime branches were added.
- No formulas, PDF logic, UI semantics, or unrelated domains were changed.

## Conscious Non-Changes

- `enqueueSubmitJob` remains a direct insert path because it is not a claim/complete/fail transition fallback.
- `recoverStuckSubmitJobs` remains RPC-owned.
- Buyer accounting adapter fallback RPC remains out of A3 scope because it is still a server-owned RPC path, not a direct table write.
- Non-critical read fallbacks outside `buyer.actions.repo.ts` and `jobQueue.ts` were not touched.
