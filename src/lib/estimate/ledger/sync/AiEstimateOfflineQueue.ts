import type {
  AiEstimateLedgerAppendRevisionInput,
  AiEstimateLedgerApproveRevisionInput,
  AiEstimateLedgerBindArtifactsInput,
  AiEstimateLedgerSetStatusInput,
  AiEstimateLedgerUpsertDraftInput,
} from "../AiEstimateLedgerTypes";

export type AiEstimateOfflineLedgerOperation =
  | { operationType: "upsert_draft"; input: AiEstimateLedgerUpsertDraftInput }
  | { operationType: "append_revision"; input: AiEstimateLedgerAppendRevisionInput }
  | { operationType: "bind_artifacts"; input: AiEstimateLedgerBindArtifactsInput }
  | { operationType: "approve_revision"; input: AiEstimateLedgerApproveRevisionInput }
  | { operationType: "set_status"; input: AiEstimateLedgerSetStatusInput };

export type AiEstimateOfflineQueueEntry = {
  queueId: string;
  createdAt: string;
  baseRevisionId: string | null;
  operation: AiEstimateOfflineLedgerOperation;
};

export type AiEstimateOfflineLedgerQueue = {
  enqueue(entry: AiEstimateOfflineQueueEntry): void;
  list(): AiEstimateOfflineQueueEntry[];
  remove(queueId: string): void;
  clear(): void;
};

export function createInMemoryAiEstimateOfflineQueue(): AiEstimateOfflineLedgerQueue {
  const entries: AiEstimateOfflineQueueEntry[] = [];
  return {
    enqueue(entry) {
      if (entries.some((candidate) => candidate.queueId === entry.queueId)) return;
      entries.push(JSON.parse(JSON.stringify(entry)) as AiEstimateOfflineQueueEntry);
    },
    list() {
      return entries
        .slice()
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
        .map((entry) => JSON.parse(JSON.stringify(entry)) as AiEstimateOfflineQueueEntry);
    },
    remove(queueId) {
      const index = entries.findIndex((entry) => entry.queueId === queueId);
      if (index >= 0) entries.splice(index, 1);
    },
    clear() {
      entries.splice(0, entries.length);
    },
  };
}
