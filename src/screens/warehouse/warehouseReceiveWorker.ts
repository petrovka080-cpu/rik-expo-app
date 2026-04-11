import type { RpcReceiveApplyResult } from "./warehouse.types";
import type { PlatformOfflineRetryTriggerSource } from "../../lib/offline/platformOffline.model";
import { recordPlatformOfflineTelemetry } from "../../lib/offline/platformOffline.observability";
import {
  getWarehouseReceiveDraft,
  markWarehouseReceiveDraftQueued,
  markWarehouseReceiveDraftRetryWait,
  markWarehouseReceiveDraftSynced,
  markWarehouseReceiveDraftSyncing,
  setWarehouseReceiveDraftItems,
  type WarehouseReceiveDraftRecord,
} from "./warehouse.receiveDraft.store";
import {
  clearWarehouseReceiveQueueForIncoming,
  enqueueWarehouseReceive,
  getWarehouseReceivePendingCount,
  markWarehouseReceiveQueueFailed,
  markWarehouseReceiveQueueInflight,
  loadWarehouseReceiveQueue,
  peekNextWarehouseReceiveQueueEntry,
  removeWarehouseReceiveQueueEntry,
  resetInflightWarehouseReceiveQueue,
} from "./warehouseReceiveQueue";

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
  }) => Promise<{ data: RpcReceiveApplyResult | null; error: { message?: string | null } | null }>;
  refreshAfterSuccess?: (incomingId: string) => Promise<void>;
  getNetworkOnline?: () => boolean | null;
};

let flushInFlight: Promise<WarehouseReceiveWorkerResult> | null = null;

const trim = (value: unknown) => String(value ?? "").trim();

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
    const entry = await peekNextWarehouseReceiveQueueEntry();
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
      await markWarehouseReceiveQueueFailed(entry.id, "offline");
      await markWarehouseReceiveDraftRetryWait(
        entry.incomingId,
        "offline",
        await getWarehouseReceivePendingCount(entry.incomingId),
      );
      recordPlatformOfflineTelemetry({
        contourKey: "warehouse_receive",
        entityKey: entry.incomingId,
        syncStatus: "retry_wait",
        queueAction: "sync_retry_wait",
        coalesced: inflight.coalescedCount > 0,
        retryCount: inflight.retryCount + 1,
        pendingCount: await getWarehouseReceivePendingCount(entry.incomingId),
        failureClass: "offline_wait",
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

    const warehousemanFio = trim(deps.getWarehousemanFio());
    if (!warehousemanFio) {
      await markWarehouseReceiveQueueFailed(entry.id, "warehouseman_fio_missing");
      await markWarehouseReceiveDraftRetryWait(
        entry.incomingId,
        "Сначала подтвердите ФИО кладовщика.",
        await getWarehouseReceivePendingCount(entry.incomingId),
      );
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
      await removeWarehouseReceiveQueueEntry(entry.id);
      await clearWarehouseReceiveQueueForIncoming(entry.incomingId);
      await markWarehouseReceiveDraftSynced(entry.incomingId, { keepItems: false, pendingCount: 0 });
      continue;
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
      const message = toErrorText(error);
      await markWarehouseReceiveQueueFailed(entry.id, message);
      await markWarehouseReceiveDraftRetryWait(
        entry.incomingId,
        message,
        await getWarehouseReceivePendingCount(entry.incomingId),
      );
      recordPlatformOfflineTelemetry({
        contourKey: "warehouse_receive",
        entityKey: entry.incomingId,
        syncStatus: "retry_wait",
        queueAction: "sync_retry_wait",
        coalesced: inflight.coalescedCount > 0,
        retryCount: inflight.retryCount + 1,
        pendingCount: await getWarehouseReceivePendingCount(entry.incomingId),
        failureClass: message === "offline" ? "offline_wait" : "retryable_sync_failure",
        triggerKind: triggerSource,
        networkKnownOffline: deps.getNetworkOnline?.() === false,
        restoredAfterReopen: false,
        manualRetry: triggerSource === "manual_retry",
        durationMs: Date.now() - startedAt,
      });
      return {
        processedCount,
        remainingCount: await getWarehouseReceivePendingCount(),
        failed: true,
        errorMessage: message,
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
  if (flushInFlight) {
    return await flushInFlight;
  }

  flushInFlight = runFlush(deps, triggerSource).finally(() => {
    flushInFlight = null;
  });

  return await flushInFlight;
};
