import type {
  ForemanDraftConflictType,
  ForemanDraftSyncStatus,
} from "../../lib/offline/foremanSyncRuntime";
import type { ForemanLocalDraftSnapshot } from "./foreman.localDraft";

export type ForemanBootstrapOwnerPlan =
  | { action: "set_owner"; ownerId: string }
  | { action: "reset_owner" }
  | { action: "keep_owner" };

export type ForemanBootstrapReconciliationPlan =
  | { action: "skip_remote_check"; requestId: null; remoteStatus: null }
  | { action: "preserve"; requestId: string; remoteStatus: string | null }
  | { action: "clear_terminal"; requestId: string; remoteStatus: string };

export type ForemanBootstrapReenqueuePlan =
  | { shouldEnqueue: false; mutationKind: null }
  | { shouldEnqueue: true; mutationKind: "submit" | "background_sync" };

export type ForemanBootstrapStaleDurableResetPatch = {
  snapshot: null;
  syncStatus: "idle";
  pendingOperationsCount: 0;
  queueDraftKey: null;
  requestIdKnown: false;
  attentionNeeded: false;
  conflictType: "none";
  lastConflictAt: null;
  recoverableLocalSnapshot: null;
  lastError: null;
  lastErrorAt: null;
  lastErrorStage: null;
  retryCount: 0;
  repeatedFailureStageCount: 0;
  lastTriggerSource: "bootstrap_complete";
  lastSyncAt: number | null;
};

export type ForemanBootstrapCompletionStartPlan =
  | {
      action: "reset_stale_durable";
      durablePatch: ForemanBootstrapStaleDurableResetPatch;
      activeOwnerReset: { nextOwnerId: undefined; resetSubmitted: true };
      resetDraftState: true;
      clearLocalSnapshotRef: true;
      nextLocalSnapshot: null;
      refreshBoundarySnapshot: null;
    }
  | {
      action: "continue";
      ownerPlan: ForemanBootstrapOwnerPlan;
      hasDurableSnapshotContent: boolean;
    };

type ForemanBootstrapStaleDurableResetPlan = Extract<
  ForemanBootstrapCompletionStartPlan,
  { action: "reset_stale_durable" }
>;

export type ForemanBootstrapStaleDurableResetDevTelemetry = {
  syncStatus: ForemanDraftSyncStatus;
  attentionNeeded: boolean;
  conflictType: ForemanDraftConflictType;
  pendingOps: number;
  retryCount: number;
};

export type ForemanBootstrapStaleDurableResetExecutionPlan = Omit<
  ForemanBootstrapStaleDurableResetPlan,
  "action"
> & {
  devTelemetry: ForemanBootstrapStaleDurableResetDevTelemetry;
};

export type ForemanBootstrapReenqueueCommandPlan =
  | { action: "skip_reenqueue"; refreshBoundarySnapshot: ForemanLocalDraftSnapshot | null }
  | {
      action: "reenqueue";
      enqueue: {
        draftKey: string;
        requestId: string | null;
        snapshotUpdatedAt: string;
        mutationKind: "submit" | "background_sync";
        localBeforeCount: number;
        localAfterCount: number;
        submitRequested: boolean;
        triggerSource: "bootstrap_complete";
      };
      markQueued: {
        queueDraftKey: string;
        triggerSource: "bootstrap_complete";
      };
      refreshBoundarySnapshot: ForemanLocalDraftSnapshot;
    };

export type ForemanRestoreRemoteCheckPlan =
  | { action: "skip_terminal_check"; requestId: null }
  | { action: "check_terminal"; requestId: string };

export type ForemanRestoreRemoteStatusPlan =
  | { action: "preserve"; requestId: string; remoteStatus: string | null }
  | { action: "clear_terminal"; requestId: string; remoteStatus: string };

export type ForemanDraftRestoreTriggerContext =
  | "focus"
  | "app_active"
  | "network_back";

export type ForemanDraftRestoreFailureTelemetry = {
  event:
    | "restore_draft_on_focus_failed"
    | "restore_draft_on_app_active_failed"
    | "restore_draft_on_network_back_failed";
  context: ForemanDraftRestoreTriggerContext;
  stage: "recovery";
  sourceKind:
    | "draft_boundary:focus_restore"
    | "draft_boundary:app_active_restore"
    | "draft_boundary:network_restore";
};

