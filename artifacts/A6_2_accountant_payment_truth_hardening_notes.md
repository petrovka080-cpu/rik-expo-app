# A6.2 Accountant Payment Truth Hardening Notes

Status: GREEN

## Risk

The accountant payment form had three related state surfaces:

- server-owned proposal financial state (`outstanding_amount`)
- allocation rows (`allocRows`)
- submit amount (`amount`)

The form displayed the canonical server outstanding amount, but the submit amount could remain empty or stale after server financial state loaded. That made `amount` a separate source of truth from the payment owner used by the UI.

## Fix Scope

Changed only accountant payment form truth ownership:

- `src/screens/accountant/accountant.paymentForm.helpers.ts`
- `src/screens/accountant/useAccountantPaymentForm.ts`
- `src/screens/accountant/accountant.paymentForm.helpers.test.ts`
- `src/screens/accountant/components/ActivePaymentForm.test.tsx`

## Production-Safe Contract

- Proposal full-payment mode derives submit amount from canonical server `restProposal`.
- Proposal partial-payment mode derives submit amount from `allocSum`.
- Manual/non-proposal forms are left untouched.
- Sync only happens after the matching server financial state is loaded for the current proposal.
- Loading/error states do not publish a stale submit amount.

## What Did Not Change

- Payment formulas
- Allocation formulas
- Totals, grouping, ordering
- Server RPC contracts
- Submit/payment business logic
- UI flow or navigation
- Retry, idempotency, or payment mutation semantics
