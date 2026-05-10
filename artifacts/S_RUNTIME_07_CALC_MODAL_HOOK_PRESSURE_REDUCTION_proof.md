# S_RUNTIME_07_CALC_MODAL_HOOK_PRESSURE_REDUCTION

final_status: GREEN_CALC_MODAL_HOOK_PRESSURE_REDUCED

## Selected Files

- `src/components/foreman/CalcModal.tsx`
- `src/components/foreman/useCalcModalController.ts`
- `tests/foreman/calcModalController.decomposition.test.ts`
- `tests/api/calcModalRpcTransportBoundary.contract.test.ts`
- `tests/security/sPii1LogRedaction.contract.test.ts`
- `tests/perf/performance-budget.test.ts`

## Reason Selected

The fresh architecture scanner showed `CalcModal.tsx` as the highest remaining TSX hook-pressure owner: 41 hook call-sites. This made it the next safe runtime/component architecture target after the BuyerItemRow reduction.

## Proof

- Extracted keyboard height tracking, toast animation state, form state, field synchronization, parse/run validation, row quantity handlers, RPC calculation, redacted diagnostics, and add-to-request flow into `useCalcModalController`.
- Kept `CalcModal.tsx` as a thin `Modal` and `CalcModalContent` render shell.
- Preserved public props, `CalcModalContent` props, calculation RPC transport boundary, payload summary redaction, close/back semantics, calculate/send semantics, and field validation semantics.
- Updated RPC/redaction source contracts to follow the new controller owner.
- Updated the performance module-count budget for exactly one permanent CalcModal controller boundary.

## Metrics

- `CalcModal.tsx` hook call-sites: 41 -> 1.
- `CalcModal.tsx` lines: 478 -> 24.
- `CalcModal.tsx` imports: 12 -> 4.
- `CalcModal.tsx` size: 13 KB -> 1 KB.
- New boundary `useCalcModalController.ts`: 43 hook call-sites, 485 lines, 13 KB.
- Architecture scanner hook-pressure component count: 7 -> 6.
- `CalcModal.tsx` is no longer in the scanner top hook-pressure list.

## Gates

- PASS: focused CalcModal/controller/RPC/redaction/perf tests, 7 suites / 35 tests.
- PASS: `npx tsc --noEmit --pretty false`.
- PASS: `npx expo lint`.
- PASS: `npm test -- --runInBand`, 682 suites passed / 1 skipped; 4036 tests passed / 1 skipped.
- PASS: architecture scanner, `GREEN_ARCHITECTURE_ANTI_REGRESSION_SUITE_ADDED`.
- PASS: `git diff --check`.
- PASS: forbidden-pattern sweep for type-ignore directives, unsafe any casts, and empty catch blocks.
- PASS: artifact JSON parse.
- PENDING_POST_PUSH: `npm run release:verify -- --json`.

## Negative Confirmations

No force push, tags, secrets, type-ignore directive, unsafe any cast, empty catch block, broad rewrite, Supabase project changes, spend cap changes, Realtime load test, destructive/unbounded DML, OTA/EAS/TestFlight/native builds, production mutation route broad enablement, cache enablement/route expansion, or rate-limit changes.

Supabase Realtime status: WAITING_FOR_SUPABASE_SUPPORT_RESPONSE.
