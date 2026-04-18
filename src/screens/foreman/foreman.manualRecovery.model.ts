import type { RequestDetails } from "../../lib/catalog_api";
import type {
  ForemanDraftConflictType,
  ForemanDraftRecoveryAction,
  ForemanDraftSyncStage,
  ForemanDraftSyncStatus,
  ForemanDraftSyncTelemetryEvent,
  ForemanDraftSyncTriggerSource,
} from "../../lib/offline/foremanSyncRuntime";
import type { ForemanLocalDraftSnapshot } from "./foreman.localDraft";

type ManualRecoveryDurableState = {
  snapshot: ForemanLocalDraftSnapshot | null;
  recoverableLocalSnapshot: ForemanLocalDraftSnapshot | null;
  conflictType: ForemanDraftConflictType;
  lastSyncAt: number | null;
};

type ManualRecoveryDurablePatch = {
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
};

export type ForemanManualRecoveryRemoteResult = {
  snapshot: ForemanLocalDraftSnapshot | null;
  details: RequestDetails | null;
  isTerminal: boolean;
};

export type ForemanRetryNowPlan =
  | { action: "skip" }
  | {
      action: "sync_local_draft";
      snapshot: ForemanLocalDraftSnapshot;
      mutationKind: "submit" | "background_sync";
      localBeforeCount: number;
      localAfterCount: number;
      force: true;
    };

export type ForemanRehydrateServerPlan =
  | { action: "skip"; requestId: null; currentSnapshot: ForemanLocalDraftSnapshot | null }
  | { action: "load_remote"; requestId: string; currentSnapshot: ForemanLocalDraftSnapshot | null };

export type ForemanRehydrateServerRemotePlan =
  | {
      action: "clear_terminal";
      requestId: string;
      currentSnapshot: ForemanLocalDraftSnapshot | null;
      remoteStatus: string | null;
    }
  | {
      action: "apply_remote_snapshot";
      requestId: string;
      currentSnapshot: ForemanLocalDraftSnapshot | null;
      remoteSnapshot: ForemanLocalDraftSnapshot;
      restoreIdentity: string;
      durablePatch: ManualRecoveryDurablePatch;
    }
  | {
      action: "load_remote_details";
      requestId: string;
      currentSnapshot: ForemanLocalDraftSnapshot | null;
      details: RequestDetails | null;
      durablePatch: ManualRecoveryDurablePatch;
    };

export type ForemanRestoreLocalPlan =
  | { action: "skip" }
  | {
      action: "restore_local_snapshot";
      snapshot: ForemanLocalDraftSnapshot;
      restoreIdentity: string;
      conflictType: ForemanDraftConflictType;
      durablePatch: ManualRecoveryDurablePatch;
    };

export type ForemanDiscardLocalPlan =
  | {
      action: "clear_local_without_remote";
      requestId: null;
      currentSnapshot: ForemanLocalDraftSnapshot | null;
      durablePatch: ManualRecoveryDurablePatch;
    }
  | { action: "load_remote"; requestId: string; currentSnapshot: ForemanLocalDraftSnapshot | null };

export type ForemanDiscardLocalRemotePlan =
  | {
      action: "clear_terminal";
      requestId: string;
      currentSnapshot: ForemanLocalDraftSnapshot | null;
      remoteStatus: string | null;
    }
  | {
      action: "apply_remote_snapshot";
      requestId: string;
      currentSnapshot: ForemanLocalDraftSnapshot | null;
      remoteSnapshot: ForemanLocalDraftSnapshot;
      restoreIdentity: string;
      durablePatch: ManualRecoveryDurablePatch;
    }
  | {
      action: "load_remote_details";
      requestId: string;
      currentSnapshot: ForemanLocalDraftSnapshot | null;
      details: RequestDetails | null;
      durablePatch: ManualRecoveryDurablePatch;
    };

export type ForemanClearFailedQueueTailPlan = {
  action: "clear_queue_tail";
  snapshot: ForemanLocalDraftSnapshot | null;
  triggerSource: "manual_retry";
};

export const FOREMAN_MANUAL_RECOVERY_TELEMETRY_COMMANDS = [
  "push_recovery_telemetry",
] as const;

export type ForemanManualRecoveryTelemetryPlan = {
  action: "push_recovery_telemetry";
  commands: typeof FOREMAN_MANUAL_RECOVERY_TELEMETRY_COMMANDS;
  telemetry: Omit<ForemanDraftSyncTelemetryEvent, "id" | "at">;
};

const trim = (value: unknown): string => String(value ?? "").trim();

