# S_RUNTIME_03_FOREMAN_SUBCONTRACT_CONTROLLER_HOOK_PRESSURE

final_status: GREEN_FOREMAN_SUBCONTRACT_CONTROLLER_HOOK_PRESSURE_REDUCED

## Selected Files

- `src/screens/foreman/hooks/useForemanSubcontractController.tsx`
- `src/screens/foreman/hooks/useForemanSubcontractControllerUiState.ts`
- `tests/foreman/foreman.subcontractController.decomposition.test.ts`
- `tests/perf/performance-budget.test.ts`

## Reason Selected

The fresh architecture scanner showed `useForemanSubcontractController.tsx` as the highest hook-pressure owner: 50 hook call-sites and 740 lines. This made it the next safe runtime/component architecture target after the BuyerScreen waves.

## Proof

- Extracted UI state, Zustand selectors, router/insets, request-history hook, and pure derived model memoization into `useForemanSubcontractControllerUiState`.
- Preserved owner hook business behavior: save draft, send to director, PDF generation/opening, hydration, request history, Supabase/BFF transport calls, and navigation behavior stayed wired through the same owner flow.
- Added source contracts proving the new boundary owns the UI/store/history/router/insets hooks and that the owner hook budget is now <= 25.
- Updated performance module-count budget to explicitly account for one new permanent Foreman subcontract hook-pressure boundary.

## Metrics

- Before: `useForemanSubcontractController.tsx` = 50 hook call-sites, 25 imports, 740 lines, 25 KB.
- After: `useForemanSubcontractController.tsx` = 25 hook call-sites, 23 imports, 731 lines, 24 KB.
- Delta: -25 hook call-sites, -2 imports, -9 lines, -1 KB.
- New boundary: `useForemanSubcontractControllerUiState.ts` = 27 hook call-sites, 9 imports, 127 lines, 4 KB.

## Gates

- PASS: focused Foreman/perf tests, 4 suites / 22 tests.
- PASS: `npx tsc --noEmit --pretty false`.
- PASS: `npx expo lint`.
- PASS: `npm test -- --runInBand`, 677 suites passed / 1 skipped; 4018 tests passed / 1 skipped.
- PASS: architecture scanner, `GREEN_ARCHITECTURE_ANTI_REGRESSION_SUITE_ADDED`.
- PASS: `git diff --check`.
- PASS: forbidden pattern sweep for `@ts-ignore`, `as any`, and empty `catch {}`.

## Negative Confirmations

No force push, tags, secrets, Supabase project changes, spend cap changes, Realtime load test, destructive/unbounded DML, OTA/EAS/TestFlight/native builds, production mutation route broad enablement, cache route expansion, cache enablement, or rate-limit changes.

Supabase Realtime status: WAITING_FOR_SUPABASE_SUPPORT_RESPONSE.
