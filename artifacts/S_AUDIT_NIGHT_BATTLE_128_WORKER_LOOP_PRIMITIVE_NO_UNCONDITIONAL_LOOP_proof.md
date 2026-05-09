# S Audit Night Battle 128: Worker Loop Primitive No Unconditional Loop

## Scope

- Updated `src/lib/async/mapWithConcurrencyLimit.ts`.
- Updated `tests/async/cancellableWorkerLoop.test.ts`.
- Did not connect the primitive to concrete workers and did not change worker business behavior.

## Fresh Scan

- `git grep -n "while *(true" src tests scripts || true`: PASS, found the newly introduced runtime primitive loop plus four carried-forward script loops and test-only guards before the fix.
- `git grep -n "for *(;;" src tests scripts || true`: PASS, no findings.

Before this wave, `src/lib/async/mapWithConcurrencyLimit.ts` contained `while (true)` inside `runCancellableWorkerLoop`. That made the primitive appear in the C2 unbounded-loop inventory.

After this wave, the primitive uses `while (!isAbortStop(signal))` and returns an explicit aborted summary after loop exit. The remaining `while(true)` findings are the four already-inventoried script loops plus test-only guard strings; the runtime primitive is no longer a finding.

## Contract Guard

- Added a focused test that reads the primitive source and rejects `while (true)` and `for (;;)`.
- The same test asserts the intended cancellation-owned loop boundary: `while (!isAbortStop(signal))`.
- This does not weaken scanner behavior or expand allowlists.

## Focused Verification

- `npx jest tests/async/cancellableWorkerLoop.test.ts src/lib/async/mapWithConcurrencyLimit.test.ts src/workers/queueWorker.boundary.test.ts tests/workers/queueRunnerLifecycle.contract.test.ts tests/perf/performance-budget.test.ts --runInBand`: PASS, 5 suites passed, 34 tests passed.
- `npx tsc --noEmit --pretty false`: PASS.

## Required Gates

- focused tests: PASS.
- typecheck: PASS.
- lint: PASS.
- full Jest runInBand: PASS.
- architecture scanner: PASS.
- git diff --check: PASS.
- release verify post-push: PASS.

Architecture scanner:

- serviceBypassFindings: 0.
- serviceBypassFiles: 0.
- transportControlledFindings: 175.
- unclassifiedCurrentFindings: 0.

Full Jest:

- Test suites: 662 passed, 1 skipped, 662 of 663 total.
- Tests: 3925 passed, 1 skipped, 3926 total.

Post-push release verify:

- `npm run release:verify -- --json`: PASS.
- head commit: `c5370ee163e81e5594c7b750d547b9d90c617763`.
- repo sync status: synced.
- worktree clean: true.
- head matches origin/main: true.
- OTA disposition: allow.
- OTA published: false.
- EAS update triggered: false.

## Safety

No production calls, DB writes, migrations, env writes, deploy, OTA, live load tests, Supabase project changes, spend cap changes, Realtime capacity work, force push, tags, secrets printed, empty catch blocks, `@ts-ignore`, broad type casts, weakened scanner/tests/lint, deleted tests, or business-semantics refactor.

Supabase Realtime status: WAITING_FOR_SUPABASE_SUPPORT_RESPONSE