export type ForemanDraftRestoreTriggerPlan =
  | {
      action: "restore";
      context: ForemanDraftRestoreTriggerContext;
      failureTelemetry: ForemanDraftRestoreFailureTelemetry;
    }
  | {
      action: "skip";
      context: ForemanDraftRestoreTriggerContext;
      reason:
        | "bootstrap_not_ready"
        | "screen_not_focused"
        | "already_focused"
        | "app_not_becoming_active"
        | "network_not_recovered";
    };

const trim = (value: unknown): string => String(value ?? "").trim();

export const buildForemanDraftRestoreFailureTelemetry = (
  context: ForemanDraftRestoreTriggerContext,
): ForemanDraftRestoreFailureTelemetry => {
  if (context === "focus") {
    return {
      event: "restore_draft_on_focus_failed",
      context,
      stage: "recovery",
      sourceKind: "draft_boundary:focus_restore",
    };
  }

  if (context === "app_active") {
    return {
      event: "restore_draft_on_app_active_failed",
      context,
      stage: "recovery",
      sourceKind: "draft_boundary:app_active_restore",
    };
  }

  return {
    event: "restore_draft_on_network_back_failed",
    context,
    stage: "recovery",
    sourceKind: "draft_boundary:network_restore",
  };
};

const restorePlan = (
  context: ForemanDraftRestoreTriggerContext,
): ForemanDraftRestoreTriggerPlan => ({
  action: "restore",
  context,
  failureTelemetry: buildForemanDraftRestoreFailureTelemetry(context),
});

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

export const shouldResetForemanBootstrapStaleDurableState = (params: {
  durableSnapshot: ForemanLocalDraftSnapshot | null;
  durableState: {
    syncStatus: ForemanDraftSyncStatus;
    attentionNeeded: boolean;
    conflictType: ForemanDraftConflictType;
    pendingOperationsCount: number;
    retryCount: number;
  };
}): boolean => {
  if (hasSnapshotContent(params.durableSnapshot)) return false;
  const { durableState } = params;
  return (
    durableState.syncStatus !== "idle" ||
    durableState.attentionNeeded ||
    durableState.conflictType !== "none" ||
    durableState.pendingOperationsCount > 0 ||
    durableState.retryCount > 0
  );
};

export const buildForemanBootstrapStaleDurableResetPatch = (params: {
  lastSyncAt: number | null;
}): ForemanBootstrapStaleDurableResetPatch => ({
  snapshot: null,
  syncStatus: "idle",
  pendingOperationsCount: 0,
  queueDraftKey: null,
  requestIdKnown: false,
  attentionNeeded: false,
  conflictType: "none",
  lastConflictAt: null,
  recoverableLocalSnapshot: null,
  lastError: null,
  lastErrorAt: null,
  lastErrorStage: null,
  retryCount: 0,
  repeatedFailureStageCount: 0,
  lastTriggerSource: "bootstrap_complete",
  lastSyncAt: params.lastSyncAt,
});

export const resolveForemanBootstrapOwnerPlan = (params: {
  durableSnapshot: ForemanLocalDraftSnapshot | null;
  requestId: string | number | null | undefined;
}): ForemanBootstrapOwnerPlan => {
  const ownerId = trim(params.durableSnapshot?.ownerId);
  if (ownerId) return { action: "set_owner", ownerId };
  if (!trim(params.requestId)) return { action: "reset_owner" };
  return { action: "keep_owner" };
};

export const resolveForemanBootstrapCompletionStartPlan = (params: {
  durableSnapshot: ForemanLocalDraftSnapshot | null;
  durableState: {
    syncStatus: ForemanDraftSyncStatus;
    attentionNeeded: boolean;
    conflictType: ForemanDraftConflictType;
    pendingOperationsCount: number;
    retryCount: number;
    lastSyncAt: number | null;
  };
  requestId: string | number | null | undefined;
}): ForemanBootstrapCompletionStartPlan => {
  if (
    shouldResetForemanBootstrapStaleDurableState({
      durableSnapshot: params.durableSnapshot,
      durableState: params.durableState,
    })
  ) {
    return {
      action: "reset_stale_durable",
      durablePatch: buildForemanBootstrapStaleDurableResetPatch({
        lastSyncAt: params.durableState.lastSyncAt,
      }),
      activeOwnerReset: { nextOwnerId: undefined, resetSubmitted: true },
      resetDraftState: true,
      clearLocalSnapshotRef: true,
      nextLocalSnapshot: null,
      refreshBoundarySnapshot: null,
    };
  }

  return {
    action: "continue",
    ownerPlan: resolveForemanBootstrapOwnerPlan({
      durableSnapshot: params.durableSnapshot,
      requestId: params.requestId,
    }),
    hasDurableSnapshotContent: hasSnapshotContent(params.durableSnapshot),
  };
};

