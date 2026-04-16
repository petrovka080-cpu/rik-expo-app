import { createStore } from "zustand/vanilla";

import {
  appendForemanTelemetryEvent,
  buildForemanAvailableRecoveryActions,
  shouldFlagForemanSyncAttention,
  type ForemanDraftConflictType,
  type ForemanDraftRecoveryAction,
  type ForemanDraftSyncStage,
  type ForemanDraftSyncStatus,
  type ForemanDraftSyncTelemetryEvent,
  type ForemanDraftSyncTriggerSource,
} from "../../lib/offline/foremanSyncRuntime";
import {
  createDefaultOfflineStorage,
  readJsonFromStorage,
  writeJsonToStorage,
  type OfflineStorageAdapter,
} from "../../lib/offline/offlineStorage";
import type { ForemanLocalDraftSnapshot } from "./foreman.localDraft";
import {
  buildCompactForemanLocalDraftSnapshotPayload,
  buildFullForemanLocalDraftSnapshotPayload,
  restoreForemanLocalDraftSnapshotFromPayload,
  type ForemanLocalDraftSnapshotPayload,
  type ForemanLocalDraftSnapshotPayloadMode,
} from "./foreman.localDraft.compactPayload";

export type ForemanDurableDraftRecord = {
  version: 2;
  hydrated: boolean;
  snapshot: ForemanLocalDraftSnapshot | null;
  syncStatus: ForemanDraftSyncStatus;
  lastSyncAt: number | null;
  lastError: string | null;
  lastErrorAt: number | null;
  lastErrorStage: ForemanDraftSyncStage | null;
  conflictType: ForemanDraftConflictType;
  lastConflictAt: number | null;
  retryCount: number;
  repeatedFailureStageCount: number;
  pendingOperationsCount: number;
  queueDraftKey: string | null;
  requestIdKnown: boolean;
  attentionNeeded: boolean;
  availableRecoveryActions: ForemanDraftRecoveryAction[];
  recoverableLocalSnapshot: ForemanLocalDraftSnapshot | null;
  lastTriggerSource: ForemanDraftSyncTriggerSource;
  telemetry: ForemanDraftSyncTelemetryEvent[];
  updatedAt: number | null;
};

type PersistedForemanDurableDraftRecord = Omit<
  ForemanDurableDraftRecord,
  "hydrated" | "snapshot" | "recoverableLocalSnapshot" | "version"
> & {
  version: 2 | 3;
  payloadSchemaVersion?: 1;
  snapshot?: ForemanLocalDraftSnapshot | null;
  snapshotPayload?: ForemanLocalDraftSnapshotPayload | null;
  snapshotStorageMode?: ForemanLocalDraftSnapshotPayloadMode;
  recoverableLocalSnapshot?: ForemanLocalDraftSnapshot | null;
  recoverableLocalSnapshotPayload?: ForemanLocalDraftSnapshotPayload | null;
  recoverableSnapshotStorageMode?: ForemanLocalDraftSnapshotPayloadMode;
};

const FOREMAN_DURABLE_DRAFT_STORAGE_KEY = "foreman_durable_draft_store_v2";

const initialState: ForemanDurableDraftRecord = {
  version: 2,
  hydrated: false,
  snapshot: null,
  syncStatus: "idle",
  lastSyncAt: null,
  lastError: null,
  lastErrorAt: null,
  lastErrorStage: null,
  conflictType: "none",
  lastConflictAt: null,
  retryCount: 0,
  repeatedFailureStageCount: 0,
  pendingOperationsCount: 0,
  queueDraftKey: null,
  requestIdKnown: false,
  attentionNeeded: false,
  availableRecoveryActions: [],
  recoverableLocalSnapshot: null,
  lastTriggerSource: "unknown",
  telemetry: [],
  updatedAt: null,
};

let storageAdapter: OfflineStorageAdapter = createDefaultOfflineStorage();

export const foremanDurableDraftStore = createStore<ForemanDurableDraftRecord>(() => initialState);

const toFiniteNumber = (value: unknown) => (Number.isFinite(Number(value)) ? Number(value) : null);
const toTrimmedString = (value: unknown) => String(value ?? "").trim() || null;

