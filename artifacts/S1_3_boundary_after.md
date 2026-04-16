# S1.3 Boundary After

## Submit Chain After

Buyer submit is still initiated by `handleCreateProposalsBySupplierAction`, and the business RPC remains `rpc_proposal_submit_v3` through `apiCreateProposalsBySupplier`.

The new finalization gate is:

1. RPC returns proposal ids.
2. Existing returned-payload director visibility check still runs.
3. `readbackSubmittedProposalTruth(supabase, proposalIds)` reads `proposals`.
4. Final sync success is returned only if every created proposal has server-confirmed director-visible truth:
   - `submitted_at` exists
   - `sent_to_accountant_at` is empty
   - status normalizes to submitted
5. Attachments, status sync, inbox removal, and success alert run only after that readback.

The queued worker now also calls the same readback before attachment binding, so background submit cannot continue from an unconfirmed stale payload.

## Approve Chain After

Director approve now goes through `runDirectorApprovePipelineAction`:

1. call `director_approve_pipeline_v1`
2. classify RPC result/error
3. read back the exact proposal row from `proposals`
4. terminal success only if `sent_to_accountant_at` is server-confirmed for that proposal id
5. screen refresh and success UI run only after the boundary helper returns success

The previous post-success cooldown guard was removed. Duplicate protection remains only for the active in-flight call; post-success idempotency is left to the server/RPC contract plus readback.

## Server/RPC-Owned Steps

- Proposal creation and submit remain owned by `rpc_proposal_submit_v3`.
- Director approval pipeline remains owned by `director_approve_pipeline_v1`.
- Terminal submit truth is owned by the `proposals` readback.
- Terminal approve truth is owned by `proposals.sent_to_accountant_at`.

## Client-Owned Steps That Remain

- Form validation and no-attachment confirmation are UI-owned.
- In-flight duplicate tap guard is UI-owned to prevent concurrent calls from the same screen.
- Alerts, sheet close, local inbox removal, and background refresh are UI-owned, but only after server truth is confirmed.
- Attachment continuation remains client-owned upload/bind work, but it starts only after submit truth is confirmed.

## Authoritative Readback Contract

- Submit: `readbackSubmittedProposalTruth` must confirm each proposal is submitted and director-visible from `proposals`.
- Approve: `readbackApprovedProposalTruth` must confirm `sent_to_accountant_at` on the exact proposal row.
- Failure classification is typed as `success`, `denied`, `conflict`, `retryable_failure`, or `terminal_failure`.

## Observability

Added structured markers:

- `proposal_submit_started`
- `proposal_submit_rpc_invoked`
- `proposal_submit_result_received`
- `proposal_submit_readback_started`
- `proposal_submit_readback_completed`
- `proposal_submit_terminal_success`
- `proposal_submit_terminal_failure`
- `director_approve_started`
- `director_approve_rpc_invoked`
- `director_approve_result_received`
- `director_approve_readback_started`
- `director_approve_readback_completed`
- `director_approve_terminal_success`
- `director_approve_terminal_failure`
