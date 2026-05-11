# S_NIGHT_UI_20_PROP_STABILITY_RENDER_CONTRACT Proof

final_status: GREEN_PROP_STABILITY_RENDER_CONTRACT

## Scope

This wave tightened render prop stability without changing transport, cache, rate-limit, DB, Supabase, navigation, or production mutation behavior.

Selected files:

- `src/features/market/MarketHomeScreen.tsx`
- `src/features/market/components/MarketHomeFeedCardCell.tsx`
- `src/features/market/useMarketHomeController.ts`
- `src/features/chat/ChatScreen.tsx`
- `src/screens/contractor/components/ContractorSubcontractsList.tsx`
- `src/features/market/marketCleanup.contract.test.tsx`
- `tests/market/marketHomeController.decomposition.test.ts`
- `tests/perf/flatListTuningBatchB.contract.test.ts`
- `tests/perf/performance-budget.test.ts`
- `tests/perf/propStabilityRenderContract.contract.test.ts`

Reason selected:

- Market feed rows had inline item callbacks. The screen also owned refresh/end/banner wrappers, which would have made new stability hooks count against the existing MarketHome render-shell budget.
- Chat thread rows had an inline long-press delete closure inside the heavy message row.
- Contractor subcontract rows had inline `renderItem`, inline row callback, and inline row/list chrome.
- Buyer, Director, Accountant, and OfficeHub already had stable render boundaries from prior waves; this wave locks those source contracts.

## Before / After Metrics

Source totals:

- lines: 1570 -> 1726
- hook call sites: 57 -> 83
- `React.memo` count in selected source files: 1 -> 4
- heavy-row inline markers: 7 -> 0

Key file metrics:

- `MarketHomeScreen.tsx`: hooks 3 -> 3; heavy-row inline markers 4 -> 0; lines 397 -> 388
- `MarketHomeFeedCardCell.tsx`: new memoized row cell; lines 0 -> 53; `React.memo` 0 -> 1
- `ChatScreen.tsx`: heavy-row inline markers 1 -> 0; `React.memo` 0 -> 1
- `ContractorSubcontractsList.tsx`: heavy-row inline markers 2 -> 0; `React.memo` 1 -> 2

Performance budget update:

- `tests/perf/performance-budget.test.ts` now documents and subtracts exactly one `S_NIGHT_UI_20` MarketHome feed-card extraction from the source module budget, keeping the effective budget at 1300.

## Contracts Proven

- Stable key extractors: Market, Chat, Contractor, Buyer, Director, Accountant list, and OfficeHub shell contracts.
- Stable `renderItem` where safe: Market feed, Chat thread, Contractor subcontract list, Buyer item row, Accountant list block, Director lists.
- Stable empty/header/footer/list chrome: existing contracts locked; Contractor list chrome memoized.
- No new inline closures in touched heavy list items.
- Style objects extracted or memoized in touched heavy rows.
- No new provider calls, transport calls, cache changes, rate-limit changes, DB writes, or environment changes.

## Gates

- Focused tests: PASS
  - `npm test -- --runInBand tests/perf/performance-budget.test.ts tests/perf/propStabilityRenderContract.contract.test.ts tests/market/marketHomeController.decomposition.test.ts`
- TypeScript: PASS
  - `npx tsc --noEmit --pretty false`
- Expo lint: PASS
  - `npx expo lint`
- Full tests: PASS
  - `npm test -- --runInBand`
  - Summary: 708 passed, 1 skipped, 4135 passed, 1 skipped
- Architecture scanner: PASS
  - `npx tsx scripts/architecture_anti_regression_suite.ts --json`
  - Direct Supabase service bypass: 0
- Diff check: PASS
  - `git diff --check`
- Artifact JSON parse: pending at artifact creation; run after this file is written.
- Post-push release verify: pending post-push.

## Negative Confirmations

- No force push.
- No tags.
- No secrets printed.
- No TypeScript ignore comments added.
- No type-erasure casts added.
- No empty catches added.
- No broad rewrite.
- No Supabase project changes.
- No spend cap changes.
- No Realtime 50K/60K load.
- No destructive or unbounded DML.
- No OTA/EAS/TestFlight/native builds.
- No production mutation route broad enablement.
- No broad cache enablement.
- No broad rate-limit enablement.

Supabase Realtime status: WAITING_FOR_SUPABASE_SUPPORT_RESPONSE
