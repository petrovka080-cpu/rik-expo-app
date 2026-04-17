import {
  createDefaultOfflineStorage,
  writeJsonToStorage,
  type OfflineStorageAdapter,
} from "../../lib/offline/offlineStorage";
import { createSerializedQueuePersistence } from "../../lib/offline/queuePersistenceSerializer";

export type WarehouseReceiveQueueStatus =
  | "pending"
  | "inflight"
  | "retry_wait"
  | "failed_non_retryable"
  | "conflicted";

export type WarehouseReceiveQueueEntry = {
  id: string;
  incomingId: string;
  type: "receive_apply";
  createdAt: number;
  status: WarehouseReceiveQueueStatus;
  retryCount: number;
  coalescedCount: number;
  lastError: string | null;
  nextRetryAt: number | null;
  updatedAt: number;
};

export type WarehouseReceiveQueueQuarantineReason =
  | "queue_json_parse_failed"
  | "queue_payload_not_array"
  | "queue_entry_not_object"
  | "queue_entry_missing_incoming_id";

export type WarehouseReceiveQueueQuarantineEntry = {
  id: string;
  sourceKey: string;
  reason: WarehouseReceiveQueueQuarantineReason;
  raw: unknown;
  createdAt: number;
  updatedAt: number;
};

const STORAGE_KEY = "warehouse_receive_queue_v1";
const QUARANTINE_STORAGE_KEY = "warehouse_receive_queue_quarantine_v1";

export const WAREHOUSE_RECEIVE_RETRY_POLICY = {
  maxAttempts: 5,
  baseDelayMs: 5_000,
  maxDelayMs: 60_000,
} as const;

let storageAdapter: OfflineStorageAdapter = createDefaultOfflineStorage();
const queuePersistence = createSerializedQueuePersistence();

const trim = (value: unknown) => String(value ?? "").trim();

const createQueueId = () =>
  `wrq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const createQuarantineId = () =>
  `wrq-q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === "object" && !Array.isArray(value);

const normalizeNumber = (value: unknown, fallback: number) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;

const normalizeNullableNumber = (value: unknown) =>
  value == null || trim(value) === ""
    ? null
    : Number.isFinite(Number(value))
      ? Number(value)
      : null;

export const computeWarehouseReceiveBackoffMs = (retryCount: number) =>
  Math.min(
    WAREHOUSE_RECEIVE_RETRY_POLICY.maxDelayMs,
    WAREHOUSE_RECEIVE_RETRY_POLICY.baseDelayMs * 2 ** Math.max(0, retryCount - 1),
  );

const normalizeStatus = (value: unknown): WarehouseReceiveQueueStatus | "unknown" => {
  const status = trim(value);
  if (!status) return "pending";
  if (status === "failed") return "retry_wait";
  if (
    status === "pending" ||
    status === "inflight" ||
    status === "retry_wait" ||
    status === "failed_non_retryable" ||
    status === "conflicted"
  ) {
    return status;
  }
  return "unknown";
};

const buildQuarantineEntry = (
  reason: WarehouseReceiveQueueQuarantineReason,
  raw: unknown,
): WarehouseReceiveQueueQuarantineEntry => {
  const now = Date.now();
  return {
    id: createQuarantineId(),
    sourceKey: STORAGE_KEY,
    reason,
    raw,
    createdAt: now,
    updatedAt: now,
  };
};

const normalizeQuarantineEntry = (value: unknown): WarehouseReceiveQueueQuarantineEntry | null => {
  if (!isRecord(value)) return null;
  const reason = trim(value.reason) as WarehouseReceiveQueueQuarantineReason;
  if (
    reason !== "queue_json_parse_failed" &&
    reason !== "queue_payload_not_array" &&
    reason !== "queue_entry_not_object" &&
    reason !== "queue_entry_missing_incoming_id"
  ) {
    return null;
  }
  return {
    id: trim(value.id) || createQuarantineId(),
    sourceKey: STORAGE_KEY,
    reason,
    raw: "raw" in value ? value.raw : null,
    createdAt: normalizeNumber(value.createdAt, Date.now()),
    updatedAt: normalizeNumber(value.updatedAt, Date.now()),
  };
};

