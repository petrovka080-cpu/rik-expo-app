# PROMISE_BATCH_BOUNDARY_HARDENING_PHASE_1 Notes

## Inventory

- Read-only inventory command:
  - `rg -n "Promise\\.all\\(" -g "!node_modules/**" -g "!dist/**" -g "!coverage/**" -g "!artifacts/**" .`
- Total `Promise.all` sites found: `137`
- High-level distribution:
  - `src`: `66`
  - `scripts`: `52`
  - `tests`: `12`
  - `supabase/functions`: `6`
  - `app`: `1`
- Selection rule for this wave:
  - choose exactly one runtime batch
  - partial success must be correct
  - no auth / money / queue / offline-core / atomic business flow
  - local blast radius only

## Shortlist

- Candidate A: `app/product/[id].tsx`
  - Domain: product details route
  - Batch: `loadMarketListingById(id)` + `loadMarketRoleCapabilities()`
  - Partial success: maybe possible, but user-facing route behavior would need extra route-state decisions
  - UI direct: yes
  - Error handling: route-level only
  - Verdict: safe, but lower value

- Candidate B: `src/screens/office/officeAccess.services.ts`
  - Domain: office access bootstrap
  - Batch: `loadCurrentAuthUser()` + `loadProfileScreenData()`
  - Partial success: not correct, bootstrap needs both sides
  - UI direct: yes
  - Business criticality: high
  - Verdict: blocked by critical business logic

- Candidate C: `src/features/ai/assistantScopeContext.ts`
  - Domain: AI assistant scoped context fanout
  - Batch: multiple buyer/director/proposal/report fetches
  - Partial success: potentially useful, but blast radius crosses several domains
  - UI direct: yes
  - Cross-domain dependencies: high
  - Verdict: too wide

- Candidate D: `src/features/profile/ProfileOtaDiagnosticsCard.tsx`
  - Domain: profile OTA diagnostics copy boundary
  - Batch:
    - `getPdfCrashBreadcrumbs()`
    - `getWarehouseBackBreadcrumbs()`
    - `getOfficeReentryBreadcrumbs()`
  - Partial success: correct, each breadcrumb section is independent diagnostics data
  - UI direct: yes, but only on explicit copy action
  - Error handling before change: outer `try/catch` only, one rejected section aborted the whole copy
  - Focused tests: `src/features/profile/ProfileOtaDiagnosticsCard.test.tsx`
  - Verdict: chosen

## Why this slice was chosen

- It is a single read-only diagnostics batch with clearly independent elements.
- Partial success is product-correct here: losing one breadcrumb source should not erase the rest of the diagnostics payload.
- The batch is narrow, user-triggered, and easy to regression-test without touching adjacent domains.
- It improves process control by turning an implicit all-or-nothing copy path into an explicit degraded-state contract.

## Why the other candidates were not chosen

- `app/product/[id].tsx` was intentionally skipped because route-state semantics are more user-visible and need separate state modeling.
- `src/screens/office/officeAccess.services.ts` was rejected because bootstrap semantics are effectively atomic.
- `src/features/ai/assistantScopeContext.ts` was rejected because it would pull a cross-domain cluster, not a safe isolated slice.

## Real batch-boundary blockers in the chosen slice

- One rejected breadcrumb read caused the whole `Promise.all(...)` to reject.
- The copy action had no explicit normalized result contract for per-section success/error.
- Errors from individual sections were not preserved in the copied diagnostics payload.
- The process had no explicit handling for:
  - zero successful sections
  - partial success
  - degraded-but-still-usable diagnostics

## Exact in-scope changes

- `src/features/profile/ProfileOtaDiagnosticsCard.tsx`
  - replaced the single `Promise.all(...)` batch with `Promise.allSettled(...)`
  - added a local `BatchResult<T>` contract
  - normalized settled results into explicit success/error entries
  - classified batch outcome into `complete`, `partial`, or `diagnostics_only`
  - preserved copied payload order while surfacing section-level errors
- `src/features/profile/ProfileOtaDiagnosticsCard.test.tsx`
  - added focused tests for one failure, multiple failures, and all failures

## Out of scope by design

- no global `Promise.all` replacement
- no auth/bootstrap changes
- no queue/offline-core changes
- no AI fanout hardening in this wave
- no route-state redesign
- no changes outside the chosen diagnostics copy boundary
