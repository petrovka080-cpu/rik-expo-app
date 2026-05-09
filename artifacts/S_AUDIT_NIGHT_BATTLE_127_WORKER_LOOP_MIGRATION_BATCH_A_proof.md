# S Audit Night Battle 127: Worker Loop Migration Batch A

## Scope

- Top-priority worker from wave 125: `scripts/run-queue-worker.ts`.
- Production implementation reached by the runner: `src/workers/queueWorker.ts`.
- No production calls, DB writes, migrations, remote env writes, deploy, OTA, live load tests, Supabase project settings, spend caps, or Realtime capacity work.

## Fresh Scan

- `git grep -n "while *(true" src tests scripts`: PASS.
- `git grep -n "for *(;;" src tests scripts`: PASS, no findings.
- Remaining `while(true)` matches are not production worker loops:
  - `scripts/director_parity_check_v1.js:192`
  - `scripts/foreman_warehouse_pdf_android_runtime_verify.ts:177`
  - test-only source guards.

## Selection

Wave 125 selected `scripts/run-queue-worker.ts` as the highest-risk worker. This wave migrated:

- `scripts/run-queue-worker.ts`: runner bootstrap lifecycle now uses `runCancellableWorkerLoop`.
- `src/workers/queueWorker.ts`: queue polling implementation now uses `runCancellableWorkerLoop`.

## Before

- Runner used a direct `while(!stopped)` bootstrap loop.
- Runner slept with local `sleep(restartBackoffMs)` after bootstrap errors.
- Worker used a direct `while(!stopped)` polling loop.
- Worker slept directly for idle, error, and compaction delay.

## After

- Runner uses `runCancellableWorkerLoop` with `AbortController`.
- Runner preserves `restartBackoffMs`, `maxBootstrapRestarts`, exit-code behavior, and crash logging.
- Worker uses `runCancellableWorkerLoop` with `AbortController`.
- Worker preserves `pollIdleMs`, `compactionDelayMs`, batch size, concurrency, queue API calls, logging, and `worker_loop_failed` observability.
- Public worker API remains the same: `stop(): void`.

## Focused Verification

- `npx jest tests/workers/queueRunnerLifecycle.contract.test.ts src/workers/queueWorker.boundary.test.ts tests/async/cancellableWorkerLoop.test.ts tests/scale/sQueue1Backpressure.contract.test.ts tests/scale/s50kQueueRuntimeAdapter2.contract.test.ts --runInBand`: PASS, 5 suites passed, 29 tests passed.

Covered:

- worker starts
- worker processes one unit
- worker stops on abort
- transient claim error backs off without spinning
- cleanup stop is called
- runner uses cancellable loop primitive
- worker primitive tests remain green

## Required Gates

- focused tests: PASS
- typecheck: PASS
- lint: PASS
- full Jest runInBand: PASS
- architecture scanner: PASS
- git diff --check: PASS
- release verify post-push: PASS

Full Jest:

- `npm test -- --runInBand`: PASS
- Test suites: 663 passed, 1 skipped, 663 of 664 total
- Tests: 3932 passed, 1 skipped, 3933 total

Architecture scanner:

- `npx tsx scripts/architecture_anti_regression_suite.ts --json`: PASS
- serviceBypassFindings: 0
- serviceBypassFiles: 0
- transportControlledFindings: 175
- unclassifiedCurrentFindings: 0

Post-push release verify:

- `npm run release:verify -- --json`: PASS
- head commit: `844e20486d187b27b964a5fec1819918d62571f4`
- origin/main commit: `844e20486d187b27b964a5fec1819918d62571f4`
- repo sync status: synced
- worktree clean: true
- head matches origin/main: true
- release gates: tsc, expo-lint, architecture-anti-regression, jest-run-in-band, jest, git-diff-check
- OTA disposition: allow
- otaPublished: false
- easUpdateTriggered: false
- easBuildTriggered: false
- easSubmitTriggered: false

## Safety

No production calls, DB writes, migrations, env writes, deploy, OTA, live load tests, Supabase project changes, spend cap changes, Realtime capacity work, force push, tags, secrets printed, empty catch blocks, type suppression comments, broad type escape casts, weakened scanner/tests/lint, deleted tests, or business-semantics refactor.

Supabase Realtime status: WAITING_FOR_SUPABASE_SUPPORT_RESPONSE
