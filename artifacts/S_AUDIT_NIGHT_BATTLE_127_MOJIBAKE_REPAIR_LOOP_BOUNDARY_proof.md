# S Audit Night Battle 127: Mojibake Repair Loop Boundary

## Scope

- Selected `scripts/mojibake_db_repair.ts`.
- Added focused contract `tests/scripts/mojibakeDbRepairLoopBoundary.contract.test.ts`.
- Did not execute the repair script and did not contact Supabase.

## Before

- Fresh search found `scripts/mojibake_db_repair.ts:89` with an unconditional `while (true)`.
- `for (;;)` search found 0 matches.
- The script stopped on empty or short pages, but had no explicit page or row ceiling.
- Select and update errors were already propagated through explicit throws.

## After

- The repair scan uses `for (let pageIndex = 0; pageIndex < MOJIBAKE_REPAIR_MAX_PAGES_PER_TABLE; pageIndex += 1)`.
- Page size remains 500.
- Maximum pages per table: 200.
- Maximum rows per table: 100000.
- Empty or short pages still complete normally.
- A full page at the ceiling now fails closed with an explicit `mojibake_db_repair exceeded page ceiling` error.
- Normalization, patch construction, `.update(patch)`, and `.eq(spec.idColumn, id)` behavior are unchanged.

## Remaining C2 Search Findings

- `while(true)` matches after patch: 15.
- target `scripts/mojibake_db_repair.ts` matches after patch: 0.
- remaining real script loops: 4.
- test-only string guards: 11.
- `for(;;)` matches after patch: 0.

Remaining real script-loop files:

- `scripts/director_parity_check_v1.js`
- `scripts/foreman_warehouse_pdf_android_runtime_verify.ts`
- `scripts/mojibake_elimination_verify.ts`
- `scripts/t1_text_encoding_proof.ts`

## Focused Verification

- `npx jest tests/scripts/mojibakeDbRepairLoopBoundary.contract.test.ts --runInBand`: PASS, 3 tests passed.
- `npx tsc --noEmit --pretty false`: PASS.

## Required Gates

- focused tests: PASS.
- typecheck: PASS.
- lint: PASS.
- full Jest runInBand: PASS.
- architecture scanner: PASS.
- git diff --check: PASS.
- release verify post-push: pending by design until the commit is pushed.

Architecture scanner:

- serviceBypassFindings: 0.
- serviceBypassFiles: 0.
- transportControlledFindings: 175.
- unclassifiedCurrentFindings: 0.

Full Jest:

- Test suites: 661 passed, 1 skipped, 661 of 662 total.
- Tests: 3918 passed, 1 skipped, 3919 total.

## Safety

No production calls, DB writes, migrations, env writes, deploy, OTA, live load tests, Supabase project changes, spend cap changes, Realtime capacity work, force push, tags, secrets printed, empty catch blocks, `@ts-ignore`, broad type casts, weakened scanner/tests/lint, deleted tests, or business-semantics refactor.

Supabase Realtime status: WAITING_FOR_SUPABASE_SUPPORT_RESPONSE
