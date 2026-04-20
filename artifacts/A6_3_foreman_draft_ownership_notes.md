# A6.3 Foreman Draft Ownership Notes

Status: GREEN

## Risk

The Foreman mutation worker has a pre-sync terminal-request guard that asks the remote owner whether a request is already terminal before replaying a local draft mutation. If this remote inspection failed, the worker correctly continued through the normal sync path, but the terminal-guard failure itself was silent.

At scale, this hides why terminal draft mutations still reach the normal worker path during network or RPC degradation.

## Fix Scope

Changed only the Foreman offline mutation worker observability boundary:

- `src/lib/offline/mutationWorker.ts`
- `src/lib/offline/mutationWorker.contract.test.ts`

## Production-Safe Contract

- Remote terminal inspection failure remains non-fatal.
- The worker still proceeds with normal sync.
- Queue ordering, retry policy, terminal cleanup, durable draft state, and business semantics are unchanged.
- The failure is now emitted as `terminal_guard_remote_inspection_failed` with normalized app error metadata.

## What Did Not Change

- Foreman draft formulas or payload semantics
- Local/durable draft mutation order
- Retry scheduling policy
- Conflict classification policy
- Queue coalescing or FIFO behavior
- UI flow, recovery actions, or terminal cleanup behavior
