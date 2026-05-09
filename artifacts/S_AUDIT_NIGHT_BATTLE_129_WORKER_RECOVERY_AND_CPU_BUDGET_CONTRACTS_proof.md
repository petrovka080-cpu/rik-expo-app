# S Audit Night Battle 129: Worker Recovery And CPU Budget Contracts

## Selected Files
- `src/lib/async/mapWithConcurrencyLimit.ts`
- `tests/async/cancellableWorkerLoop.test.ts`
- `src/workers/queueWorker.ts`
- `src/workers/queueWorker.boundary.test.ts`
- `tests/perf/performance-budget.test.ts`

## Reason Selected
- The cancellable worker loop primitive is the shared contract for worker cancellation, recovery backoff, and no-spin behavior.
- `queueWorker.ts` is the production owner using that primitive, so cleanup idempotency belongs at the handle boundary.
- Existing performance budget tests can carry a static worker loop CPU-spin budget without adding runtime load or production calls.

## Before
- Primitive tests covered basic abort, max iterations, transient backoff, fatal errors, and quick-task sleep.
- The production queue worker could call cleanup side effects more than once if `stop()` was invoked repeatedly.
- No perf-budget assertion explicitly tied worker loops to nonzero sleep/backoff budgets.

## After
- Added controlled-clock primitive contracts for:
  - fast success loops waiting for sleep before the next iteration
  - repeated recoverable failures using `errorBackoffMs`
  - abort during sleep exiting cleanly
  - abort during an active task exiting after the task boundary
- Made `QueueWorkerHandle.stop()` idempotent with an early return after the first stop.
- Added a boundary test proving repeated stop calls only stop metrics once.
- Added a performance budget assertion that production queue workers stay on the cancellable loop and nonzero backoff path.

## Gates
- focused tests: PASS
  - `npx jest tests/async/cancellableWorkerLoop.test.ts src/workers/queueWorker.boundary.test.ts tests/workers/queueRunnerLifecycle.contract.test.ts src/lib/entry/rootLayout.recovery.test.tsx tests/perf/performance-budget.test.ts --runInBand`
  - 5 test suites passed; 53 tests passed
- typecheck: PASS
  - `npx tsc --noEmit --pretty false`
- lint: PASS
  - `npx expo lint`
- full Jest runInBand: PASS
  - `npm test -- --runInBand`
  - 666 test suites passed, 1 skipped; 3947 tests passed, 1 skipped
- architecture scanner: PASS
  - `npx tsx scripts/architecture_anti_regression_suite.ts --json`
  - service bypass findings 0, service bypass files 0, transport controlled findings 175, unclassified current findings 0, production raw loop findings 0
- git diff --check: PASS
- release verify post-push: PENDING

## Safety
- No production calls, DB writes, migrations, remote env writes, deploy, OTA, live load tests, Supabase project changes, spend cap changes, Realtime capacity work, force push, tags, secrets printed, empty catch blocks, TypeScript ignore suppressions, unsafe any-casts, scanner weakening, test deletion, or business-semantic refactor.
- Supabase Realtime status: `WAITING_FOR_SUPABASE_SUPPORT_RESPONSE`
