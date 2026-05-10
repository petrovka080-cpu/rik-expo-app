# S_RUNTIME_06_BUYER_ITEM_ROW_HOOK_PRESSURE_REDUCTION

final_status: GREEN_BUYER_ITEM_ROW_HOOK_PRESSURE_REDUCED

## Selected Files

- `src/screens/buyer/components/BuyerItemRow.tsx`
- `src/screens/buyer/hooks/useBuyerItemEditorModel.ts`
- `tests/buyer/buyerItemRowEditorModel.contract.test.ts`
- `tests/perf/performance-budget.test.ts`

## Reason Selected

The fresh architecture scanner showed `BuyerItemRow.tsx` as the highest hook-pressure TSX owner after the already green BuyerScreen and FlatList waves: 43 hook call-sites and 722 lines. This made it the next narrow runtime/component architecture target.

## Proof

- Extracted BuyerItemEditor state, effects, memoized styles, supplier picker state, price/note commit handlers, and supplier selection reset scheduling into `useBuyerItemEditorModel`.
- Kept `BuyerItemRow.tsx` focused on rendering, supplier list render callbacks, FlatList tuning constants, typed props, and the existing `React.memo` comparator.
- Preserved public props, row identity, list tuning, supplier picker behavior, note merge behavior, price commit behavior, and row memo comparison semantics.
- Added a source contract proving the editor model boundary owns state/effects while `BuyerItemRow.tsx` stays under the hook budget.
- Updated the performance module-count budget for exactly one permanent BuyerItemRow editor view-model boundary.

## Metrics

- `BuyerItemRow.tsx` hook call-sites: 43 -> 3.
- `BuyerItemRow.tsx` lines: 722 -> 545.
- `BuyerItemRow.tsx` size: 25 KB -> 17 KB.
- `BuyerItemRow.tsx` imports: 10 -> 11.
- New boundary `useBuyerItemEditorModel.ts`: 44 hook call-sites, 323 lines, 11 KB.
- Architecture scanner hook-pressure component count: 8 -> 7.
- `BuyerItemRow.tsx` is no longer in the scanner top hook-pressure list.

## Gates

- PASS: focused BuyerItemRow/list/perf tests, 5 suites / 26 tests.
- PASS: `npx tsc --noEmit --pretty false`.
- PASS: `npx expo lint`.
- PASS: `npm test -- --runInBand`, 681 suites passed / 1 skipped; 4033 tests passed / 1 skipped.
- PASS: architecture scanner, `GREEN_ARCHITECTURE_ANTI_REGRESSION_SUITE_ADDED`.
- PASS: `git diff --check`.
- PASS: forbidden-pattern sweep for type-ignore directives, unsafe any casts, and empty catch blocks.
- PASS: artifact JSON parse.
- PENDING_POST_PUSH: `npm run release:verify -- --json`.

## Negative Confirmations

No force push, tags, secrets, type-ignore directive, unsafe any cast, empty catch block, broad rewrite, Supabase project changes, spend cap changes, Realtime load test, destructive/unbounded DML, OTA/EAS/TestFlight/native builds, production mutation route broad enablement, cache enablement/route expansion, or rate-limit changes.

Supabase Realtime status: WAITING_FOR_SUPABASE_SUPPORT_RESPONSE.
