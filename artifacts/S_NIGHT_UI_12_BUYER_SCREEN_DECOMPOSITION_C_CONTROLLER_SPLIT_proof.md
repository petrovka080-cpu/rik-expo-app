# S_NIGHT_UI_12_BUYER_SCREEN_DECOMPOSITION_C_CONTROLLER_SPLIT Proof

final_status: `GREEN_BUYER_SCREEN_DECOMPOSITION_C_CONTROLLER_SPLIT`

## Scope

Selected `src/screens/buyer/BuyerScreen.tsx` because it was the requested UI bottleneck. The wave keeps it as a composition shell and moves the existing orchestration into `src/screens/buyer/hooks/useBuyerScreenController.ts`.

Selected tests were updated only to lock the new owner boundary:

- `tests/buyer/buyerScreenOwnerSplit.decomposition.test.ts`
- `src/screens/buyer/hooks/useBuyerScreenStoreViewModel.test.ts`
- `src/screens/buyer/buyer.observability.test.ts`
- `tests/perf/performance-budget.test.ts`

## Before / After Metrics

| Metric | Before | After | Delta |
| --- | ---: | ---: | ---: |
| BuyerScreen lines | 557 | 8 | -549 |
| BuyerScreen root hook calls | 32 | 1 | -31 |
| BuyerScreen imports | 37 | 3 | -34 |
| BuyerScreen Supabase references | 11 | 0 | -11 |
| BuyerScreen catalog API references | 8 | 0 | -8 |

Targets were met: hook calls decreased by more than 12 and lines decreased by more than 80.

## Boundary Proof

- `BuyerScreen` calls only `useBuyerScreenController()` and renders `BuyerScreenContent`.
- Search/filter state, selected item state, sheet visibility state, loading aggregation, and toast/status orchestration now live behind the typed controller hook.
- Direct provider and catalog API references were removed from `BuyerScreen`.
- `BuyerScreenContent`, chrome model, ui-state, and side-effect boundaries remain unchanged in behavior.
- The performance module budget remains capped: one permanent controller boundary is accounted separately, with the global adjusted limit still locked at 1300.

## Gates

- focused tests: PASS
  `npx jest tests/perf/performance-budget.test.ts tests/buyer/buyerScreenOwnerSplit.decomposition.test.ts src/screens/buyer/hooks/useBuyerScreenStoreViewModel.test.ts src/screens/buyer/buyer.observability.test.ts src/screens/buyer/hooks/useBuyerScreenSideEffects.test.tsx src/screens/buyer/components/BuyerScreenHeader.test.tsx src/screens/buyer/buyer.screen.model.test.ts --runInBand`
- TypeScript: PASS
  `npx tsc --noEmit --pretty false`
- Expo lint: PASS
  `npx expo lint`
- full tests: PASS
  `npm test -- --runInBand`
- architecture scanner: PASS
  `npx tsx scripts/architecture_anti_regression_suite.ts --json`
- diff check: PASS
  `git diff --check`
- artifact JSON parse: PASS
- post-push release verify: PENDING before commit

## Negative Confirmations

- No business logic rewrite.
- No BFF, cache, or rate-limit changes.
- No navigation behavior change.
- No DB writes, migrations, production mutations, load tests, OTA/EAS/TestFlight/native builds, Supabase project changes, spend cap changes, or secrets printed.
- No `@ts-ignore`, no `as any`, and no `catch {}` added.

Supabase Realtime status: `WAITING_FOR_SUPABASE_SUPPORT_RESPONSE`
