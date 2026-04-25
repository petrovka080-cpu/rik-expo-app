# V4-4 Accountant + Contractor Critical E2E Notes

## Goal

Add production-safe critical E2E coverage for the last two uncovered business domains:

- Accountant payment-ready flow
- Contractor progress save flow

This wave stays within E2E/seed/selector scope only. No business logic, SQL/RPC, runtime, or app configuration changes were made.

## Changed Files

- `scripts/e2e/_shared/maestroCriticalBusinessSeed.ts`
- `scripts/e2e/run-maestro-critical.ts`
- `maestro/flows/critical/accountant-payment.yaml`
- `maestro/flows/critical/contractor-progress.yaml`
- `tests/e2e/maestroCriticalBusinessPhase1.contract.test.ts`
- `src/screens/accountant/components/ListRow.tsx`
- `src/screens/accountant/components/CardModal.tsx`
- `src/screens/accountant/components/AccountantCardContent.tsx`
- `src/screens/contractor/components/ContractorSubcontractsList.tsx`
- `src/screens/contractor/components/ContractorWorkModal.tsx`
- `src/screens/contractor/components/WorkModalOverviewSection.tsx`

## What Was Added

- Deterministic Accountant seed wired to an authenticated accountant inbox check.
- Deterministic Contractor seed wired to contractor inbox visibility.
- New Maestro flows:
  - `accountant-payment.yaml`
  - `contractor-progress.yaml`
- Contract coverage for the new flows/selectors/seed env.
- Minimal selector surface for Accountant and Contractor screens where stable E2E lookup was otherwise fragile.

## Root Causes Closed

### Accountant

Initial failures were not caused by business logic:

- list row `testID` did not surface reliably to Maestro
- modal root/field `testID`s also did not surface reliably
- forcing the partial allocation subpath was unnecessary for this wave and proved unstable as a proof target

Final solution:

- open the seeded item by deterministic supplier text
- verify supplier/invoice/status/amount-ready state through surfaced text plus `payment-form-rest`
- prove payment readiness through visible payment controls instead of forcing a deeper partial allocation branch

### Contractor

Initial failures were also selector-level only:

- work card `testID` did not surface reliably to Maestro
- modal root `testID` did not surface reliably
- success dialog used app-specific alert ids/text rather than `android:id/alertTitle`

Final solution:

- open the seeded work item by deterministic contractor text
- verify work modal by surfaced title/state text
- verify save success by surfaced dialog text

## Expected Post-Push Step

`release:verify` must be rerun after commit/push on a clean `HEAD == origin/main`. If the guard returns `otaDisposition=allow`, publish OTA. If it returns `block` or `build-required`, do not publish OTA.
