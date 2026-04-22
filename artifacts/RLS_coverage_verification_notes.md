## RLS_COVERAGE_VERIFICATION

### Scope
- Exact verification-only wave.
- No runtime/business logic changes.
- Exact new guard files:
  - [tests/security/rlsCoverage.shared.ts](/C:/dev/rik-expo-app-release/tests/security/rlsCoverage.shared.ts)
  - [tests/security/rlsCoverageVerification.test.ts](/C:/dev/rik-expo-app-release/tests/security/rlsCoverageVerification.test.ts)

### Why This Wave
- The current repo already has many SQL boundary hardening migrations, but the release/test layer did not yet hold one narrow verification suite proving that the highest-risk authenticated mutation boundaries keep:
  - RLS on their idempotency ledgers
  - no direct table grants to `anon` / `authenticated`
  - execute exposure only on the intended public wrapper
  - search-path hardening where that contract already exists

### Exact Audited Boundaries
1. Buyer proposal submit
   - `proposal_submit_mutations_v1`
   - `rpc_proposal_submit_v3(...)`
   - search-path hardening in `20260416223000_p0_4_buyer_proposal_security_definer_search_path_submit_v1.sql`
2. Warehouse receive apply
   - `warehouse_receive_apply_idempotency_v1`
   - `wh_receive_apply_ui(...)`
   - hardened warehouse atomic wrapper in `20260416213000_p0_security_definer_search_path_warehouse_atomic_v1.sql`
3. Warehouse request issue
   - `warehouse_issue_request_mutations_v1`
   - `wh_issue_request_atomic_v1(...)`
4. Warehouse free issue
   - `warehouse_issue_free_mutations_v1`
   - `wh_issue_free_atomic_v5(...)`
5. Accountant payment
   - `accounting_pay_invoice_mutations_v1`
   - `accounting_pay_invoice_v1(...)`
   - revoked internal apply boundary `accounting_pay_invoice_apply_v1(...)`
   - search-path hardening in `20260416220000_p0_3_finance_security_definer_search_path_payment_v1.sql`

### Root Cause Closed
- Before this wave, these protections existed in migrations but were guarded only piecemeal.
- A regression could have widened direct table access or lost wrapper/isolation guarantees without one exact verification suite covering the whole contract boundary.

### What Was Added
- Shared migration-reader/assertion helper for RLS boundary verification.
- One focused suite that proves the selected mutation boundaries still preserve:
  - ledger table RLS
  - private ledger access
  - authenticated-only wrapper grants
  - preserved search-path hardening on already-hardened wrappers
  - revoked internal apply exposure on accountant payment

### What Was Intentionally Not Touched
- SQL bodies
- migrations themselves
- RPC contracts
- runtime JS/TS behavior
- role semantics
- auth, PDF, queue, routing, or UI domains

### Semantics Impact
- `false`
- This wave strengthens release/test verification only; it does not change production behavior.
