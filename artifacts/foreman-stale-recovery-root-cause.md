STATUS: ROOT CAUSE FOUND

# P6.3e Foreman Stale Recovery State Audit

## Exact selector chain

| UI surface | owner | source fields | clears on terminal? | proof |
| --- | --- | --- | --- | --- |
| Global red/yellow banner | `PlatformOfflineStatusHost` -> `buildForemanContour` -> `summarizePlatformOfflineOverview` | `foremanDurableDraftStore.snapshot`, `syncStatus`, `pendingOperationsCount`, `retryCount`, `lastError` | Partially. P6.3d ignores fields when `snapshot == null`, but an active stale `snapshot` still qualifies the contour. | `src/components/PlatformOfflineStatusHost.tsx:80`, `src/components/PlatformOfflineStatusHost.tsx:110`, `src/lib/offline/platformOffline.model.ts:152` |
| `Прораб: нужна проверка` / `Прораб: в очереди` banner detail | `summarizePlatformOfflineOverview` active contour list | `contour.label`, `contour.syncStatus`, `contour.pendingCount` | Partially. Depends entirely on the foreman contour being sanitized before summary. | `src/lib/offline/platformOffline.model.ts:157`, `src/lib/offline/platformOffline.model.ts:181` |
| Draft summary card label `Черновик REQ-0121/2026` | `ForemanMaterialsContent` -> `ForemanEditorSection` -> `ForemanDraftSummaryCard` | `activeDraftDisplayLabel` from `requestId` or `requestDetails.display_no`; `items.length`; `draftSyncUi` | No direct terminal guard at the card. It always renders the draft card with whatever model the controller supplies. | `src/screens/foreman/useForemanScreenController.ts:909`, `src/screens/foreman/useForemanScreenController.ts:915`, `src/screens/foreman/ForemanEditorSection.tsx:66`, `src/screens/foreman/ForemanEditorSection.tsx:278` |
| Badge `Нужно внимание` | `buildForemanSyncUiStatus` -> `buildForemanDraftVisualModel` | `draftConflictType`, `draftSyncStatus`, `draftSyncAttentionNeeded`, `draftRetryCount`, `draftLastErrorStage` from `boundaryState` | Partially. `clearTerminalLocalDraft` resets these, but bootstrap/foreground reconciliation do not detect request-bound recovery when only `recoverableLocalSnapshot` remains. | `src/screens/foreman/useForemanScreenController.ts:194`, `src/lib/offline/foremanSyncRuntime.ts:294`, `src/screens/foreman/foremanDraftVisualState.ts:72`, `src/screens/foreman/foremanDraftVisualState.ts:81` |
| Retry copy `Повтор синхронизации ещё продолжается` | `buildForemanSyncUiStatus` -> `translateSyncDetail` | `retryCount`, `lastErrorAt`, `draftSyncStatus == retry_wait`, `attentionNeeded` | Same partial cleanup issue. The text is generated from durable/boundary sync metadata, not server truth. | `src/lib/offline/foremanSyncRuntime.ts:368`, `src/screens/foreman/foremanDraftVisualState.ts:106` |
| Recovery modal actions `Повторить / Вернуть локальную / Очистить очередь / Удалить локальную` | `ForemanDraftModal` | `availableDraftRecoveryActions` from `boundaryState.availableRecoveryActions`, copied from `foremanDurableDraftStore.availableRecoveryActions` | No sufficient terminal guard. Actions are generated from `recoverableLocalSnapshot`, `conflictType`, `status`, `attentionNeeded`, and can exist even when active `snapshot == null`. | `src/screens/foreman/ForemanDraftModal.tsx:171`, `src/lib/offline/foremanSyncRuntime.ts:253`, `src/screens/foreman/foreman.durableDraft.store.ts:152`, `src/screens/foreman/hooks/useForemanDraftBoundary.ts:213` |

## Client truth owners for request-bound recovery