const buildPersistedSnapshotPayload = (
  snapshot: ForemanLocalDraftSnapshot | null,
): {
  payload: ForemanLocalDraftSnapshotPayload | null;
  legacySnapshot: ForemanLocalDraftSnapshot | null;
  mode: ForemanLocalDraftSnapshotPayloadMode;
} => {
  if (!snapshot) {
    return {
      payload: null,
      legacySnapshot: null,
      mode: "none",
    };
  }

  try {
    const compact = buildCompactForemanLocalDraftSnapshotPayload(snapshot);
    if (compact) {
      return {
        payload: compact,
        legacySnapshot: null,
        mode: "compact_v1",
      };
    }
  } catch {
    // Preserve the full payload if compact encoding ever becomes unavailable.
  }

  return {
    payload: buildFullForemanLocalDraftSnapshotPayload(snapshot),
    legacySnapshot: snapshot,
    mode: "full_v1",
  };
};

const restorePersistedSnapshot = (
  payload: unknown,
  legacySnapshot: ForemanLocalDraftSnapshot | null | undefined,
): ForemanLocalDraftSnapshot | null =>
  restoreForemanLocalDraftSnapshotFromPayload(payload) ?? legacySnapshot ?? null;

const persistState = async (state: ForemanDurableDraftRecord) => {
  const snapshotPayload = buildPersistedSnapshotPayload(state.snapshot);
  const recoverableSnapshotPayload = buildPersistedSnapshotPayload(
    state.recoverableLocalSnapshot,
  );
  const record: PersistedForemanDurableDraftRecord = {
    version: 3,
    payloadSchemaVersion: 1,
    snapshot: snapshotPayload.legacySnapshot,
    snapshotPayload: snapshotPayload.payload,
    snapshotStorageMode: snapshotPayload.mode,
    syncStatus: state.syncStatus,
    lastSyncAt: state.lastSyncAt,
    lastError: state.lastError,
    lastErrorAt: state.lastErrorAt,
    lastErrorStage: state.lastErrorStage,
    conflictType: state.conflictType,
    lastConflictAt: state.lastConflictAt,
    retryCount: state.retryCount,
    repeatedFailureStageCount: state.repeatedFailureStageCount,
    pendingOperationsCount: state.pendingOperationsCount,
    queueDraftKey: state.queueDraftKey,
    requestIdKnown: state.requestIdKnown,
    attentionNeeded: state.attentionNeeded,
    availableRecoveryActions: state.availableRecoveryActions,
    recoverableLocalSnapshot: recoverableSnapshotPayload.legacySnapshot,
    recoverableLocalSnapshotPayload: recoverableSnapshotPayload.payload,
    recoverableSnapshotStorageMode: recoverableSnapshotPayload.mode,
    lastTriggerSource: state.lastTriggerSource,
    telemetry: state.telemetry,
    updatedAt: state.updatedAt,
  };

  const isEmpty =
    !record.snapshot &&
    !record.snapshotPayload &&
    record.syncStatus === "idle" &&
    record.lastSyncAt == null &&
    !record.lastError &&
    record.lastErrorAt == null &&
    record.lastErrorStage == null &&
    record.conflictType === "none" &&
    record.lastConflictAt == null &&
    record.retryCount === 0 &&
    record.repeatedFailureStageCount === 0 &&
    record.pendingOperationsCount === 0 &&
    !record.queueDraftKey &&
    record.requestIdKnown === false &&
    record.attentionNeeded === false &&
    record.availableRecoveryActions.length === 0 &&
    !record.recoverableLocalSnapshot &&
    !record.recoverableLocalSnapshotPayload &&
    record.lastTriggerSource === "unknown" &&
    record.telemetry.length === 0 &&
    record.updatedAt == null;

  if (isEmpty) {
    await storageAdapter.removeItem(FOREMAN_DURABLE_DRAFT_STORAGE_KEY);
    return;
  }

  await writeJsonToStorage(storageAdapter, FOREMAN_DURABLE_DRAFT_STORAGE_KEY, record);
};

const setAndPersistState = async (next: ForemanDurableDraftRecord) => {
  foremanDurableDraftStore.setState(next);
  await persistState(next);
  return next;
};

const buildPatchedState = (
  previous: ForemanDurableDraftRecord,
  patch: Partial<Omit<ForemanDurableDraftRecord, "hydrated" | "version">>,
): ForemanDurableDraftRecord => {
  const next: ForemanDurableDraftRecord = {
    ...previous,
    version: 2,
    hydrated: true,
    ...patch,
    updatedAt: Date.now(),
  };

  next.availableRecoveryActions = buildForemanAvailableRecoveryActions({
    status: next.syncStatus,
    conflictType: next.conflictType,
    pendingOperationsCount: next.pendingOperationsCount,
    requestIdKnown: next.requestIdKnown,
    hasRecoverableLocalSnapshot: Boolean(next.recoverableLocalSnapshot),
    hasSnapshot: Boolean(next.snapshot),
    attentionNeeded: next.attentionNeeded,
  });

  return next;
};

