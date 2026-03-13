# Runtime Smoke Verification After Hardening v1

Date: 2026-03-09

## Scope
Post-hardening smoke verification for:
- Warehouse expense request loader fix
- Buyer type-gate counterparty behavior
- Director report anti-dup guard

## Automated checks executed

### 1. TypeScript build consistency
- Command: `npx tsc --noEmit --pretty false`
- Result: PASS
- Meaning: changed code compiles and type contracts remain consistent.

### 2. Schema-surface probe (live env from `.env.local`)
- `request_items.kind`: present
- `proposal_items` core binding fields (`request_item_id`, `supplier`, `price`, `qty`, `note`): present
- `proposal_items.supplier_id`: missing
- `proposal_items.contractor_id`: missing
- `purchase_items.kind`: missing
- `proposals`: RLS denied for anon (`42501 permission denied`)

Interpretation:
- Confirms current system is still legacy/partial on canonical entity binding.
- Confirms why schema phase is required for strict guarantees.

## Manual runtime smoke (required)

### A. Warehouse -> Расход
1. Open `Warehouse` tab, switch to `Расход`.
2. Validate request list loads and loading state ends.
3. Check logs/network: no repeated `400` against `/rest/v1/requests?...select=...`.
4. Open request details and issue flow; verify stock refresh.

Expected:
- No endless spinner.
- No repeating 400 spam.
- Existing issue flow unchanged.

### B. Buyer proposal screen
1. Open buyer inbox and select one line per type (`material`, `service`/`work`).
2. For `material`, verify suggestions/label target supplier role.
3. For `service/work`, verify suggestions/label target contractor role.
4. Try submit with missing counterparty/price and verify validation stops submit.

Expected:
- Type-gated counterparty UX works.
- Invalid mixed/empty inputs are blocked pre-submit.

### C. Director reports (discipline/material facts)
1. Open Director reports and run period/object filters.
2. Compare row counts before/after where duplicate symptoms were observed.
3. Confirm no sudden N-fold expansion in repeated loads.

Expected:
- Stable row counts across refreshes.
- No obvious duplicate inflation in discipline output.

## Limits of this smoke run
- Full mobile UI runtime was not executed from CLI session.
- DB contained zero operational rows in current env, so data-level regression surface is limited.
- Final confidence requires manual app run against real/staging dataset.

## Status
`SMOKE PARTIAL: BUILD+SCHEMA PROBE PASS, UI RUNTIME MANUAL CHECK REQUIRED`
