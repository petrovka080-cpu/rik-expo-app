import {
  createDefaultOfflineStorage,
  readJsonFromStorage,
  writeJsonToStorage,
  type OfflineStorageAdapter,
} from "./offlineStorage";

export type ContractorProgressQueueStatus = "pending" | "inflight" | "failed";

export type ContractorProgressQueueEntry = {
  id: string;
  progressId: string;
  type: "progress_submit";
  createdAt: number;
  status: ContractorProgressQueueStatus;
  retryCount: number;
  coalescedCount: number;
  lastError: string | null;
  updatedAt: number;
};

const STORAGE_KEY = "contractor_progress_queue_v1";

let storageAdapter: OfflineStorageAdapter = createDefaultOfflineStorage();

const trim = (value: unknown) => String(value ?? "").trim();

const createQueueId = () => `cpq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeEntry = (value: unknown): ContractorProgressQueueEntry | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const progressId = trim(row.progressId);
  if (!progressId) return null;
  const status = trim(row.status) as ContractorProgressQueueStatus;
  return {
    id: trim(row.id) || createQueueId(),
    progressId,
    type: "progress_submit",
    createdAt: Number.isFinite(Number(row.createdAt)) ? Number(row.createdAt) : Date.now(),
    status: status === "inflight" || status === "failed" ? status : "pending",
    retryCount: Number.isFinite(Number(row.retryCount)) ? Number(row.retryCount) : 0,
    coalescedCount: Number.isFinite(Number(row.coalescedCount)) ? Number(row.coalescedCount) : 0,
    lastError: trim(row.lastError) || null,
    updatedAt: Number.isFinite(Number(row.updatedAt)) ? Number(row.updatedAt) : Date.now(),
  };
};

const loadQueueInternal = async (): Promise<ContractorProgressQueueEntry[]> => {
  const loaded = await readJsonFromStorage<unknown[]>(storageAdapter, STORAGE_KEY);
  if (!Array.isArray(loaded)) return [];
  return loaded
    .map((entry) => normalizeEntry(entry))
    .filter((entry): entry is ContractorProgressQueueEntry => Boolean(entry))
    .sort((left, right) => left.createdAt - right.createdAt);
};

const saveQueueInternal = async (entries: ContractorProgressQueueEntry[]) => {
  if (!entries.length) {
    await storageAdapter.removeItem(STORAGE_KEY);
    return;
  }
  await writeJsonToStorage(storageAdapter, STORAGE_KEY, entries);
};

export const configureContractorProgressQueue = (options?: {
  storage?: OfflineStorageAdapter;
}) => {
  storageAdapter = options?.storage ?? createDefaultOfflineStorage();
};

export const loadContractorProgressQueue = async () => await loadQueueInternal();

export const clearContractorProgressQueue = async (): Promise<ContractorProgressQueueEntry[]> => {
  await saveQueueInternal([]);
  return [];
};

export const getContractorProgressPendingCount = async (progressId?: string | null): Promise<number> => {
  const queue = await loadQueueInternal();
  const key = trim(progressId);
  if (!key) return queue.length;
  return queue.filter((entry) => entry.progressId === key).length;
};

export const getContractorProgressQueueEntry = async (
  progressId: string,
): Promise<ContractorProgressQueueEntry | null> => {
  const key = trim(progressId);
  if (!key) return null;
  const queue = await loadQueueInternal();
  return queue.find((entry) => entry.progressId === key) ?? null;
};

export const resetInflightContractorProgressQueue = async (): Promise<ContractorProgressQueueEntry[]> => {
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

export const enqueueContractorProgress = async (progressId: string): Promise<ContractorProgressQueueEntry[]> => {
  const key = trim(progressId);
  if (!key) return await loadQueueInternal();

  const queue = await loadQueueInternal();
  const existingIndex = queue.findIndex((entry) => entry.progressId === key);
  const now = Date.now();

  if (existingIndex >= 0) {
    const existing = queue[existingIndex];
    if (existing.status === "inflight") {
      return queue;
    }

    const next = [...queue];
    next[existingIndex] = {
      ...existing,
      status: "pending",
      retryCount: 0,
      coalescedCount: existing.coalescedCount + 1,
      lastError: null,
      updatedAt: now,
    };
    await saveQueueInternal(next);
    return next;
  }

  const nextEntry: ContractorProgressQueueEntry = {
    id: createQueueId(),
    progressId: key,
    type: "progress_submit",
    createdAt: now,
    status: "pending",
    retryCount: 0,
    coalescedCount: 0,
    lastError: null,
    updatedAt: now,
  };

  const next = [...queue, nextEntry].sort((left, right) => left.createdAt - right.createdAt);
  await saveQueueInternal(next);
  return next;
};

export const peekNextContractorProgressQueueEntry = async (): Promise<ContractorProgressQueueEntry | null> => {
  const queue = await loadQueueInternal();
  return queue.find((entry) => entry.status === "pending" || entry.status === "failed") ?? null;
};

export const markContractorProgressQueueInflight = async (
  queueId: string,
): Promise<ContractorProgressQueueEntry | null> => {
  const queue = await loadQueueInternal();
  const now = Date.now();
  let nextEntry: ContractorProgressQueueEntry | null = null;
  const next = queue.map((entry) => {
    if (entry.id !== queueId) return entry;
    nextEntry = {
      ...entry,
      status: "inflight",
      updatedAt: now,
    };
    return nextEntry;
  });
  await saveQueueInternal(next);
  return nextEntry;
};

export const markContractorProgressQueueFailed = async (
  queueId: string,
  errorMessage: string,
): Promise<ContractorProgressQueueEntry | null> => {
  const queue = await loadQueueInternal();
  const now = Date.now();
  let nextEntry: ContractorProgressQueueEntry | null = null;
  const next = queue.map((entry) => {
    if (entry.id !== queueId) return entry;
    nextEntry = {
      ...entry,
      status: "failed",
      retryCount: entry.retryCount + 1,
      lastError: trim(errorMessage) || null,
      updatedAt: now,
    };
    return nextEntry;
  });
  await saveQueueInternal(next);
  return nextEntry;
};

export const removeContractorProgressQueueEntry = async (
  queueId: string,
): Promise<ContractorProgressQueueEntry[]> => {
  const queue = await loadQueueInternal();
  const next = queue.filter((entry) => entry.id !== queueId);
  await saveQueueInternal(next);
  return next;
};

export const clearContractorProgressQueueForProgress = async (
  progressId: string,
): Promise<ContractorProgressQueueEntry[]> => {
  const key = trim(progressId);
  const queue = await loadQueueInternal();
  const next = queue.filter((entry) => entry.progressId !== key);
  await saveQueueInternal(next);
  return next;
};
