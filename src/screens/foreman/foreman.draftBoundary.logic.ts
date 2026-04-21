import type { CatchDisciplineKind } from "../../lib/observability/catchDiscipline";
import {
  classifyForemanSyncError,
  isForemanConflictAutoRecoverable,
  type ForemanDraftRecoveryAction,
  type ForemanDraftSyncStage,
} from "../../lib/offline/foremanSyncRuntime";
import type { ForemanDurableDraftRecord } from "./foreman.durableDraft.store";
import { resolveForemanDraftBoundaryFailureReportPlan } from "./foreman.draftBoundaryFailure.model";
import { resolveForemanDraftQueueKey } from "./foreman.draftBoundaryIdentity.model";
import {
  resolveForemanRestoreRemoteCheckPlan,
  resolveForemanRestoreRemoteStatusPlan,
  shouldSyncForemanDraftAfterRestoreCheck,
} from "./foreman.draftLifecycle.model";
import { isDraftLikeStatus, ridStr } from "./foreman.helpers";
import type { ForemanLocalDraftSnapshot } from "./foreman.localDraft";
import { resolveForemanManualRecoveryTelemetryPlan } from "./foreman.manualRecovery.model";
import { buildForemanDraftRecoveryBoundaryPatch } from "./foreman.draftRecovery.model";

type ForemanDraftBoundaryDurableState = Pick<
  ForemanDurableDraftRecord,
  | "snapshot"
  | "syncStatus"
  | "lastSyncAt"
  | "lastError"
  | "lastErrorAt"
  | "lastErrorStage"
  | "conflictType"
  | "retryCount"
  | "queueDraftKey"
  | "requestIdKnown"
  | "attentionNeeded"
  | "availableRecoveryActions"
>;

export type ForemanDraftBoundaryRefreshPlan = {
  snapshot: ForemanLocalDraftSnapshot | null;
  boundaryPatch: ReturnType<typeof buildForemanDraftRecoveryBoundaryPatch>;
};

export type ForemanDraftBoundaryRestoreAttemptPlan =
  | {
      action: "skip";
      reason: "bootstrap_not_ready";
      snapshot: null;
      remoteCheckPlan: { action: "skip_terminal_check"; requestId: null };
      shouldSyncAfterRemoteCheck: false;
    }
  | {
      action: "restore";
      snapshot: ForemanLocalDraftSnapshot | null;
      remoteCheckPlan: ReturnType<typeof resolveForemanRestoreRemoteCheckPlan>;
      shouldSyncAfterRemoteCheck: boolean;
    };

export const resolveForemanDraftBoundarySnapshot = (params: {
  durableSnapshot: ForemanLocalDraftSnapshot | null;
  localSnapshot: ForemanLocalDraftSnapshot | null;
  snapshotOverride?: ForemanLocalDraftSnapshot | null;
}) =>
  params.snapshotOverride === undefined
    ? params.durableSnapshot ?? params.localSnapshot
    : params.snapshotOverride;

export const resolveForemanDraftBoundaryRefreshPlan = (params: {
  durableState: ForemanDraftBoundaryDurableState;
  localSnapshot: ForemanLocalDraftSnapshot | null;
  snapshotOverride?: ForemanLocalDraftSnapshot | null;
  pendingOperationsCount: number;
}): ForemanDraftBoundaryRefreshPlan => {
  const snapshot = resolveForemanDraftBoundarySnapshot({
    durableSnapshot: params.durableState.snapshot,
    localSnapshot: params.localSnapshot,
    snapshotOverride: params.snapshotOverride,
  });

  return {
    snapshot,
    boundaryPatch: buildForemanDraftRecoveryBoundaryPatch({
      durableState: params.durableState,
      snapshot,
      pendingOperationsCount: params.pendingOperationsCount,
    }),
  };
};

