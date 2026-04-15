# P6.4 Director Finance Read-Path Boundary Audit

STATUS: ROOT READ-PATH SCOPE FOUND

## ROOT READ-PATH CHAIN

Director Finance main panel:

`DirectorScreen` -> `useDirectorScreenController` -> `fetchFinance` -> `loadDirectorFinanceScreenScope` -> `fetchDirectorFinancePanelScopeV4ViaRpc` -> `director_finance_panel_scope_v4` RPC -> `buildDirectorFinanceCanonicalScope` -> `finScope` -> `useDirectorFinancePanel` / `DirectorFinanceContent`.

Proof:
- `src/screens/director/useDirectorScreenController.ts:63` reads `finLoading` from `directorUi.store`.
- `src/screens/director/useDirectorScreenController.ts:66` owns local `finScope` state.
- `src/screens/director/useDirectorScreenController.ts:81` defines controller-owned `fetchFinance`.
- `src/screens/director/useDirectorScreenController.ts:84` calls `loadDirectorFinanceScreenScope`.
- `src/lib/api/directorFinanceScope.service.ts:408` calls `fetchDirectorFinancePanelScopeV4ViaRpc`.
- `src/lib/api/directorFinanceScope.service.ts:463` builds `canonicalScope`.
- `src/screens/director/useDirectorScreenController.ts:225` passes `finScope`, `finLoading`, and `fetchFinance` into `useDirectorFinancePanel`.
- `src/screens/director/DirectorScreen.tsx:167` / `src/screens/director/DirectorScreen.tsx:205` pass `finLoading` and `finScope` into finance UI.

Refresh/read lifecycle:

`useDirectorLifecycle` -> `refreshFinanceScoped` -> generic `runRefresh` manual in-flight queue -> `fetchFinance`.

Proof:
- `src/screens/director/director.lifecycle.ts:21` defines `RefreshState`.
- `src/screens/director/director.lifecycle.ts:179` owns `financeRefreshRef`.
- `src/screens/director/director.lifecycle.ts:183` / `src/screens/director/director.lifecycle.ts:189` point the refresh function at `fetchFinance`.
- `src/screens/director/director.lifecycle.ts:222` defines `refreshFinanceScoped`.
- `src/screens/director/director.lifecycle.ts:363` runs current visible scope on `screen_init`.
- `src/screens/director/director.lifecycle.ts:381` refreshes finance on tab switch.

Realtime read refresh:

`useDirectorFinanceRealtimeLifecycle` -> local `inFlightRef`/`queuedMetaRef` -> `refreshFinanceRealtimeScope` -> `fetchFinance`.

Proof:
- `src/screens/director/useDirectorScreenController.ts:233` defines `refreshFinanceRealtimeScope`.
- `src/screens/director/useDirectorScreenController.ts:243` wires finance realtime lifecycle.
- `src/screens/director/director.finance.realtime.lifecycle.ts:33` owns `inFlightRef`.
- `src/screens/director/director.finance.realtime.lifecycle.ts:34` owns `queuedMetaRef`.
- `src/screens/director/director.finance.realtime.lifecycle.ts:127` coalesces realtime refresh while in-flight.

## MANUAL ORCHESTRATION FOUND

1. Controller-owned fetch orchestration:
- `useDirectorScreenController` owns `fetchFinance`, `finScope`, and loading transition.
- It manually sets `setFinLoading(true/false)` and catches/logs errors.
- Query data ownership is not in React Query, unlike the neighboring reports options path.

2. Store-backed loading flag:
- `directorUi.store` owns `finLoading` and `setFinLoading`.
- This loading flag is read by controller/UI and also reset by `closeFinanceUi`.
- Loading/error derivation is not centralized in a query boundary.

3. Duplicate refresh entry points:
- Initial/focus/tab/app lifecycle calls `fetchFinance` through `useDirectorLifecycle`.
- Finance realtime calls `fetchFinance` through `useDirectorFinanceRealtimeLifecycle`.
- Finance modal refresh button calls `financePanel.fetchFinance`.
- Period apply/clear calls `fetchFinance` from `director.finance.panel.ts`.

4. Manual in-flight/queue guards:
- `useDirectorLifecycle` has generic `RefreshState` with `inFlight`, `rerunQueued`, `rerunForce`.
- `useDirectorFinanceRealtimeLifecycle` separately has `inFlightRef` and `queuedMetaRef`.
- These guards sit above the finance fetch instead of using the query owner as the fetch boundary.

5. Scattered loading/error state:
- Loading is in `directorUi.store`.
- Errors are only warned in `warnDirectorFinance`; there is no finance query error model.
- UI currently consumes loading only, while the read service already throws hard when the v4 scope is unavailable.

6. Query boundary gap:
- Reports already have `directorReports.query.key.ts`, `directorReports.query.types.ts`, `directorReports.query.adapter.ts`, and `useDirectorReportOptionsQuery.ts`.
- Finance has canonical service/RPC/read model, but no equivalent query key/type/adapter/hook boundary.

## SAFE EXTRACTION SCOPE

Safe additive extraction:

1. Add finance query key builder:
- Period/object/due/critical scoped.
- Normalize `null`/`undefined` periods and object id to empty strings.
- Namespace under `["director", "finance"]`.

2. Add finance query types:
- Re-export existing `DirectorFinanceScreenScopeResult`.
- Define params and query data shape without duplicating business semantics.

3. Add pure finance query adapter:
- Extract `canonicalScope`, `panelScope`, `issues`, `supportRowsLoaded`, `cutoverMeta`, and `sourceMeta` from `loadDirectorFinanceScreenScope` result.
- Do not fabricate empty finance truth on errors.

4. Add `useDirectorFinanceQuery`:
- Own the call to `loadDirectorFinanceScreenScope`.
- Derive `finScope`, `finLoading`, error, `refreshFinance`, and `invalidateFinance`.
- Keep service/RPC payload semantics untouched.

5. Thin `useDirectorScreenController`:
- Remove local `finScope` state and controller-owned finance fetch body.
- Keep the public `fetchFinance` contract by mapping it to the query refresh.
- Keep UI props and finance panel props unchanged.

6. Preserve current UI/business behavior:
- `DirectorFinanceContent`, finance modals, supplier scope, PDF paths, and finance aggregate math remain untouched.
- Existing lifecycle/realtime owners may still coalesce refreshes, but their refresh target becomes the query boundary instead of controller-owned fetch state.

## WHAT MUST NOT BE TOUCHED

- `director_finance_panel_scope_v4` RPC meaning and arguments.
- Finance aggregate/bucket/obligation/spend semantics.
- Supplier detail RPC/PDF/prefetch flow.
- Director reports read path.
- Approve/pay/submit/proposal mutation flows.
- UI layout, labels, sections, grouping, filters, and modal navigation.

## MINIMAL P6.4 FIX PLAN

1. Introduce `src/screens/director/finance/directorFinance.query.key.ts`.
2. Introduce `src/screens/director/finance/directorFinance.query.types.ts`.
3. Introduce `src/screens/director/finance/directorFinance.query.adapter.ts`.
4. Introduce `src/screens/director/finance/useDirectorFinanceQuery.ts`.
5. Replace controller-owned `finScope`/`fetchFinance`/`finLoading` plumbing with query data while preserving return contract.
6. Add regression tests for keys, adapter, query data/loading contract, controller public shape, and refresh invalidation contract.
