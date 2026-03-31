## Accounting Finance Transition Map

### Canonical owner

- Finance truth owner: PostgreSQL canonical chain
- Canonical read: `public.accountant_proposal_financial_state_v1`
- Canonical inbox read: `public.accountant_inbox_scope_v1`
- Canonical pay mutation: `public.accounting_pay_invoice_v1`
- Revoke-after-pay guard: `public.guard_paid_proposal_financial_revocation_v1`

### Canonical read fields

- `proposal.proposal_id`
- `proposal.status`
- `proposal.sent_to_accountant_at`
- `totals.payable_amount`
- `totals.total_paid`
- `totals.outstanding_amount`
- `totals.payments_count`
- `totals.payment_status`
- `eligibility.approved`
- `eligibility.sent_to_accountant`
- `eligibility.payment_eligible`
- `eligibility.failure_code`
- `allocation_summary.paid_known_sum`
- `allocation_summary.paid_unassigned`

### Effective finance states

#### `proposal_not_approved`

- Condition: `approved=false`
- Allowed transitions:
  - proposal may later become approved/sent by existing upstream business path
- Forbidden transitions:
  - `pay`
- Owner of truth:
  - upstream proposal approval flow for transition
  - finance chain for payment rejection

#### `approval_revoked`

- Condition: `approved=true` and `sent_to_accountant=false`
- Allowed transitions:
  - upstream resend-to-accountant path may restore payable state if business allows
- Forbidden transitions:
  - `pay`
- Owner of truth:
  - upstream proposal/accountant handoff path for transition
  - finance chain for payment rejection

#### `ready_to_pay`

- Condition:
  - `approved=true`
  - `sent_to_accountant=true`
  - `outstanding_amount > 0`
  - `payment_eligible=true`
- Allowed transitions:
  - `pay` through `public.accounting_pay_invoice_v1`
  - pre-payment revoke/handoff withdrawal through existing upstream path
- Forbidden transitions:
  - client-owned paid/outstanding recalculation
- Owner of truth:
  - finance chain

#### `partially_paid`

- Condition:
  - `total_paid > 0`
  - `outstanding_amount > 0`
  - `payment_status='Частично оплачено'`
- Allowed transitions:
  - further `pay` through `public.accounting_pay_invoice_v1`
- Forbidden transitions:
  - destructive revoke of approved/accountant-handoff state
  - stale duplicate payment commit
- Owner of truth:
  - finance chain

#### `fully_paid`

- Condition:
  - `outstanding_amount <= 0.01`
  - `payment_status='Оплачено'`
  - `payment_eligible=false`
- Allowed transitions:
  - read-only consumption
- Forbidden transitions:
  - `pay`
  - destructive revoke of approved/accountant-handoff state
- Owner of truth:
  - finance chain

### Allowed transitions

1. `ready_to_pay -> partially_paid`
   owner: `public.accounting_pay_invoice_v1`
2. `ready_to_pay -> fully_paid`
   owner: `public.accounting_pay_invoice_v1`
3. `partially_paid -> partially_paid`
   owner: `public.accounting_pay_invoice_v1`
   meaning: another partial payment reduces outstanding
4. `partially_paid -> fully_paid`
   owner: `public.accounting_pay_invoice_v1`
5. `proposal_not_approved -> ready_to_pay`
   owner: existing upstream proposal approval + send-to-accountant path
   note: out of scope for this batch, but finance chain consumes this state canonically
6. `approval_revoked -> ready_to_pay`
   owner: existing upstream resend-to-accountant path
   note: out of scope for this batch, but finance chain consumes this state canonically

### Forbidden transitions

1. `proposal_not_approved -> pay`
   blocked by: `public.accounting_pay_invoice_v1`
2. `approval_revoked -> pay`
   blocked by: `public.accounting_pay_invoice_v1`
3. `fully_paid -> pay`
   blocked by: `public.accounting_pay_invoice_v1`
4. `partially_paid/full_paid -> revoke approval/accountant handoff`
   blocked by: `public.guard_paid_proposal_financial_revocation_v1`
5. `ready_to_pay/partially_paid -> duplicate stale pay`
   blocked by: `p_expected_total_paid` and `p_expected_outstanding` stale-state checks in `public.accounting_pay_invoice_v1`
6. `any -> over-allocation`
   blocked by: allocation validation in `public.accounting_pay_invoice_v1`

### Client boundary

- RN accountant screen may render and collect payment intent.
- RN accountant screen is not owner of:
  - `paid`
  - `outstanding`
  - `payment_eligible`
  - final payment status
- Primary RN read path must consume:
  - inbox financial fields from `accountant_inbox_scope_v1`
  - proposal financial truth from `accountant_proposal_financial_state_v1`
- Local allocation math remains UI-only and must not replace canonical finance state.
