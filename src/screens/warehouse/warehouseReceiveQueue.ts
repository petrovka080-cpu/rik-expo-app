import {
  createDefaultOfflineStorage,
  readJsonFromStorage,
  writeJsonToStorage,
  type OfflineStorageAdapter,
} from "../../lib/offline/offlineStorage";
import { createSerializedQueuePersistence } from "../../lib/offline/queuePersistenceSerializer";

export type WarehouseReceiveQueueStatus = "pending" | "inflight" | "failed";

export type WarehouseReceiveQueueEntry = {
  id: string;
  incomingId: string;
  type: "receive_apply";
  createdAt: number;
  status: WarehouseReceiveQueueStatus;
  retryCount: number;
  coalescedCount: number;
  lastError: string | null;
  updatedAt: number;
};

const STORAGE_KEY = "warehouse_receive_queue_v1";

let storageAdapter: OfflineStorageAdapter = createDefaultOfflineStorage();
const queuePersistence = createSerializedQueuePersistence();

const trim = (value: unknown) => String(value ?? "").trim();

const createQueueId = () =>
  `wrq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeEntry = (value: unknown): WarehouseReceiveQueueEntry | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const incomingId = trim(row.incomingId);
  if (!incomingId) return null;
  const status = trim(row.status) as WarehouseReceiveQueueStatus;
  return {
    id: trim(row.id) || createQueueId(),
    incomingId,
    type: "receive_apply",
    createdAt: Number.isFinite(Number(row.createdAt)) ? Number(row.createdAt) : Date.now(),
    status: status === "inflight" || status === "failed" ? status : "pending",
    retryCount: Number.isFinite(Number(row.retryCount)) ? Number(row.retryCount) : 0,
    coalescedCount: Number.isFinite(Number(row.coalescedCount)) ? Number(row.coalescedCount) : 0,
    lastError: trim(row.lastError) || null,
    updatedAt: Number.isFinite(Number(row.updatedAt)) ? Number(row.updatedAt) : Date.now(),
  };
};

const loadQueueInternal = async (): Promise<WarehouseReceiveQueueEntry[]> => {
  const loaded = await readJsonFromStorage<unknown[]>(storageAdapter, STORAGE_KEY);
  if (!Array.isArray(loaded)) return [];
  return loaded
    .map((entry) => normalizeEntry(entry))
    .filter((entry): entry is WarehouseReceiveQueueEntry => Boolean(entry))
    .sort((left, right) => left.createdAt - right.createdAt);
};

const saveQueueInternal = async (entries: WarehouseReceiveQueueEntry[]) => {
  if (!entries.length) {
    await storageAdapter.removeItem(STORAGE_KEY);
    return;
  }
  await writeJsonToStorage(storageAdapter, STORAGE_KEY, entries);
};

export const configureWarehouseReceiveQueue = (options?: {
  storage?: OfflineStorageAdapter;
}) => {
  storageAdapter = options?.storage ?? createDefaultOfflineStorage();
  queuePersistence.reset();
};

export const loadWarehouseReceiveQueue = async () => await queuePersistence.run(loadQueueInternal);

export const clearWarehouseReceiveQueue = async (): Promise<WarehouseReceiveQueueEntry[]> => {
  return await queuePersistence.run(async () => {
    await saveQueueInternal([]);
    return [];
  });
};

export const getWarehouseReceivePendingCount = async (incomingId?: string | null): Promise<number> => {
  return await queuePersistence.run(async () => {
    const queue = await loadQueueInternal();
    const key = trim(incomingId);
    if (!key) return queue.length;
    return queue.filter((entry) => entry.incomingId === key).length;
  });
};

export const getWarehouseReceiveQueueEntry = async (
  incomingId: string,
): Promise<WarehouseReceiveQueueEntry | null> => {
  const key = trim(incomingId);
  if (!key) return null;
  return await queuePersistence.run(async () => {
    const queue = await loadQueueInternal();
    return queue.find((entry) => entry.incomingId === key) ?? null;
  });
};

export const resetInflightWarehouseReceiveQueue = async (): Promise<WarehouseReceiveQueueEntry[]> => {
  return await queuePersistence.run(async () => {
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
  });
};

export const enqueueWarehouseReceive = async (incomingId: string): Promise<WarehouseReceiveQueueEntry[]> => {
  const key = trim(incomingId);
  return await queuePersistence.run(async () => {
    if (!key) return await loadQueueInternal();

    const queue = await loadQueueInternal();
    const existingIndex = queue.findIndex((entry) => entry.incomingId === key);
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

    const nextEntry: WarehouseReceiveQueueEntry = {
      id: createQueueId(),
      incomingId: key,
      type: "receive_apply",
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
  });
};

export const peekNextWarehouseReceiveQueueEntry = async (): Promise<WarehouseReceiveQueueEntry | null> => {
  return await queuePersistence.run(async () => {
    const queue = await loadQueueInternal();
    return queue.find((entry) => entry.status === "pending" || entry.status === "failed") ?? null;
  });
};

export const markWarehouseReceiveQueueInflight = async (
  queueId: string,
): Promise<WarehouseReceiveQueueEntry | null> => {
  return await queuePersistence.run(async () => {
    const queue = await loadQueueInternal();
    const now = Date.now();
    let nextEntry: WarehouseReceiveQueueEntry | null = null;
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
  });
};

export const markWarehouseReceiveQueueFailed = async (
  queueId: string,
  errorMessage: string,
): Promise<WarehouseReceiveQueueEntry | null> => {
  return await queuePersistence.run(async () => {
    const queue = await loadQueueInternal();
    const now = Date.now();
    let nextEntry: WarehouseReceiveQueueEntry | null = null;
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
  });
};

export const removeWarehouseReceiveQueueEntry = async (
  queueId: string,
): Promise<WarehouseReceiveQueueEntry[]> => {
  return await queuePersistence.run(async () => {
    const queue = await loadQueueInternal();
    const next = queue.filter((entry) => entry.id !== queueId);
    await saveQueueInternal(next);
    return next;
  });
};

export const clearWarehouseReceiveQueueForIncoming = async (
  incomingId: string,
): Promise<WarehouseReceiveQueueEntry[]> => {
  const key = trim(incomingId);
  return await queuePersistence.run(async () => {
    const queue = await loadQueueInternal();
    const next = queue.filter((entry) => entry.incomingId !== key);
    await saveQueueInternal(next);
    return next;
  });
};
