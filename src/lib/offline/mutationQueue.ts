import {
  createDefaultOfflineStorage,
  readJsonFromStorage,
  writeJsonToStorage,
  type OfflineStorageAdapter,
} from "./offlineStorage";
import type { ForemanDraftSyncTriggerSource } from "./foremanSyncRuntime";
import type { ForemanDraftMutationKind } from "../../screens/foreman/foreman.draftBoundary.helpers";

export type MutationQueueStatus = "pending" | "inflight" | "failed";

export type ForemanMutationQueueType =
  | "add_item"
  | "update_qty"
  | "delete_item"
  | "submit_draft"
  | "cancel_draft"
  | "background_sync";

export type ForemanMutationQueueEntry = {
  id: string;
  scope: "foreman_draft";
  type: ForemanMutationQueueType;
  coalescedCount: number;
  payload: {
    draftKey: string;
    requestId: string | null;
    snapshotUpdatedAt: string | null;
    mutationKind: ForemanDraftMutationKind;
    localBeforeCount: number | null;
    localAfterCount: number | null;
    submitRequested: boolean;
    triggerSource: ForemanDraftSyncTriggerSource;
  };
  createdAt: number;
  retryCount: number;
  status: MutationQueueStatus;
  lastError: string | null;
  lastAttemptAt: number | null;
  updatedAt: number;
};

const MUTATION_QUEUE_STORAGE_KEY = "offline_mutation_queue_v1";

let storageAdapter: OfflineStorageAdapter = createDefaultOfflineStorage();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === "object" && !Array.isArray(value);

const trim = (value: unknown) => String(value ?? "").trim();

