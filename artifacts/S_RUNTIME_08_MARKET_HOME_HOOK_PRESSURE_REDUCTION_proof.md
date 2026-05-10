# S_RUNTIME_08_MARKET_HOME_HOOK_PRESSURE_REDUCTION Proof

## Status

`GREEN_MARKET_HOME_HOOK_PRESSURE_REDUCED`

## Why This File Was Selected

The wave started clean from `origin/main` at `430e13115fa60da102b6d8e79e6ff1e9378dc418` with ahead/behind `0/0`.

Fresh architecture scanner output showed `src/features/market/MarketHomeScreen.tsx` as the top remaining TSX hook-pressure owner:

- `MarketHomeScreen.tsx`: 33 hook call-sites, 668 lines
- Scanner hook-pressure component count: 6
- Scanner god-component count: 30

## What Changed

- Added `src/features/market/useMarketHomeController.ts`.
- Moved MarketHomeScreen state, effects, store selectors, feed loading, pagination, navigation callbacks, phone/WhatsApp openers, auction entry observability, and derived feed state into the controller.
- Kept `MarketHomeScreen.tsx` as a render shell with the existing FlatList tuning constants, `renderItem`, placeholder rendering, refresh control, pagination trigger, header, and footer composition.
- Added `tests/market/marketHomeController.decomposition.test.ts`.
- Updated `tests/perf/performance-budget.test.ts` to budget the one permanent controller boundary.

## Before And After

| Metric | Before | After |
| --- | ---: | ---: |
| `MarketHomeScreen.tsx` hook call-sites | 33 | 3 |
| `MarketHomeScreen.tsx` lines | 668 | 376 |
| `useMarketHomeController.ts` hook call-sites | 0 | 38 |
| `useMarketHomeController.ts` lines | 0 | 342 |
| scanner hook-pressure component count | 6 | 5 |
| scanner god-component count | 30 | 29 |

## Behavior Preservation

- Public screen entry point preserved.
- Navigation routes preserved.
- Marketplace service calls preserved.
- BFF/Supabase boundaries preserved.
- FlatList tuning props preserved.
- Refresh and pagination triggers preserved.
- No visual styling changes.
- No route list expansion.
- No cache enablement.
- No rate-limit changes.

## Gates

- `npm test -- --runInBand tests/market/marketHomeController.decomposition.test.ts tests/perf/flatListTuningBatchB.contract.test.ts tests/api/uiUnsafeCastBatchA.contract.test.ts tests/perf/performance-budget.test.ts` PASS
- `npx tsc --noEmit --pretty false` PASS
- `npx tsx scripts/architecture_anti_regression_suite.ts --json` PASS
- `npx expo lint` PASS
- `npm test -- --runInBand` PASS: 683 suites passed, 1 skipped; 4040 tests passed, 1 skipped
- `git diff --check` PASS
- Artifact JSON parse PASS
- Forbidden-pattern sweep PASS: no `@ts-ignore`, no `as any`, no `catch {}`

Post-push `npm run release:verify -- --json` remains the only gate that must run after push.
