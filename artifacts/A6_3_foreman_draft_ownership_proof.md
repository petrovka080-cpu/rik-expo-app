# A6.3 Foreman Draft Ownership Proof

Status: GREEN

## Commands

```bash
npm test -- mutationWorker.contract --runInBand --no-coverage
npm test -- mutationQueue.contract --runInBand --no-coverage
npm test -- offline --runInBand --no-coverage
npx tsc --noEmit --pretty false
npx expo lint
git diff --check
npm test -- --runInBand
npm test
```

## Results

- `mutationWorker.contract`: PASS, 15 tests
- `mutationQueue.contract`: PASS, 16 tests
- `offline`: PASS, 15 suites / 183 tests
- `npx tsc --noEmit --pretty false`: PASS
- `npx expo lint`: PASS
- `git diff --check`: PASS
- `npm test -- --runInBand`: PASS, 373 suites passed / 1 skipped, 2376 tests passed / 1 skipped
- `npm test`: PASS, 373 suites passed / 1 skipped, 2376 tests passed / 1 skipped

## Notes

An exploratory command `npm test -- foremanSyncRuntime --runInBand --no-coverage` returned "No tests found" because no test file matches that pattern. It was not used as a GREEN gate.

## Before / After

Before:

- Pre-sync terminal guard remote inspection failure was swallowed.
- Normal sync still proceeded, but production diagnostics had no direct event for the guard failure.

After:

- The same non-fatal behavior is preserved.
- The worker records `terminal_guard_remote_inspection_failed` with normalized error code, message, request id, draft key, and fallback reason.
