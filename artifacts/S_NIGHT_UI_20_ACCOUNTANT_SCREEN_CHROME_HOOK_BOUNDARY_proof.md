# S_NIGHT_UI_20_ACCOUNTANT_SCREEN_CHROME_HOOK_BOUNDARY

final_status: GREEN_ACCOUNTANT_SCREEN_CHROME_HOOK_BOUNDARY

## Selected Files
- src/screens/accountant/useAccountantScreenComposition.tsx
- src/screens/accountant/useAccountantScreenChromeModel.ts
- tests/accountant/accountantScreenDecompositionA.contract.test.ts
- tests/api/uiUnsafeCastBatchA.contract.test.ts
- tests/perf/performance-budget.test.ts

## Reason Selected
Fresh architecture scanner showed AccountantScreen composition as the top UI hook-pressure file. This wave extracts only UI chrome state into a typed hook boundary; payments, documents, realtime lifecycle, transport, data loading, and business actions remain untouched.

## Before / After Metrics
- useAccountantScreenComposition before: 514 lines, 33 hooks, 29 imports.
- useAccountantScreenComposition after: 485 lines, 24 hooks, 25 imports.
- New useAccountantScreenChromeModel: 67 lines, 10 hooks, 6 imports.
- Component debt: hookPressureComponentCount 2 -> 1; godComponentCount 25 -> 24.

## Gates
- focused tests: PASS (5 suites, 24 tests).
- npx tsc --noEmit --pretty false: PASS.
- npx expo lint: PASS.
- npm test -- --runInBand: PASS (705 passed, 1 skipped; 4121 tests passed, 1 skipped).
- architecture scanner: PASS, GREEN_ARCHITECTURE_ANTI_REGRESSION_SUITE_ADDED.
- git diff --check: PASS.
- artifact JSON parse: PASS.
- post-push npm run release:verify -- --json: pending post-push gate.

## Safety Proof
- No production calls performed.
- No DB writes, migrations, env/config edits, Supabase project changes, cache/rate-limit changes, or Realtime load.
- Architecture scanner safety: productionCalls=false, dbWrites=false, migrations=false, supabaseProjectChanges=false, envChanges=false, secretsPrinted=false.
- Supabase Realtime status: WAITING_FOR_SUPABASE_SUPPORT_RESPONSE.
