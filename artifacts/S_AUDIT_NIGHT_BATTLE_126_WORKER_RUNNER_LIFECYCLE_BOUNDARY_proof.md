# S Audit Night Battle 126: Worker Runner Lifecycle Boundary

## Scope

- Selected `scripts/run-queue-worker.ts`.
- Added focused contract `tests/workers/queueRunnerLifecycle.contract.test.ts`.
- Did not change queue job processing semantics in `src/workers/queueWorker.ts`.

## Before

- Fresh search found `scripts/run-queue-worker.ts:62` with `while (true)`.
- `for (;;)` search found 0 matches.
- Runner had bootstrap crash backoff, but no explicit max bootstrap restart policy.
- Runner stop path had a silent catch.

## After

- Runner loop is `while (!stopped)`.
- SIGINT/SIGTERM still call `stop()` and exit.
- Bootstrap restart backoff is explicit and clamped:
  - default: 5000 ms
  - min: 1000 ms
  - max: 60000 ms
  - env override: `QUEUE_RUNNER_BOOTSTRAP_RESTART_BACKOFF_MS`
- Bootstrap restart count is explicit and clamped:
  - default: 20
  - min: 1
  - max: 100
  - env override: `QUEUE_RUNNER_MAX_BOOTSTRAP_RESTARTS`
- Restart limit sets `process.exitCode = 1` and stops the runner.
- Stop failures are logged with a typed message instead of being silently swallowed.
- Fresh grep no longer finds `scripts/run-queue-worker.ts` in the `while(true)` search.

## Remaining C2 Search Findings

- `while(true)` matches after patch: 16
- production worker `while(true)` matches after patch: 0
- remaining real script loops: 5, all non-worker findings from the previous inventory
- test-only string guards: 11
- `for(;;)` matches after patch: 0

## Focused Verification

- `npx jest tests/workers/queueRunnerLifecycle.contract.test.ts --runInBand`: PASS, 3 tests passed
- `npx tsc --noEmit --pretty false`: PASS

## Required Gates

- focused tests: PASS
- typecheck: PASS
- lint: PASS
- full Jest runInBand: PASS
- architecture scanner: PASS
- git diff --check: PASS
- release verify post-push: PASS

Architecture scanner:

- serviceBypassFindings: 0
- serviceBypassFiles: 0
- transportControlledFindings: 175
- unclassifiedCurrentFindings: 0

Full Jest:

- Test suites: 660 passed, 1 skipped, 660 of 661 total
- Tests: 3915 passed, 1 skipped, 3916 total

Post-push release verify:

- `npm run release:verify -- --json`: PASS
- head commit: `a5f9bb5a0237e7b33ce0bf7ac085380f40f71982`
- repo sync status: synced
- worktree clean: true
- head matches origin/main: true
- OTA disposition: skip

## Safety

No production calls, DB writes, migrations, env writes, deploy, OTA, live load tests, Supabase project changes, spend cap changes, Realtime capacity work, force push, tags, secrets printed, empty catch blocks, `@ts-ignore`, broad type casts, weakened scanner/tests/lint, deleted tests, or business-semantics refactor.

Supabase Realtime status: WAITING_FOR_SUPABASE_SUPPORT_RESPONSE
