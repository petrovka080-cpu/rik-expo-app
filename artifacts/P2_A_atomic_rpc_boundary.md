# P2-A Atomic RPC Boundary

## Current Head Baseline

- `main` was clean before the wave.
- The canonical proposal creation boundary already exists as `public.rpc_proposal_submit_v3`.
- The defining migration is `supabase/migrations/20260330200000_proposal_creation_boundary_v3.sql`.
- The active hardened function path is covered by `supabase/migrations/20260416223000_p0_4_buyer_proposal_security_definer_search_path_submit_v1.sql`.

## Old Risk

The historical risk was a client-owned multi-step write path:

1. create proposal head
2. insert/link proposal items
3. update request item status / submit state

If any client-side step failed after an earlier write, the system could leave partial proposal state.

## Current Boundary

The production create path is now:

1. `createProposalsBySupplier`
2. `runAtomicProposalSubmitRpc`
3. `supabase.rpc("rpc_proposal_submit_v3", args)`

The RPC owns validation, proposal head creation, proposal item insertion, optional submit state, optional request item status update, and idempotent replay under one database transaction.

## P2-A Closeout Change

This closeout removes the dormant legacy client orchestration helpers from `src/lib/catalog/catalog.proposalCreation.service.ts`.

Removed client-side write-stage code:

- `createProposalHeadStage`
- `linkProposalItemsStage`
- `completeProposalCreationStage`
- `syncProposalRequestItemStatusStage`
- direct fallback insertion into `proposal_items`
- direct fallback status update into `request_items`

Kept behavior:

- external `createProposalsBySupplier` contract
- `rpc_proposal_submit_v3` request shape
- result mapping
- duplicate-conflict recovery contract
- UI flow

## Atomicity Proof Intent

- RPC failure is surfaced as a controlled error.
- Client does not perform fallback create/link/status writes.
- Mismatched RPC success payloads are rejected by the adapter.
- Validation failures happen before partial success is accepted by the client.
