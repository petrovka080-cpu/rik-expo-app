# S Audit Night Battle 125: Worker While True Inventory

## Scope

- Inventory only for audit risk C2.
- No production code rewrite in this wave.
- No production calls, DB writes, migrations, env writes, deploy, OTA, live load tests, Supabase project settings, spend caps, or Realtime capacity work.

## Fresh Search

- `git grep -n "while *(true" src tests scripts`: PASS
- `git grep -n "for *(;;" src tests scripts`: PASS, no findings

## Finding Summary

- Real loop findings: 6
- Production worker findings: 1
- Test-only string guards: 10
- Mock loops: 0
- `for(;;)` findings: 0

## Production Worker Finding

| File | Line | Classification | Cancellation | Backoff | Max Retry Or Idle Wait | Error Handling | Shutdown |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `scripts/run-queue-worker.ts` | 62 | production worker | partial: SIGINT/SIGTERM call `stop()` and exit; inner worker has a stopped flag | yes: 5000ms bootstrap crash sleep; inner worker idle/error sleep | idle wait exists; no max bootstrap restart count | yes: bootstrap catch logs; inner worker records boundary failure | yes: signal handlers |

Highest-risk worker for next wave:

- `scripts/run-queue-worker.ts`
- Reason: it is the only production worker finding from the required search and its runner-level restart loop is unconditional.

## Non-Worker Real Loops

| File | Line | Classification | Termination | Risk |
| --- | ---: | --- | --- | --- |
| `scripts/director_parity_check_v1.js` | 192 | bounded/retry loop | empty page, short page, hard offset guard | P2, production read script if run |
| `scripts/foreman_warehouse_pdf_android_runtime_verify.ts` | 177 | false positive | bounded string scan with monotonic index | P4 |
| `scripts/mojibake_db_repair.ts` | 89 | bounded/retry loop | page exhaustion only | P1, production DB write script if run; not a worker |
| `scripts/mojibake_elimination_verify.ts` | 127 | bounded/retry loop | page exhaustion only | P2, production read script if run |
| `scripts/t1_text_encoding_proof.ts` | 176 | bounded/retry loop | page exhaustion only | P2, production read script if run |

## Test-Only Guards

The remaining matches are contract assertions that prevent unbounded pagination loops in API source files:

- `tests/api/buyerInboxFullScanSafeRouting.contract.test.ts:23`
- `tests/api/directorReportsAggregationContracts.contract.test.ts:139`
- `tests/api/fetchAllUnboundedReadsCloseout.contract.test.ts:35`
- `tests/api/fetchAllUnboundedReadsCloseout.contract.test.ts:47`
- `tests/api/fetchAllUnboundedReadsCloseout.contract.test.ts:48`
- `tests/api/referenceListPageCeiling.contract.test.ts:17`
- `tests/api/referenceListPageCeiling.contract.test.ts:25`
- `tests/api/topListPaginationBatch5A.contract.test.ts:55`
- `tests/api/topListPaginationBatch6.contract.test.ts:132`
- `tests/api/warehouseLifecycleAndDictsUnboundedPaginationCloseout.contract.test.ts:17`
- `tests/api/warehouseLifecycleAndDictsUnboundedPaginationCloseout.contract.test.ts:61`

## Focused Verification

- `npx jest src/workers/queueWorker.boundary.test.ts --runInBand`: PASS, 4 tests passed
- `npx tsc --noEmit --pretty false`: PASS

## Required Gates

- focused tests: PASS
- typecheck: PASS
- lint: PASS
- full Jest runInBand: PASS
- architecture scanner: PASS
- git diff --check: PASS
- release verify post-push: PENDING

Architecture scanner:

- serviceBypassFindings: 0
- serviceBypassFiles: 0
- transportControlledFindings: 175
- unclassifiedCurrentFindings: 0

Full Jest:

- Test suites: 659 passed, 1 skipped, 659 of 660 total
- Tests: 3912 passed, 1 skipped, 3913 total

## Safety

No production calls, DB writes, migrations, env writes, deploy, OTA, live load tests, Supabase project changes, spend cap changes, Realtime capacity work, force push, tags, secrets printed, empty catch blocks, `@ts-ignore`, broad type casts, weakened scanner/tests/lint, deleted tests, or business-semantics refactor.

Supabase Realtime status: WAITING_FOR_SUPABASE_SUPPORT_RESPONSE
