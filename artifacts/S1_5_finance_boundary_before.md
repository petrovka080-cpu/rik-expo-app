# S1.5 Finance Boundary Before

## Status

NOT GREEN before this finalization pass.

## Observed Gaps

- `runProposalAccountingMutation` treated `ensureAccountingFlags` as an active stage after the accountant handoff.
- `useBuyerEnsureAccountingFlags` could recreate final accounting fields from the client by updating `proposals.sent_to_accountant_at`, `proposals.payment_status`, and `proposals.invoice_amount`.
- The local helper swallowed read/update errors with a silent catch.
- The accounting action had no deterministic in-flight guard at the pure action boundary.
- Existing tests covered only a narrow status propagation path and one failure stage.

## Risk

The client could claim final accounting success even if the authoritative server state was stale, missing, or not refreshed yet.

## Out Of Scope

- Submit proposal queue behavior.
- Foreman draft/recovery paths.
- PDF/open flow.
- Director approve.
- Server RPC semantics.
