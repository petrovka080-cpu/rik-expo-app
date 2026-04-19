# P2-C Warehouse Receive Flow Boundary

## Scope

Narrow decomposition of `useWarehouseReceiveFlow` around warehouse receive retry/telemetry decisions.

## Changed

- Moved receive enqueue telemetry planning into `warehouseReceiveFlow.model.ts`.
- Moved manual retry telemetry planning into `warehouseReceiveFlow.model.ts`.
- Moved final-state manual retry requeue decision into `warehouseReceiveFlow.model.ts`.
- Removed `react-hooks/exhaustive-deps` suppressions from `useWarehouseReceiveFlow.ts` and added the real dependencies.

## Not Changed

- Receive apply RPC path.
- Queue storage and worker semantics.
- Draft persistence semantics.
- Warehouse UI text, navigation, modals, and FIO flow.
- Offline retry policy and replay ordering.
- Backend SQL or migrations.

## Boundary

`useWarehouseReceiveFlow` remains the side-effect owner:

- state updates
- queue writes
- telemetry emission
- notifications
- receive apply wiring
- post-unmount guards

`warehouseReceiveFlow.model.ts` owns pure decisions:

- enqueue telemetry payload
- manual retry telemetry payload
- requeue decision for final local queue states

This keeps the runtime hook thinner without introducing a temporary hook or duplicate execution path.