const hasSnapshotContent = (snapshot: ForemanLocalDraftSnapshot | null | undefined): boolean => {
  if (!snapshot) return false;
  if (snapshot.items.length > 0) return true;
  if (snapshot.pendingDeletes.length > 0) return true;
  if (snapshot.submitRequested) return true;
  return Boolean(
    trim(snapshot.requestId) ||
      trim(snapshot.header.foreman) ||
      trim(snapshot.header.comment) ||
      trim(snapshot.header.objectType) ||
      trim(snapshot.header.level) ||
      trim(snapshot.header.system) ||
      trim(snapshot.header.zone),
  );
};

const buildSyncedRemotePatch = (params: {
  snapshot: ForemanLocalDraftSnapshot;
  recoverableLocalSnapshot: ForemanLocalDraftSnapshot | null;
  now: number;
}): ManualRecoveryDurablePatch => ({
  snapshot: params.snapshot,
  syncStatus: "synced",
  pendingOperationsCount: 0,
  queueDraftKey: null,
  requestIdKnown: true,
  attentionNeeded: false,
  conflictType: "none",
  lastConflictAt: null,
  recoverableLocalSnapshot: params.recoverableLocalSnapshot,
  lastError: null,
  lastErrorAt: null,
  lastErrorStage: null,
  retryCount: 0,
  repeatedFailureStageCount: 0,
  lastTriggerSource: "manual_retry",
  lastSyncAt: params.now,
});

const buildIdleRemoteDetailsPatch = (params: {
  requestId: string | null;
  recoverableLocalSnapshot: ForemanLocalDraftSnapshot | null;
  now: number | null;
}): ManualRecoveryDurablePatch => ({
  snapshot: null,
  syncStatus: "idle",
  pendingOperationsCount: 0,
  queueDraftKey: null,
  requestIdKnown: Boolean(params.requestId),
  attentionNeeded: false,
  conflictType: "none",
  lastConflictAt: null,
  recoverableLocalSnapshot: params.recoverableLocalSnapshot,
  lastError: null,
  lastErrorAt: null,
  lastErrorStage: null,
  retryCount: 0,
  repeatedFailureStageCount: 0,
  lastTriggerSource: "manual_retry",
  lastSyncAt: params.now,
});

const resolveTargetRequestId = (params: {
  currentSnapshot: ForemanLocalDraftSnapshot | null;
  requestId: string | number | null | undefined;
}): string | null => trim(params.currentSnapshot?.requestId) || trim(params.requestId) || null;

export const planForemanRetryNowAction = (params: {
  snapshot: ForemanLocalDraftSnapshot | null;
}): ForemanRetryNowPlan => {
  if (!hasSnapshotContent(params.snapshot)) return { action: "skip" };
  const snapshot = params.snapshot;
  return {
    action: "sync_local_draft",
    snapshot,
    mutationKind: snapshot.submitRequested ? "submit" : "background_sync",
    localBeforeCount: snapshot.items.length,
    localAfterCount: snapshot.items.length,
    force: true,
  };
};

export const planForemanRehydrateServerAction = (params: {
  currentSnapshot: ForemanLocalDraftSnapshot | null;
  requestId: string | number | null | undefined;
}): ForemanRehydrateServerPlan => {
  const requestId = resolveTargetRequestId(params);
  if (!requestId) {
    return { action: "skip", requestId: null, currentSnapshot: params.currentSnapshot };
  }
  return { action: "load_remote", requestId, currentSnapshot: params.currentSnapshot };
};

export const planForemanRehydrateServerRemoteAction = (params: {
  requestId: string;
  currentSnapshot: ForemanLocalDraftSnapshot | null;
  remote: ForemanManualRecoveryRemoteResult;
  now: number;
}): ForemanRehydrateServerRemotePlan => {
  if (params.remote.isTerminal) {
    return {
      action: "clear_terminal",
      requestId: params.requestId,
      currentSnapshot: params.currentSnapshot,
      remoteStatus: params.remote.details?.status ?? null,
    };
  }

  if (params.remote.snapshot) {
    return {
      action: "apply_remote_snapshot",
      requestId: params.requestId,
      currentSnapshot: params.currentSnapshot,
      remoteSnapshot: params.remote.snapshot,
      restoreIdentity: `manual:remote:${params.requestId}`,
      durablePatch: buildSyncedRemotePatch({
        snapshot: params.remote.snapshot,
        recoverableLocalSnapshot: params.currentSnapshot,
        now: params.now,
      }),
    };
  }

  return {
    action: "load_remote_details",
    requestId: params.requestId,
    currentSnapshot: params.currentSnapshot,
    details: params.remote.details,
    durablePatch: buildIdleRemoteDetailsPatch({
      requestId: params.requestId,
      recoverableLocalSnapshot: params.currentSnapshot,
      now: params.now,
    }),
  };
};

