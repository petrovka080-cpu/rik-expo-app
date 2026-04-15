# P6.4 Director Finance Read-Path Query Boundary Fix Summary

STATUS: STATIC GREEN

## What changed

- Added a Director Finance query-key boundary under `src/screens/director/finance`.
- Added a typed query data contract that reuses the existing finance screen scope service and canonical read model.
- Added a pure adapter that maps `DirectorFinanceScreenScopeResult` to the controller-facing finance query data.
- Added `useDirectorFinanceQuery` as the query owner for the main Director Finance panel scope.
- Thinned `useDirectorScreenController`: it no longer owns `finScope` state or the manual `setFinLoading(true/false)` finance fetch body.

## What was extracted

- Query key generation:
  - `directorFinanceKeys.all`
  - `directorFinanceKeys.scope(...)`
  - `buildDirectorFinanceScopeKey(...)`
  - `normalizeDirectorFinanceScopeParams(...)`

- Adapter layer:
  - `adaptDirectorFinanceScopeResult(...)`

- Query owner:
  - `fetchDirectorFinanceQueryData(...)`
  - `useDirectorFinanceQuery(...)`

## What was not changed

- No finance aggregate, bucket, obligation, spend, supplier, or object semantics changed.
- No RPC name, payload meaning, or server status semantics changed.
- No PDF path changed.
- No Director Reports path changed.
- No approve/pay/submit/proposal mutation path changed.
- No UI redesign or copy/layout changes.

## Test proof

- `npx jest src/screens/director/finance --no-coverage --runInBand`: green, 3 suites / 15 tests.
- `npx tsc --noEmit --pretty false`: green.
- `npx expo lint`: green with existing baseline of 6 warnings.
- `npx jest --no-coverage`: green, 257 passed / 1 skipped suites; 1456 passed / 1 skipped tests.

## Residual scope intentionally deferred

- Director realtime / invalidation dedupe remains a separate future wave.
- Director Reports read-path remains a separate future wave.
