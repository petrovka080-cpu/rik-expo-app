# P6.3f Foreman Stale Recovery State Audit

STATUS: ROOT CAUSE FOUND

## Exact Selector Chain

| UI surface | owner | keyed by requestId | clears on terminal? | proof |
| --- | --- | --- | --- | --- |
| Top global banner `Нужна проверка` / `Прораб: нужна проверка` | `PlatformOfflineStatusHost` -> `buildForemanContour` -> `summarizePlatformOfflineOverview` | `foremanDurableDraftStore.snapshot.requestId`, `queueDraftKey` | Partially | `src/components/PlatformOfflineStatusHost.tsx:80` only reports Foreman when `state.snapshot` is truthy; therefore a remaining banner means durable snapshot survived or was recreated. |
| `Прораб: в очереди` / unsynced contour | `buildForemanContour` | `foremanDurableDraftStore.snapshot` plus `pendingOperationsCount` | Partially | `src/components/PlatformOfflineStatusHost.tsx:90` and `src/lib/offline/platformOffline.model.ts:156` turn non-idle/pending contours into the global banner. |
| Draft card label `Черновик REQ-0121/2026` | `useForemanScreenController` -> `materialsContentProps.currentDisplayLabel` -> `ForemanEditorSection` -> `ForemanDraftSummaryCard` | `requestId`, `requestDetails.display_no` | No | `src/screens/foreman/useForemanScreenController.ts:909` prefers `requestDetails.display_no`; `src/screens/foreman/ForemanEditorSection.tsx:278` renders the card unconditionally. |
| Badge `Нужно внимание` | `buildForemanSyncUiStatus` -> `buildForemanDraftVisualModel` | `boundaryState.attentionNeeded`, `syncStatus`, `conflictType`, `retryCount` | Partially | `src/lib/offline/foremanSyncRuntime.ts:338` returns `Need attention`; `src/screens/foreman/foremanDraftVisualState.ts:72` translates it to `Нужно внимание`. |
| Retry copy `Повтор синхронизации ещё продолжается` | `buildForemanSyncUiStatus` -> `foremanDraftVisualState.translateSyncDetail` | `boundaryState.retryCount`, `lastErrorAt`, `syncStatus=retry_wait` | Partially | `src/lib/offline/foremanSyncRuntime.ts:374` emits `Retry ...`; `src/screens/foreman/foremanDraftVisualState.ts:106` translates retry details. |
| Recovery modal buttons | `useForemanScreenController` -> `ForemanDraftModal.availableRecoveryActions` | `boundaryState.availableRecoveryActions` from durable recovery state | No for terminal open/rehydrate paths | `src/screens/foreman/ForemanDraftModal.tsx:128` renders the recovery block when actions are present; actions are derived in `src/lib/offline/foremanSyncRuntime.ts:253`. |

## Exact Stale Fields

- Durable owner: `snapshot`, `syncStatus`, `pendingOperationsCount`, `queueDraftKey`, `requestIdKnown`, `attentionNeeded`, `conflictType`, `retryCount`, `availableRecoveryActions`, `recoverableLocalSnapshot`.
- Boundary owner: `boundaryState.syncStatus`, `pendingOperationsCount`, `attentionNeeded`, `conflictType`, `availableRecoveryActions`.
- Controller/card owner: `requestId` and `requestDetails.display_no` are enough to label the card as `Черновик REQ-0121/2026` even when `requestDetails.status` is terminal.
- Modal owner: `availableDraftRecoveryActions` is passed through without a terminal/non-draft guard.
- Queue owner: mutation worker has a terminal guard, but it relies on the request key it can inspect; display-number/local-key leftovers were not part of the cleanup key contract.

## Why Current P6.3e Is Insufficient

- Bootstrap/live cleanup exists, but `openRequestById` has a terminal branch that only clears the local snapshot and then writes terminal `requestId`/`requestDetails` back into the draft surface. It does not call the full terminal cleanup contract.
- `rehydrateDraftFromServer` preserves `recoverableLocalSnapshot: currentSnapshot` when the server returns no draft. For a terminal request this keeps local recovery actions alive after choosing the server.
- `discardLocalDraftNow` also keeps terminal request details in the draft surface after server inspection returns no draft.
- The card and modal selectors do not independently enforce "terminal request cannot be classified as recoverable draft"; the previous tests only covered helper decisions and platform summary, not the actual card/modal prop chain.
- Cleanup keys only include request id and queue key. Stale legacy/display-number keys can survive because `displayNo` is not collected as a cleanup key and `fetchRequestDetails` only queries by `id`.

## Minimal Safe Fix Scope

1. Extend terminal cleanup candidate/key collection to include snapshot display numbers as request-bound aliases.
2. Let `fetchRequestDetails` resolve a request by `display_no` fallback so old `REQ-0121/2026`-keyed local owners can be reconciled.
3. Call full terminal cleanup from `openRequestById`, `rehydrateDraftFromServer`, and `discardLocalDraftNow` when remote truth is terminal.
4. Prevent history select from opening the draft modal when `openRequestById` cleaned a terminal request.
5. Add a narrow selector guard so terminal, non-draft `requestDetails` cannot feed stale draft label/actions when no local draft is active.
6. Add focused regression tests for terminal display-number cleanup, terminal open not opening the draft modal, and terminal selector action suppression while keeping real pending/offline recovery intact.
