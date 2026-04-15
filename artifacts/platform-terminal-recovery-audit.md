# G1 Platform Terminal / Recovery Audit

STATUS: ROOT CAUSE CLASS FOUND

Date: 2026-04-15

## Owner map by role

| Module | Entity kind | Terminal source | Local owners | Cleanup exists | Risk |
| --- | --- | --- | --- | --- | --- |
| Foreman | request | `request.status`, `submitted_at`, `fetchRequestDetails`, mutation worker `inspectRemoteDraft`, `isForemanTerminalRemoteStatus` | `foreman.durableDraft.store`, legacy local draft storage, `offline_mutation_queue_v2`, boundary state, controller draft card/modal props | Yes after P6.3f: `clearTerminalLocalDraft` plus worker terminal guard and controller guards | Low residual. Existing role-specific contract is present but not platform-typed. |
| Warehouse receive | warehouse incoming/receive | Incoming queue/items RPC rows expose `incoming_status`, `qty_left_sum`, `qty_left`; complete terminal truth is `qty_left <= 0` or removed from receive queue scope | `warehouse_receive_draft_store_v1`, `warehouse_receive_queue_v1`, `useWarehouseReceiveFlow` bootstrap/network/app_active flush, active items modal status, global warehouse contour | Partial only: successful worker clears queue and marks synced; missing draft clears queue; no terminal guard before retry/restore | High. Persisted draft/queue can survive after server receive is already terminal and global host will still render banner from local metadata. |
| Contractor progress | contractor progress | Work/progress server state from `ensureWorkProgressSubmission` errors and work modal/read-only row state; no explicit pre-flush terminal inspect | `contractor_progress_draft_store_v2`, `contractor_progress_queue_v2`, `useContractorProgressReliability` bootstrap/network/app_active flush, active progress modal status, global contractor contour | Partial only: success clears queue and marks synced; conflict errors mark failed/conflicted; no pre-flush terminal cleanup adapter | High. Persisted progress draft/queue can survive as retry/recovery after server/work row is already closed/submitted/final. |
| Buyer | request/proposal/request_items | Buyer buckets/inbox scopes and proposal RPC results; proposal creation boundary returns submitted/visible state; request_item status sync | `buyer.store` modal `{ type, entityId }`, `selectedRequestId`, in-memory picked rows/attachments, optional server `submit_jobs` queue, staged proposal attachments | Modal close and success clear local picks. Job queue is server-owned; no client durable recovery store in buyer UI | Medium. No local durable recovery banner owner found, but modal/picked selection has no shared terminal/recoverable typed guard. |
| Accountant | proposal/payment | `accountantLoadProposalFinancialState`, payment eligibility/failure codes, `payment_status` | `accountantUi.store` `cardOpen/currentPaymentId`, `useAccountantPaymentForm` local form/allocation state, `useAccountantInboxController` optimistic `removedIds`, `pendingPaymentIntentRef` | Payment form reload resets on proposalId; payment action checks server financial state before mutation | Medium-low. Mostly transient UI owners, but no shared terminal/recoverable typed guard for modal/form eligibility. |
| Global status host | platform contour | None directly; consumes local owner state | `PlatformOfflineStatusHost` builds Foreman/Warehouse/Contractor contours and calls `summarizePlatformOfflineOverview` | Foreman snapshot guard only | High for non-Foreman persisted contours. Warehouse/Contractor contours are purely local-state derived. |

## UI surface owner table

| UI surface | Owner | Source fields | Clears on terminal? | Proof |
| --- | --- | --- | --- | --- |
| Top global red/yellow banner | `PlatformOfflineStatusHost` -> `summarizePlatformOfflineOverview` | Foreman `syncStatus/pendingOperationsCount/retryCount/lastError`; warehouse `draft.status/pendingCount/retryCount/lastError`; contractor `draft.syncStatus/pendingCount/retryCount/lastError` | Foreman yes; warehouse/contractor no explicit terminal guard | `src/components/PlatformOfflineStatusHost.tsx` builds contours from stores. Only `buildForemanContour` checks `state.snapshot`; warehouse/contractor map all records. |
| Foreman draft card/recovery modal/badge | `useForemanDraftBoundary` + `useForemanScreenController` | `snapshot`, `recoverableLocalSnapshot`, `attentionNeeded`, `syncStatus`, `conflictType`, `availableRecoveryActions`, queue keys | Yes after P6.3f | `foreman.terminalRecovery.ts` collects candidates and cleanup keys; controller guards terminal non-draft request details. |
| Warehouse receive retry text/status | `useWarehouseReceiveFlow` + `IncomingItemsSheet` | active draft `status`, `pendingCount`, `lastError`; `canRetryActiveReceive` when `retry_wait` or `queued` | No explicit terminal guard | `useWarehouseReceiveFlow.ts` hydrates store then flushes on `bootstrap_complete`, `network_back`, `app_active`; `buildWarehouseReceiveSyncUiStatus` renders retry/failed from local draft. |
| Warehouse global badge/banner source | `PlatformOfflineStatusHost` | all records from `warehouse_receive_draft_store_v1` | No | `buildWarehouseContour` does not know server terminal truth and treats any persisted retry/queued/failed record as active contour. |
| Contractor progress retry/status | `useContractorProgressReliability` + work modal sections | active draft `syncStatus`, `failureClass`, `lastError`; `canRetryProgress` when `retry_wait` | No explicit terminal guard | Reliability hook hydrates and replays queue on bootstrap/network/app_active, then hydrates modal from persisted draft if `shouldHydrateDraft`. |
| Contractor global badge/banner source | `PlatformOfflineStatusHost` | all records from `contractor_progress_draft_store_v2` | No | `buildContractorContour` maps every persisted record and does not know remote terminal/read-only state. |
| Buyer recovery-like modal | `useBuyerSheets` + `buyer.store` | transient modal `type/entityId`, selected request id | Closes on success/manual close only | No durable local recovery store found; optional submit job is server-side `submit_jobs`. |
| Accountant payment modal/retry-like form | `accountantUi.store`, `useAccountantPaymentForm`, `useAccountantPayActions` | `cardOpen/currentPaymentId`, financial form state, pending intent ref, optimistic removedIds | Server eligibility is checked before payment; modal state is transient | No durable local recovery store found; shared terminal semantics absent. |

