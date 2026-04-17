import type {
  ForemanDraftConflictType,
  ForemanDraftRecoveryAction,
  ForemanDraftSyncStage,
  ForemanDraftSyncStatus,
} from "../../lib/offline/foremanSyncRuntime";
import type { ForemanDraftBoundaryState } from "./foreman.draftBoundary.helpers";
import type { ForemanLocalDraftSnapshot } from "./foreman.localDraft";

type RecoveryBoundaryPatch = Pick<
  ForemanDraftBoundaryState,
  | "draftDirty"
  | "syncNeeded"
  | "syncStatus"
  | "lastSyncAt"
  | "lastErrorAt"
  | "lastErrorStage"
  | "conflictType"
  | "retryCount"
  | "pendingOperationsCount"
  | "queueDraftKey"
  | "requestIdKnown"
  | "attentionNeeded"
  | "availableRecoveryActions"
>;

type RecoveryDurableState = {
  syncStatus: ForemanDraftSyncStatus;
  lastSyncAt: number | null;
  lastError: string | null;
  lastErrorAt: number | null;
  lastErrorStage: ForemanDraftSyncStage | null;
  conflictType: ForemanDraftConflictType;
  retryCount: number;
  queueDraftKey: string | null;
  requestIdKnown: boolean;
  attentionNeeded: boolean;
  availableRecoveryActions: ForemanDraftRecoveryAction[];
};

type TerminalRecoveryDurableState = {
  syncStatus: ForemanDraftSyncStatus;
  attentionNeeded: boolean;
  conflictType: ForemanDraftConflictType;
  pendingOperationsCount: number;
  retryCount: number;
  availableRecoveryActions: ForemanDraftRecoveryAction[];
  recoverableLocalSnapshot: ForemanLocalDraftSnapshot | null;
};

export type ForemanTerminalRecoveryCleanupDecision = {
  shouldClear: boolean;
  requestId: string | null;
  remoteStatus: string | null;
  isTerminalConflict: boolean;
  isTerminalStatus: boolean;
  snapshotForCleanup: ForemanLocalDraftSnapshot | null;
};

const DRAFT_STATUS_KEYS = new Set(["draft", "черновик", ""]);

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

const hasSnapshotPendingSync = (snapshot: ForemanLocalDraftSnapshot | null | undefined): boolean => {
  if (!snapshot) return false;
  if (!trim(snapshot.requestId) && snapshot.items.length > 0) return true;
  if (snapshot.pendingDeletes.length > 0) return true;
  if (snapshot.submitRequested) return true;
  return snapshot.items.some((item) => !trim(item.remote_item_id));
};

const isDraftLikeStatus = (value?: string | null): boolean =>
  DRAFT_STATUS_KEYS.has(trim(value).toLowerCase());

const noTerminalCleanupDecision = (params?: {
  remoteStatus?: string | null;
  isTerminalConflict?: boolean;
  isTerminalStatus?: boolean;
}): ForemanTerminalRecoveryCleanupDecision => ({
  shouldClear: false,
  requestId: null,
  remoteStatus: params?.remoteStatus ?? null,
  isTerminalConflict: params?.isTerminalConflict ?? false,
  isTerminalStatus: params?.isTerminalStatus ?? false,
  snapshotForCleanup: null,
});

export const buildForemanDraftRecoveryBoundaryPatch = (params: {
  durableState: RecoveryDurableState;
  snapshot: ForemanLocalDraftSnapshot | null;
  pendingOperationsCount: number;
}): RecoveryBoundaryPatch => {
  const { durableState, snapshot } = params;
  const { pendingOperationsCount } = params;

  return {
    draftDirty:
      Boolean(snapshot && hasSnapshotContent(snapshot)) &&
      (durableState.syncStatus !== "synced" ||
        pendingOperationsCount > 0 ||
        Boolean(durableState.lastError)),
    syncNeeded:
      pendingOperationsCount > 0 ||
      durableState.syncStatus === "retry_wait" ||
      durableState.syncStatus === "failed_terminal" ||
      durableState.conflictType !== "none" ||
      Boolean(snapshot && hasSnapshotPendingSync(snapshot)),
    syncStatus: durableState.syncStatus,
    lastSyncAt: durableState.lastSyncAt,
    lastErrorAt: durableState.lastErrorAt,
    lastErrorStage: durableState.lastErrorStage,
    conflictType: durableState.conflictType,
    retryCount: durableState.retryCount,
    pendingOperationsCount,
    queueDraftKey: durableState.queueDraftKey,
    requestIdKnown: durableState.requestIdKnown,
    attentionNeeded: durableState.attentionNeeded,
    availableRecoveryActions: durableState.availableRecoveryActions,
  };
};

export const resolveForemanTerminalRecoveryCleanupDecision = (params: {
  bootstrapReady: boolean;
  boundaryConflictType: ForemanDraftConflictType;
  requestId: string | number | null | undefined;
  remoteStatus: string | null | undefined;
  snapshot: ForemanLocalDraftSnapshot | null;
  durableState: TerminalRecoveryDurableState;
}): ForemanTerminalRecoveryCleanupDecision => {
  const remoteStatus = params.remoteStatus ?? null;
  const isTerminalConflict = params.boundaryConflictType === "server_terminal_conflict";
  const isTerminalStatus = Boolean(remoteStatus && !isDraftLikeStatus(remoteStatus));

  if (!params.bootstrapReady || (!isTerminalConflict && !isTerminalStatus)) {
    return noTerminalCleanupDecision({
      remoteStatus,
      isTerminalConflict,
      isTerminalStatus,
    });
  }

  const snapshotId = trim(params.snapshot?.requestId);
  const recoverableId = trim(params.durableState.recoverableLocalSnapshot?.requestId);
  const activeId = trim(params.requestId);

  let terminalRequestId: string | null = null;
  if (isTerminalConflict) {
    terminalRequestId = snapshotId || recoverableId || activeId || null;
  } else if (isTerminalStatus && snapshotId === activeId) {
    terminalRequestId = activeId || null;
  } else if (isTerminalStatus && activeId) {
    terminalRequestId = activeId || null;
  }

  if (!terminalRequestId) {
    return noTerminalCleanupDecision({
      remoteStatus,
      isTerminalConflict,
      isTerminalStatus,
    });
  }

  const hasStaleState =
    params.durableState.syncStatus !== "idle" ||
    params.durableState.attentionNeeded ||
    params.durableState.conflictType !== "none" ||
    params.durableState.pendingOperationsCount > 0 ||
    params.durableState.retryCount > 0 ||
    Boolean(params.snapshot && hasSnapshotContent(params.snapshot)) ||
    Boolean(
      params.durableState.recoverableLocalSnapshot &&
        hasSnapshotContent(params.durableState.recoverableLocalSnapshot),
    ) ||
    params.durableState.availableRecoveryActions.length > 0;

  if (!hasStaleState) {
    return noTerminalCleanupDecision({
      remoteStatus,
      isTerminalConflict,
      isTerminalStatus,
    });
  }

  return {
    shouldClear: true,
    requestId: terminalRequestId,
    remoteStatus,
    isTerminalConflict,
    isTerminalStatus,
    snapshotForCleanup:
      params.snapshot && hasSnapshotContent(params.snapshot) ? params.snapshot : null,
  };
};
