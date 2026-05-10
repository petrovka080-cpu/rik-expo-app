# S_NIGHT_UI_14_ACCOUNTANT_SCREEN_DECOMPOSITION_A

final_status: GREEN_ACCOUNTANT_SCREEN_DECOMPOSITION_A

## Selection

Selected files:
- `src/screens/accountant/AccountantScreen.tsx`
- `src/screens/accountant/useAccountantScreenComposition.tsx`
- `src/screens/accountant/components/AccountantScreenView.tsx`
- `src/screens/accountant/useAccountantScreenViewModel.test.ts`
- `src/screens/accountant/accountant.screen.boundaries.test.ts`
- `tests/accountant/accountantScreenDecompositionA.contract.test.ts`
- `tests/api/uiUnsafeCastBatchA.contract.test.ts`
- `tests/perf/performance-budget.test.ts`

Reason selected: `AccountantScreen.tsx` was the next largest UI composition surface and mixed controller state, selected card state, sheet/modal wiring, summary model wiring, and JSX in one component.

## Before And After Metrics

Before:
- `AccountantScreen.tsx` lines: 604
- `AccountantScreen.tsx` hook calls: 32
- `AccountantScreen.tsx` imports: 42
- Dedicated composition hook files: 0
- Dedicated presentational view files: 0

After:
- `AccountantScreen.tsx` lines: 10
- `AccountantScreen.tsx` hook calls: 1
- `AccountantScreen.tsx` imports: 3
- `useAccountantScreenComposition.tsx` lines: 513
- `useAccountantScreenComposition.tsx` hook calls: 33
- `AccountantScreenView.tsx` lines: 318
- `AccountantScreenView.tsx` hook calls: 0

Delta:
- Root lines: -594
- Root hook calls: -31
- Root imports: -39

## Proof

- `AccountantScreen.tsx` is now a composition shell that calls `useAccountantScreenComposition` and renders `AccountantScreenView`.
- `useAccountantScreenComposition` preserves the existing controller/filter/selected-card/sheet/modal/summary wiring behind a typed hook boundary.
- `AccountantScreenView` owns the render tree and has zero hook calls and no transport calls.
- The decomposition contract proves root size, root hook ownership, view hook-free status, and no direct `supabase`, `fetch`, cache, or rate-limit references in root/view.
- Existing accountant boundary and view-model tests were updated to assert the new source contract.
- Performance budget accounts for the two permanent accountant decomposition modules without raising unrelated budgets.

## Gates

- Focused tests: PASS
  - `npx jest tests/api/uiUnsafeCastBatchA.contract.test.ts tests/accountant/accountantScreenDecompositionA.contract.test.ts src/screens/accountant/useAccountantScreenViewModel.test.ts src/screens/accountant/accountant.screen.boundaries.test.ts tests/perf/performance-budget.test.ts --runInBand`
  - 5 suites passed, 23 tests passed.
- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `npm test -- --runInBand`: PASS
  - 700 suites passed, 1 skipped; 4099 tests passed, 1 skipped.
- `npx tsx scripts/architecture_anti_regression_suite.ts --json`: PASS
- `git diff --check`: PASS
- Artifact JSON parse: PASS
- Post-push `npm run release:verify -- --json`: PENDING

## Negative Confirmations

- No accounting business logic changes.
- No transport changes.
- No DB, env, or production calls.
- No production mutation.
- No Supabase project changes.
- No cache or rate-limit changes.
- No route expansion.
- No secrets printed.
- No TypeScript suppressions, unsafe any-casts, or empty catch blocks added.
- No OTA/EAS/TestFlight/native builds.
- No Realtime 50K/60K load.

Supabase Realtime status: WAITING_FOR_SUPABASE_SUPPORT_RESPONSE
