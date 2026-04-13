import {
  createDefaultOfflineStorage,
  readJsonFromStorage,
  writeJsonToStorage,
  type OfflineStorageAdapter,
} from "./offlineStorage";
import { createSerializedQueuePersistence } from "./queuePersistenceSerializer";
import type { ForemanDraftSyncTriggerSource } from "./foremanSyncRuntime";
import type { ForemanDraftMutationKind } from "../../screens/foreman/foreman.draftBoundary.helpers";
import {
  getOfflineMutationRetryPolicy,
  shouldProcessOfflineMutationNow,
} from "./mutation.retryPolicy";
import { recordOfflineMutationEvent } from "./mutation.telemetry";
import {
  type OfflineMutationCompatibilityStatus,
  type OfflineMutationEnvelopeBase,
  type OfflineMutationErrorKind,
  type OfflineMutationLifecycleStatus,
  isOfflineMutationActiveLifecycleStatus,
  isOfflineMutationFinalLifecycleStatus,
} from "./mutation.types";

export type MutationQueueStatus = OfflineMutationCompatibilityStatus;

export type ForemanMutationQueueType =
  | "add_item"
  | "update_qty"
  | "delete_item"
  | "submit_draft"
  | "cancel_draft"
  | "background_sync";

export type ForemanMutationQueueEntry = OfflineMutationEnvelopeBase & {
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
};

export type ForemanMutationQueueSummary = {
  totalCount: number;
  activeCount: number;
  pendingCount: number;
  inflightCount: number;
  failedCount: number;
  retryScheduledCount: number;
  conflictedCount: number;
  failedNonRetryableCount: number;
  coalescedCount: number;
};

const MUTATION_QUEUE_STORAGE_KEY = "offline_mutation_queue_v2";
const MUTATION_QUEUE_LEGACY_STORAGE_KEY = "offline_mutation_queue_v1";
const FINAL_HISTORY_LIMIT = 20;

let storageAdapter: OfflineStorageAdapter = createDefaultOfflineStorage();
const queuePersistence = createSerializedQueuePersistence();

const trim = (value: unknown) => String(value ?? "").trim();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === "object" && !Array.isArray(value);

