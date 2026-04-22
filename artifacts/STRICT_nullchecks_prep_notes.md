# STRICT_NULLCHECKS_PROGRAM_PREP Notes

## Why this wave exists
- Global `strictNullChecks` is still not enabled for the whole repo.
- The safe move in this wave was inventory-first plus exact blocker removal, not a platform-wide strict flip.

## Probe strategy
- Left global tsconfig behavior unchanged.
- Used a narrow probe config: `tsconfig.strict-null-prep.json`.
- Probed only 4 hot production owners:
  - `src/lib/auth/useAuthLifecycle.ts`
  - `src/screens/accountant/useAccountantPaymentForm.ts`
  - `src/screens/warehouse/hooks/useWarehouseReceiveFlow.ts`
  - `src/screens/director/hooks/useDirectorReportsController.ts`

## What the probe surfaced
- The hottest direct blockers were not in the 4 owners themselves, but in 3 downstream dependencies:
  - `src/lib/api/director_reports.transport.discipline.ts`
  - `src/lib/api/directorReportsTransport.service.ts`
  - `src/screens/warehouse/warehouse.seed.ts`

## Exact runtime-safe fixes made
- `director_reports.transport.discipline.ts`
  - Replaced `query.eq(..., p.objectName)` on nullable legacy filter branches with a derived `legacyObjectNameFilter`.
  - Semantics preserved: legacy free-form object-name filtering still happens only when canonical object resolution is absent.
- `directorReportsTransport.service.ts`
  - Changed omitted RPC args from `null` to `undefined`.
  - Semantics preserved: omitted optional filters still mean “not scoped”.
- `warehouse.seed.ts`
  - Replaced unsafe duplicate merge assumption with an explicit deterministic merge helper.
  - Semantics preserved: duplicate rows still merge by the same key and same summed quantity.

## What was intentionally not done
- No global `strictNullChecks: true`.
- No global strict rollout.
- No broad typing cleanup across unrelated files.
- No changes to business logic, SQL/RPC semantics, or UI semantics.

## Runtime-proof note
- Android emulator proof was completed after one bounded environment-only recovery in the clean release worktree.
- The recovery was a temporary local junction so the Expo dev client could resolve the expected `rik-expo-app` path segment while the release worktree lives at `rik-expo-app-release`.
- No product code, config, or runtime behavior was changed for that recovery, and the temporary junction was removed immediately after proof collection.

## Files intentionally left for later phases
- `useAuthLifecycle.ts`
- `useAccountantPaymentForm.ts`
- `useWarehouseReceiveFlow.ts`
- `useDirectorReportsController.ts`

These are now better prepared for a later strict-null phase because their hottest downstream blockers were removed here first.
