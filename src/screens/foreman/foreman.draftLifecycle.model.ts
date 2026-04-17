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

export type ForemanRestoreRemoteCheckPlan =
  | { action: "skip_terminal_check"; requestId: null }
  | { action: "check_terminal"; requestId: string };

export type ForemanRestoreRemoteStatusPlan =
  | { action: "preserve"; requestId: string; remoteStatus: string | null }
  | { action: "clear_terminal"; requestId: string; remoteStatus: string };

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

export const resolveForemanBootstrapOwnerPlan = (params: {
  durableSnapshot: ForemanLocalDraftSnapshot | null;
  requestId: string | number | null | undefined;
}): ForemanBootstrapOwnerPlan => {
  const ownerId = trim(params.durableSnapshot?.ownerId);
  if (ownerId) return { action: "set_owner", ownerId };
  if (!trim(params.requestId)) return { action: "reset_owner" };
  return { action: "keep_owner" };
};

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
