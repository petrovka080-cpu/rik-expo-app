# G1 Platform Terminal / Recovery Fix Summary

STATUS: STATIC GREEN / RUNTIME DEVICE PROOF PENDING

Date: 2026-04-15

## Contract defined

Added `src/lib/offline/platformTerminalRecovery.ts` with explicit typed semantics:

- `isTerminal(...)`
- `isDraftLike(...)`
- `isRecoverable(...)`
- `shouldRenderRecoveryUI(...)`
- `shouldAllowRetry(...)`
- `shouldClearLocalRecoveryState(...)`
- `clearLocalRecoveryState(...)`

Important contract rule: `null` and empty status do not mean draft-like. Terminal server truth always wins over local recovery signals.

## Cleanup adapters added

| Entity kind | Adapter | Owners cleared |
| --- | --- | --- |
| `warehouse_receive` | `clearWarehouseReceiveLocalRecovery` | `warehouse_receive_queue_v1`, `warehouse_receive_draft_store_v1` |
| `contractor_progress` | `clearContractorProgressLocalRecovery` | `contractor_progress_queue_v2`, `contractor_progress_draft_store_v2` |

Foreman was not rewritten because P6.3f already added role-specific terminal cleanup and worker/controller guards. G1 covers Foreman through shared semantic tests and keeps the working Foreman path stable.

## Hardened paths

- Warehouse worker accepts optional `inspectRemoteReceive`; terminal truth clears local receive recovery before `applyReceive`.
- Warehouse receive flow supplies terminal inspection from the canonical receive items loader. No receive rows or zero remaining quantity means no recoverable local receive draft should survive.
- Contractor worker accepts optional `inspectRemoteProgress`; terminal truth clears local progress recovery before `ensureWorkProgressSubmission`.
- Contractor reliability hook supplies active-row terminal inspection without changing the hook bootstrap dependencies.
- Global status host remains passive. It relies on owner cleanup rather than fetching remote truth in the render path.

## What was not changed

- No server statuses changed.
- No approve/pay/submit/receive business semantics changed.
- No RPC contract changed.
- No UI redesign.
- No timers, reload hacks, route remounts, or debounce fixes.
- No broad screen-controller refactor.

## Regression tests added

- Shared contract tests: terminal is not draft-like, not recoverable, and does not allow retry UI.
- Neighbor smoke semantics: proposal/payment terminal truth blocks recovery UI.
- Warehouse owner cleanup tests: draft and queue are removed for terminal incoming; unrelated incoming remains.
- Warehouse worker lifecycle tests: bootstrap terminal preflight clears local recovery; active receive still syncs.
- Contractor owner cleanup tests: draft and queue are removed for terminal progress; unrelated progress remains.
- Contractor worker lifecycle tests: app_active terminal preflight clears local recovery; active progress still syncs.

## Proof status

- TypeScript: `npx tsc --noEmit --pretty false` green.
- Lint: `npx expo lint` green with existing 6-warning baseline and no touched-file warnings.
- Targeted Jest: green for `platformTerminalRecovery`, `warehouseReceiveWorker`, `contractorProgressWorker`.
- Full Jest: `npx jest --no-coverage` green, 254 suites passed, 1 skipped; 1441 tests passed, 1 skipped.
- Runtime iPhone proof: pending, requires OTA and device verification after static gates.
