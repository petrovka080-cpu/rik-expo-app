# S_NIGHT_UI_19_BUYER_SUBCONTRACT_TAB_RENDER_VIEW_SPLIT

final_status: GREEN_BUYER_SUBCONTRACT_TAB_RENDER_VIEW_SPLIT

## Selected Files
- src/screens/buyer/BuyerSubcontractTab.tsx
- src/screens/buyer/BuyerSubcontractTab.view.tsx
- tests/buyer/buyerSubcontractTab.decomposition.test.ts
- tests/buyer/uiUnsafeCastBatchBRowsModals.contract.test.ts
- tests/perf/performance-budget.test.ts

## Reason Selected
Fresh architecture scanner showed BuyerSubcontractTab as the next buyer UI hook-pressure candidate. This wave only splits render code into a presentational boundary; data lifecycle, existing Supabase usage, pagination, save/submit, and contractor attach logic stay in the root controller.

## Before / After Metrics
- BuyerSubcontractTab before: 650 lines, 27 hooks, 16 imports.
- BuyerSubcontractTab after: 343 lines, 24 hooks, 9 imports.
- New BuyerSubcontractTab.view: 429 lines, 0 hooks, 13 imports.
- Root delta: -307 lines, -3 hooks, -7 imports.

## Gates
- focused tests: PASS (4 suites, 23 tests).
- npx tsc --noEmit --pretty false: PASS.
- npx expo lint: PASS.
- npm test -- --runInBand: PASS (705 passed, 1 skipped; 4120 tests passed, 1 skipped).
- architecture scanner: PASS, GREEN_ARCHITECTURE_ANTI_REGRESSION_SUITE_ADDED.
- git diff --check: PASS.
- artifact JSON parse: PASS.
- post-push npm run release:verify -- --json: pending post-push gate.

## Safety Proof
- No production calls performed.
- No DB writes, migrations, env/config edits, Supabase project changes, cache/rate-limit changes, or Realtime load.
- Architecture scanner safety: productionCalls=false, dbWrites=false, migrations=false, supabaseProjectChanges=false, envChanges=false, secretsPrinted=false.
- Supabase Realtime status: WAITING_FOR_SUPABASE_SUPPORT_RESPONSE.
