# STRICT_NULLCHECKS_PHASE_1 Notes

## Chosen slice
- Exact phase-1 slice: `src/lib/auth/useAuthLifecycle.ts`
- Rationale:
  - highest platform priority among the prepared candidates
  - strict-null probe for the exact owner already compiled clean after prep
  - existing route-decision helpers make this slice verifiable without broad runtime churn

## Candidate audit
- Individually probed with `strictNullChecks: true`:
  - `src/lib/auth/useAuthLifecycle.ts`
  - `src/screens/accountant/useAccountantPaymentForm.ts`
  - `src/screens/warehouse/hooks/useWarehouseReceiveFlow.ts`
  - `src/screens/director/hooks/useDirectorReportsController.ts`
- All four prepared owners compiled clean in isolation.

## Why auth lifecycle was selected first
- It is the highest-risk platform owner in the prepared set because it gates session truth and redirect behavior.
- The slice is narrow enough to harden without reopening unrelated business domains.

## Exact phase-1 boundary
- Included:
  - `src/lib/auth/useAuthLifecycle.ts`
  - strict-null compile proof config
  - focused nullability tests for exported pure helpers
- Intentionally excluded:
  - `useAuthGuard.ts`
  - wider auth-adjacent dependencies outside the exact slice

## Why the broader auth boundary was not taken in this wave
- Probing `useAuthLifecycle.ts + useAuthGuard.ts` pulled pre-existing nullability blockers outside the chosen slice:
  - `src/lib/api/buyer.ts`
  - `src/lib/api/director.ts`
  - `src/lib/catalog/catalog.transport.ts`
  - `src/lib/pdf/directorSupplierSummary.shared.ts`
- Pulling those into this wave would violate the exact-scope rule for phase 1.

## Semantics
- No runtime business semantics changed in this wave.
- The phase-1 closeout proves one exact production auth slice can live under strict-null discipline cleanly before any broader rollout.
