# S Audit Night Battle 130: Unsafe Cast Inventory Matrix

## Selected Files
- `artifacts/S_AUDIT_NIGHT_BATTLE_130_UNSAFE_CAST_INVENTORY_MATRIX_matrix.json`
- `artifacts/S_AUDIT_NIGHT_BATTLE_130_UNSAFE_CAST_INVENTORY_MATRIX_proof.md`

## Reason Selected
- This is an inventory and planning wave for H3 unsafe casts.
- No production code was changed because the requested output is a baseline matrix and reduction plan.
- The current tree started clean and synced with `origin/main`.

## Fresh Scan
- Requested commands:
  - `git grep -n "as any" src tests || true`
  - `git grep -n "@ts-ignore" src tests || true`
  - `git grep -n "@ts-expect-error" src tests || true`
  - `git grep -n "unknown as" src tests || true`
- PowerShell compatibility note: this shell rejected literal `|| true`, so the same `git grep` commands were rerun with equivalent `$LASTEXITCODE` handling.
- Raw line counts:
  - `as any`: 25
  - `@ts-ignore`: 2
  - `@ts-expect-error`: 3
  - `unknown as`: 181
  - total raw lines: 211
- Actionable baseline:
  - actual `as any` casts: 19
  - actual `unknown as` casts: 181
  - actual `@ts-ignore` suppressions: 0
  - actual `@ts-expect-error` suppressions: 0
  - total actionable cast-like findings: 200

The prompt referenced 162 unsafe casts. The fresh `src tests` scan is higher: 211 raw lines and 200 actionable cast-like findings after excluding governance-test literal strings. This wave records the fresh baseline rather than forcing a stale count.

## Buckets
- API/transport: 57 findings, high risk. Top files: `src/lib/api/buyer.ts` 7, `src/screens/foreman/foreman.dicts.repo.ts` 6, `src/screens/buyer/buyer.repo.read.transport.ts` 5, `src/screens/director/director.data.ts` 5. Fix type: typed adapter, generic constraint, schema guard.
- auth/session/navigation: 1 finding, medium risk. Top file: `src/screens/profile/ProfileContent.tsx` 1. Fix type: typed adapter or route discriminated union.
- domain services: 19 findings, high risk. Top files: `src/screens/contractor/contractor.workModalService.ts` 7, `src/screens/contractor/contractor.loadWorksService.ts` 5, `src/screens/warehouse/warehouse.stockReports.service.ts` 3. Fix type: schema guard, typed adapter, generic constraint.
- UI props/screens: 6 findings, medium risk. Top files have 1 each: warehouse sheet/screen styles, React19 modal style, Foreman picker/query hooks. Fix type: typed adapter, generic constraint.
- tests/mocks: 112 findings, medium risk. Top files: `src/lib/supabaseClient.test.ts` 7, `src/lib/api/proposals.silentCatch.test.ts` 6, `src/screens/buyer/buyer.status.mutation.test.ts` 5. Fix type: typed mock, typed adapter, discriminated union.
- generated/irreducible: 16 raw findings, 5 actionable and 11 governance literal matches. Top actionable files include `_core`, env cache/RPC helpers, WeakRef polyfill, and mojibake encoding sentinel. Fix type: targeted typed adapter or generic constraint only after local proof.

## Target Counts
- Current raw line findings: 211.
- Current actionable cast-like findings: 200.
- Current production actionable cast-like findings: 88.
- Current test/mock actionable cast-like findings: 112.
- Phase 1 target reduction: 67.
- Phase 1 target actionable cast-like findings: 133.
- Never increase actual `@ts-ignore`, actual `@ts-expect-error`, or production `as any`.

## Highest-Risk Next Slice
- Start with API/transport because 57 findings sit on provider/query/RPC boundaries.
- Recommended first files:
  - `src/lib/api/buyer.ts`
  - `src/lib/api/proposals.ts`
  - `src/screens/buyer/buyer.repo.read.transport.ts`
- Recommended contract: typed query adapter or schema guard tests around selected row-shape boundaries before removing casts.

## Gates
- focused tests: PASS
  - `npx jest tests/governance/type-suppression-audit.test.ts --runInBand`
  - 1 test suite passed; 6 tests passed
- typecheck: PASS
  - `npx tsc --noEmit --pretty false`
- lint: PASS
  - `npx expo lint`
- full Jest runInBand: PASS
  - `npm test -- --runInBand`
  - 666 test suites passed, 1 skipped; 3950 tests passed, 1 skipped
- architecture scanner: PASS
  - `npx tsx scripts/architecture_anti_regression_suite.ts --json`
  - service bypass findings 0, service bypass files 0, transport controlled findings 175, unclassified current findings 0, production raw loop findings 0
- git diff --check: PASS
- release verify post-push: PENDING

## Safety
- No production calls, DB writes, migrations, remote env writes, deploy, OTA, live load tests, Supabase project changes, spend cap changes, Realtime capacity work, force push, tags, secrets printed, empty-catch additions, TypeScript ignore suppressions, unsafe any-casts, scanner weakening, test deletion, or business-semantic refactor.
- Supabase Realtime status: `WAITING_FOR_SUPABASE_SUPPORT_RESPONSE`
