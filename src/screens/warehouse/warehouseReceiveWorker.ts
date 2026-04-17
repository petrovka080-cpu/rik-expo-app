import type { RpcReceiveApplyResult } from "./warehouse.types";
import type { PlatformOfflineRetryTriggerSource } from "../../lib/offline/platformOffline.model";
import { recordPlatformOfflineTelemetry } from "../../lib/offline/platformOffline.observability";
import {
  classifyOfflineMutationErrorKind,
  isOfflineMutationConflictKind,
} from "../../lib/offline/mutation.conflict";
import {
  shouldClearLocalRecoveryState,
  type PlatformTerminalTruth,
} from "../../lib/offline/platformTerminalRecovery";
import {
  requestOfflineReplay,
  type OfflineReplayPolicy,
} from "../../lib/offline/offlineReplayCoordinator";
import {
  getWarehouseReceiveDraft,
  markWarehouseReceiveDraftFailedTerminal,
  markWarehouseReceiveDraftQueued,
  markWarehouseReceiveDraftRetryWait,
  markWarehouseReceiveDraftSynced,
  markWarehouseReceiveDraftSyncing,
  setWarehouseReceiveDraftItems,
  type WarehouseReceiveDraftRecord,
} from "./warehouse.receiveDraft.store";
import {
  enqueueWarehouseReceive,
  getWarehouseReceivePendingCount,
  markWarehouseReceiveQueueConflicted,
  markWarehouseReceiveQueueFailedNonRetryable,
  markWarehouseReceiveQueueInflight,
  markWarehouseReceiveQueueRetryWait,
  loadWarehouseReceiveQueue,
  peekNextWarehouseReceiveQueueEntry,
  removeWarehouseReceiveQueueEntry,
  resetInflightWarehouseReceiveQueue,
} from "./warehouseReceiveQueue";
import { clearWarehouseReceiveLocalRecovery } from "./warehouse.terminalRecovery";

type WarehouseReceiveWorkerTriggerSource = PlatformOfflineRetryTriggerSource;

export type WarehouseReceiveWorkerResult = {
  processedCount: number;
  remainingCount: number;
  failed: boolean;
  errorMessage: string | null;
  lastIncomingId: string | null;
  lastOkCount: number;
  lastFailCount: number;
  lastLeftAfter: number | null;
  triggerSource: WarehouseReceiveWorkerTriggerSource;
};

type WarehouseReceiveWorkerDeps = {
  getWarehousemanFio: () => string;
  applyReceive: (params: {
    incomingId: string;
    items: { purchase_item_id: string; qty: number }[];
    warehousemanFio: string;
    clientMutationId: string;
  }) => Promise<{ data: RpcReceiveApplyResult | null; error: { message?: string | null } | null }>;
  refreshAfterSuccess?: (incomingId: string) => Promise<void>;
  getNetworkOnline?: () => boolean | null;
  inspectRemoteReceive?: (
    incomingId: string,
  ) => Promise<PlatformTerminalTruth | null | undefined>;
};

const trim = (value: unknown) => String(value ?? "").trim();
export const WAREHOUSE_RECEIVE_REPLAY_POLICY = {
  queueKey: "warehouse_receive",
  owner: "warehouse_receive_worker",
  concurrencyLimit: 1,
  ordering: "created_at_fifo",
  backpressure: "coalesce_triggers_and_rerun_once",
} as const satisfies OfflineReplayPolicy;

const serializeDraftItems = (draft: WarehouseReceiveDraftRecord | null) =>
  JSON.stringify(
    (draft?.items ?? [])
      .map((item) => ({ itemId: trim(item.itemId), qty: Number(item.qty) }))
      .sort((left, right) => left.itemId.localeCompare(right.itemId)),
  );

const toErrorText = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return trim((error as { message?: unknown }).message) || "sync_failed";
  }
  return trim(error) || "sync_failed";
};

type WarehouseReceiveFailureAssessment = {
  queueStatus: "retry_wait" | "failed_non_retryable" | "conflicted";
  errorMessage: string;
  failureClass: "offline_wait" | "retryable_sync_failure" | "failed_non_retryable" | "conflicted";
};