## Terminal truth sources

- Request/Foreman: server request status and submit marker. Current local helper `isDraftLikeStatus` treats `""` as draft-like; G1 shared contract must avoid copying that implicit rule.
- Warehouse receive: receive queue RPC only returns heads/items where `qty_left_sum > 0` or `qty_left > 0`; a missing head/item or zero remaining quantity is terminal for local receive recovery. `incoming_status` is available but not yet centralized as a terminal semantic.
- Contractor progress: work row read-only/closed/submitted state and terminal conflict responses from progress submission. Current worker classifies terminal conflict only after attempting the mutation.
- Proposal/Buyer: proposal/request_item statuses and server submit result visibility. Optional job queue is server-owned, not a local durable recovery owner.
- Payment/Accountant: canonical financial state eligibility and `payment_status` (`PAID`, `PART`, etc.) from `accountantLoadProposalFinancialState`.

## Cleanup gaps

1. There is no shared typed contract for `isTerminal`, `isDraftLike`, `isRecoverable`, `shouldRenderRecoveryUI`, `shouldAllowRetry`, or `clearLocalRecoveryState`.
2. Foreman has a role-specific terminal cleanup path, but Warehouse and Contractor persisted owners do not expose entity-bound "terminal cleanup" adapters.
3. Warehouse worker restores inflight entries and processes queued/failed receive entries before any remote terminal inspection.
4. Warehouse bootstrap, network_back, and app_active paths replay the queue after hydrating persisted drafts without terminal filtering.
5. Contractor worker restores inflight entries and processes queued/retry entries before any explicit server terminal inspection.
6. Contractor bootstrap, network_back, and app_active paths replay persisted drafts without terminal filtering.
7. Global banner contours for Warehouse and Contractor are local metadata driven. They cannot distinguish real unresolved offline work from stale terminal recovery unless cleanup has already removed the local owner.
8. Buyer and Accountant do not have durable recovery owners in the audited paths, but modal/form selectors are not protected by a shared recovery contract.

## Highest risk paths

- `warehouse_receive_draft_store_v1` + `warehouse_receive_queue_v1` can recreate global warning state after cold start because `hydrateWarehouseReceiveDraftStore()` is immediately followed by `flushWarehouseReceiveQueue("bootstrap_complete")`.
- `contractor_progress_draft_store_v2` + `contractor_progress_queue_v2` has the same cold-start/network/app-active replay shape.
- `PlatformOfflineStatusHost` is intentionally passive and should not fetch remote truth; therefore owner cleanup adapters and worker/restore guards are the safe fix layer.
- Existing shared `PlatformOfflineSyncStatus` values include `failed_terminal`, but that means local sync failed terminally, not that server entity is terminal. The G1 contract must keep these two meanings separate.

## Recommended minimal hardening scope

1. Add an additive shared `platformTerminalRecovery` helper with explicit typed semantics and no null-as-draft fallback.
2. Add entity-bound cleanup adapters for high-risk persisted owners:
   - Warehouse receive: remove draft record and all queue entries for `incomingId`.
   - Contractor progress: remove draft record and all queue entries for `progressId`.
   - Foreman: delegate/align existing terminal cleanup semantics through the shared contract in tests first, without rewriting the working Foreman path.
3. Add optional worker preflight inspectors:
   - Warehouse receive worker: if `inspectRemoteReceive(incomingId)` says terminal, clear local receive recovery instead of calling `applyReceive`.
   - Contractor progress worker: if `inspectRemoteProgress(progressId)` says terminal, clear local progress recovery instead of calling `ensureWorkProgressSubmission`.
4. Add selector-level tests proving terminal entities are not recoverable and cannot render recovery/retry UI.
5. Add lifecycle tests for bootstrap/network/app_active by exercising worker flush with terminal inspectors, because those hooks all route through worker flush.