export const planForemanRestoreLocalAction = (params: {
  durableState: Pick<ManualRecoveryDurableState, "recoverableLocalSnapshot">;
  now: number;
}): ForemanRestoreLocalPlan => {
  const snapshot = params.durableState.recoverableLocalSnapshot;
  if (!hasSnapshotContent(snapshot)) return { action: "skip" };

  const conflictType: ForemanDraftConflictType = snapshot.requestId
    ? "stale_local_snapshot"
    : "retryable_sync_failure";

  return {
    action: "restore_local_snapshot",
    snapshot,
    restoreIdentity: `manual:restore:${snapshot.updatedAt}`,
    conflictType,
    durablePatch: {
      snapshot,
      syncStatus: "dirty_local",
      pendingOperationsCount: 0,
      queueDraftKey: null,
      requestIdKnown: Boolean(snapshot.requestId),
      attentionNeeded: true,
      conflictType,
      lastConflictAt: params.now,
      recoverableLocalSnapshot: null,
      lastTriggerSource: "manual_retry",
    },
  };
};

export const planForemanDiscardLocalAction = (params: {
  durableState: Pick<ManualRecoveryDurableState, "lastSyncAt">;
  currentSnapshot: ForemanLocalDraftSnapshot | null;
  requestId: string | number | null | undefined;
}): ForemanDiscardLocalPlan => {
  const requestId = resolveTargetRequestId(params);
  if (requestId) {
    return { action: "load_remote", requestId, currentSnapshot: params.currentSnapshot };
  }
  return {
    action: "clear_local_without_remote",
    requestId: null,
    currentSnapshot: params.currentSnapshot,
    durablePatch: buildIdleRemoteDetailsPatch({
      requestId: null,
      recoverableLocalSnapshot: null,
      now: params.durableState.lastSyncAt,
    }),
  };
};

export const planForemanDiscardLocalRemoteAction = (params: {
  requestId: string;
  currentSnapshot: ForemanLocalDraftSnapshot | null;
  remote: ForemanManualRecoveryRemoteResult;
  now: number;
}): ForemanDiscardLocalRemotePlan => {
  if (params.remote.isTerminal) {
    return {
      action: "clear_terminal",
      requestId: params.requestId,
      currentSnapshot: params.currentSnapshot,
      remoteStatus: params.remote.details?.status ?? null,
    };
  }

  if (params.remote.snapshot) {
    return {
      action: "apply_remote_snapshot",
      requestId: params.requestId,
      currentSnapshot: params.currentSnapshot,
      remoteSnapshot: params.remote.snapshot,
      restoreIdentity: `manual:discard:${params.requestId}`,
      durablePatch: buildSyncedRemotePatch({
        snapshot: params.remote.snapshot,
        recoverableLocalSnapshot: null,
        now: params.now,
      }),
    };
  }

  return {
    action: "load_remote_details",
    requestId: params.requestId,
    currentSnapshot: params.currentSnapshot,
    details: params.remote.details,
    durablePatch: buildIdleRemoteDetailsPatch({
      requestId: params.requestId,
      recoverableLocalSnapshot: null,
      now: params.now,
    }),
  };
};

export const planForemanClearFailedQueueTailAction = (params: {
  snapshot: ForemanLocalDraftSnapshot | null;
}): ForemanClearFailedQueueTailPlan => ({
  action: "clear_queue_tail",
  snapshot: params.snapshot,
  triggerSource: "manual_retry",
});

export const resolveForemanManualRecoveryTelemetryPlan = (params: {
  snapshot: ForemanLocalDraftSnapshot | null;
  draftKey: string;
  durableState: {
    conflictType: ForemanDraftConflictType;
    retryCount: number;
    pendingOperationsCount: number;
  };
  recoveryAction: ForemanDraftRecoveryAction;
  result: "progress" | "success" | "retryable_failure" | "terminal_failure";
  conflictType?: ForemanDraftConflictType;
  errorClass?: string | null;
  errorCode?: string | null;
  networkOnline: boolean | null | undefined;
  localOnlyRequestId: string;
}): ForemanManualRecoveryTelemetryPlan => ({
  action: "push_recovery_telemetry",
  commands: FOREMAN_MANUAL_RECOVERY_TELEMETRY_COMMANDS,
  telemetry: {
    stage: "recovery",
    result: params.result,
    draftKey: params.draftKey,
    requestId: trim(params.snapshot?.requestId) || null,
    localOnlyDraftKey: params.draftKey === params.localOnlyRequestId,
    attemptNumber: params.durableState.retryCount + 1,
    queueSizeBefore: params.durableState.pendingOperationsCount,
    queueSizeAfter: params.durableState.pendingOperationsCount,
    coalescedCount: 0,
    conflictType: params.conflictType ?? params.durableState.conflictType,
    recoveryAction: params.recoveryAction,
    errorClass: params.errorClass ?? null,
    errorCode: params.errorCode ?? null,
    offlineState: params.networkOnline === true ? "online" : params.networkOnline === false ? "offline" : "unknown",
    triggerSource: "manual_retry",
  },
});