export const resolveForemanBootstrapStaleDurableResetExecutionPlan = (params: {
  resetPlan: ForemanBootstrapStaleDurableResetPlan;
  durableState: {
    syncStatus: ForemanDraftSyncStatus;
    attentionNeeded: boolean;
    conflictType: ForemanDraftConflictType;
    pendingOperationsCount: number;
    retryCount: number;
  };
}): ForemanBootstrapStaleDurableResetExecutionPlan => ({
  durablePatch: params.resetPlan.durablePatch,
  activeOwnerReset: params.resetPlan.activeOwnerReset,
  resetDraftState: params.resetPlan.resetDraftState,
  clearLocalSnapshotRef: params.resetPlan.clearLocalSnapshotRef,
  nextLocalSnapshot: params.resetPlan.nextLocalSnapshot,
  refreshBoundarySnapshot: params.resetPlan.refreshBoundarySnapshot,
  devTelemetry: {
    syncStatus: params.durableState.syncStatus,
    attentionNeeded: params.durableState.attentionNeeded,
    conflictType: params.durableState.conflictType,
    pendingOps: params.durableState.pendingOperationsCount,
    retryCount: params.durableState.retryCount,
  },
});

export const getForemanBootstrapReconciliationRequestId = (
  snapshot: ForemanLocalDraftSnapshot | null | undefined,
): string | null => trim(snapshot?.requestId) || null;

export const resolveForemanBootstrapReconciliationPlan = (params: {
  snapshot: ForemanLocalDraftSnapshot | null;
  remoteStatus: string | null | undefined;
  remoteStatusIsTerminal: boolean;
}): ForemanBootstrapReconciliationPlan => {
  const requestId = getForemanBootstrapReconciliationRequestId(params.snapshot);
  if (!requestId) {
    return { action: "skip_remote_check", requestId: null, remoteStatus: null };
  }
  const remoteStatus = params.remoteStatus ?? null;
  if (params.remoteStatusIsTerminal && remoteStatus) {
    return { action: "clear_terminal", requestId, remoteStatus };
  }
  return { action: "preserve", requestId, remoteStatus };
};

export const resolveForemanBootstrapReenqueuePlan = (params: {
  pendingOperationsCount: number;
  conflictAutoRecoverable: boolean;
  snapshotSubmitRequested: boolean;
  snapshotHasPendingSync: boolean;
  syncStatus: ForemanDraftSyncStatus;
}): ForemanBootstrapReenqueuePlan => {
  const shouldEnqueue =
    params.pendingOperationsCount === 0 &&
    params.conflictAutoRecoverable &&
    (params.snapshotSubmitRequested ||
      params.snapshotHasPendingSync ||
      params.syncStatus === "dirty_local" ||
      params.syncStatus === "retry_wait" ||
      params.syncStatus === "failed_terminal");

  if (!shouldEnqueue) {
    return { shouldEnqueue: false, mutationKind: null };
  }
  return {
    shouldEnqueue: true,
    mutationKind: params.snapshotSubmitRequested ? "submit" : "background_sync",
  };
};

export const planForemanBootstrapReenqueueCommand = (params: {
  snapshot: ForemanLocalDraftSnapshot;
  pendingOperationsCount: number;
  conflictAutoRecoverable: boolean;
  snapshotHasPendingSync: boolean;
  syncStatus: ForemanDraftSyncStatus;
  draftKey: string;
}): ForemanBootstrapReenqueueCommandPlan => {
  const reenqueuePlan = resolveForemanBootstrapReenqueuePlan({
    pendingOperationsCount: params.pendingOperationsCount,
    conflictAutoRecoverable: params.conflictAutoRecoverable,
    snapshotSubmitRequested: params.snapshot.submitRequested,
    snapshotHasPendingSync: params.snapshotHasPendingSync,
    syncStatus: params.syncStatus,
  });

  if (!reenqueuePlan.shouldEnqueue) {
    return {
      action: "skip_reenqueue",
      refreshBoundarySnapshot: params.snapshot,
    };
  }

  return {
    action: "reenqueue",
    enqueue: {
      draftKey: params.draftKey,
      requestId: trim(params.snapshot.requestId) || null,
      snapshotUpdatedAt: params.snapshot.updatedAt,
      mutationKind: reenqueuePlan.mutationKind,
      localBeforeCount: params.snapshot.items.length,
      localAfterCount: params.snapshot.items.length,
      submitRequested: params.snapshot.submitRequested,
      triggerSource: "bootstrap_complete",
    },
    markQueued: {
      queueDraftKey: params.draftKey,
      triggerSource: "bootstrap_complete",
    },
    refreshBoundarySnapshot: params.snapshot,
  };
};