const classifyWarehouseReceiveFailure = (error: unknown): WarehouseReceiveFailureAssessment => {
  const normalized = classifyOfflineMutationErrorKind(error);
  const lower = normalized.message.toLowerCase();

  if (normalized.errorKind === "network_unreachable") {
    return {
      queueStatus: "retry_wait",
      errorMessage: normalized.message,
      failureClass: "offline_wait",
    };
  }

  if (
    isOfflineMutationConflictKind(normalized.errorKind) ||
    lower.includes("already received") ||
    lower.includes("already applied") ||
    lower.includes("remaining") ||
    lower.includes("left_after") ||
    lower.includes("closed") ||
    lower.includes("completed") ||
    lower.includes("cancelled") ||
    lower.includes("canceled")
  ) {
    return {
      queueStatus: "conflicted",
      errorMessage: normalized.message,
      failureClass: "conflicted",
    };
  }

  if (
    normalized.errorKind === "auth_invalid" ||
    normalized.errorKind === "contract_validation"
  ) {
    return {
      queueStatus: "failed_non_retryable",
      errorMessage: normalized.message,
      failureClass: "failed_non_retryable",
    };
  }

  return {
    queueStatus: "retry_wait",
    errorMessage: normalized.message,
    failureClass: "retryable_sync_failure",
  };
};

const markWarehouseReceiveFailureState = async (params: {
  queueId: string;
  incomingId: string;
  failure: WarehouseReceiveFailureAssessment;
}) => {
  if (params.failure.queueStatus === "conflicted") {
    const queueEntry = await markWarehouseReceiveQueueConflicted(params.queueId, params.failure.errorMessage);
    const pendingCount = await getWarehouseReceivePendingCount(params.incomingId);
    await markWarehouseReceiveDraftFailedTerminal(params.incomingId, params.failure.errorMessage, pendingCount);
    return {
      queueEntry,
      syncStatus: "failed_terminal" as const,
      queueAction: "sync_conflicted" as const,
      failureClass: "conflicted" as const,
      retryCount: queueEntry?.retryCount ?? 0,
      pendingCount,
    };
  }

  if (params.failure.queueStatus === "failed_non_retryable") {
    const queueEntry = await markWarehouseReceiveQueueFailedNonRetryable(params.queueId, params.failure.errorMessage);
    const pendingCount = await getWarehouseReceivePendingCount(params.incomingId);
    await markWarehouseReceiveDraftFailedTerminal(params.incomingId, params.failure.errorMessage, pendingCount);
    return {
      queueEntry,
      syncStatus: "failed_terminal" as const,
      queueAction: "sync_failed_non_retryable" as const,
      failureClass: "failed_non_retryable" as const,
      retryCount: queueEntry?.retryCount ?? 0,
      pendingCount,
    };
  }

  const queueEntry = await markWarehouseReceiveQueueRetryWait(params.queueId, params.failure.errorMessage);
  const pendingCount = await getWarehouseReceivePendingCount(params.incomingId);

  if (queueEntry?.status === "retry_wait") {
    await markWarehouseReceiveDraftRetryWait(
      params.incomingId,
      params.failure.errorMessage,
      pendingCount,
      { nextRetryAt: queueEntry.nextRetryAt },
    );
    return {
      queueEntry,
      syncStatus: "retry_wait" as const,
      queueAction: "sync_retry_wait" as const,
      failureClass: params.failure.failureClass,
      retryCount: queueEntry.retryCount,
      pendingCount,
    };
  }

  await markWarehouseReceiveDraftFailedTerminal(params.incomingId, params.failure.errorMessage, pendingCount);
  return {
    queueEntry,
    syncStatus: "failed_terminal" as const,
    queueAction: "sync_failed_non_retryable" as const,
    failureClass: "failed_non_retryable" as const,
    retryCount: queueEntry?.retryCount ?? 0,
    pendingCount,
  };
};