const createMutationId = () =>
  `mq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const uniqueDraftKeys = (draftKeys: (string | null | undefined)[]) =>
  Array.from(new Set(draftKeys.map((key) => trim(key)).filter(Boolean)));

const toForemanMutationQueueType = (
  mutationKind: ForemanDraftMutationKind,
  submitRequested: boolean,
): ForemanMutationQueueType => {
  if (submitRequested || mutationKind === "submit") return "submit_draft";
  if (mutationKind === "whole_cancel") return "cancel_draft";
  if (mutationKind === "row_remove") return "delete_item";
  if (mutationKind === "qty_update") return "update_qty";
  if (mutationKind === "catalog_add" || mutationKind === "calc_add" || mutationKind === "ai_local_add") {
    return "add_item";
  }
  return "background_sync";
};

const normalizeEntry = (value: unknown): ForemanMutationQueueEntry | null => {
  if (!isRecord(value)) return null;
  if (value.scope !== "foreman_draft") return null;
  const payload = isRecord(value.payload) ? value.payload : null;
  if (!payload) return null;

  const type = trim(value.type) as ForemanMutationQueueType;
  const status = trim(value.status) as MutationQueueStatus;
  const mutationKind = trim(payload.mutationKind) as ForemanDraftMutationKind;
  if (!type || !status || !mutationKind) return null;

  return {
    id: trim(value.id) || createMutationId(),
    scope: "foreman_draft",
    type,
    coalescedCount: Number.isFinite(Number(value.coalescedCount)) ? Number(value.coalescedCount) : 0,
    payload: {
      draftKey: trim(payload.draftKey),
      requestId: trim(payload.requestId) || null,
      snapshotUpdatedAt: trim(payload.snapshotUpdatedAt) || null,
      mutationKind,
      localBeforeCount: Number.isFinite(Number(payload.localBeforeCount))
        ? Number(payload.localBeforeCount)
        : null,
      localAfterCount: Number.isFinite(Number(payload.localAfterCount))
        ? Number(payload.localAfterCount)
        : null,
      submitRequested: payload.submitRequested === true,
      triggerSource: (trim(payload.triggerSource) as ForemanDraftSyncTriggerSource) || "unknown",
    },
    createdAt: Number.isFinite(Number(value.createdAt)) ? Number(value.createdAt) : Date.now(),
    retryCount: Number.isFinite(Number(value.retryCount)) ? Number(value.retryCount) : 0,
    status: status === "inflight" || status === "failed" ? status : "pending",
    lastError: trim(value.lastError) || null,
    lastAttemptAt: Number.isFinite(Number(value.lastAttemptAt)) ? Number(value.lastAttemptAt) : null,
    updatedAt: Number.isFinite(Number(value.updatedAt)) ? Number(value.updatedAt) : Date.now(),
  };
};

const loadQueueInternal = async (): Promise<ForemanMutationQueueEntry[]> => {
  const loaded = await readJsonFromStorage<unknown[]>(storageAdapter, MUTATION_QUEUE_STORAGE_KEY);
  if (!Array.isArray(loaded)) return [];
  return loaded
    .map((entry) => normalizeEntry(entry))
    .filter((entry): entry is ForemanMutationQueueEntry => Boolean(entry))
    .sort((left, right) => left.createdAt - right.createdAt);
};

const saveQueueInternal = async (entries: ForemanMutationQueueEntry[]) => {
  if (!entries.length) {
    await storageAdapter.removeItem(MUTATION_QUEUE_STORAGE_KEY);
    return;
  }
  await writeJsonToStorage(storageAdapter, MUTATION_QUEUE_STORAGE_KEY, entries);
};

const isTerminalMutation = (type: ForemanMutationQueueType) =>
  type === "submit_draft" || type === "cancel_draft";

const isMergeableStatus = (status: MutationQueueStatus) => status === "pending" || status === "failed";

export const configureMutationQueue = (options?: { storage?: OfflineStorageAdapter }) => {
  storageAdapter = options?.storage ?? createDefaultOfflineStorage();
};

export const loadForemanMutationQueue = async () => await loadQueueInternal();

export const clearForemanMutationQueue = async () => {
  await saveQueueInternal([]);
};

export type ForemanMutationQueueSummary = {
  totalCount: number;
  pendingCount: number;
  inflightCount: number;
  failedCount: number;
  coalescedCount: number;
};

export const getForemanPendingMutationCount = async (draftKey?: string | null): Promise<number> => {
  const queue = await loadQueueInternal();
  const key = trim(draftKey);
  if (!key) return queue.length;
  return queue.filter((entry) => entry.payload.draftKey === key).length;
};

export const getForemanPendingMutationCountForDraftKeys = async (
  draftKeys: (string | null | undefined)[],
): Promise<number> => {
  const keys = uniqueDraftKeys(draftKeys);
  if (!keys.length) return await getForemanPendingMutationCount();
  const queue = await loadQueueInternal();
  return queue.filter((entry) => keys.includes(entry.payload.draftKey)).length;
};

export const getForemanMutationQueueSummary = async (
  draftKeys?: (string | null | undefined)[],
): Promise<ForemanMutationQueueSummary> => {
  const queue = await loadQueueInternal();
  const keys = uniqueDraftKeys(draftKeys ?? []);
  const filtered = keys.length ? queue.filter((entry) => keys.includes(entry.payload.draftKey)) : queue;
  return {
    totalCount: filtered.length,
    pendingCount: filtered.filter((entry) => entry.status === "pending").length,
    inflightCount: filtered.filter((entry) => entry.status === "inflight").length,
    failedCount: filtered.filter((entry) => entry.status === "failed").length,
    coalescedCount: filtered.reduce((sum, entry) => sum + entry.coalescedCount, 0),
  };
};

export const resetInflightForemanMutations = async (): Promise<ForemanMutationQueueEntry[]> => {
  const queue = await loadQueueInternal();
  const next = queue.map((entry) =>
    entry.status === "inflight"
      ? {
          ...entry,
          status: "pending" as const,
          updatedAt: Date.now(),
        }
      : entry,
  );
  await saveQueueInternal(next);
  return next;
};

export const enqueueForemanMutation = async (params: {
  draftKey: string;
  requestId?: string | null;
  snapshotUpdatedAt?: string | null;
  mutationKind: ForemanDraftMutationKind;
  localBeforeCount?: number | null;
  localAfterCount?: number | null;
  submitRequested?: boolean;
  triggerSource?: ForemanDraftSyncTriggerSource;
}): Promise<ForemanMutationQueueEntry[]> => {
  const draftKey = trim(params.draftKey);
  if (!draftKey) {
    return await loadQueueInternal();
  }

  const queue = await loadQueueInternal();
  const type = toForemanMutationQueueType(params.mutationKind, params.submitRequested === true);
  const now = Date.now();
  const nextEntry: ForemanMutationQueueEntry = {
    id: createMutationId(),
    scope: "foreman_draft",
    type,
    coalescedCount: 0,
    payload: {
      draftKey,
      requestId: trim(params.requestId) || null,
      snapshotUpdatedAt: trim(params.snapshotUpdatedAt) || null,
      mutationKind: params.mutationKind,
      localBeforeCount: params.localBeforeCount ?? null,
      localAfterCount: params.localAfterCount ?? null,
      submitRequested: params.submitRequested === true,
      triggerSource: params.triggerSource ?? "unknown",
    },
    createdAt: now,
    retryCount: 0,
    status: "pending",
    lastError: null,
    lastAttemptAt: null,
    updatedAt: now,
  };

  const sameDraft = (entry: ForemanMutationQueueEntry) => entry.scope === "foreman_draft" && entry.payload.draftKey === draftKey;

  let nextQueue = queue;
  if (isTerminalMutation(type)) {
    const coalescedEntries = queue.filter((entry) => sameDraft(entry) && isMergeableStatus(entry.status));
    nextEntry.coalescedCount = coalescedEntries.reduce((sum, entry) => sum + entry.coalescedCount + 1, 0);
    nextQueue = queue.filter((entry) => !(sameDraft(entry) && isMergeableStatus(entry.status)));
    nextQueue.push(nextEntry);
  } else {
    const mergeIndex = nextQueue.findIndex((entry) => sameDraft(entry) && isMergeableStatus(entry.status));
    if (mergeIndex >= 0) {
      nextQueue = [...nextQueue];
      nextQueue[mergeIndex] = {
        ...nextQueue[mergeIndex],
        type,
        coalescedCount: nextQueue[mergeIndex].coalescedCount + 1,
        payload: nextEntry.payload,
        status: "pending",
        retryCount: 0,
        lastError: null,
        lastAttemptAt: null,
        updatedAt: now,
      };
    } else {
      nextQueue = [...nextQueue, nextEntry];
    }
  }

  nextQueue.sort((left, right) => left.createdAt - right.createdAt);
  await saveQueueInternal(nextQueue);
  return nextQueue;
};

export const removeForemanMutationById = async (mutationId: string): Promise<ForemanMutationQueueEntry[]> => {
  const queue = await loadQueueInternal();
  const next = queue.filter((entry) => entry.id !== mutationId);
  await saveQueueInternal(next);
  return next;
};

export const clearForemanMutationsForDraft = async (draftKey: string): Promise<ForemanMutationQueueEntry[]> => {
  const key = trim(draftKey);
  const queue = await loadQueueInternal();
  const next = queue.filter((entry) => entry.payload.draftKey !== key);
  await saveQueueInternal(next);
  return next;
};

export const rekeyForemanMutations = async (
  fromDraftKey: string,
  toDraftKey: string,
): Promise<ForemanMutationQueueEntry[]> => {
  const fromKey = trim(fromDraftKey);
  const toKey = trim(toDraftKey);
  if (!fromKey || !toKey || fromKey === toKey) {
    return await loadQueueInternal();
  }

  const queue = await loadQueueInternal();
  const next = queue.map((entry) =>
    entry.payload.draftKey === fromKey
      ? {
          ...entry,
          payload: {
            ...entry.payload,
            draftKey: toKey,
            requestId: trim(entry.payload.requestId) || toKey,
          },
          updatedAt: Date.now(),
        }
      : entry,
  );
  await saveQueueInternal(next);
  return next;
};

export const peekNextForemanMutation = async (): Promise<ForemanMutationQueueEntry | null> => {
  const queue = await loadQueueInternal();
  return queue.find((entry) => entry.status === "pending" || entry.status === "failed") ?? null;
};

export const markForemanMutationInflight = async (
  mutationId: string,
): Promise<ForemanMutationQueueEntry | null> => {
  const queue = await loadQueueInternal();
  const now = Date.now();
  let nextEntry: ForemanMutationQueueEntry | null = null;
  const next = queue.map((entry) => {
    if (entry.id !== mutationId) return entry;
    nextEntry = {
      ...entry,
      status: "inflight",
      lastAttemptAt: now,
      updatedAt: now,
    };
    return nextEntry;
  });
  await saveQueueInternal(next);
  return nextEntry;
};

export const markForemanMutationFailed = async (
  mutationId: string,
  error: string,
): Promise<ForemanMutationQueueEntry | null> => {
  const queue = await loadQueueInternal();
  const now = Date.now();
  let nextEntry: ForemanMutationQueueEntry | null = null;
  const next = queue.map((entry) => {
    if (entry.id !== mutationId) return entry;
    nextEntry = {
      ...entry,
      status: "failed",
      retryCount: entry.retryCount + 1,
      lastError: error,
      lastAttemptAt: now,
      updatedAt: now,
    };
    return nextEntry;
  });
  await saveQueueInternal(next);
  return nextEntry;
};
