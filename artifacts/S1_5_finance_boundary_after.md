# S1.5 Finance Boundary After

## Status

GREEN candidate pending full validation and release proof.

## Boundary Changes

- Accounting success is gated by an authoritative `proposals` readback.
- The required server field is `sent_to_accountant_at`; if it is absent after handoff, the mutation fails at `verify_accountant_state`.
- The old client-owned `ensure_accounting_flags` stage is removed from the active mutation chain.
- `useBuyerEnsureAccountingFlags` is now verify-only and no longer updates final accounting fields.
- Duplicate accounting sends are guarded by an in-flight ref before any RPC/upload work starts.

## Still Client-Owned

- Form validation for invoice number/date/amount.
- Optional invoice file upload.
- Proposal HTML attachment refresh.
- UI busy/alert/sheet state.

These remain client-owned because they are input preparation or UI state, not final accounting truth.

## Server-Owned

- Accountant handoff.
- `sent_to_accountant_at`.
- Payment status after handoff.
- Invoice amount persisted as accounting truth.
- Post-write authoritative readback.