export const resolveForemanDraftBoundaryManualRecoveryTelemetryPlan = (params: {
  durableState: ForemanDurableDraftRecord;
  localSnapshot: ForemanLocalDraftSnapshot | null;
  activeRequestId?: string | number | null;
  localOnlyRequestId: string;
  recoveryAction: ForemanDraftRecoveryAction;
  result: "progress" | "success" | "retryable_failure" | "terminal_failure";
  conflictType?: ForemanDurableDraftRecord["conflictType"];
  errorClass?: string | null;
  errorCode?: string | null;
  networkOnline: boolean | null | undefined;
}) => {
  const snapshot = params.localSnapshot ?? params.durableState.snapshot;
  const draftKey = resolveForemanDraftQueueKey({
    snapshot,
    activeRequestId: params.activeRequestId,
    localOnlyRequestId: params.localOnlyRequestId,
  });

  return resolveForemanManualRecoveryTelemetryPlan({
    snapshot,
    draftKey,
    durableState: params.durableState,
    recoveryAction: params.recoveryAction,
    result: params.result,
    conflictType: params.conflictType,
    errorClass: params.errorClass,
    errorCode: params.errorCode,
    networkOnline: params.networkOnline,
    localOnlyRequestId: params.localOnlyRequestId,
  });
};

export const resolveForemanDraftBoundaryFailurePlan = (params: {
  durableState: Pick<ForemanDurableDraftRecord, "snapshot">;
  localSnapshot: ForemanLocalDraftSnapshot | null;
  activeRequestId?: string | number | null;
  localOnlyRequestId: string;
  event: string;
  error: unknown;
  context?: string;
  stage: ForemanDraftSyncStage;
  kind?: CatchDisciplineKind;
  sourceKind?: string;
  extra?: Record<string, unknown>;
}) => {
  const snapshot = params.localSnapshot ?? params.durableState.snapshot;
  const classified = classifyForemanSyncError(params.error);

  return resolveForemanDraftBoundaryFailureReportPlan({
    event: params.event,
    error: params.error,
    context: params.context,
    stage: params.stage,
    kind: params.kind,
    sourceKind: params.sourceKind,
    extra: params.extra,
    classified,
    queueDraftKey: resolveForemanDraftQueueKey({
      snapshot,
      activeRequestId: params.activeRequestId,
      localOnlyRequestId: params.localOnlyRequestId,
    }),
    requestId: ridStr(snapshot?.requestId) || ridStr(params.activeRequestId) || null,
  });
};

export const resolveForemanDraftBoundaryRestoreAttemptPlan = (params: {
  bootstrapReady: boolean;
  durableState: Pick<ForemanDurableDraftRecord, "snapshot" | "conflictType">;
  localSnapshot: ForemanLocalDraftSnapshot | null;
}): ForemanDraftBoundaryRestoreAttemptPlan => {
  if (!params.bootstrapReady) {
    return {
      action: "skip",
      reason: "bootstrap_not_ready",
      snapshot: null,
      remoteCheckPlan: { action: "skip_terminal_check", requestId: null },
      shouldSyncAfterRemoteCheck: false,
    };
  }

  const snapshot = resolveForemanDraftBoundarySnapshot({
    durableSnapshot: params.durableState.snapshot,
    localSnapshot: params.localSnapshot,
  });

  return {
    action: "restore",
    snapshot,
    remoteCheckPlan: resolveForemanRestoreRemoteCheckPlan({ snapshot }),
    shouldSyncAfterRemoteCheck: shouldSyncForemanDraftAfterRestoreCheck({
      conflictAutoRecoverable: isForemanConflictAutoRecoverable(params.durableState.conflictType),
    }),
  };
};

export const resolveForemanDraftBoundaryRestoreRemotePlan = (params: {
  requestId: string;
  remoteStatus: string | null | undefined;
}) =>
  resolveForemanRestoreRemoteStatusPlan({
    requestId: params.requestId,
    remoteStatus: params.remoteStatus ?? null,
    remoteStatusIsTerminal: Boolean(
      params.remoteStatus && !isDraftLikeStatus(params.remoteStatus),
    ),
  });
