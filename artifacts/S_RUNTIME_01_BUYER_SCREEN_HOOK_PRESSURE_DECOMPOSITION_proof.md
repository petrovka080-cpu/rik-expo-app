# S_RUNTIME_01 BuyerScreen Hook Pressure Decomposition

final_status: GREEN_BUYER_SCREEN_HOOK_PRESSURE_REDUCED

## Selection

Selected `BuyerScreen.tsx` because it was the named architecture-risk hotspot: 61 root hook call-sites and 699 lines at `origin/main`.

Selected `useBuyerScreenUiState.ts` to extract a typed UI-state/view-model boundary around the store selector, FIO state, selection refs, sheet state, RFQ state, tab-scroll safety, search setter, toast, header-collapse values, and request-label preload helpers.

Selected `useBuyerScreenChromeModel.ts` to extract the typed chrome/view-model boundary around `buildBuyerScreenViewModel`, FIO modal opening, header counts, and `useBuyerScreenHeader`.

Selected the focused tests to ratchet the source budget and keep observability, decomposition, and performance-budget proof aligned with the new boundary.

## Before / After

| File | Metric | Before | After | Delta |
| --- | ---: | ---: | ---: | ---: |
| `src/screens/buyer/BuyerScreen.tsx` | root hook call-sites | 61 | 32 | -29 |
| `src/screens/buyer/BuyerScreen.tsx` | lines | 699 | 584 | -115 |
| `src/screens/buyer/BuyerScreen.tsx` | imports | 54 | 37 | -17 |

Target met: reduced root hook call-sites by 29, exceeding the requested 25-call-site reduction.

## Gates

PASS: focused BuyerScreen tests:

`npm test -- --runInBand src/screens/buyer/buyer.observability.test.ts tests/perf/performance-budget.test.ts tests/buyer/buyerScreenOwnerSplit.decomposition.test.ts src/screens/buyer/hooks/useBuyerScreenStoreViewModel.test.ts src/screens/buyer/buyer.screen.model.test.ts src/screens/buyer/hooks/useBuyerScreenSideEffects.test.tsx src/screens/buyer/components/BuyerScreenHeader.test.tsx`

Result: 7 suites passed, 34 tests passed.

PASS: `npx tsc --noEmit --pretty false`

PASS: `npx expo lint`

PASS: `npx tsx scripts/architecture_anti_regression_suite.ts --json`

Scanner evidence: direct Supabase service bypass findings 0; service bypass files 0; unclassified current findings 0; BuyerScreen component-debt report now shows hookCount 32 and lineCount 584.

PASS: `git diff --check`

PASS: touched-surface forbidden-pattern scan found no `@ts-ignore`, no `as any`, and no empty `catch {}`.

PASS: `npm test -- --runInBand`

Result: 676 suites passed, 1 skipped; 4013 tests passed, 1 skipped.

Pending until after commit/push: `npm run release:verify -- --json`.

## Negative Confirmations

No behavior, navigation, visual, BFF, Supabase, cache, route-enablement, rate-limit, production mutation, spend-cap, OTA/EAS/TestFlight/native build, destructive DML, force-push, tag, `@ts-ignore`, `as any`, or empty-catch changes were made.

Supabase Realtime remains WAITING_FOR_SUPABASE_SUPPORT_RESPONSE.
