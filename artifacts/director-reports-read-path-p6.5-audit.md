# P6.5 Director Reports Read-Path Boundary Audit

STATUS: ROOT READ-PATH SCOPE FOUND

## ROOT READ-PATH CHAIN

Director Reports main modal:

`DirectorScreen` -> `useDirectorScreenController` -> `useDirectorReports` -> `useDirectorReportsController` -> `loadDirectorReportUiScope` -> `loadDirectorReportTransportScope` -> `director_report_transport_scope_v1` transport/RPC -> normalized `DirectorReportScopeLoadResult` -> controller commits -> `DirectorReportsModal`.

Proof:
- `src/screens/director/DirectorScreen.tsx:222` passes `reports.repOpen` into `DirectorReportsModal`.
- `src/screens/director/DirectorScreen.tsx:224` / `src/screens/director/DirectorScreen.tsx:225` pass `repData` and `repDiscipline`.
- `src/screens/director/DirectorScreen.tsx:227` / `src/screens/director/DirectorScreen.tsx:228` / `src/screens/director/DirectorScreen.tsx:242` pass reports loading flags.
- `src/screens/director/director.reports.ts:9` calls `useDirectorReportsController`.
- `src/screens/director/hooks/useDirectorReportsController.ts:154` defines `fetchReport`.
- `src/screens/director/hooks/useDirectorReportsController.ts:218` defines `fetchDiscipline`.
- `src/screens/director/hooks/useDirectorReportsController.ts:400` defines `syncScopeBothModes`.
- `src/screens/director/hooks/useDirectorReportsController.ts:576` defines `refreshReports`.
- `src/screens/director/hooks/useDirectorReportsController.ts:666` defines `openReports`.
- `src/lib/api/directorReportsScope.service.ts:561` defines `loadDirectorReportUiScope`.
- `src/lib/api/directorReportsScope.service.ts:581` calls `loadDirectorReportTransportScope`.
- `src/lib/api/directorReportsScope.service.ts:615` through `src/lib/api/directorReportsScope.service.ts:627` builds the result key, report, discipline and readiness fields.

Realtime/lifecycle read refresh:

`useDirectorScreenController` -> `useDirectorReportsRealtimeLifecycle` / `useDirectorLifecycle` -> `reports.refreshReports` or `reports.fetchReport`.

Proof:
- `src/screens/director/useDirectorScreenController.ts:230` defines `refreshReportsRealtimeScope`.
- `src/screens/director/useDirectorScreenController.ts:242` wires reports realtime lifecycle.
- `src/screens/director/useDirectorScreenController.ts:247` checks `reports.repLoading || reports.repOptLoading || reports.repDisciplinePriceLoading`.
- `src/screens/director/useDirectorScreenController.ts:254` passes `fetchReport: reports.fetchReport` into shared lifecycle.
- `src/screens/director/director.reports.realtime.lifecycle.ts:33` owns a separate realtime `inFlightRef`.
- `src/screens/director/director.reports.realtime.lifecycle.ts:34` owns `queuedMetaRef`.

## MANUAL ORCHESTRATION FOUND

1. Main reports read path still controller-owned:
- `useDirectorReportsController` keeps `repData`, `repDiscipline`, `repOptObjects`, and `repOptObjectIdByName` as local React state.
- It owns `fetchReport`, `fetchDiscipline`, `syncScopeBothModes`, `applyReportPeriod`, `refreshReports`, and `openReports`.
- These methods call `loadDirectorReportUiScope` directly.

2. Manual request sequencing and abort slots:
- `reportReqSeqRef`, `disciplineReqSeqRef`, and `scopeLoadSeqRef` are incremented manually.
- `reportRequestRef`, `disciplineRequestRef`, and `scopeRequestRef` are explicit AbortController slots.
- `beginScopeRefresh` aborts active requests and bumps sequence ids.
- `directorReports.scopeLoader.ts` contains reusable request-slot utilities, but the controller still owns when/how to run them.

