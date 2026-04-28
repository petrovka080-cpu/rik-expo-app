# S-OFF-1 offline replay circuit breaker notes

## Scope

- Added a global in-memory replay circuit breaker to the existing offline replay coordinator.
- Wired the breaker into foreman mutation replay, warehouse receive replay, and contractor progress replay workers.
- Kept queue item shape, mutation payload shape, client_mutation_id, retry semantics, quarantine semantics, SQL/RPC, RLS, UI, navigation, app config, package files, and Maestro YAML unchanged.

## Circuit breaker

- Helper location: `src/lib/offline/offlineReplayCoordinator.ts`
- Failure window: 60,000 ms
- Failure threshold: 5 transient failures
- Initial cooldown: 30,000 ms
- Max cooldown: 300,000 ms
- State persistence: in-memory only
- Transient failures counted: HTTP 429, HTTP 502/503/5xx, network/fetch/connection/offline/transport, timeout/temporary/service unavailable signals
- Permanent/domain failures ignored: validation, invalid/schema, permission/auth, conflict/stale/duplicate/already/closed/completed/cancelled, HTTP 400/401/403/404/409/412/422

## Worker behavior

- Before processing a replay tick, each worker calls `shouldAllowReplay()`.
- If the circuit is cooling down, the worker returns a non-failing skip result and does not mark items failed, delete queue entries, or quarantine entries.
- On retryable transient failures, workers call `recordReplayFailure(...)`.
- On successful replay mutation, workers call `recordReplaySuccess(...)`.

## Safety notes

- Business logic changed: NO
- Mutation payload changed: NO
- client_mutation_id changed: NO
- Queue item shape changed: NO
- Quarantine criteria changed: NO
- Retry semantics changed: NO
- SQL/RPC changed: NO
- RLS changed: NO
- UI changed: NO
- Maestro YAML changed: NO
- OTA published: NO