const createMutationId = () =>
  `mq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const uniqueDraftKeys = (draftKeys: (string | null | undefined)[]) =>
  Array.from(new Set(draftKeys.map((key) => trim(key)).filter(Boolean)));

const FOREMAN_RETRY_POLICY = getOfflineMutationRetryPolicy("foreman_default");

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

const toLifecycleStatusFromLegacy = (
  status: MutationQueueStatus,
): OfflineMutationLifecycleStatus => {
  if (status === "inflight") return "processing";
  if (status === "failed") return "retry_scheduled";
  return "queued";
};

const toCompatibilityStatus = (
  status: OfflineMutationLifecycleStatus,
): OfflineMutationCompatibilityStatus => {
  if (status === "processing") return "inflight";
  if (status === "queued") return "pending";
  return "failed";
};

const isProcessableLifecycleStatus = (status: OfflineMutationLifecycleStatus) =>
  status === "queued" || status === "retry_scheduled";

const isMergeableLifecycleStatus = (status: OfflineMutationLifecycleStatus) => status !== "processing";

const buildForemanMutationDedupeKey = (params: {
  draftKey: string;
  mutationKind: ForemanDraftMutationKind;
  snapshotUpdatedAt?: string | null;
  submitRequested?: boolean;
}) =>
  [
    "foreman_draft",
    trim(params.draftKey),
    trim(params.mutationKind),
    trim(params.snapshotUpdatedAt) || "no_snapshot_version",
    params.submitRequested === true ? "submit" : "sync",
  ].join(":");

const normalizeEntry = (value: unknown): ForemanMutationQueueEntry | null => {
  if (!isRecord(value)) return null;
  if (value.scope !== "foreman_draft") return null;
  const payload = isRecord(value.payload) ? value.payload : null;
  if (!payload) return null;

  const type = trim(value.type) as ForemanMutationQueueType;
  const status = trim(value.status) as MutationQueueStatus;
  const lifecycleStatus =
    (trim(value.lifecycleStatus) as OfflineMutationLifecycleStatus) || toLifecycleStatusFromLegacy(status);
  const mutationKind = trim(payload.mutationKind) as ForemanDraftMutationKind;
  const draftKey = trim(payload.draftKey);
  if (!type || !status || !mutationKind || !draftKey) return null;

  return {
    id: trim(value.id) || createMutationId(),
    owner: "foreman",
    entityType: "foreman_draft",
    entityId: draftKey,
    scope: "foreman_draft",
    type,
    dedupeKey:
      trim(value.dedupeKey) ||
      buildForemanMutationDedupeKey({
        draftKey,
        mutationKind,
        snapshotUpdatedAt: trim(payload.snapshotUpdatedAt) || null,
        submitRequested: payload.submitRequested === true,
      }),
    baseVersion: trim(value.baseVersion ?? payload.snapshotUpdatedAt) || null,
    serverVersionHint: trim(value.serverVersionHint) || null,
    coalescedCount: Number.isFinite(Number(value.coalescedCount)) ? Number(value.coalescedCount) : 0,
    payload: {
      draftKey,
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
      : FOREMAN_RETRY_POLICY.maxAttempts,
  };
};

const loadRawQueue = async (key: string) => await readJsonFromStorage<unknown[]>(storageAdapter, key);

const loadQueueInternal = async (): Promise<ForemanMutationQueueEntry[]> => {
  const loaded = (await loadRawQueue(MUTATION_QUEUE_STORAGE_KEY)) ?? (await loadRawQueue(MUTATION_QUEUE_LEGACY_STORAGE_KEY));
  if (!Array.isArray(loaded)) return [];
  return loaded
    .map((entry) => normalizeEntry(entry))
    .filter((entry): entry is ForemanMutationQueueEntry => Boolean(entry))
    .sort((left, right) => left.createdAt - right.createdAt);
};

const pruneQueueHistory = (entries: ForemanMutationQueueEntry[]) => {
  const active = entries.filter((entry) => !isOfflineMutationFinalLifecycleStatus(entry.lifecycleStatus));
  const terminal = entries
    .filter((entry) => isOfflineMutationFinalLifecycleStatus(entry.lifecycleStatus))
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, FINAL_HISTORY_LIMIT);
  return [...active, ...terminal].sort((left, right) => left.createdAt - right.createdAt);
};

const saveQueueInternal = async (entries: ForemanMutationQueueEntry[]) => {
  const next = pruneQueueHistory(entries);
  if (!next.length) {
    await storageAdapter.removeItem(MUTATION_QUEUE_STORAGE_KEY);
    await storageAdapter.removeItem(MUTATION_QUEUE_LEGACY_STORAGE_KEY);
    return;
  }
  await writeJsonToStorage(storageAdapter, MUTATION_QUEUE_STORAGE_KEY, next);
  await storageAdapter.removeItem(MUTATION_QUEUE_LEGACY_STORAGE_KEY);
};

const updateQueueEntry = async (
  mutationId: string,
  updater: (entry: ForemanMutationQueueEntry) => ForemanMutationQueueEntry,
) => {
  return await queuePersistence.run(async () => {
    const queue = await loadQueueInternal();
    let nextEntry: ForemanMutationQueueEntry | null = null;
    const next = queue.map((entry) => {
      if (entry.id !== mutationId) return entry;
      nextEntry = updater(entry);
      return nextEntry;
    });
    await saveQueueInternal(next);
    return nextEntry;
  });
};

const isActiveForDraftCount = (entry: ForemanMutationQueueEntry) =>
  entry.lifecycleStatus === "queued" ||
  entry.lifecycleStatus === "processing" ||
  entry.lifecycleStatus === "retry_scheduled";

const isTerminalMutation = (type: ForemanMutationQueueType) =>
  type === "submit_draft" || type === "cancel_draft";

const createEntry = (params: {
  draftKey: string;
  requestId?: string | null;
  snapshotUpdatedAt?: string | null;
  mutationKind: ForemanDraftMutationKind;
  localBeforeCount?: number | null;
  localAfterCount?: number | null;
  submitRequested?: boolean;
  triggerSource?: ForemanDraftSyncTriggerSource;
}) => {
  const now = Date.now();
  const dedupeKey = buildForemanMutationDedupeKey({
    draftKey: params.draftKey,
    mutationKind: params.mutationKind,
    snapshotUpdatedAt: params.snapshotUpdatedAt,
    submitRequested: params.submitRequested === true,
  });
  return {
    id: createMutationId(),
    owner: "foreman" as const,
    entityType: "foreman_draft" as const,
    entityId: params.draftKey,
    scope: "foreman_draft" as const,
    type: toForemanMutationQueueType(params.mutationKind, params.submitRequested === true),
    dedupeKey,
    baseVersion: trim(params.snapshotUpdatedAt) || null,
    serverVersionHint: null,
    coalescedCount: 0,
    payload: {
      draftKey: params.draftKey,
      requestId: trim(params.requestId) || null,
      snapshotUpdatedAt: trim(params.snapshotUpdatedAt) || null,
      mutationKind: params.mutationKind,
      localBeforeCount: params.localBeforeCount ?? null,
      localAfterCount: params.localAfterCount ?? null,
      submitRequested: params.submitRequested === true,
      triggerSource: params.triggerSource ?? "unknown",
    },
    createdAt: now,
    updatedAt: now,
    attemptCount: 0,
    retryCount: 0,
    status: "pending" as const,
    lifecycleStatus: "queued" as const,
    lastAttemptAt: null,
    lastError: null,
    lastErrorCode: null,
    lastErrorKind: "none" as const,
    nextRetryAt: null,
    maxAttempts: FOREMAN_RETRY_POLICY.maxAttempts,
  } satisfies ForemanMutationQueueEntry;
};

export const configureMutationQueue = (options?: { storage?: OfflineStorageAdapter }) => {
  storageAdapter = options?.storage ?? createDefaultOfflineStorage();
  queuePersistence.reset();
};

export const loadForemanMutationQueue = async () => await queuePersistence.run(loadQueueInternal);

export const clearForemanMutationQueue = async () => {
  await queuePersistence.run(async () => {
    await saveQueueInternal([]);
  });
};

export const getForemanPendingMutationCount = async (draftKey?: string | null): Promise<number> => {
  return await queuePersistence.run(async () => {
    const queue = await loadQueueInternal();
    const key = trim(draftKey);
    const filtered = key ? queue.filter((entry) => entry.payload.draftKey === key) : queue;
    return filtered.filter(isActiveForDraftCount).length;
  });
};

export const getForemanPendingMutationCountForDraftKeys = async (
  draftKeys: (string | null | undefined)[],
): Promise<number> => {
  const keys = uniqueDraftKeys(draftKeys);
  return await queuePersistence.run(async () => {
    const queue = await loadQueueInternal();
    if (!keys.length) return queue.filter(isActiveForDraftCount).length;
    return queue.filter((entry) => keys.includes(entry.payload.draftKey) && isActiveForDraftCount(entry)).length;
  });
};

export const getForemanMutationQueueSummary = async (
  draftKeys?: (string | null | undefined)[],
): Promise<ForemanMutationQueueSummary> => {
  return await queuePersistence.run(async () => {
    const queue = await loadQueueInternal();
    const keys = uniqueDraftKeys(draftKeys ?? []);
    const filtered = keys.length ? queue.filter((entry) => keys.includes(entry.payload.draftKey)) : queue;
    return {
      totalCount: filtered.length,
      activeCount: filtered.filter((entry) => isOfflineMutationActiveLifecycleStatus(entry.lifecycleStatus)).length,
      pendingCount: filtered.filter((entry) => entry.status === "pending").length,
      inflightCount: filtered.filter((entry) => entry.status === "inflight").length,
      failedCount: filtered.filter((entry) => entry.status === "failed").length,
      retryScheduledCount: filtered.filter((entry) => entry.lifecycleStatus === "retry_scheduled").length,
      conflictedCount: filtered.filter((entry) => entry.lifecycleStatus === "conflicted").length,
      failedNonRetryableCount: filtered.filter((entry) => entry.lifecycleStatus === "failed_non_retryable").length,
      coalescedCount: filtered.reduce((sum, entry) => sum + entry.coalescedCount, 0),
    };
  });
};

export const resetInflightForemanMutations = async (): Promise<ForemanMutationQueueEntry[]> => {
  return await queuePersistence.run(async () => {
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
        owner: "foreman",
        entityId: entry.entityId,
        mutationId: entry.id,
        dedupeKey: entry.dedupeKey,
        lifecycleStatus: entry.lifecycleStatus,
        action: "inflight_restored",
        attemptCount: entry.attemptCount,
        retryCount: entry.retryCount,
        triggerSource: entry.payload.triggerSource,
        errorKind: entry.lastErrorKind,
        errorCode: entry.lastErrorCode,
        nextRetryAt: entry.nextRetryAt,
        coalescedCount: entry.coalescedCount,
        extra: null,
      });
    }
    await saveQueueInternal(next);
    return next;
  });
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
  return await queuePersistence.run(async () => {
    if (!draftKey) {
      return await loadQueueInternal();
    }

    const queue = await loadQueueInternal();
    const nextEntry = createEntry({
      ...params,
      draftKey,
    });
    const sameDraft = (entry: ForemanMutationQueueEntry) =>
      entry.scope === "foreman_draft" && entry.payload.draftKey === draftKey;

    const exactDuplicateIndex = queue.findIndex((entry) => entry.dedupeKey === nextEntry.dedupeKey);
    if (exactDuplicateIndex >= 0) {
      const existing = queue[exactDuplicateIndex];
      const updated = {
        ...existing,
        payload: nextEntry.payload,
        type: nextEntry.type,
        entityId: draftKey,
        baseVersion: nextEntry.baseVersion,
        coalescedCount: existing.coalescedCount + 1,
        lifecycleStatus:
          existing.lifecycleStatus === "processing" ? existing.lifecycleStatus : ("queued" as const),
        status: existing.lifecycleStatus === "processing" ? existing.status : ("pending" as const),
        lastError: existing.lifecycleStatus === "processing" ? existing.lastError : null,
        lastErrorCode: existing.lifecycleStatus === "processing" ? existing.lastErrorCode : null,
        lastErrorKind: existing.lifecycleStatus === "processing" ? existing.lastErrorKind : "none",
        nextRetryAt: existing.lifecycleStatus === "processing" ? existing.nextRetryAt : null,
        retryCount: existing.lifecycleStatus === "processing" ? existing.retryCount : 0,
        updatedAt: Date.now(),
      };
      const next = [...queue];
      next[exactDuplicateIndex] = updated;
      await saveQueueInternal(next);
      recordOfflineMutationEvent({
        owner: "foreman",
        entityId: updated.entityId,
        mutationId: updated.id,
        dedupeKey: updated.dedupeKey,
        lifecycleStatus: updated.lifecycleStatus,
        action: "dedupe_suppressed",
        attemptCount: updated.attemptCount,
        retryCount: updated.retryCount,
        triggerSource: updated.payload.triggerSource,
        errorKind: updated.lastErrorKind,
        errorCode: updated.lastErrorCode,
        nextRetryAt: updated.nextRetryAt,
        coalescedCount: updated.coalescedCount,
        extra: {
          mutationKind: updated.payload.mutationKind,
        },
      });
      return next;
    }

    let nextQueue = queue;
    if (isTerminalMutation(nextEntry.type)) {
      const coalescedEntries = queue.filter(
        (entry) => sameDraft(entry) && isMergeableLifecycleStatus(entry.lifecycleStatus),
      );
      nextEntry.coalescedCount = coalescedEntries.reduce((sum, entry) => sum + entry.coalescedCount + 1, 0);
      nextQueue = queue.filter(
        (entry) => !(sameDraft(entry) && isMergeableLifecycleStatus(entry.lifecycleStatus)),
      );
      nextQueue.push(nextEntry);
    } else {
      const mergeIndex = nextQueue.findIndex(
        (entry) => sameDraft(entry) && isMergeableLifecycleStatus(entry.lifecycleStatus),
      );
      if (mergeIndex >= 0) {
        nextQueue = [...nextQueue];
        nextQueue[mergeIndex] = {
          ...nextQueue[mergeIndex],
          type: nextEntry.type,
          dedupeKey: nextEntry.dedupeKey,
          baseVersion: nextEntry.baseVersion,
          entityId: draftKey,
          coalescedCount: nextQueue[mergeIndex].coalescedCount + 1,
          payload: nextEntry.payload,
          status: "pending",
          lifecycleStatus: "queued",
          retryCount: 0,
          lastError: null,
          lastErrorCode: null,
          lastErrorKind: "none",
          lastAttemptAt: null,
          nextRetryAt: null,
          updatedAt: nextEntry.updatedAt,
        };
      } else {
        nextQueue = [...nextQueue, nextEntry];
      }
    }

    nextQueue.sort((left, right) => left.createdAt - right.createdAt);
    await saveQueueInternal(nextQueue);
    const queuedEntry =
      nextQueue.find((entry) => entry.dedupeKey === nextEntry.dedupeKey) ??
      nextQueue.find((entry) => entry.entityId === draftKey) ??
      nextEntry;
    recordOfflineMutationEvent({
      owner: "foreman",
      entityId: queuedEntry.entityId,
      mutationId: queuedEntry.id,
      dedupeKey: queuedEntry.dedupeKey,
      lifecycleStatus: queuedEntry.lifecycleStatus,
      action: queuedEntry.coalescedCount > 0 ? "dedupe_suppressed" : "enqueue",
      attemptCount: queuedEntry.attemptCount,
      retryCount: queuedEntry.retryCount,
      triggerSource: queuedEntry.payload.triggerSource,
      errorKind: queuedEntry.lastErrorKind,
      errorCode: queuedEntry.lastErrorCode,
      nextRetryAt: queuedEntry.nextRetryAt,
      coalescedCount: queuedEntry.coalescedCount,
      extra: {
        mutationKind: queuedEntry.payload.mutationKind,
        submitRequested: queuedEntry.payload.submitRequested,
      },
    });
    return nextQueue;
  });
};

export const removeForemanMutationById = async (mutationId: string): Promise<ForemanMutationQueueEntry[]> => {
  return await queuePersistence.run(async () => {
    const queue = await loadQueueInternal();
    const next = queue.filter((entry) => entry.id !== mutationId);
    await saveQueueInternal(next);
    return next;
  });
};

export const clearForemanMutationsForDraft = async (draftKey: string): Promise<ForemanMutationQueueEntry[]> => {
  const key = trim(draftKey);
  return await queuePersistence.run(async () => {
    const queue = await loadQueueInternal();
    const next = queue.filter((entry) => entry.payload.draftKey !== key);
    await saveQueueInternal(next);
    return next;
  });
};

export const rekeyForemanMutations = async (
  fromDraftKey: string,
  toDraftKey: string,
): Promise<ForemanMutationQueueEntry[]> => {
  const fromKey = trim(fromDraftKey);
  const toKey = trim(toDraftKey);
  return await queuePersistence.run(async () => {
    if (!fromKey || !toKey || fromKey === toKey) {
      return await loadQueueInternal();
    }

    const queue = await loadQueueInternal();
    const next = queue.map((entry) =>
      entry.payload.draftKey === fromKey
        ? {
            ...entry,
            entityId: toKey,
            dedupeKey: entry.dedupeKey.replace(fromKey, toKey),
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
  });
};

export const peekNextForemanMutation = async (options?: {
  triggerSource?: ForemanDraftSyncTriggerSource | null;
  now?: number;
}): Promise<ForemanMutationQueueEntry | null> => {
  return await queuePersistence.run(async () => {
    const queue = await loadQueueInternal();
    const now = Number.isFinite(options?.now ?? NaN) ? Number(options?.now) : Date.now();
    for (const entry of queue) {
      if (!isProcessableLifecycleStatus(entry.lifecycleStatus)) continue;
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
          triggerSource: options?.triggerSource ?? entry.payload.triggerSource,
          now,
        })
      ) {
        return entry;
      }
    }
    return null;
  });
};

export const markForemanMutationInflight = async (
  mutationId: string,
): Promise<ForemanMutationQueueEntry | null> =>
  await updateQueueEntry(mutationId, (entry) => ({
    ...entry,
    status: "inflight",
    lifecycleStatus: "processing",
    attemptCount: entry.attemptCount + 1,
    lastAttemptAt: Date.now(),
    updatedAt: Date.now(),
  }));

export const markForemanMutationRetryScheduled = async (params: {
  mutationId: string;
  errorMessage: string;
  errorCode: string;
  errorKind: OfflineMutationErrorKind;
  nextRetryAt: number;
}): Promise<ForemanMutationQueueEntry | null> => {
  const nextEntry = await updateQueueEntry(params.mutationId, (entry) => ({
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
      owner: "foreman",
      entityId: nextEntry.entityId,
      mutationId: nextEntry.id,
      dedupeKey: nextEntry.dedupeKey,
      lifecycleStatus: nextEntry.lifecycleStatus,
      action: "retry_scheduled",
      attemptCount: nextEntry.attemptCount,
      retryCount: nextEntry.retryCount,
      triggerSource: nextEntry.payload.triggerSource,
      errorKind: nextEntry.lastErrorKind,
      errorCode: nextEntry.lastErrorCode,
      nextRetryAt: nextEntry.nextRetryAt,
      coalescedCount: nextEntry.coalescedCount,
      extra: null,
    });
  }
  return nextEntry;
};

export const markForemanMutationConflicted = async (params: {
  mutationId: string;
  errorMessage: string;
  errorCode: string;
  errorKind: OfflineMutationErrorKind;
  serverVersionHint?: string | null;
}): Promise<ForemanMutationQueueEntry | null> => {
  const nextEntry = await updateQueueEntry(params.mutationId, (entry) => ({
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
      owner: "foreman",
      entityId: nextEntry.entityId,
      mutationId: nextEntry.id,
      dedupeKey: nextEntry.dedupeKey,
      lifecycleStatus: nextEntry.lifecycleStatus,
      action: "conflict_detected",
      attemptCount: nextEntry.attemptCount,
      retryCount: nextEntry.retryCount,
      triggerSource: nextEntry.payload.triggerSource,
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

export const markForemanMutationFailedNonRetryable = async (params: {
  mutationId: string;
  errorMessage: string;
  errorCode: string;
  errorKind: OfflineMutationErrorKind;
  exhausted?: boolean;
}): Promise<ForemanMutationQueueEntry | null> => {
  const nextEntry = await updateQueueEntry(params.mutationId, (entry) => ({
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
      owner: "foreman",
      entityId: nextEntry.entityId,
      mutationId: nextEntry.id,
      dedupeKey: nextEntry.dedupeKey,
      lifecycleStatus: nextEntry.lifecycleStatus,
      action: params.exhausted === true ? "retry_exhausted" : "failed_non_retryable",
      attemptCount: nextEntry.attemptCount,
      retryCount: nextEntry.retryCount,
      triggerSource: nextEntry.payload.triggerSource,
      errorKind: nextEntry.lastErrorKind,
      errorCode: nextEntry.lastErrorCode,
      nextRetryAt: null,
      coalescedCount: nextEntry.coalescedCount,
      extra: null,
    });
  }
  return nextEntry;
};
