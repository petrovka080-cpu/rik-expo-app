# Contractor Anti-Hack Audit (No Business Logic Change)

Date: 2026-03-06
Scope: `app/(tabs)/contractor.tsx`, `src/screens/contractor/*`

## A) Found hacks (classified)

1. `contractor.tsx` had polling via `setInterval` + `issuedPollInFlightRef`.
Type: `B` Async/race workaround.
Risk: overlap/race between ticks, harder lifecycle cleanup.

2. `contractor.tsx` contained modal transition queue internals (`modalTransition*` refs + dismiss counter) inline in screen.
Type: `E` Modal flow workaround.
Risk: orchestration spread across screen-level UI state.

3. `contractor.tsx` had inlined fallback material bootstrap logic in `openActBuilder`.
Type: `C` Data fallback workaround.
Risk: heavy branch in UI layer, duplication and low observability.

4. `contractor.tsx` had inlined full submit orchestration (validate -> limits -> PDF -> DB save -> alerts).
Type: `D` Domain leakage + `B` async orchestration spread.
Risk: difficult maintenance, mixed concerns.

5. `contractor.tsx` had inlined profile/contractor loading and activation SQL.
Type: `D` Domain leakage.
Risk: duplicated data mapping and auth/profile access in view layer.

6. `contractor.workModalService.ts`/`contractor.workModalBootstrap.ts` used profile fallback fields (`fallbackOrg/fallbackPhone`) for header path.
Type: `C` Data fallback workaround.
Risk: silent source substitution and inconsistent contractor identity display.

## B) Replacements done

1. Polling refactor (no logic change):
- Added `useIssuedPolling` hook:
  - `src/screens/contractor/contractor.issuedPolling.ts`
- Replaced `setInterval + inFlightRef` by deterministic sequential loop (`setTimeout` after completed tick).
- `issuedPollInFlightRef` removed from screen.

2. Modal flow extraction:
- Added `src/screens/contractor/contractor.modalFlow.ts`.
- Screen now consumes `onAnyModalDismissed` + `queueAfterClosingModals` from one owner hook.

3. ActBuilder open fallback extraction:
- Added `src/screens/contractor/contractor.actBuilderOpenService.ts`.
- `openActBuilder` now delegates fallback/default-material bootstrap to service.

4. Submit flow extraction:
- Added `src/screens/contractor/contractor.actBuilderSubmitFlow.ts`.
- `submitActBuilder` now calls flow service and only applies result to UI state.

5. Profile/contractor data extraction:
- Added `src/screens/contractor/contractor.profileService.ts`.
- Moved profile load / contractor load / contractor activation from screen to service functions.

6. Works list orchestration extraction:
- Added `loadContractorWorksBundle` in `contractor.loadWorksService.ts`.
- Moved approved subcontracts + works enrichment/filtering/synthetic composition out of screen.

7. Removed profile fallback for work-modal header:
- Removed `fallbackOrg/fallbackPhone` from bootstrap/service call chain.

## C) Kept safeguards (explicitly, with reason)

1. `loadWorksSeqRef` in screen.
Reason: protects against stale async response applying after newer request; no duplicated guard currently.

2. `workModalBootSeqRef` and `issuedLoadSeqRef`.
Reason: protect modal-scoped async updates from stale completion after modal context switches.

3. `focusedRef` / `lastKickRef`.
Reason: prevent redundant reload spikes during navigation focus churn.

4. `debouncedMaterialSearch` (uses timer in `debounce` helper).
Reason: intentional user input throttling, not synchronization hack.

## D) Source-of-truth check

- Card projection: `contractor.viewModels.ts`
- Approved subcontract linking/filtering/synthetic rows: `contractor.rows.ts`
- Works bundle load pipeline: `contractor.loadWorksService.ts`
- Work-modal bootstrap pipeline: `contractor.workModalBootstrap.ts`
- Act submit flow: `contractor.actBuilderSubmitFlow.ts` + `contractor.actSubmitService.ts`

No business-rule intent changed; only placement/orchestration changed.

## E) Verification

Static checks:
- `npx tsc --noEmit` passed after each refactor step.

Manual scenarios to run (required by PROD gate):
1. Contractor list load.
2. Open subcontract card -> work modal.
3. Open ActBuilder and check defaults/material list.
4. Submit act (success + partial save branches).
5. Submit work progress.
6. Re-open same entities and ensure stable data.
7. Web/mobile parity for same contractor card semantics.