3. Scattered loading flags:
- `directorReports.store.ts` owns `repLoading`, `repDisciplinePriceLoading`, and `repOptLoading`.
- Controller methods set these flags directly in multiple paths:
  - `fetchReport`
  - `fetchDiscipline`
  - `syncScopeBothModes`
  - `fetchReportOptions`
  - `applyReportPeriod`
  - `refreshReports`
  - `openReports`

4. Duplicate refresh/load entry points:
- Modal open calls `reports.openReports`.
- Manual refresh calls `reports.refreshReports`.
- Period change calls `applyReportPeriod`.
- Object filter calls `applyObjectFilter` -> `syncScopeBothModes`.
- Tab switch can call `syncScopeBothModes` or `fetchReport`.
- Realtime calls `refreshReports`.
- Shared lifecycle calls `fetchReport`.

5. Partial query boundary already exists:
- `directorReports.query.key.ts` exists and centralizes string cache/dependency keys.
- `directorReports.query.types.ts` exists and re-exports scope service types.
- `directorReports.query.adapter.ts` exists and provides pure extraction adapters.
- `useDirectorReportOptionsQuery.ts` exists, but only for the options path.

6. Missing query owner:
- There is no `useDirectorReportsQuery.ts` for the main report/discipline scope.
- Main read ownership is still split across controller request slots, store loading flags, and commit helpers.

## SAFE EXTRACTION SCOPE

Safe additive extraction for P6.5:

1. Add a main reports query owner:
- `useDirectorReportsQuery.ts` should own `loadDirectorReportUiScope` calls for a single scope load.
- It should expose `reportsData`, `repLoading`, `repOptLoading`, `repDisciplinePriceLoading` derivation helpers, `refreshReportsScope`, and `invalidateReportsScope`.
- It should keep `enabled: false` by default so existing UI-triggered flows remain explicit.

2. Extend query keys without breaking existing string key contract:
- Keep `buildDirectorReportsOptionsKey`, `buildDirectorReportsScopeKey`, and `buildDirectorDisciplineKey` unchanged.
- Add React Query key namespace helpers around the existing string keys.

3. Extend adapter layer:
- Keep existing adapters unchanged.
- Add a combined adapter for controller-facing scope data if needed, but do not recompute report rows, discipline, summary, diagnostics, or KPI values.

4. Thin controller narrowly:
- Replace direct `loadReportScope(...)` calls in the main full-scope paths with query-owned loader/refetch helpers where safe.
- Preserve controller public return shape.
- Preserve existing commit layer (`useDirectorReportsCommit`) and derived layer (`useDirectorReportsDerived`).
- Preserve two-phase discipline behavior for base -> priced payloads.

5. Keep request-slot semantics where React Query is not yet the owner:
- Do not remove realtime/lifecycle coalescing in this wave.
- Do not broadly rewrite `director.reports.realtime.lifecycle.ts`; this belongs to P6.6.

## WHAT MUST NOT BE TOUCHED

- Report transport/RPC meaning and payload semantics.
- Canonical report summary/diagnostics normalization.
- Report rows, discipline grouping, object filter semantics, bucket meaning, pricing semantics.
- PDF generation/open/export flows.
- Finance module.
- Proposal/approve/pay/submit mutations.
- UI layout/copy/modal structure.
- Broad realtime/invalidation cleanup; that belongs to P6.6 only after P6.5 is GREEN.

## MINIMAL P6.5 FIX PLAN

1. Extend `src/screens/director/reports/directorReports.query.key.ts` with React Query key helpers.
2. Extend `src/screens/director/reports/directorReports.query.types.ts` with query params/data types.
3. Extend `src/screens/director/reports/directorReports.query.adapter.ts` with a combined scope adapter if needed.
4. Add `src/screens/director/reports/useDirectorReportsQuery.ts`.
5. Wire the controller's main scope loader through the query boundary while preserving public return shape and commit behavior.
6. Add regression tests for keys, adapter, query owner, controller contract, loading/error derivation, and semantic parity.