export const resolveForemanRestoreRemoteCheckPlan = (params: {
  snapshot: ForemanLocalDraftSnapshot | null;
}): ForemanRestoreRemoteCheckPlan => {
  if (!hasSnapshotContent(params.snapshot)) {
    return { action: "skip_terminal_check", requestId: null };
  }
  const requestId = trim(params.snapshot?.requestId);
  if (!requestId) {
    return { action: "skip_terminal_check", requestId: null };
  }
  return { action: "check_terminal", requestId };
};

export const resolveForemanRestoreRemoteStatusPlan = (params: {
  requestId: string;
  remoteStatus: string | null | undefined;
  remoteStatusIsTerminal: boolean;
}): ForemanRestoreRemoteStatusPlan => {
  const remoteStatus = params.remoteStatus ?? null;
  if (params.remoteStatusIsTerminal && remoteStatus) {
    return { action: "clear_terminal", requestId: params.requestId, remoteStatus };
  }
  return { action: "preserve", requestId: params.requestId, remoteStatus };
};

export const planForemanFocusRestoreTrigger = (params: {
  bootstrapReady: boolean;
  isScreenFocused: boolean;
  wasScreenFocused: boolean;
}): ForemanDraftRestoreTriggerPlan => {
  if (!params.bootstrapReady) {
    return { action: "skip", context: "focus", reason: "bootstrap_not_ready" };
  }
  if (!params.isScreenFocused) {
    return { action: "skip", context: "focus", reason: "screen_not_focused" };
  }
  if (params.wasScreenFocused) {
    return { action: "skip", context: "focus", reason: "already_focused" };
  }
  return restorePlan("focus");
};

export const planForemanAppActiveRestoreTrigger = (params: {
  bootstrapReady: boolean;
  previousState: string;
  nextState: string;
}): ForemanDraftRestoreTriggerPlan => {
  if (!params.bootstrapReady) {
    return { action: "skip", context: "app_active", reason: "bootstrap_not_ready" };
  }
  if (params.previousState !== "active" && params.nextState === "active") {
    return restorePlan("app_active");
  }
  return { action: "skip", context: "app_active", reason: "app_not_becoming_active" };
};

export const planForemanNetworkBackRestoreTrigger = (params: {
  bootstrapReady: boolean;
  previousOnline: boolean | null;
  nextOnline: boolean | null;
}): ForemanDraftRestoreTriggerPlan => {
  if (!params.bootstrapReady) {
    return { action: "skip", context: "network_back", reason: "bootstrap_not_ready" };
  }
  if (params.previousOnline === false && params.nextOnline === true) {
    return restorePlan("network_back");
  }
  return { action: "skip", context: "network_back", reason: "network_not_recovered" };
};

export const shouldSyncForemanDraftAfterRestoreCheck = (params: {
  conflictAutoRecoverable: boolean;
}): boolean => params.conflictAutoRecoverable;

export const shouldSkipForemanRemoteDraftEffects = (params: {
  bootstrapReady: boolean;
  activeSnapshot: ForemanLocalDraftSnapshot | null;
  requestId: string | number | null | undefined;
}): boolean => {
  if (!params.bootstrapReady) return true;
  if (!params.activeSnapshot) return false;
  const snapshotRequestId = trim(params.activeSnapshot.requestId);
  const activeRequestId = trim(params.requestId);
  if (snapshotRequestId) return snapshotRequestId === activeRequestId;
  return !activeRequestId;
};

export const shouldPersistForemanLifecycleSnapshot = (params: {
  bootstrapReady: boolean;
  isDraftActive: boolean;
  localDraftSnapshotRefCleared: boolean;
  hasRequestDetails: boolean;
  detailsRequestId: string | null;
  requestId: string | number | null | undefined;
  hasLocalDraft: boolean;
}): boolean => {
  if (!params.bootstrapReady) return false;
  if (!params.isDraftActive) return false;
  if (params.localDraftSnapshotRefCleared) return false;

  const activeRequestId = trim(params.requestId);
  if (
    params.hasRequestDetails &&
    params.detailsRequestId &&
    activeRequestId &&
    params.detailsRequestId !== activeRequestId &&
    !params.hasLocalDraft
  ) {
    return false;
  }

  return true;
};
