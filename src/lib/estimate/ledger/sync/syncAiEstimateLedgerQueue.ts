import type { AiEstimateLedgerStore } from "../AiEstimateLedgerStore";
import type { AiEstimateOfflineLedgerQueue } from "./AiEstimateOfflineQueue";
import { resolveAiEstimateSyncConflict } from "./resolveAiEstimateSyncConflict";

export type AiEstimateLedgerSyncSummary = {
  syncedCount: number;
  conflictCount: number;
  remainingQueueCount: number;
  idempotencyReusedCount: number;
};

export function syncAiEstimateLedgerQueue(input: {
  queue: AiEstimateOfflineLedgerQueue;
  store: AiEstimateLedgerStore;
}): AiEstimateLedgerSyncSummary {
  let syncedCount = 0;
  let conflictCount = 0;
  let idempotencyReusedCount = 0;
  for (const entry of input.queue.list()) {
    const estimateId = "estimateId" in entry.operation.input ? entry.operation.input.estimateId : "";
    const existing = estimateId ? input.store.getRecord(estimateId) : null;
    if (entry.operation.operationType !== "upsert_draft") {
      const conflict = resolveAiEstimateSyncConflict({
        serverRecord: existing,
        baseRevisionId: entry.baseRevisionId,
      });
      if (conflict.status === "conflict") {
        conflictCount += 1;
        continue;
      }
    }
    const result = entry.operation.operationType === "upsert_draft"
      ? input.store.upsertDraft({ ...entry.operation.input, sourceLayer: "offline_sync" })
      : entry.operation.operationType === "append_revision"
        ? input.store.appendRevision({ ...entry.operation.input, sourceLayer: "offline_sync" })
        : entry.operation.operationType === "bind_artifacts"
          ? input.store.bindArtifacts({ ...entry.operation.input, sourceLayer: "offline_sync" })
          : entry.operation.operationType === "approve_revision"
            ? input.store.approveRevision({ ...entry.operation.input, sourceLayer: "offline_sync" })
            : input.store.setStatus({ ...entry.operation.input, sourceLayer: "offline_sync" });
    if (result.idempotencyReused) idempotencyReusedCount += 1;
    input.queue.remove(entry.queueId);
    syncedCount += 1;
  }
  return {
    syncedCount,
    conflictCount,
    remainingQueueCount: input.queue.list().length,
    idempotencyReusedCount,
  };
}
