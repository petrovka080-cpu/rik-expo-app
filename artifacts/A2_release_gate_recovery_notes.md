# A2 Release Gate Recovery Notes

Status: GREEN candidate
Commit under test: 7460c4fe5d068aaa88ae5eb9a63fe1113414e4f3

## Exact A1 Failure Under Investigation

- Suite: `src/lib/api/directorRolePdfBackends.test.ts`
- Reported failing contract: line 331, concurrent production report backend requests.
- Expected backend invocation count: `1`
- Reported received backend invocation count: `0`
- Reported mode: exact parallel `npm test`

## Reproduction Result On Current Clean Base

The A1 failure does not reproduce on current `main`.

- `npm test`: PASS
- `npm test -- src/lib/api/directorRolePdfBackends.test.ts`: PASS
- `npm test -- --runInBand src/lib/api/directorRolePdfBackends.test.ts`: PASS

This means the current release gate is no longer in the A1 NOT GREEN state before any production-code change in A2.

## State Owner

The director production report backend owns two module-level maps:

- `productionPdfClientCache`
- `productionPdfClientInFlight`

The production runtime contract is:

- identical cache key checks `productionPdfClientInFlight` synchronously;
- the task promise is registered before manifest/cache/backend awaits;
- cache lookup is inside the registered task;
- `finally` deletes the in-flight entry only when it still owns the current task.

## Root Cause Class

Current root cause class: **not active / not reproducible on current HEAD**.

The closest A1-class risk was **Class D - test isolation defect over Class A module cache ownership**:

- the shared mutable state is module-level by design;
- the targeted test boundary uses `jest.resetModules()` before requiring the service;
- current focused and full parallel runs prove that module state is isolated on current HEAD.

No evidence remains for Class B cache-key mismatch or Class C incorrect coalescing on current HEAD.

## A2 Fix

No production service code was changed.

The A2 change is a regression shield in `src/lib/api/directorRolePdfBackends.test.ts`:

- failed backend invocation clears in-flight ownership;
- `jest.resetModules()` isolates module-level cache state between test module reloads.

This is production-safe because it strengthens tests around the existing runtime contract without changing PDF generation, manifest design, transport, cache semantics, or business logic.

## Not Changed

- Director production report business logic.
- PDF formulas.
- Totals, grouping, ordering.
- Template semantics.
- Open UX.
- Transport/backend protocol.
- Manifest contract.
- Runtime cache/coalescing implementation.
- No artificial delays, retry, skip, weakened assertion, `--runInBand` workaround, hook, adapter, VM shim, `@ts-ignore`, or `eslint-disable` was added.