const runFlush = async (
  deps: WarehouseReceiveWorkerDeps,
  triggerSource: WarehouseReceiveWorkerTriggerSource,
): Promise<WarehouseReceiveWorkerResult> => {
  const inflightBeforeReset = (await loadWarehouseReceiveQueue()).filter((entry) => entry.status === "inflight").length;
  await resetInflightWarehouseReceiveQueue();
  const restoredInflightCount = inflightBeforeReset;
  if (restoredInflightCount > 0) {
    recordPlatformOfflineTelemetry({
      contourKey: "warehouse_receive",
      entityKey: null,
      syncStatus: "queued",
      queueAction: "reset_inflight",
      coalesced: false,
      retryCount: 0,
      pendingCount: restoredInflightCount,
      failureClass: "none",
      triggerKind: triggerSource,
      networkKnownOffline: deps.getNetworkOnline?.() === false,
      restoredAfterReopen: true,
      manualRetry: triggerSource === "manual_retry",
      durationMs: null,
    });
  }

  let processedCount = 0;
  let lastIncomingId: string | null = null;
  let lastOkCount = 0;
  let lastFailCount = 0;
  let lastLeftAfter: number | null = null;

  while (true) {
    const entry = await peekNextWarehouseReceiveQueueEntry({ triggerSource });
    if (!entry) {
      return {
        processedCount,
        remainingCount: await getWarehouseReceivePendingCount(),
        failed: false,
        errorMessage: null,
        lastIncomingId,
        lastOkCount,
        lastFailCount,
        lastLeftAfter,
        triggerSource,
      };
    }

    const inflight = await markWarehouseReceiveQueueInflight(entry.id);
    if (!inflight) continue;

    if (deps.getNetworkOnline?.() === false) {
      const failureState = await markWarehouseReceiveFailureState({
        queueId: entry.id,
        incomingId: entry.incomingId,
        failure: {
          queueStatus: "retry_wait",
          errorMessage: "offline",
          failureClass: "offline_wait",
        },
      });
      recordPlatformOfflineTelemetry({
        contourKey: "warehouse_receive",
        entityKey: entry.incomingId,
        syncStatus: failureState.syncStatus,
        queueAction: failureState.queueAction,
        coalesced: inflight.coalescedCount > 0,
        retryCount: failureState.retryCount,
        pendingCount: failureState.pendingCount,
        failureClass: failureState.failureClass,
        triggerKind: triggerSource,
        networkKnownOffline: true,
        restoredAfterReopen: false,
        manualRetry: triggerSource === "manual_retry",
        durationMs: null,
      });
      return {
        processedCount,
        remainingCount: await getWarehouseReceivePendingCount(),
        failed: true,
        errorMessage: "offline",
        lastIncomingId,
        lastOkCount,
        lastFailCount,
        lastLeftAfter,
        triggerSource,
      };
    }

    if (deps.inspectRemoteReceive) {
      try {
        const remoteTruth = await deps.inspectRemoteReceive(entry.incomingId);
        if (shouldClearLocalRecoveryState({ remoteTruth })) {
          await clearWarehouseReceiveLocalRecovery(entry.incomingId);
          recordPlatformOfflineTelemetry({
            contourKey: "warehouse_receive",
            entityKey: entry.incomingId,
            syncStatus: "synced",
            queueAction: "sync_success",
            coalesced: inflight.coalescedCount > 0,
            retryCount: inflight.retryCount,
            pendingCount: 0,
            failureClass: "none",
            triggerKind: triggerSource,
            networkKnownOffline: deps.getNetworkOnline?.() === false,
            restoredAfterReopen: restoredInflightCount > 0,
            manualRetry: triggerSource === "manual_retry",
            durationMs: null,
            errorMessage: remoteTruth?.reason ?? "terminal_remote_cleanup",
          });
          processedCount += 1;
          lastIncomingId = entry.incomingId;
          continue;
        }
      } catch (error) {
        const failure = classifyWarehouseReceiveFailure(error);
        const failureState = await markWarehouseReceiveFailureState({
          queueId: entry.id,
          incomingId: entry.incomingId,
          failure,
        });
        recordPlatformOfflineTelemetry({
          contourKey: "warehouse_receive",
          entityKey: entry.incomingId,
          syncStatus: failureState.syncStatus,
          queueAction: failureState.queueAction,
          coalesced: inflight.coalescedCount > 0,
          retryCount: failureState.retryCount,
          pendingCount: failureState.pendingCount,
          failureClass: failureState.failureClass,
          triggerKind: triggerSource,
          networkKnownOffline: deps.getNetworkOnline?.() === false,
          restoredAfterReopen: false,
          manualRetry: triggerSource === "manual_retry",
          durationMs: null,
          errorMessage: failure.errorMessage,
        });
        return {
          processedCount,
          remainingCount: await getWarehouseReceivePendingCount(),
          failed: true,
          errorMessage: failure.errorMessage,
          lastIncomingId,
          lastOkCount,
          lastFailCount,
          lastLeftAfter,
          triggerSource,
        };
      }
    }

    const warehousemanFio = trim(deps.getWarehousemanFio());
    if (!warehousemanFio) {
      const failureState = await markWarehouseReceiveFailureState({
        queueId: entry.id,
        incomingId: entry.incomingId,
        failure: {
          queueStatus: "failed_non_retryable",
          errorMessage: "\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u0435 \u0424\u0418\u041e \u043a\u043b\u0430\u0434\u043e\u0432\u0449\u0438\u043a\u0430.",
          failureClass: "failed_non_retryable",
        },
      });
      recordPlatformOfflineTelemetry({
        contourKey: "warehouse_receive",
        entityKey: entry.incomingId,
        syncStatus: failureState.syncStatus,
        queueAction: failureState.queueAction,
        coalesced: inflight.coalescedCount > 0,
        retryCount: failureState.retryCount,
        pendingCount: failureState.pendingCount,
        failureClass: failureState.failureClass,
        triggerKind: triggerSource,
        networkKnownOffline: deps.getNetworkOnline?.() === false,
        restoredAfterReopen: false,
        manualRetry: triggerSource === "manual_retry",
        durationMs: null,
        errorMessage: "warehouseman_fio_missing",
      });
      return {
        processedCount,
        remainingCount: await getWarehouseReceivePendingCount(),
        failed: true,
        errorMessage: "warehouseman_fio_missing",
        lastIncomingId,
        lastOkCount,
        lastFailCount,
        lastLeftAfter,
        triggerSource,
      };
    }

    const draftBefore = getWarehouseReceiveDraft(entry.incomingId);
    if (!draftBefore || !draftBefore.items.length) {
      const failureState = await markWarehouseReceiveFailureState({
        queueId: entry.id,
        incomingId: entry.incomingId,
        failure: {
          queueStatus: "failed_non_retryable",
          errorMessage: "warehouse_receive_draft_missing_or_empty",
          failureClass: "failed_non_retryable",
        },
      });
      recordPlatformOfflineTelemetry({
        contourKey: "warehouse_receive",
        entityKey: entry.incomingId,
        syncStatus: failureState.syncStatus,
        queueAction: failureState.queueAction,
        coalesced: inflight.coalescedCount > 0,
        retryCount: failureState.retryCount,
        pendingCount: failureState.pendingCount,
        failureClass: failureState.failureClass,
        triggerKind: triggerSource,
        networkKnownOffline: deps.getNetworkOnline?.() === false,
        restoredAfterReopen: false,
        manualRetry: triggerSource === "manual_retry",
        durationMs: null,
        errorMessage: "warehouse_receive_draft_missing_or_empty",
      });
      return {
        processedCount,
        remainingCount: await getWarehouseReceivePendingCount(),
        failed: true,
        errorMessage: "warehouse_receive_draft_missing_or_empty",
        lastIncomingId,
        lastOkCount,
        lastFailCount,
        lastLeftAfter,
        triggerSource,
      };
    }

    const snapshotKey = serializeDraftItems(draftBefore);
    const payload = draftBefore.items.map((item) => ({
      purchase_item_id: item.itemId,
      qty: Number(item.qty),
    }));
    const pendingBefore = await getWarehouseReceivePendingCount(entry.incomingId);
    await markWarehouseReceiveDraftSyncing(entry.incomingId, pendingBefore);
    recordPlatformOfflineTelemetry({
      contourKey: "warehouse_receive",
      entityKey: entry.incomingId,
      syncStatus: "syncing",
      queueAction: "sync_start",
      coalesced: inflight.coalescedCount > 0,
      retryCount: inflight.retryCount,
      pendingCount: pendingBefore,
      failureClass: "none",
      triggerKind: triggerSource,
      networkKnownOffline: deps.getNetworkOnline?.() === false,
      restoredAfterReopen: false,
      manualRetry: triggerSource === "manual_retry",
      durationMs: null,
    });
    const startedAt = Date.now();

    try {
      const { data, error } = await deps.applyReceive({
        incomingId: entry.incomingId,
        items: payload,
        warehousemanFio,
        clientMutationId: inflight.id,
      });

      if (error) throw new Error(trim(error.message) || "receive_apply_failed");

      await removeWarehouseReceiveQueueEntry(entry.id);
      processedCount += 1;
      lastIncomingId = entry.incomingId;
      lastOkCount = Number(data?.ok ?? 0);
      lastFailCount = Number(data?.fail ?? 0);
      lastLeftAfter = Number.isFinite(Number(data?.left_after)) ? Number(data?.left_after) : null;

      const draftAfter = getWarehouseReceiveDraft(entry.incomingId);
      const snapshotChangedWhileSyncing =
        draftAfter != null &&
        draftAfter.items.length > 0 &&
        serializeDraftItems(draftAfter) !== snapshotKey;

      if (snapshotChangedWhileSyncing) {
        await enqueueWarehouseReceive(entry.incomingId);
        await markWarehouseReceiveDraftQueued(
          entry.incomingId,
          await getWarehouseReceivePendingCount(entry.incomingId),
        );
      } else {
        await setWarehouseReceiveDraftItems(entry.incomingId, []);
        await markWarehouseReceiveDraftSynced(entry.incomingId, { keepItems: false, pendingCount: 0 });
      }

      recordPlatformOfflineTelemetry({
        contourKey: "warehouse_receive",
        entityKey: entry.incomingId,
        syncStatus: snapshotChangedWhileSyncing ? "queued" : "synced",
        queueAction: "sync_success",
        coalesced: inflight.coalescedCount > 0,
        retryCount: inflight.retryCount,
        pendingCount: snapshotChangedWhileSyncing ? await getWarehouseReceivePendingCount(entry.incomingId) : 0,
        failureClass: "none",
        triggerKind: triggerSource,
        networkKnownOffline: false,
        restoredAfterReopen: restoredInflightCount > 0,
        manualRetry: triggerSource === "manual_retry",
        durationMs: Date.now() - startedAt,
      });

      if (deps.refreshAfterSuccess) {
        try {
          await deps.refreshAfterSuccess(entry.incomingId);
        } catch (error) {
          const refreshErrorMessage = toErrorText(error);
          // The receive operation already succeeded on the server. UI refresh can recover later.
          recordPlatformOfflineTelemetry({
            contourKey: "warehouse_receive",
            entityKey: entry.incomingId,
            syncStatus: snapshotChangedWhileSyncing ? "queued" : "synced",
            queueAction: "refresh_after_success_failed",
            coalesced: inflight.coalescedCount > 0,
            retryCount: inflight.retryCount,
            pendingCount: snapshotChangedWhileSyncing ? await getWarehouseReceivePendingCount(entry.incomingId) : 0,
            failureClass: "ui_refresh_failure",
            triggerKind: triggerSource,
            networkKnownOffline: deps.getNetworkOnline?.() === false,
            restoredAfterReopen: restoredInflightCount > 0,
            manualRetry: triggerSource === "manual_retry",
            durationMs: Date.now() - startedAt,
            errorMessage: refreshErrorMessage,
          });
        }
      }
    } catch (error) {
      const failure = classifyWarehouseReceiveFailure(error);
      const failureState = await markWarehouseReceiveFailureState({
        queueId: entry.id,
        incomingId: entry.incomingId,
        failure,
      });
      recordPlatformOfflineTelemetry({
        contourKey: "warehouse_receive",
        entityKey: entry.incomingId,
        syncStatus: failureState.syncStatus,
        queueAction: failureState.queueAction,
        coalesced: inflight.coalescedCount > 0,
        retryCount: failureState.retryCount,
        pendingCount: failureState.pendingCount,
        failureClass: failureState.failureClass,
        triggerKind: triggerSource,
        networkKnownOffline: deps.getNetworkOnline?.() === false,
        restoredAfterReopen: false,
        manualRetry: triggerSource === "manual_retry",
        durationMs: Date.now() - startedAt,
        errorMessage: failure.errorMessage,
      });
      return {
        processedCount,
        remainingCount: await getWarehouseReceivePendingCount(),
        failed: true,
        errorMessage: failure.errorMessage,
        lastIncomingId,
        lastOkCount,
        lastFailCount,
        lastLeftAfter,
        triggerSource,
      };
    }
  }
};

export const flushWarehouseReceiveQueue = async (
  deps: WarehouseReceiveWorkerDeps,
  triggerSource: WarehouseReceiveWorkerTriggerSource,
): Promise<WarehouseReceiveWorkerResult> => {
  return await requestOfflineReplay(
    WAREHOUSE_RECEIVE_REPLAY_POLICY,
    triggerSource,
    async (scheduledTriggerSource) =>
      await runFlush(
        deps,
        scheduledTriggerSource as WarehouseReceiveWorkerTriggerSource,
      ),
  );
};