const loadQuarantineInternal = async (): Promise<WarehouseReceiveQueueQuarantineEntry[]> => {
  const raw = await storageAdapter.getItem(QUARANTINE_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => normalizeQuarantineEntry(entry))
      .filter((entry): entry is WarehouseReceiveQueueQuarantineEntry => Boolean(entry))
      .sort((left, right) => left.createdAt - right.createdAt);
  } catch {
    return [];
  }
};

const saveQuarantineInternal = async (entries: WarehouseReceiveQueueQuarantineEntry[]) => {
  if (!entries.length) {
    await storageAdapter.removeItem(QUARANTINE_STORAGE_KEY);
    return;
  }
  await writeJsonToStorage(storageAdapter, QUARANTINE_STORAGE_KEY, entries);
};

const appendQuarantineInternal = async (entries: WarehouseReceiveQueueQuarantineEntry[]) => {
  if (!entries.length) return;
  const existing = await loadQuarantineInternal();
  await saveQuarantineInternal([...existing, ...entries].sort((left, right) => left.createdAt - right.createdAt));
};

const normalizeEntry = (
  value: unknown,
): { entry: WarehouseReceiveQueueEntry | null; quarantine: WarehouseReceiveQueueQuarantineEntry | null } => {
  if (!isRecord(value)) {
    return {
      entry: null,
      quarantine: buildQuarantineEntry("queue_entry_not_object", value),
    };
  }

  const incomingId = trim(value.incomingId);
  if (!incomingId) {
    return {
      entry: null,
      quarantine: buildQuarantineEntry("queue_entry_missing_incoming_id", value),
    };
  }

  const normalizedStatus = normalizeStatus(value.status);
  const status: WarehouseReceiveQueueStatus =
    normalizedStatus === "unknown" ? "failed_non_retryable" : normalizedStatus;
  const lastError =
    normalizedStatus === "unknown"
      ? trim(value.lastError) || `unknown_queue_status:${trim(value.status)}`
      : trim(value.lastError) || null;
  const nextRetryAt = status === "retry_wait" ? normalizeNullableNumber(value.nextRetryAt) : null;

  return {
    entry: {
      id: trim(value.id) || createQueueId(),
      incomingId,
      type: "receive_apply",
      createdAt: normalizeNumber(value.createdAt, Date.now()),
      status,
      retryCount: Math.max(0, normalizeNumber(value.retryCount, 0)),
      coalescedCount: Math.max(0, normalizeNumber(value.coalescedCount, 0)),
      lastError,
      nextRetryAt,
      updatedAt: normalizeNumber(value.updatedAt, Date.now()),
    },
    quarantine: null,
  };
};

const saveQueueInternal = async (entries: WarehouseReceiveQueueEntry[]) => {
  if (!entries.length) {
    await storageAdapter.removeItem(STORAGE_KEY);
    return;
  }
  await writeJsonToStorage(storageAdapter, STORAGE_KEY, entries);
};