export const configureForemanDurableDraftStore = (options?: {
  storage?: OfflineStorageAdapter;
}) => {
  storageAdapter = options?.storage ?? createDefaultOfflineStorage();
};

export const getForemanDurableDraftState = () => foremanDurableDraftStore.getState();

export const hydrateForemanDurableDraftStore = async (): Promise<ForemanDurableDraftRecord> => {
  const loaded = await readJsonFromStorage<Partial<PersistedForemanDurableDraftRecord>>(
    storageAdapter,
    FOREMAN_DURABLE_DRAFT_STORAGE_KEY,
  );
  const restoredSnapshot = loaded
    ? restorePersistedSnapshot(loaded.snapshotPayload, loaded.snapshot)
    : null;
  const restoredRecoverableSnapshot = loaded
    ? restorePersistedSnapshot(
        loaded.recoverableLocalSnapshotPayload,
        loaded.recoverableLocalSnapshot,
      )
    : null;

  const next: ForemanDurableDraftRecord = loaded
    ? {
        version: 2,
        hydrated: true,
        snapshot: restoredSnapshot,
        syncStatus: loaded.syncStatus ?? "idle",
        lastSyncAt: toFiniteNumber(loaded.lastSyncAt),
        lastError: toTrimmedString(loaded.lastError),
        lastErrorAt: toFiniteNumber(loaded.lastErrorAt),
        lastErrorStage: (toTrimmedString(loaded.lastErrorStage) as ForemanDraftSyncStage | null) ?? null,
        conflictType: (toTrimmedString(loaded.conflictType) as ForemanDraftConflictType | null) ?? "none",
        lastConflictAt: toFiniteNumber(loaded.lastConflictAt),
        retryCount: toFiniteNumber(loaded.retryCount) ?? 0,
        repeatedFailureStageCount: toFiniteNumber(loaded.repeatedFailureStageCount) ?? 0,
        pendingOperationsCount: toFiniteNumber(loaded.pendingOperationsCount) ?? 0,
        queueDraftKey: toTrimmedString(loaded.queueDraftKey),
        requestIdKnown: loaded.requestIdKnown === true,
        attentionNeeded: loaded.attentionNeeded === true,
        availableRecoveryActions: Array.isArray(loaded.availableRecoveryActions)
          ? (loaded.availableRecoveryActions as ForemanDraftRecoveryAction[])
          : [],
        recoverableLocalSnapshot: restoredRecoverableSnapshot,
        lastTriggerSource:
          (toTrimmedString(loaded.lastTriggerSource) as ForemanDraftSyncTriggerSource | null) ?? "unknown",
        telemetry: Array.isArray(loaded.telemetry)
          ? (loaded.telemetry as ForemanDraftSyncTelemetryEvent[])
          : [],
        updatedAt: toFiniteNumber(loaded.updatedAt),
      }
    : {
        ...initialState,
        hydrated: true,
      };

  next.availableRecoveryActions = buildForemanAvailableRecoveryActions({
    status: next.syncStatus,
    conflictType: next.conflictType,
    pendingOperationsCount: next.pendingOperationsCount,
    requestIdKnown: next.requestIdKnown,
    hasRecoverableLocalSnapshot: Boolean(next.recoverableLocalSnapshot),
    hasSnapshot: Boolean(next.snapshot),
    attentionNeeded: next.attentionNeeded,
  });

  foremanDurableDraftStore.setState(next);
  return next;
};

export const replaceForemanDurableDraftSnapshot = async (
  snapshot: ForemanLocalDraftSnapshot | null,
  options?: Partial<Omit<ForemanDurableDraftRecord, "version" | "hydrated" | "snapshot">>,
): Promise<ForemanDurableDraftRecord> => {
  const previous = getForemanDurableDraftState();
  return await setAndPersistState(
    buildPatchedState(previous, {
      snapshot,
      requestIdKnown: Boolean(snapshot?.requestId) || options?.requestIdKnown === true,
      ...options,
    }),
  );
};

