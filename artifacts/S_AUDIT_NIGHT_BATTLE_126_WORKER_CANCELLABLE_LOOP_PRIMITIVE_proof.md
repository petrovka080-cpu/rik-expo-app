# S Audit Night Battle 126: Worker Cancellable Loop Primitive

## Scope

- Added the shared primitive in `src/lib/async/mapWithConcurrencyLimit.ts`.
- Added focused tests in `tests/async/cancellableWorkerLoop.test.ts`.
- Did not connect the primitive to any concrete worker in this wave.

## Location Choice

- `src/workers` contains concrete queue worker implementations.
- `src/lib/async` already contains reusable async primitives.
- The primitive was placed in the existing `src/lib/async/mapWithConcurrencyLimit.ts` module to avoid increasing the production source module count budget.

## Before

- Worker loops had no shared cancellable primitive.
- Cancellation, backoff, and loop bounding were handled per worker or per script.
- A first new-source-file attempt failed the performance budget with source module count `1302 > 1300`.

## After

- New primitive: `runCancellableWorkerLoop`.
- Abort support through `AbortSignal`.
- Sleep/backoff through injectable `WorkerLoopClock`.
- Test-only bounded mode through `testMode.maxIterations`.
- Explicit `onError` hook with `continue`, `stop`, and `throw` decisions.
- Explicit `shouldStop` stop condition.
- No busy spin: continuing iterations sleep with at least `MIN_WORKER_LOOP_BACKOFF_MS`.
- Fatal errors throw by default and are not silently swallowed.
- Concrete worker behavior is unchanged.
- Performance budget passes without weakening the budget.

## Focused Verification

- `npx jest tests/async/cancellableWorkerLoop.test.ts src/lib/async/mapWithConcurrencyLimit.test.ts src/workers/queueWorker.boundary.test.ts tests/workers/queueRunnerLifecycle.contract.test.ts tests/perf/performance-budget.test.ts --runInBand`: PASS, 5 suites passed, 33 tests passed.
- `npx tsc --noEmit --pretty false`: PASS.

Covered primitive cases:

- exits on abort.
- respects `testMode.maxIterations`.
- backs off after transient error.
- does not swallow fatal error silently.
- does not run tight loop when task returns quickly.
- honors stop condition.

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

- Test suites: 662 passed, 1 skipped, 662 of 663 total.
- Tests: 3924 passed, 1 skipped, 3925 total.

## Safety

No production calls, DB writes, migrations, env writes, deploy, OTA, live load tests, Supabase project changes, spend cap changes, Realtime capacity work, force push, tags, secrets printed, empty catch blocks, `@ts-ignore`, broad type casts, weakened scanner/tests/lint, deleted tests, or business-semantics refactor.

Supabase Realtime status: WAITING_FOR_SUPABASE_SUPPORT_RESPONSE
