import {
  createDefaultOfflineStorage,
  readJsonFromStorage,
  writeJsonToStorage,
  type OfflineStorageAdapter,
} from "./offlineStorage";
import {
  getOfflineMutationRetryPolicy,
  shouldProcessOfflineMutationNow,
} from "./mutation.retryPolicy";
import { recordOfflineMutationEvent } from "./mutation.telemetry";
import type {
  OfflineMutationCompatibilityStatus,
  OfflineMutationEnvelopeBase,
  OfflineMutationErrorKind,
  OfflineMutationLifecycleStatus,
} from "./mutation.types";

export type ContractorProgressQueueStatus = OfflineMutationCompatibilityStatus;

export type ContractorProgressQueueEntry = OfflineMutationEnvelopeBase & {
  progressId: string;
  type: "progress_submit";
  coalescedCount: number;
};

const STORAGE_KEY = "contractor_progress_queue_v2";
const LEGACY_STORAGE_KEY = "contractor_progress_queue_v1";
const FINAL_HISTORY_LIMIT = 20;

let storageAdapter: OfflineStorageAdapter = createDefaultOfflineStorage();

const trim = (value: unknown) => String(value ?? "").trim();

const createQueueId = () => `cpq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const CONTRACTOR_RETRY_POLICY = getOfflineMutationRetryPolicy("contractor_default");

const buildContractorProgressDedupeKey = (params: {
  progressId: string;
  baseVersion?: string | null;
  serverVersionHint?: string | null;
}) =>
  [
    "contractor_progress",
    trim(params.progressId),
    trim(params.baseVersion) || "no_local_version",
    trim(params.serverVersionHint) || "no_server_hint",
  ].join(":");

const toLifecycleStatusFromLegacy = (
  status: ContractorProgressQueueStatus,
): OfflineMutationLifecycleStatus => {
  if (status === "inflight") return "processing";
  if (status === "failed") return "retry_scheduled";
  return "queued";
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === "object" && !Array.isArray(value);

const normalizeEntry = (value: unknown): ContractorProgressQueueEntry | null => {
  if (!isRecord(value)) return null;
  const progressId = trim(value.progressId);
  if (!progressId) return null;
  const status = trim(value.status) as ContractorProgressQueueStatus;
  const lifecycleStatus =
    (trim(value.lifecycleStatus) as OfflineMutationLifecycleStatus) || toLifecycleStatusFromLegacy(status);

  return {
    id: trim(value.id) || createQueueId(),
    owner: "contractor",
    entityType: "contractor_progress",
    entityId: progressId,
    progressId,
    type: "progress_submit",
    dedupeKey:
      trim(value.dedupeKey) ||
      buildContractorProgressDedupeKey({
        progressId,
        baseVersion: trim(value.baseVersion) || null,
        serverVersionHint: trim(value.serverVersionHint) || null,
      }),
    baseVersion: trim(value.baseVersion) || null,
    serverVersionHint: trim(value.serverVersionHint) || null,
    createdAt: Number.isFinite(Number(value.createdAt)) ? Number(value.createdAt) : Date.now(),
    updatedAt: Number.isFinite(Number(value.updatedAt)) ? Number(value.updatedAt) : Date.now(),
    attemptCount: Number.isFinite(Number(value.attemptCount))
      ? Number(value.attemptCount)
      : Number.isFinite(Number(value.retryCount))
        ? Number(value.retryCount)
        : 0,
    retryCount: Number.isFinite(Number(value.retryCount)) ? Number(value.retryCount) : 0,
    status: status === "inflight" || status === "failed" ? status : "pending",
    lifecycleStatus,
    lastAttemptAt: Number.isFinite(Number(value.lastAttemptAt)) ? Number(value.lastAttemptAt) : null,
    lastError: trim(value.lastError) || null,
    lastErrorCode: trim(value.lastErrorCode) || null,
    lastErrorKind: (trim(value.lastErrorKind) as OfflineMutationErrorKind) || "none",
    nextRetryAt: Number.isFinite(Number(value.nextRetryAt)) ? Number(value.nextRetryAt) : null,
    maxAttempts: Number.isFinite(Number(value.maxAttempts))
      ? Number(value.maxAttempts)
      : CONTRACTOR_RETRY_POLICY.maxAttempts,
    coalescedCount: Number.isFinite(Number(value.coalescedCount)) ? Number(value.coalescedCount) : 0,
  };
};

const loadRawQueue = async (key: string) => await readJsonFromStorage<unknown[]>(storageAdapter, key);

const loadQueueInternal = async (): Promise<ContractorProgressQueueEntry[]> => {
  const loaded = (await loadRawQueue(STORAGE_KEY)) ?? (await loadRawQueue(LEGACY_STORAGE_KEY));
  if (!Array.isArray(loaded)) return [];
  return loaded
    .map((entry) => normalizeEntry(entry))
    .filter((entry): entry is ContractorProgressQueueEntry => Boolean(entry))
    .sort((left, right) => left.createdAt - right.createdAt);
};

const pruneQueueHistory = (entries: ContractorProgressQueueEntry[]) => {
  const active = entries.filter(
    (entry) =>
      entry.lifecycleStatus === "queued" ||
      entry.lifecycleStatus === "processing" ||
      entry.lifecycleStatus === "retry_scheduled",
  );
  const finalEntries = entries
    .filter((entry) => entry.lifecycleStatus !== "queued" && entry.lifecycleStatus !== "processing" && entry.lifecycleStatus !== "retry_scheduled")
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, FINAL_HISTORY_LIMIT);
  return [...active, ...finalEntries].sort((left, right) => left.createdAt - right.createdAt);
};

const saveQueueInternal = async (entries: ContractorProgressQueueEntry[]) => {
  const next = pruneQueueHistory(entries);
  if (!next.length) {
    await storageAdapter.removeItem(STORAGE_KEY);
    await storageAdapter.removeItem(LEGACY_STORAGE_KEY);
    return;
  }
  await writeJsonToStorage(storageAdapter, STORAGE_KEY, next);
  await storageAdapter.removeItem(LEGACY_STORAGE_KEY);
};

const updateQueueEntry = async (
  queueId: string,
  updater: (entry: ContractorProgressQueueEntry) => ContractorProgressQueueEntry,
) => {
  const queue = await loadQueueInternal();
  let nextEntry: ContractorProgressQueueEntry | null = null;
  const next = queue.map((entry) => {
    if (entry.id !== queueId) return entry;
    nextEntry = updater(entry);
    return nextEntry;
  });
  await saveQueueInternal(next);
  return nextEntry;
};

const isActiveLifecycleStatus = (status: OfflineMutationLifecycleStatus) =>
  status === "queued" || status === "processing" || status === "retry_scheduled";

export const configureContractorProgressQueue = (options?: {
  storage?: OfflineStorageAdapter;
}) => {
  storageAdapter = options?.storage ?? createDefaultOfflineStorage();
};

export const loadContractorProgressQueue = async (options?: {
  includeFinal?: boolean;
}) => {
  const queue = await loadQueueInternal();
  return options?.includeFinal ? queue : queue.filter((entry) => isActiveLifecycleStatus(entry.lifecycleStatus));
};

export const clearContractorProgressQueue = async (): Promise<ContractorProgressQueueEntry[]> => {
  await saveQueueInternal([]);
  return [];
};

export const getContractorProgressPendingCount = async (progressId?: string | null): Promise<number> => {
  const queue = await loadQueueInternal();
  const key = trim(progressId);
  const filtered = key ? queue.filter((entry) => entry.progressId === key) : queue;
  return filtered.filter((entry) => isActiveLifecycleStatus(entry.lifecycleStatus)).length;
};

export const getContractorProgressQueueEntry = async (
  progressId: string,
  options?: { includeFinal?: boolean },
): Promise<ContractorProgressQueueEntry | null> => {
  const key = trim(progressId);
  if (!key) return null;
  const queue = await loadQueueInternal();
  return (
    queue.find(
      (entry) =>
        entry.progressId === key &&
        (options?.includeFinal === true || isActiveLifecycleStatus(entry.lifecycleStatus)),
    ) ?? null
  );
};

export const resetInflightContractorProgressQueue = async (): Promise<ContractorProgressQueueEntry[]> => {
  const queue = await loadQueueInternal();
  const now = Date.now();
  const next = queue.map((entry) =>
    entry.lifecycleStatus === "processing"
      ? {
          ...entry,
          status: "pending" as const,
          lifecycleStatus: "queued" as const,
          updatedAt: now,
        }
      : entry,
  );
  const restored = next.filter(
    (entry, index) =>
      entry.lifecycleStatus === "queued" && queue[index]?.lifecycleStatus === "processing",
  );
  for (const entry of restored) {
    recordOfflineMutationEvent({
      owner: "contractor",
      entityId: entry.entityId,
      mutationId: entry.id,
      dedupeKey: entry.dedupeKey,
      lifecycleStatus: entry.lifecycleStatus,
      action: "inflight_restored",
      attemptCount: entry.attemptCount,
      retryCount: entry.retryCount,
      triggerSource: null,
      errorKind: entry.lastErrorKind,
      errorCode: entry.lastErrorCode,
      nextRetryAt: entry.nextRetryAt,
      coalescedCount: entry.coalescedCount,
      extra: null,
    });
  }
  await saveQueueInternal(next);
  return next;
};

export const enqueueContractorProgress = async (
  progressId: string,
  options?: {
    baseVersion?: string | null;
    serverVersionHint?: string | null;
  },
): Promise<ContractorProgressQueueEntry[]> => {
  const key = trim(progressId);
  if (!key) return await loadQueueInternal();

  const queue = await loadQueueInternal();
  const now = Date.now();
  const dedupeKey = buildContractorProgressDedupeKey({
    progressId: key,
    baseVersion: options?.baseVersion,
    serverVersionHint: options?.serverVersionHint,
  });
  const exactDuplicateIndex = queue.findIndex((entry) => entry.dedupeKey === dedupeKey);

  if (exactDuplicateIndex >= 0) {
    const existing = queue[exactDuplicateIndex];
    const next = [...queue];
    next[exactDuplicateIndex] = {
      ...existing,
      dedupeKey,
      baseVersion: trim(options?.baseVersion) || existing.baseVersion,
      serverVersionHint: trim(options?.serverVersionHint) || existing.serverVersionHint,
      status: existing.lifecycleStatus === "processing" ? existing.status : "pending",
      lifecycleStatus: existing.lifecycleStatus === "processing" ? existing.lifecycleStatus : "queued",
      retryCount: existing.lifecycleStatus === "processing" ? existing.retryCount : 0,
      lastError: existing.lifecycleStatus === "processing" ? existing.lastError : null,
      lastErrorCode: existing.lifecycleStatus === "processing" ? existing.lastErrorCode : null,
      lastErrorKind: existing.lifecycleStatus === "processing" ? existing.lastErrorKind : "none",
      nextRetryAt: existing.lifecycleStatus === "processing" ? existing.nextRetryAt : null,
      coalescedCount: existing.coalescedCount + 1,
      updatedAt: now,
    };
    await saveQueueInternal(next);
    recordOfflineMutationEvent({
      owner: "contractor",
      entityId: key,
      mutationId: next[exactDuplicateIndex].id,
      dedupeKey,
      lifecycleStatus: next[exactDuplicateIndex].lifecycleStatus,
      action: "dedupe_suppressed",
      attemptCount: next[exactDuplicateIndex].attemptCount,
      retryCount: next[exactDuplicateIndex].retryCount,
      triggerSource: null,
      errorKind: next[exactDuplicateIndex].lastErrorKind,
      errorCode: next[exactDuplicateIndex].lastErrorCode,
      nextRetryAt: next[exactDuplicateIndex].nextRetryAt,
      coalescedCount: next[exactDuplicateIndex].coalescedCount,
      extra: null,
    });
    return next;
  }

  const existingIndex = queue.findIndex((entry) => entry.progressId === key && entry.lifecycleStatus !== "processing");
  if (existingIndex >= 0) {
    const existing = queue[existingIndex];
    const next = [...queue];
    next[existingIndex] = {
      ...existing,
      dedupeKey,
      baseVersion: trim(options?.baseVersion) || null,
      serverVersionHint: trim(options?.serverVersionHint) || existing.serverVersionHint,
      status: "pending",
      lifecycleStatus: "queued",
      retryCount: 0,
      lastError: null,
      lastErrorCode: null,
      lastErrorKind: "none",
      nextRetryAt: null,
      coalescedCount: existing.coalescedCount + 1,
      updatedAt: now,
    };
    await saveQueueInternal(next);
    recordOfflineMutationEvent({
      owner: "contractor",
      entityId: key,
      mutationId: next[existingIndex].id,
      dedupeKey,
      lifecycleStatus: "queued",
      action: "dedupe_suppressed",
      attemptCount: next[existingIndex].attemptCount,
      retryCount: next[existingIndex].retryCount,
      triggerSource: null,
      errorKind: "none",
      errorCode: null,
      nextRetryAt: null,
      coalescedCount: next[existingIndex].coalescedCount,
      extra: null,
    });
    return next;
  }

  const nextEntry: ContractorProgressQueueEntry = {
    id: createQueueId(),
    owner: "contractor",
    entityType: "contractor_progress",
    entityId: key,
    progressId: key,
    type: "progress_submit",
    dedupeKey,
    baseVersion: trim(options?.baseVersion) || null,
    serverVersionHint: trim(options?.serverVersionHint) || null,
    createdAt: now,
    updatedAt: now,
    attemptCount: 0,
    retryCount: 0,
    status: "pending",
    lifecycleStatus: "queued",
    lastAttemptAt: null,
    lastError: null,
    lastErrorCode: null,
    lastErrorKind: "none",
    nextRetryAt: null,
    maxAttempts: CONTRACTOR_RETRY_POLICY.maxAttempts,
    coalescedCount: 0,
  };

  const next = [...queue, nextEntry].sort((left, right) => left.createdAt - right.createdAt);
  await saveQueueInternal(next);
  recordOfflineMutationEvent({
    owner: "contractor",
    entityId: nextEntry.entityId,
    mutationId: nextEntry.id,
    dedupeKey: nextEntry.dedupeKey,
    lifecycleStatus: nextEntry.lifecycleStatus,
    action: "enqueue",
    attemptCount: nextEntry.attemptCount,
    retryCount: nextEntry.retryCount,
    triggerSource: null,
    errorKind: nextEntry.lastErrorKind,
    errorCode: nextEntry.lastErrorCode,
    nextRetryAt: nextEntry.nextRetryAt,
    coalescedCount: nextEntry.coalescedCount,
    extra: null,
  });
  return next;
};

export const peekNextContractorProgressQueueEntry = async (options?: {
  triggerSource?: string | null;
  now?: number;
}): Promise<ContractorProgressQueueEntry | null> => {
  const queue = await loadQueueInternal();
  const now = Number.isFinite(options?.now ?? NaN) ? Number(options?.now) : Date.now();
  for (const entry of queue) {
    if (entry.lifecycleStatus !== "queued" && entry.lifecycleStatus !== "retry_scheduled") continue;
    if (
      options?.triggerSource === "network_back" &&
      entry.lifecycleStatus === "retry_scheduled" &&
      entry.lastErrorKind === "network_unreachable"
    ) {
      return entry;
    }
    if (
      shouldProcessOfflineMutationNow({
        lifecycleStatus: entry.lifecycleStatus,
        nextRetryAt: entry.nextRetryAt,
        triggerSource: options?.triggerSource,
        now,
      })
    ) {
      return entry;
    }
  }
  return null;
};

export const markContractorProgressQueueInflight = async (
  queueId: string,
): Promise<ContractorProgressQueueEntry | null> =>
  await updateQueueEntry(queueId, (entry) => ({
    ...entry,
    status: "inflight",
    lifecycleStatus: "processing",
    attemptCount: entry.attemptCount + 1,
    lastAttemptAt: Date.now(),
    updatedAt: Date.now(),
  }));

export const markContractorProgressQueueRetryScheduled = async (params: {
  queueId: string;
  errorMessage: string;
  errorCode: string;
  errorKind: OfflineMutationErrorKind;
  nextRetryAt: number;
}): Promise<ContractorProgressQueueEntry | null> => {
  const nextEntry = await updateQueueEntry(params.queueId, (entry) => ({
    ...entry,
    status: "failed",
    lifecycleStatus: "retry_scheduled",
    retryCount: entry.retryCount + 1,
    lastError: trim(params.errorMessage) || null,
    lastErrorCode: trim(params.errorCode) || null,
    lastErrorKind: params.errorKind,
    nextRetryAt: params.nextRetryAt,
    updatedAt: Date.now(),
  }));
  if (nextEntry) {
    recordOfflineMutationEvent({
      owner: "contractor",
      entityId: nextEntry.entityId,
      mutationId: nextEntry.id,
      dedupeKey: nextEntry.dedupeKey,
      lifecycleStatus: nextEntry.lifecycleStatus,
      action: "retry_scheduled",
      attemptCount: nextEntry.attemptCount,
      retryCount: nextEntry.retryCount,
      triggerSource: null,
      errorKind: nextEntry.lastErrorKind,
      errorCode: nextEntry.lastErrorCode,
      nextRetryAt: nextEntry.nextRetryAt,
      coalescedCount: nextEntry.coalescedCount,
      extra: null,
    });
  }
  return nextEntry;
};

export const markContractorProgressQueueConflicted = async (params: {
  queueId: string;
  errorMessage: string;
  errorCode: string;
  errorKind: OfflineMutationErrorKind;
  serverVersionHint?: string | null;
}): Promise<ContractorProgressQueueEntry | null> => {
  const nextEntry = await updateQueueEntry(params.queueId, (entry) => ({
    ...entry,
    status: "failed",
    lifecycleStatus: "conflicted",
    lastError: trim(params.errorMessage) || null,
    lastErrorCode: trim(params.errorCode) || null,
    lastErrorKind: params.errorKind,
    nextRetryAt: null,
    serverVersionHint: trim(params.serverVersionHint) || entry.serverVersionHint,
    updatedAt: Date.now(),
  }));
  if (nextEntry) {
    recordOfflineMutationEvent({
      owner: "contractor",
      entityId: nextEntry.entityId,
      mutationId: nextEntry.id,
      dedupeKey: nextEntry.dedupeKey,
      lifecycleStatus: nextEntry.lifecycleStatus,
      action: "conflict_detected",
      attemptCount: nextEntry.attemptCount,
      retryCount: nextEntry.retryCount,
      triggerSource: null,
      errorKind: nextEntry.lastErrorKind,
      errorCode: nextEntry.lastErrorCode,
      nextRetryAt: null,
      coalescedCount: nextEntry.coalescedCount,
      extra: {
        serverVersionHint: nextEntry.serverVersionHint,
      },
    });
  }
  return nextEntry;
};

export const markContractorProgressQueueFailedNonRetryable = async (params: {
  queueId: string;
  errorMessage: string;
  errorCode: string;
  errorKind: OfflineMutationErrorKind;
  exhausted?: boolean;
}): Promise<ContractorProgressQueueEntry | null> => {
  const nextEntry = await updateQueueEntry(params.queueId, (entry) => ({
    ...entry,
    status: "failed",
    lifecycleStatus: "failed_non_retryable",
    lastError: trim(params.errorMessage) || null,
    lastErrorCode: trim(params.errorCode) || null,
    lastErrorKind: params.errorKind,
    nextRetryAt: null,
    updatedAt: Date.now(),
  }));
  if (nextEntry) {
    recordOfflineMutationEvent({
      owner: "contractor",
      entityId: nextEntry.entityId,
      mutationId: nextEntry.id,
      dedupeKey: nextEntry.dedupeKey,
      lifecycleStatus: nextEntry.lifecycleStatus,
      action: params.exhausted === true ? "retry_exhausted" : "failed_non_retryable",
      attemptCount: nextEntry.attemptCount,
      retryCount: nextEntry.retryCount,
      triggerSource: null,
      errorKind: nextEntry.lastErrorKind,
      errorCode: nextEntry.lastErrorCode,
      nextRetryAt: null,
      coalescedCount: nextEntry.coalescedCount,
      extra: null,
    });
  }
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
