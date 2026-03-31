## Accounting Canonical Finance Chain

### What was weak before

- Accountant primary path still had client-owned `outstanding` rendering in inbox/list adapters.
- Payment form still derived proposal `rest/outstanding` and `paidUnassigned` locally instead of consuming canonical server values.
- Finance mutations were already mostly server-owned, but primary accountant read path was not fully aligned with the same server truth.

### What is canonical now

- Primary finance read:
  - `public.accountant_proposal_financial_state_v1`
- Primary inbox/read-window finance projection:
  - `public.accountant_inbox_scope_v1`
- Primary pay mutation:
  - `public.accounting_pay_invoice_v1`
- Revoke-after-pay guard:
  - `public.guard_paid_proposal_financial_revocation_v1`

### What no longer belongs to the client

- Primary `paid / outstanding / payment_eligible / failure_code` truth
- Primary inbox/list residual math
- Primary proposal payment-form outstanding math for proposal-backed payments

### What stayed on the client deliberately

- Allocation entry geometry inside the payment form
- Rendering and UX wiring
- Transport adaptation for the current RN accountant screen

These remain UI concerns only and do not own canonical finance truth.

### Exact scope changed

- `supabase/migrations/20260331110000_accounting_canonical_finance_chain_v1.sql`
- `src/screens/accountant/accountant.inbox.service.ts`
- `src/screens/accountant/presentation/accountantRowAdapters.ts`
- `src/screens/accountant/accountant.paymentForm.helpers.ts`
- `src/screens/accountant/useAccountantPaymentForm.ts`
- targeted accountant tests
- `scripts/accounting_canonical_finance_verify.ts`

### Why revoke/pay race is closed

- `public.accounting_pay_invoice_v1` rejects invalid and stale payment attempts server-side.
- `public.guard_paid_proposal_financial_revocation_v1` blocks destructive revoke of approved/accountant-handoff state once committed payments exist.
- Read-after-write remains canonical via `accountant_proposal_financial_state_v1`.

### What consciously did not change

- Accountant UI layout and interaction structure
- Buyer / foreman / director flows
- Proposal lifecycle and request lifecycle
- Attachment subsystem
- Broad accounting cleanup outside the finance chain
