# Wave 3: Offline / Realtime Core Test Hardening

## Scope
- Added contract-level tests only for `mutationQueue.ts` and `mutationWorker.ts`.
- No production-semantic changes were made to offline queue, worker, retry policy, realtime transport, or UI flows.

## Queue contract proof
- `Q1` dedupe by `dedupeKey`: exact duplicate enqueue collapses into one queued mutation and keeps the latest payload intent.
- `Q2` compatible coalescing: pending same-draft mutations merge into one queued mutation with updated intent.
- `Q3` terminal absorption: a terminal draft mutation absorbs obsolete pending draft intent without losing the final action.
- `Q4` inflight recovery/reset: processing mutations restore back to queued and emit `inflight_restored`.
- `Q5` retry scheduling gate: `nextRetryAt` is respected under regular triggers, but `network_back` can recover `network_unreachable` retries immediately.
- `Q6` compaction/pruning safety: only the newest 20 terminal entries survive pruning while active queue truth remains intact.

## Worker contract proof
- `W1` retryable failure: retryable sync failure becomes `retry_scheduled`, with queue and durable sync state aligned.
- `W2` terminal non-retryable path: exhausted retries become `failed_non_retryable`.
- `W3` conflict path: stale/conflict failure becomes `conflicted` and durable conflict state is recorded.
- `W4` stuck recovery: processing mutation is restored before worker execution resumes and then flushes successfully.
- `W5` completed path: successful mutation is removed from the queue and a second flush does not reprocess it.

## Runnable proof
- Jest command:
  `node node_modules/jest/bin/jest.js src/lib/offline/mutationQueue.contract.test.ts src/lib/offline/mutationWorker.contract.test.ts --runInBand --json --outputFile artifacts/wave3-offline-core-jest.json`
- Result:
  `2` suites passed, `11` tests passed, `0` failed.
- Typecheck command:
  `node node_modules/typescript/bin/tsc --noEmit --pretty false`
- Result:
  passed

## Governance outcome
- `mutationQueue.ts` now has regression barriers around dedupe, merge, absorption, retry gating, inflight reset, and pruning.
- `mutationWorker.ts` now has regression barriers around retry scheduling, terminal failure, conflict transitions, stuck recovery, and completed-path cleanup.
- This narrows the highest offline/realtime orchestration risk without changing production semantics.