const loadQueueInternal = async (): Promise<WarehouseReceiveQueueEntry[]> => {
  const raw = await storageAdapter.getItem(STORAGE_KEY);
  if (!raw) return [];

  let loaded: unknown;
  try {
    loaded = JSON.parse(raw) as unknown;
  } catch {
    await appendQuarantineInternal([buildQuarantineEntry("queue_json_parse_failed", raw)]);
    await storageAdapter.removeItem(STORAGE_KEY);
    return [];
  }

  if (!Array.isArray(loaded)) {
    await appendQuarantineInternal([buildQuarantineEntry("queue_payload_not_array", loaded)]);
    await storageAdapter.removeItem(STORAGE_KEY);
    return [];
  }

  const quarantine: WarehouseReceiveQueueQuarantineEntry[] = [];
  const entries = loaded
    .map((entry) => {
      const normalized = normalizeEntry(entry);
      if (normalized.quarantine) quarantine.push(normalized.quarantine);
      return normalized.entry;
    })
    .filter((entry): entry is WarehouseReceiveQueueEntry => Boolean(entry))
    .sort((left, right) => left.createdAt - right.createdAt);

  if (quarantine.length > 0) {
    await appendQuarantineInternal(quarantine);
    await saveQueueInternal(entries);
  }

  return entries;
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

export const loadWarehouseReceiveQueueQuarantine = async () =>
  await queuePersistence.run(loadQuarantineInternal);

export const clearWarehouseReceiveQueueQuarantine = async (): Promise<WarehouseReceiveQueueQuarantineEntry[]> => {
  return await queuePersistence.run(async () => {
    await saveQuarantineInternal([]);
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
            nextRetryAt: null,
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
        nextRetryAt: null,
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
      nextRetryAt: null,
      updatedAt: now,
    };

    const next = [...queue, nextEntry].sort((left, right) => left.createdAt - right.createdAt);
    await saveQueueInternal(next);
    return next;
  });
};

const shouldProcessQueueEntryNow = (
  entry: WarehouseReceiveQueueEntry,
  options?: {
    triggerSource?: string | null;
    now?: number;
  },
) => {
  if (entry.status === "pending") return true;
  if (entry.status !== "retry_wait") return false;
  if (options?.triggerSource === "manual_retry") return true;
  if (options?.triggerSource === "network_back" && entry.lastError === "offline") return true;
  if (!Number.isFinite(entry.nextRetryAt ?? NaN)) return true;
  const now = Number.isFinite(options?.now ?? NaN) ? Number(options?.now) : Date.now();
  return now >= Number(entry.nextRetryAt);
};

export const peekNextWarehouseReceiveQueueEntry = async (options?: {
  triggerSource?: string | null;
  now?: number;
}): Promise<WarehouseReceiveQueueEntry | null> => {
  return await queuePersistence.run(async () => {
    const queue = await loadQueueInternal();
    return queue.find((entry) => shouldProcessQueueEntryNow(entry, options)) ?? null;
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
        nextRetryAt: null,
        updatedAt: now,
      };
      return nextEntry;
    });
    await saveQueueInternal(next);
    return nextEntry;
  });
};

export const markWarehouseReceiveQueueRetryWait = async (
  queueId: string,
  errorMessage: string,
): Promise<WarehouseReceiveQueueEntry | null> => {
  return await queuePersistence.run(async () => {
    const queue = await loadQueueInternal();
    const now = Date.now();
    let nextEntry: WarehouseReceiveQueueEntry | null = null;
    const next = queue.map((entry) => {
      if (entry.id !== queueId) return entry;
      const retryCount = entry.retryCount + 1;
      const retryExhausted = retryCount >= WAREHOUSE_RECEIVE_RETRY_POLICY.maxAttempts;
      nextEntry = {
        ...entry,
        status: retryExhausted ? "failed_non_retryable" : "retry_wait",
        retryCount,
        lastError: trim(errorMessage) || null,
        nextRetryAt: retryExhausted ? null : now + computeWarehouseReceiveBackoffMs(retryCount),
        updatedAt: now,
      };
      return nextEntry;
    });
    await saveQueueInternal(next);
    return nextEntry;
  });
};

export const markWarehouseReceiveQueueFailed = markWarehouseReceiveQueueRetryWait;

export const markWarehouseReceiveQueueFailedNonRetryable = async (
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
        status: "failed_non_retryable",
        lastError: trim(errorMessage) || null,
        nextRetryAt: null,
        updatedAt: now,
      };
      return nextEntry;
    });
    await saveQueueInternal(next);
    return nextEntry;
  });
};

export const markWarehouseReceiveQueueConflicted = async (
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
        status: "conflicted",
        lastError: trim(errorMessage) || null,
        nextRetryAt: null,
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