export const pushForemanDurableDraftTelemetry = async (
  event: Omit<ForemanDraftSyncTelemetryEvent, "id" | "at"> & { id?: string; at?: number },
): Promise<ForemanDurableDraftRecord> => {
  const previous = getForemanDurableDraftState();
  return await setAndPersistState(
    buildPatchedState(previous, {
      telemetry: appendForemanTelemetryEvent(previous.telemetry, event),
    }),
  );
};

export const markForemanDurableDraftDirtyLocal = async (
  snapshot: ForemanLocalDraftSnapshot | null,
  options?: {
    queueDraftKey?: string | null;
    triggerSource?: ForemanDraftSyncTriggerSource;
  },
): Promise<ForemanDurableDraftRecord> => {
  const previous = getForemanDurableDraftState();
  return await replaceForemanDurableDraftSnapshot(snapshot, {
    syncStatus: snapshot ? "dirty_local" : "idle",
    queueDraftKey: options?.queueDraftKey ?? previous.queueDraftKey,
    requestIdKnown: Boolean(snapshot?.requestId),
    conflictType: snapshot ? previous.conflictType : "none",
    lastTriggerSource: options?.triggerSource ?? previous.lastTriggerSource,
  });
};

export const markForemanDurableDraftQueued = async (
  snapshot: ForemanLocalDraftSnapshot | null,
  pendingOperationsCount: number,
  options?: {
    queueDraftKey?: string | null;
    triggerSource?: ForemanDraftSyncTriggerSource;
  },
): Promise<ForemanDurableDraftRecord> =>
  await replaceForemanDurableDraftSnapshot(snapshot, {
    syncStatus: snapshot || pendingOperationsCount > 0 ? "queued" : "idle",
    pendingOperationsCount,
    queueDraftKey: options?.queueDraftKey ?? null,
    requestIdKnown: Boolean(snapshot?.requestId),
    conflictType: "none",
    lastConflictAt: null,
    attentionNeeded: false,
    lastTriggerSource: options?.triggerSource ?? "unknown",
  });

export const markForemanDurableDraftSyncStarted = async (
  pendingOperationsCount: number,
  options?: {
    queueDraftKey?: string | null;
    triggerSource?: ForemanDraftSyncTriggerSource;
  },
): Promise<ForemanDurableDraftRecord> => {
  const previous = getForemanDurableDraftState();
  return await replaceForemanDurableDraftSnapshot(previous.snapshot, {
    syncStatus: previous.snapshot || pendingOperationsCount > 0 ? "syncing" : "idle",
    pendingOperationsCount,
    queueDraftKey: options?.queueDraftKey ?? previous.queueDraftKey,
    conflictType: previous.conflictType === "retryable_sync_failure" ? previous.conflictType : "none",
    lastTriggerSource: options?.triggerSource ?? previous.lastTriggerSource,
  });
};

export const markForemanDurableDraftSyncSucceeded = async (
  snapshot: ForemanLocalDraftSnapshot | null,
  pendingOperationsCount: number,
  options?: {
    queueDraftKey?: string | null;
    triggerSource?: ForemanDraftSyncTriggerSource;
  },
): Promise<ForemanDurableDraftRecord> =>
  await replaceForemanDurableDraftSnapshot(snapshot, {
    syncStatus: snapshot ? (pendingOperationsCount > 0 ? "queued" : "synced") : "idle",
    pendingOperationsCount,
    lastSyncAt: Date.now(),
    lastError: null,
    lastErrorAt: null,
    lastErrorStage: null,
    conflictType: "none",
    lastConflictAt: null,
    retryCount: 0,
    repeatedFailureStageCount: 0,
    queueDraftKey: pendingOperationsCount > 0 ? options?.queueDraftKey ?? null : null,
    requestIdKnown: Boolean(snapshot?.requestId),
    attentionNeeded: false,
    recoverableLocalSnapshot: null,
    lastTriggerSource: options?.triggerSource ?? "unknown",
  });

