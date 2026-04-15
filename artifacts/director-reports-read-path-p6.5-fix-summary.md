# P6.5 Director Reports Read-Path Query Boundary Fix Summary

STATUS: STATIC GREEN

## What changed

- Added the main Director Reports query owner: `useDirectorReportsQuery`.
- Extended Director Reports query keys with a React Query namespace while preserving existing string key builders.
- Extended Director Reports query types with scope query params/data.
- Extended the pure adapter layer with a full scope query data adapter.
- Routed `useDirectorReportsController` scope loading through the query boundary instead of calling `loadDirectorReportUiScope` directly.

## What was extracted

- Query ownership for the main reports scope load:
  - `fetchDirectorReportsQueryData(...)`
  - `useDirectorReportsQuery(...)`
  - `loadReportsScope(...)`
  - `refreshReportsScope(...)`
  - `invalidateReportsScope(...)`

- Query key boundary:
  - `directorReportsKeys.all`
  - `directorReportsKeys.scope(...)`
  - `normalizeDirectorReportsScopeQueryParams(...)`

- Adapter boundary:
  - `adaptDirectorReportsScopeQueryData(...)`

## What was preserved

- Existing public controller return shape.
- Existing commit layer and derived layer.
- Existing two-phase discipline base -> priced flow.
- Existing abort/cancellation guarantees.
- Existing report rows, canonical summary, diagnostics, object filters, discipline grouping, and pricing semantics.

## What was not changed

- No PDF generation/open/export flow changed.
- No server RPC/transport payload meaning changed.
- No finance module changed.
- No proposal/approve/pay/submit mutation path changed.
- No UI redesign or copy/layout changes.
- No realtime/invalidation cleanup beyond routing the reports read load through query ownership; full realtime/invalidation dedupe remains P6.6.

## Test proof

- `npx jest src/screens/director/reports src/screens/director/hooks/useDirectorReportsController.cancellation.test.tsx src/screens/director/hooks/useDirectorReportsController.query-contract.test.ts --no-coverage --runInBand`: green, 6 suites / 57 tests.
- `npx tsc --noEmit --pretty false`: green.
- `npx expo lint`: green with existing baseline of 6 warnings.
- `npx jest --no-coverage`: green, 258 passed / 1 skipped suites; 1465 passed / 1 skipped tests.
