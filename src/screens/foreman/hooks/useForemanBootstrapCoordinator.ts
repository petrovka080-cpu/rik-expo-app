/**
 * useForemanBootstrapCoordinator.ts
 *
 * Extracted bootstrap coordinator hook for the Foreman draft boundary.
 *
 * PURPOSE:
 *   Isolates the `bootstrapDraft` function from `useForemanDraftBoundary.ts`,
 *   reducing that file's surface area without changing any business logic.
 *
 * CONTRACT:
 *   - Zero changes to bootstrap logic — this is a verbatim extraction.
 *   - Accepts a typed `deps` object instead of closing over parent-hook scope.
 *   - Returns `{ bootstrapDraft }` — same hook call signature as before.
 *   - Production safe: no new effects, no new state, no new refs.
 *
 * ARCHITECTURE NOTE (P0-A):
 *   `useForemanDraftBoundary.ts` had 72 hook calls (useEffect/useCallback/
 *   useRef/useState) in 1806 lines. The bootstrap coordinator is the largest
 *   single useCallback (~167 lines, 14 deps). Extracting it:
 *     - Removes 1 complex useCallback from the parent
 *     - Gives bootstrap its own dependency surface (testable independently)
 *     - Reduces cognitive load when reading the parent hook
 */

import { useCallback } from "react";
import {
  fetchRequestDetails,
} from "../../../lib/catalog_api";
import {
  enqueueForemanMutation,
  getForemanPendingMutationCountForDraftKeys,
} from "../../../lib/offline/mutationQueue";
import {
  markForemanSnapshotQueued,
} from "../../../lib/offline/mutationWorker";
import { runForemanQueueRecovery } from "../../../lib/offline/offlineQueueRecovery";
import {
  isForemanConflictAutoRecoverable,
} from "../../../lib/offline/foremanSyncRuntime";
import { recordCatchDiscipline } from "../../../lib/observability/catchDiscipline";
import {
  FOREMAN_LOCAL_ONLY_REQUEST_ID,
  hasForemanLocalDraftPendingSync,
  type ForemanLocalDraftSnapshot,
} from "../foreman.localDraft";
import {
  isDraftLikeStatus,
} from "../foreman.helpers";
import {
  bootstrapForemanDraftBoundary,
  type ForemanDraftBoundaryState,
} from "../foreman.draftBoundary.helpers";
import {
  getForemanBootstrapReconciliationRequestId,
  planForemanBootstrapReenqueueCommand,
  resolveForemanBootstrapCompletionStartPlan,
  resolveForemanBootstrapHydrateTelemetryPlan,
  resolveForemanBootstrapReconciliationPlan,
  resolveForemanBootstrapStaleDurableResetExecutionPlan,
} from "../foreman.draftLifecycle.model";
import {
  getForemanDurableDraftState,
  patchForemanDurableDraftRecoveryState,
  pushForemanDurableDraftTelemetry,
} from "../foreman.durableDraft.store";
import type { RequestDetails } from "../../../lib/catalog_api";
import type { Dispatch, SetStateAction, MutableRefObject } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export type ForemanBootstrapCoordinatorDeps = {
  // State setters
  patchBoundaryState: (patch: Partial<ForemanDraftBoundaryState>) => void;
  setActiveDraftOwnerId: (
    ownerId?: string | null,
    options?: { resetSubmitted?: boolean },
  ) => string;
  setRequestIdState: Dispatch<SetStateAction<string>>;
  setRequestDetails: Dispatch<SetStateAction<RequestDetails | null>>;
  setDisplayNoByReq: Dispatch<SetStateAction<Record<string, string>>>;
  setLocalDraftSnapshot: Dispatch<SetStateAction<ForemanLocalDraftSnapshot | null>>;
  localDraftSnapshotRef: MutableRefObject<ForemanLocalDraftSnapshot | null>;
  syncHeaderFromDetails: (details: RequestDetails) => void;
  networkOnlineRef: MutableRefObject<boolean | null>;
  /** Setetr for the skip-remote-hydration request-id ref in the parent hook. */
  setSkipRemoteHydrationRequestId: (requestId: string | null) => void;

  // Callbacks from parent hook (pre-memoized)
  clearDraftCache: (options?: {
    snapshot?: ForemanLocalDraftSnapshot | null;
    requestId?: string | null;
  }) => Promise<void>;
  applyLocalDraftSnapshotToBoundary: (
    snapshot: ForemanLocalDraftSnapshot | null,
    options?: {
      restoreHeader?: boolean;
      clearWhenEmpty?: boolean;
      restoreSource?: "none" | "snapshot" | "remoteDraft";
      restoreIdentity?: string | null;
    },
  ) => void;
  clearTerminalLocalDraft: (options: {
    snapshot?: ForemanLocalDraftSnapshot | null;
    requestId: string;
    remoteStatus?: string | null;
  }) => Promise<void>;
  clearTerminalRecoveryOwnerIfNeeded: (
    context: string,
    options?: { cancelled?: () => boolean },
  ) => Promise<boolean>;
  getDraftQueueKey: (
    snapshot?: ForemanLocalDraftSnapshot | null,
    fallbackRequestId?: string | null,
  ) => string;
  getDraftQueueKeys: (
    snapshot?: ForemanLocalDraftSnapshot | null,
    fallbackRequestId?: string | null,
  ) => string[];
  loadItems: (
    rid?: string | null,
    options?: { forceRemote?: boolean },
  ) => Promise<void>;
  refreshBoundarySyncState: (
    snapshotOverride?: ForemanLocalDraftSnapshot | null,
  ) => Promise<void>;
  resetDraftState: () => void;
  requestId: string;
};

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Provides the `bootstrapDraft` coordinator function.
 *
 * This hook has no state of its own — it is a pure callback factory
 * that receives all dependencies explicitly via `deps` and returns
 * a stable, memoized `bootstrapDraft` function.
 */
