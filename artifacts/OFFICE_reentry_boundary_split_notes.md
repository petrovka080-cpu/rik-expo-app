# OFFICE_REENTRY_BOUNDARY_SPLIT Notes

## Scope
- Exact owner split only for `src/lib/navigation/officeReentryBreadcrumbs.ts`.
- No changes to auth, role business logic, Office screen composition, PDF domain, SQL/RPC, or unrelated navigation flows.

## Initial Ownership Map
- `officeReentryBreadcrumbs.ts` previously owned all of the following at once:
- breadcrumb type/contracts and normalization
- AsyncStorage read/write/clear
- batched write scheduling and flush policy
- AppState final-flush subscription
- post-return probe normalization and formatting
- route return receipt state
- office marker and lifecycle observability payload shaping
- public entrypoint exports

## Risk Before Split
- One file owned persistence, lifecycle wiring, probe formatting, route-return state, and observability at the same time.
- Storage failure, probe formatting, and marker recording could not be tested independently without loading the whole Office reentry boundary.
- Silent storage/batch failure behavior inside the touched scope was ambiguous until it was routed through explicit observability.

## Extracted Modules
- `src/lib/navigation/officeReentryBreadcrumbs.contract.ts`
  Holds the shared types, constants, normalization helpers, and error descriptor shaping used across the Office reentry boundary.
- `src/lib/navigation/officeReentryBreadcrumbBatcher.ts`
  Holds batch buffering, flush sizing, timer discipline, and "flush after marker" policy.
- `src/lib/navigation/officeReentryBreadcrumbs.persistence.ts`
  Holds AsyncStorage read/write/clear and the global batcher/AppState final flush lifecycle.
- `src/lib/navigation/officeReentryBreadcrumbDiagnostics.ts`
  Holds post-return probe normalization, storage, formatting, and diagnostic text building.
- `src/lib/navigation/officeReentryRouteReturnReceipt.ts`
  Holds pending/recent route return receipt ownership.
- `src/lib/navigation/officeReentryBreadcrumbMarkers.ts`
  Holds marker recording, lifecycle marker helpers, and observability payload shaping.

## What Stayed In The Public Entrypoint
- `src/lib/navigation/officeReentryBreadcrumbs.ts` stayed as the stable public module path for callers.
- The file now acts as a barrel entrypoint that re-exports the same Office reentry boundary surface instead of owning persistence, probe, receipt, and marker internals inline.

## Semantics Preservation
- Import path for callers did not change.
- Office reentry constants and normalized result behavior stayed shared through the new contract module.
- Storage persistence semantics, batch flush semantics, route return receipt semantics, and marker names stayed unchanged.
- The touched scope removed silent swallow behavior for breadcrumb persistence and batch flush failures by routing them to `recordPlatformObservability(...)` without changing caller-facing behavior.

## Intentional Non-Changes
- No Office shell/layout owner rewrite in this wave.
- No change to route selection or reentry business rules outside the breadcrumb boundary.
- No attempt to clean unrelated `catch {}` or hygiene debt outside exact Office reentry files.

## File Size Outcome
- Previous `src/lib/navigation/officeReentryBreadcrumbs.ts`: 1484 lines.
- Current public entrypoint `src/lib/navigation/officeReentryBreadcrumbs.ts`: 123 lines.
- Split owners now carry the remaining exact responsibilities:
  - contract: 242 lines
  - batcher: 119 lines
  - persistence: 148 lines
  - diagnostics: 122 lines
  - return receipt: 55 lines
  - markers: 898 lines

## Residual Risk Left Intentionally
- `officeReentryBreadcrumbMarkers.ts` remains the largest exact-scope owner because marker/event vocabulary is still broad. That is acceptable for this wave because it is now isolated from storage, batch flushing, diagnostics, and route-return state, so future reductions can happen without re-entangling the rest of the boundary.
