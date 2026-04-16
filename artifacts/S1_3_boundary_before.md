# S1.3 Boundary Before

## Submit Chain Before

Buyer screen action:

1. `handleCreateProposalsBySupplierAction`
2. `runSyncSubmitMutation`
3. `apiCreateProposalsBySupplier`
4. `rpc_proposal_submit_v3`
5. screen-level check of returned RPC payload fields:
   - `submitted`
   - `visible_to_director`
6. attachment continuation
7. request item status sync
8. local inbox removal and success alert

The final UI success was allowed after the returned RPC payload said the proposal was submitted and director-visible. There was no separate screen/worker readback against the authoritative `proposals` row before local finalization.

## Approve Chain Before

Director screen action:

1. `approveProposal`
2. in-hook `supabase.rpc("director_approve_pipeline_v1", ...)`
3. local parsing of RPC result
4. `refreshDirectorApprovalViews()`
5. success alert/close

The success path depended on the RPC not erroring and a general refresh call. It did not verify the specific approved proposal row before showing terminal success.

## Client-Owned Steps

- Buyer submit treated RPC payload fields as sufficient final truth.
- Buyer duplicate guard returned a successful skipped mutation result.
- Buyer worker continued from the create/submit payload without an independent readback.
- Director approve called the RPC directly inside the hook and showed success after refresh.
- Director approve had a cooldown guard after success, so duplicate semantics were partly time-owned by the client.

## Speculative Finalization Points

- Submit could remove items from inbox after payload truth but before authoritative table truth.
- Submit could start attachment continuation after payload truth but before authoritative table truth.
- Approve could show success without proving `proposals.sent_to_accountant_at` for the proposal id.
- A stale refresh could be treated as a successful visual confirmation because no proposal-specific readback gate existed.

## Stale Overwrite Risks

- Returned submit payload could be stale or partial while local UI commits final success.
- A duplicate submit tap could return a successful skipped result.
- Approve refresh could race with stale screen state and still show success.
- Queue worker could bind attachments after a submit result that was not independently confirmed.