export const markForemanDurableDraftSyncFailed = async (
  snapshot: ForemanLocalDraftSnapshot | null,
  error: string,
  pendingOperationsCount: number,
  options: {
    stage: ForemanDraftSyncStage;
    retryable: boolean;
    conflictType: ForemanDraftConflictType;
    queueDraftKey?: string | null;
    triggerSource?: ForemanDraftSyncTriggerSource;
    recoverableLocalSnapshot?: ForemanLocalDraftSnapshot | null;
  },
): Promise<ForemanDurableDraftRecord> => {
  const previous = getForemanDurableDraftState();
  const retryCount = previous.retryCount + 1;
  const repeatedFailureStageCount =
    previous.lastErrorStage === options.stage ? previous.repeatedFailureStageCount + 1 : 1;
  const syncStatus: ForemanDraftSyncStatus = options.retryable ? "retry_wait" : "failed_terminal";
  const attentionNeeded = shouldFlagForemanSyncAttention({
    status: syncStatus,
    conflictType: options.conflictType,
    retryCount,
    repeatedFailureStageCount,
  });

  return await replaceForemanDurableDraftSnapshot(snapshot, {
    syncStatus,
    pendingOperationsCount,
    lastError: error,
    lastErrorAt: Date.now(),
    lastErrorStage: options.stage,
    conflictType: options.conflictType,
    lastConflictAt: options.conflictType === "none" ? null : Date.now(),
    retryCount,
    repeatedFailureStageCount,
    queueDraftKey: options.queueDraftKey ?? previous.queueDraftKey,
    requestIdKnown: Boolean(snapshot?.requestId),
    attentionNeeded,
    recoverableLocalSnapshot:
      options.conflictType === "none"
        ? previous.recoverableLocalSnapshot
        : options.recoverableLocalSnapshot ?? snapshot ?? previous.recoverableLocalSnapshot,
    lastTriggerSource: options.triggerSource ?? previous.lastTriggerSource,
  });
};

export const patchForemanDurableDraftRecoveryState = async (patch: {
  snapshot?: ForemanLocalDraftSnapshot | null;
  syncStatus?: ForemanDraftSyncStatus;
  pendingOperationsCount?: number;
  queueDraftKey?: string | null;
  requestIdKnown?: boolean;
  attentionNeeded?: boolean;
  conflictType?: ForemanDraftConflictType;
  lastConflictAt?: number | null;
  recoverableLocalSnapshot?: ForemanLocalDraftSnapshot | null;
  lastError?: string | null;
  lastErrorAt?: number | null;
  lastErrorStage?: ForemanDraftSyncStage | null;
  retryCount?: number;
  repeatedFailureStageCount?: number;
  lastTriggerSource?: ForemanDraftSyncTriggerSource;
  lastSyncAt?: number | null;
}): Promise<ForemanDurableDraftRecord> => {
  const previous = getForemanDurableDraftState();
  return await setAndPersistState(
    buildPatchedState(previous, {
      snapshot: patch.snapshot === undefined ? previous.snapshot : patch.snapshot,
      syncStatus: patch.syncStatus ?? previous.syncStatus,
      pendingOperationsCount: patch.pendingOperationsCount ?? previous.pendingOperationsCount,
      queueDraftKey: patch.queueDraftKey === undefined ? previous.queueDraftKey : patch.queueDraftKey,
      requestIdKnown: patch.requestIdKnown ?? previous.requestIdKnown,
      attentionNeeded: patch.attentionNeeded ?? previous.attentionNeeded,
      conflictType: patch.conflictType ?? previous.conflictType,
      lastConflictAt: patch.lastConflictAt === undefined ? previous.lastConflictAt : patch.lastConflictAt,
      recoverableLocalSnapshot:
        patch.recoverableLocalSnapshot === undefined
          ? previous.recoverableLocalSnapshot
          : patch.recoverableLocalSnapshot,
      lastError: patch.lastError === undefined ? previous.lastError : patch.lastError,
      lastErrorAt: patch.lastErrorAt === undefined ? previous.lastErrorAt : patch.lastErrorAt,
      lastErrorStage: patch.lastErrorStage === undefined ? previous.lastErrorStage : patch.lastErrorStage,
      retryCount: patch.retryCount ?? previous.retryCount,
      repeatedFailureStageCount:
        patch.repeatedFailureStageCount ?? previous.repeatedFailureStageCount,
      lastTriggerSource: patch.lastTriggerSource ?? previous.lastTriggerSource,
      lastSyncAt: patch.lastSyncAt === undefined ? previous.lastSyncAt : patch.lastSyncAt,
    }),
  );
};

export const clearForemanDurableDraftState = async (): Promise<ForemanDurableDraftRecord> => {
  const next: ForemanDurableDraftRecord = {
    ...initialState,
    hydrated: true,
  };
  return await setAndPersistState(next);
};