| Owner | Key/requestId | Stores | Cleanup today |
| --- | --- | --- | --- |
| `foremanDurableDraftStore` persisted at `foreman_durable_draft_store_v2` | Single foreman durable record, with `snapshot.requestId` and `recoverableLocalSnapshot.requestId` | Active draft snapshot, sync metadata, retry metadata, attention flag, conflict type, recovery actions, recoverable local snapshot | `clearTerminalLocalDraft` clears all fields, but trigger paths only discover active `snapshot` or current `requestDetails`, not all recoverable request-bound owners. |
| Offline mutation queue persisted at `offline_mutation_queue_v2` / legacy `v1` | `payload.draftKey`, `payload.requestId`, `entityId` | Pending/retry/conflicted mutation entries and counters | Cleared for active snapshot/request id by `clearDraftCache`; missed if terminal cleanup is never triggered for a recovery-only durable record. |
| Legacy foreman local draft storage | `foreman_materials_local_draft_v1` | Old snapshot format | Cleared by `clearForemanLocalDraftSnapshot`/`saveForemanLocalDraftSnapshot(null)`. |
| Catalog local draft id cache | `DRAFT_KEY`, `memDraftId`, low-level cached draft id | Last local draft request id | Cleared by `clearForemanDraftCacheState`, but only when terminal cleanup runs. |
| React boundary state | In-memory `boundaryState` | `syncStatus`, `pendingOperationsCount`, `attentionNeeded`, `availableRecoveryActions` | Refreshed from durable store; if durable recovery owner survives, UI survives. |
| React refs/state | `localDraftSnapshotRef`, `requestId`, `requestDetails`, `items`, `activeDraftOwnerIdRef` | Current screen-local draft identity and card/modal source data | Reset by `clearTerminalLocalDraft`; not reached for recovery-only owner. |
| Draft modal UI store | Zustand `useForemanDraftStore` | `draftOpen`, busy flags, modal visibility | Not a persisted recovery owner. It can keep the modal open, but actions come from durable/boundary state. |

## Exact stale fields

The stale state is not one flag. The durable owner can retain:

- `snapshot` with `requestId == REQ-0121/2026` or equivalent server id.
- `recoverableLocalSnapshot` with the same request id after the active snapshot was cleared.
- `availableRecoveryActions` derived from `recoverableLocalSnapshot`, `conflictType`, `syncStatus`, and `attentionNeeded`.
- `syncStatus` such as `failed_terminal`, `retry_wait`, or `queued`.
- `pendingOperationsCount` and queue entries keyed by request id / local-only draft key.
- `conflictType` such as `server_terminal_conflict` or `stale_local_snapshot`.
- `attentionNeeded == true`.
- Screen-local `requestId`, `requestDetails`, and `items` when cleanup has not run or has been rehydrated from a stale snapshot.

## Why current P6.3c/P6.3d is insufficient

P6.3c/P6.3d fixed bootstrap/live reconciliation for the active snapshot path:

- `resolveForemanDraftBootstrap` validates `snapshot.requestId` against remote status.
- `restoreDraftIfNeeded` foreground-checks `localDraftSnapshotRef.current ?? durableState.snapshot`.
- live reconciliation reacts to `requestDetails.status` or `server_terminal_conflict`.
- `PlatformOfflineStatusHost` now suppresses the global contour when `snapshot == null`.

The remaining path is above/beside that fix:

- `foremanDurableDraftStore.recoverableLocalSnapshot` is a request-bound recovery owner independent from `snapshot`.
- `buildForemanAvailableRecoveryActions` treats `hasRecoverableLocalSnapshot` as recoverable even when `snapshot == null`.
- `refreshBoundarySyncState` copies `availableRecoveryActions` directly to `boundaryState`.
- `ForemanDraftModal` renders the recovery block from `availableRecoveryActions`.
- Bootstrap and foreground terminal checks do not inspect `recoverableLocalSnapshot.requestId`, so a terminal request can remain client-owned as a recoverable draft after active snapshot cleanup.

## Minimal safe fix scope

Add a deterministic terminal cleanup contract that:

- treats both `snapshot` and `recoverableLocalSnapshot` as request-bound foreman recovery owners;
- detects a terminal remote status for any request id held by those owners during bootstrap/focus/foreground;
- clears durable snapshot, recoverable snapshot, sync metadata, recovery actions, queue counters, and request-bound mutation queue entries for that request;
- prevents selectors from classifying `snapshot == null` plus stale durable recovery metadata as an active recoverable draft;
- leaves real draft-like/offline pending cases untouched.
