# S_AUDIT_NIGHT_BATTLE_138_UNSAFE_CAST_API_SUPPLIERS_GUARDED_PAGED_QUERY

## Scope

Selected files:
- `src/lib/api/suppliers.ts`
- `tests/api/suppliersGuardedPagedQuery.contract.test.ts`
- `scripts/architecture_anti_regression_suite.ts`

Reason selected:
- Fresh ratchet scan showed production unsafe unknown casts concentrated in critical `src/lib/api`.
- `src/lib/api/suppliers.ts` had three paged-query casts that could be replaced by the existing guarded paged-query adapter.
- The change is narrow: only supplier list/file paged reads and the ratchet baseline for the proven reduction.

## Before

- Unsafe-cast ratchet total: 192.
- Production unsafe-cast count: 49.
- `src/lib/api` unsafe unknown casts: 27.
- `src/lib/api/suppliers.ts` paged-query unsafe unknown casts: 3.
- Legacy local `PagedSupplierQuery` was used to force provider query chains into the paged loader shape.

## After

- Unsafe-cast ratchet total: 189.
- Production unsafe-cast count: 46.
- `src/lib/api` unsafe unknown casts: 24.
- `src/lib/api/suppliers.ts` paged-query unsafe unknown casts: 0.
- `listSuppliers` and `listSupplierFiles` now wrap provider query chains with `createGuardedPagedQuery`.
- Supplier rows and supplier file metadata rows are guarded by explicit DTO guards.
- No allowlist entry was added.

## Contract Coverage

- `tests/api/suppliersGuardedPagedQuery.contract.test.ts` confirms guarded supplier reads.
- The test rejects malformed supplier rows safely.
- The test preserves provider errors.
- The test keeps null and undefined paged payload handling as empty reads.
- The test covers supplier file metadata row guarding.
- The test confirms the old supplier paged-query cast and `PagedSupplierQuery` type do not return.

## Scanner Evidence

Fresh architecture scanner after the change:
- service bypass findings: 0.
- service bypass files: 0.
- transport-controlled findings: 175.
- unclassified direct Supabase findings: 0.
- unsafe-cast ratchet current total: 189.
- critical `src/lib/api` unsafe unknown casts: 24.

Target scan:
- Command: `rg -n "\bunknown\s+as\b|\bas\s+any\b|@ts-ignore|catch\s*\{\}" src\lib\api\suppliers.ts tests\api\suppliersGuardedPagedQuery.contract.test.ts`
- Result: no matches.

## Gates

- Focused tests: PASS.
  - `npm test -- --runInBand tests/api/suppliersGuardedPagedQuery.contract.test.ts tests/api/supplierFilesListDefaultLimit.contract.test.ts tests/api/guardedPagedQueryTransport.contract.test.ts tests/architecture/architectureAntiRegressionSuite.test.ts`
- Typecheck: PASS.
  - `npx tsc --noEmit --pretty false`
- Lint: PASS.
  - `npx expo lint`
- Full Jest runInBand: PASS.
  - `npm test -- --runInBand`
  - 671 passed, 1 skipped, 672 total suites.
  - 3987 passed, 1 skipped, 3988 total tests.
- Architecture scanner: PASS.
  - `npx tsx scripts/architecture_anti_regression_suite.ts --json`
- `git diff --check`: PASS.
- Release verify post-push: pending post-push run.

## Negative Confirmations

No production calls, DB writes, migrations, env writes, deploy, OTA, live load tests, cache/rate-limit production enablement, Supabase project changes, spend cap changes, Realtime capacity work, force push, tags, secrets printed, empty catch blocks, ts-ignore, as-any casts, scanner weakening, test deletion, or business-semantic refactor.

Supabase Realtime status: WAITING_FOR_SUPABASE_SUPPORT_RESPONSE.
