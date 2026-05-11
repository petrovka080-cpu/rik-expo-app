# S_NIGHT_ERROR_23_ERROR_HANDLING_GAP_BATCH_B_RATCHET

final_status: GREEN_ERROR_HANDLING_GAP_BATCH_B_RATCHET

## Scope

- Selected from Batch A deferred files: `director_reports.naming.ts`, `pdfDocumentActions.ts`, `pdfRunner.ts`, and `useContractorProgressReliability.ts`.
- No business logic rewrite, no transport changes, no PDF lifecycle behavior change, and no contractor offline queue semantic change.
- Director naming runtime code remains untouched because older pagination/load guardrails explicitly protect that skipped surface.

## Deterministic Proof

- `scripts/error/errorHandlingGapRatchet.ts` scans the four deferred target files.
- try/finally-only blocks require owner, reason, migration path, and redacted-observability proof.
- Catch blocks must either throw or emit through an approved redacted observability boundary.
- Raw `console.warn`/`console.error` sinks introduced in target catch bodies fail unless the line uses a redaction-safe value.
- The architecture suite now includes `error_handling_gap_ratchet`.

## Metrics

- Before: 4 deferred Batch A files, no targeted ratchet.
- After: 4 target files closed or explicitly documented.
- After: 9 try/finally-only blocks documented, 0 undocumented.
- After: 15 catch blocks scanned, 0 missing signal, 0 empty catch blocks, 0 raw diagnostic sinks.
- After: targeted silent swallow = 0.

## Focused Tests

- `npm test -- --runInBand tests/error/errorHandlingGapRatchet.contract.test.ts tests/error/tryCatchGapsBatchA.contract.test.ts tests/observability/noSilentRuntimeCatch.test.ts`
- Result: PASS, 3 suites, 15 tests.

## Architecture

- `npx tsx scripts/architecture_anti_regression_suite.ts --json`
- Result: PASS.
- New check: `error_handling_gap_ratchet`.

## Safety

- No production calls.
- No DB writes.
- No migrations.
- No Supabase project changes.
- No cache or rate-limit changes.
- No secrets printed.
- Supabase Realtime status: WAITING_FOR_SUPABASE_SUPPORT_RESPONSE.