export function useForemanBootstrapCoordinator(deps: ForemanBootstrapCoordinatorDeps) {
  const {
    patchBoundaryState,
    setActiveDraftOwnerId,
    setRequestIdState,
    setRequestDetails,
    setDisplayNoByReq,
    setLocalDraftSnapshot,
    localDraftSnapshotRef,
    networkOnlineRef,
    syncHeaderFromDetails,
    setSkipRemoteHydrationRequestId,
    clearDraftCache,
    applyLocalDraftSnapshotToBoundary,
    clearTerminalLocalDraft,
    clearTerminalRecoveryOwnerIfNeeded,
    getDraftQueueKey,
    getDraftQueueKeys,
    loadItems,
    refreshBoundarySyncState,
    resetDraftState,
    requestId,
  } = deps;

  /**
   * Bootstrap the Foreman draft boundary on mount.
   *
   * VERBATIM extraction from `useForemanDraftBoundary.ts` lines 1309–1476.
   * No logic changes. Only deps are now received explicitly.
   */
  const bootstrapDraft = useCallback(
    async (options?: { cancelled?: () => boolean }) => {
      await bootstrapForemanDraftBoundary({
        cancelled: options?.cancelled,
        patchBoundaryState,
        clearDraftCache,
        applyLocalDraftSnapshotToBoundary,
        setSkipRemoteHydrationRequestId,
        setRequestIdState,
        setRequestDetails,
        syncHeaderFromDetails,
        setDisplayNoByReq,
        loadItems,
      });
      if (options?.cancelled?.()) return;

      if (await clearTerminalRecoveryOwnerIfNeeded("bootstrap_complete", options)) return;

      // ── O4: Queue recovery — classify + reset inflight before any flush ───
      // Runs before snapshot enqueue and flush. Non-blocking: errors are logged
      // internally, result is advisory only. Never removes items.
      await runForemanQueueRecovery({ triggerSource: "bootstrap_complete" });

      const durableSnapshot = getForemanDurableDraftState().snapshot;

      // ── P6.3a: Reset stale sync metadata when bootstrap cleared the snapshot ──
      // When resolveForemanDraftBootstrap detects a terminal remote status, it
      // calls clearDraftCache which clears the snapshot. However, the durable
      // store sync metadata (syncStatus, attentionNeeded, conflictType, etc.)
      // is NOT reset by clearDraftCache. Without this explicit reset, the
      // global PlatformOfflineStatusHost banner keeps reading stale values
      // from the durable store, showing phantom "Нужна проверка" banners.
      const staleDurableState = getForemanDurableDraftState();
      const completionStartPlan = resolveForemanBootstrapCompletionStartPlan({
        durableSnapshot,
        durableState: staleDurableState,
        requestId,
      });
      if (completionStartPlan.action === "reset_stale_durable") {
        const staleResetExecutionPlan = resolveForemanBootstrapStaleDurableResetExecutionPlan({
          resetPlan: completionStartPlan,
          durableState: staleDurableState,
        });
        if (__DEV__) {
          console.info("[foreman.bootstrap] resetting stale durable sync metadata", staleResetExecutionPlan.devTelemetry);
        }
        await patchForemanDurableDraftRecoveryState(staleResetExecutionPlan.durablePatch);
        // P6.3c: Also clear React-level draft state (items, requestDetails,
        // requestId, header). Without this, isDraftActive stays true because
        // requestDetails still holds the old "draft" status, and the persist
        // effect rebuilds & re-persists the stale snapshot.
        setActiveDraftOwnerId(staleResetExecutionPlan.activeOwnerReset.nextOwnerId, {
          resetSubmitted: staleResetExecutionPlan.activeOwnerReset.resetSubmitted,
        });
        if (staleResetExecutionPlan.resetDraftState) resetDraftState();
        if (staleResetExecutionPlan.clearLocalSnapshotRef) {
          localDraftSnapshotRef.current = staleResetExecutionPlan.nextLocalSnapshot;
        }
        setLocalDraftSnapshot(staleResetExecutionPlan.nextLocalSnapshot);
        await refreshBoundarySyncState(staleResetExecutionPlan.refreshBoundarySnapshot);
        return;
      }

      const ownerPlan = completionStartPlan.ownerPlan;
      if (ownerPlan.action === "set_owner") {
        setActiveDraftOwnerId(ownerPlan.ownerId, { resetSubmitted: true });
      } else if (ownerPlan.action === "reset_owner") {
        setActiveDraftOwnerId(undefined, { resetSubmitted: true });
      }
      if (durableSnapshot && completionStartPlan.hasDurableSnapshotContent) {
        const hydrateDraftKey = getDraftQueueKey(durableSnapshot);
        const hydrateTelemetryPlan = resolveForemanBootstrapHydrateTelemetryPlan({
          snapshot: durableSnapshot,
          draftKey: hydrateDraftKey,
          durableConflictType: getForemanDurableDraftState().conflictType,
          networkOnline: networkOnlineRef.current,
          localOnlyRequestId: FOREMAN_LOCAL_ONLY_REQUEST_ID,
        });
        await pushForemanDurableDraftTelemetry(hydrateTelemetryPlan.telemetry);
        const pendingOperationsCount = await getForemanPendingMutationCountForDraftKeys(
          getDraftQueueKeys(durableSnapshot),
        );

        // ── P6.3e: Reconciliation MUST run BEFORE re-enqueue ──────────
        // Previous order: enqueue first, reconcile second. This caused
        // the mutation worker to pick up the enqueued mutation concurrently,
        // fail against the terminal server state, and write recovery state
        // back into the durable store — overwriting the reconciliation cleanup.
        // Now we check remote status FIRST then decide whether to enqueue.
        const reconciledRequestId = getForemanBootstrapReconciliationRequestId(durableSnapshot);
        if (reconciledRequestId) {
          try {
            if (options?.cancelled?.()) return;
            const remoteDetails = await fetchRequestDetails(reconciledRequestId);
            const remoteStatus = remoteDetails?.status ?? null;
            const reconciliationPlan = resolveForemanBootstrapReconciliationPlan({
              snapshot: durableSnapshot,
              remoteStatus,
              remoteStatusIsTerminal: Boolean(remoteStatus && !isDraftLikeStatus(remoteStatus)),
            });
            if (reconciliationPlan.action === "clear_terminal") {
              if (__DEV__) {
                console.info("[foreman.bootstrap-reconciliation] clearing stale draft (pre-enqueue)", {
                  requestId: reconciliationPlan.requestId,
                  remoteStatus: reconciliationPlan.remoteStatus,
                  localSnapshotItems: durableSnapshot.items.length,
                  submitRequested: durableSnapshot.submitRequested,
                });
              }
              await clearTerminalLocalDraft({
                snapshot: durableSnapshot,
                requestId: reconciliationPlan.requestId,
                remoteStatus: reconciliationPlan.remoteStatus,
              });
              await refreshBoundarySyncState(null);
              return;
            }
          } catch (error) {
            recordCatchDiscipline({
              screen: "foreman",
              surface: "draft_boundary",
              event: "bootstrap_reconciliation_remote_check_failed",
              kind: "degraded_fallback",
              error,
              sourceKind: "rpc:fetch_request_details",
              errorStage: "recovery",
              trigger: "unknown",
              extra: {
                requestId: reconciledRequestId,
                queueDraftKey: getDraftQueueKey(durableSnapshot),
                fallbackReason: "defer_bootstrap_reconciliation",
                snapshotItemCount: durableSnapshot.items.length,
                submitRequested: durableSnapshot.submitRequested,
              },
            });
            if (__DEV__) {
              console.info("[foreman.bootstrap-reconciliation] skipped (network error)", {
                requestId: reconciledRequestId,
              });
            }
          }
        }

        // Only re-enqueue if reconciliation didn't clear the draft
        const reenqueueState = getForemanDurableDraftState();
        const reenqueuePlan = planForemanBootstrapReenqueueCommand({
          snapshot: durableSnapshot,
          pendingOperationsCount,
          conflictAutoRecoverable: isForemanConflictAutoRecoverable(reenqueueState.conflictType),
          snapshotHasPendingSync: hasForemanLocalDraftPendingSync(durableSnapshot),
          syncStatus: reenqueueState.syncStatus,
          draftKey: getDraftQueueKey(durableSnapshot),
        });
        if (reenqueuePlan.action === "reenqueue") {
          await enqueueForemanMutation(reenqueuePlan.enqueue);
          await markForemanSnapshotQueued(durableSnapshot, {
            queueDraftKey: reenqueuePlan.markQueued.queueDraftKey,
            triggerSource: reenqueuePlan.markQueued.triggerSource,
          });
        }
      }

      await refreshBoundarySyncState(durableSnapshot ?? null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps object is the single dep surface
    [
      applyLocalDraftSnapshotToBoundary,
      clearDraftCache,
      clearTerminalLocalDraft,
      clearTerminalRecoveryOwnerIfNeeded,
      getDraftQueueKey,
      getDraftQueueKeys,
      loadItems,
      patchBoundaryState,
      refreshBoundarySyncState,
      requestId,
      resetDraftState,
      setActiveDraftOwnerId,
      setDisplayNoByReq,
      setLocalDraftSnapshot,
      setRequestDetails,
      setRequestIdState,
      setSkipRemoteHydrationRequestId,
      syncHeaderFromDetails,
    ],
  );

  return { bootstrapDraft };
}
