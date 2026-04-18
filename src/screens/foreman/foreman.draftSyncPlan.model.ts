import type {
  ForemanDraftConflictType,
  ForemanDraftSyncTelemetryEvent,
  ForemanDraftSyncTriggerSource,
} from "../../lib/offline/foremanSyncRuntime";
import {
  isForemanConflictAutoRecoverable,
  normalizeForemanSyncTriggerSource,
} from "../../lib/offline/foremanSyncRuntime";
import type { ForemanDraftMutationKind } from "./foreman.draftBoundary.helpers";
import type { ForemanLocalDraftSnapshot } from "./foreman.localDraft";

export const FOREMAN_DUPLICATE_SUBMIT_MESSAGE =
  "Этот черновик уже отправлен. Откройте новый активный черновик.";

export const FOREMAN_SYNC_DIRTY_LOCAL_COMMANDS = [
  "mark_dirty_local",
  "persist_local_snapshot",
  "push_enqueue_progress_telemetry",
] as const;

export const FOREMAN_SYNC_FLUSH_COMPLETION_COMMANDS = {
  refreshBoundarySyncState: "refresh_boundary_sync_state",
  throwQueueFailure: "throw_queue_failure",
  markLastSubmittedOwner: "mark_last_submitted_owner",
  returnSyncResult: "return_sync_result",
} as const;

type ForemanSyncDurablePatch = {
  snapshot: ForemanLocalDraftSnapshot;
  syncStatus: "dirty_local";
  pendingOperationsCount: 0;
  queueDraftKey: null;
  requestIdKnown: boolean;
  attentionNeeded: true;
  lastTriggerSource: ForemanDraftSyncTriggerSource;
};

export type ForemanSyncOfflineState = "online" | "offline" | "unknown";

export type ForemanSyncDirtyLocalCommandPlan = {
  action: "record_dirty_local";
  commands: typeof FOREMAN_SYNC_DIRTY_LOCAL_COMMANDS;
  dirtyLocal: {
    queueDraftKey: string;
    triggerSource: ForemanDraftSyncTriggerSource;
  };
  telemetry: Omit<ForemanDraftSyncTelemetryEvent, "id" | "at">;
};

export type ForemanSyncInactiveGatePlan =
  | { action: "skip_inactive"; requestId: string | null; submitted: null }
  | { action: "continue" };

export type ForemanSyncSnapshotPreflightPlan =
  | { action: "skip_empty"; snapshot: ForemanLocalDraftSnapshot | null; requestId: string | null; submitted: null }
  | { action: "throw_duplicate_submit"; submitOwnerId: string; message: string }
  | { action: "await_in_flight_submit"; submitOwnerId: string }
  | {
      action: "continue";
      snapshot: ForemanLocalDraftSnapshot;
      mutationKind: ForemanDraftMutationKind;
      triggerSource: ForemanDraftSyncTriggerSource;
      submitOwnerId: string | null;
    };

export type ForemanSyncQueuePlan =
  | {
      action: "block_for_manual_recovery";
      snapshot: ForemanLocalDraftSnapshot;
      durablePatch: ForemanSyncDurablePatch;
      requestId: string | null;
      submitted: null;
    }
  | {
      action: "enqueue_and_flush";
      snapshot: ForemanLocalDraftSnapshot;
      enqueue: {
        draftKey: string;
        requestId: string | null;
        snapshotUpdatedAt: string;
        mutationKind: ForemanDraftMutationKind;
        localBeforeCount: number | null;
        localAfterCount: number;
        submitRequested: boolean;
        triggerSource: ForemanDraftSyncTriggerSource;
      };
    };

export type ForemanSyncFlushWorkerResult<TSubmitted> = {
  requestId: string | null;
  submitted: TSubmitted | null;
  failed: boolean;
  errorMessage: string | null;
};

export type ForemanSyncFlushCompletionPlan<TSubmitted> =
  | {
      action: "throw_failed";
      commands: readonly [
        typeof FOREMAN_SYNC_FLUSH_COMPLETION_COMMANDS.refreshBoundarySyncState,
        typeof FOREMAN_SYNC_FLUSH_COMPLETION_COMMANDS.throwQueueFailure,
      ];
      message: string;
    }
  | {
      action: "return_success";
      commands:
        | readonly [
            typeof FOREMAN_SYNC_FLUSH_COMPLETION_COMMANDS.refreshBoundarySyncState,
            typeof FOREMAN_SYNC_FLUSH_COMPLETION_COMMANDS.returnSyncResult,
          ]
        | readonly [
            typeof FOREMAN_SYNC_FLUSH_COMPLETION_COMMANDS.refreshBoundarySyncState,
            typeof FOREMAN_SYNC_FLUSH_COMPLETION_COMMANDS.markLastSubmittedOwner,
            typeof FOREMAN_SYNC_FLUSH_COMPLETION_COMMANDS.returnSyncResult,
          ];
      markLastSubmittedOwnerId: string | null;
      result: {
        requestId: string | null;
        submitted: TSubmitted | null;
      };
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

export const resolveForemanSyncMutationKind = (params: {
  optionMutationKind?: ForemanDraftMutationKind | null;
  submit?: boolean;
}): ForemanDraftMutationKind => params.optionMutationKind ?? (params.submit ? "submit" : "background_sync");

export const resolveForemanSyncOfflineState = (
  value: boolean | null | undefined,
): ForemanSyncOfflineState =>
  value === true ? "online" : value === false ? "offline" : "unknown";

export const planForemanSyncInactiveGate = (params: {
  isDraftActive: boolean;
  hasOverrideSnapshot: boolean;
  mutationKind: ForemanDraftMutationKind;
  requestId: string | number | null | undefined;
}): ForemanSyncInactiveGatePlan => {
  if (!params.isDraftActive && !params.hasOverrideSnapshot && params.mutationKind !== "background_sync") {
    return { action: "skip_inactive", requestId: trim(params.requestId) || null, submitted: null };
  }
  return { action: "continue" };
};

export const planForemanSyncSnapshotPreflight = (params: {
  snapshot: ForemanLocalDraftSnapshot | null;
  submit: boolean;
  mutationKind: ForemanDraftMutationKind;
  context?: string | null;
  requestId: string | number | null | undefined;
  activeDraftOwnerId: string | null | undefined;
  lastSubmittedOwnerId: string | null | undefined;
  submitInFlightOwnerId: string | null | undefined;
  hasDraftSyncInFlight: boolean;
}): ForemanSyncSnapshotPreflightPlan => {
  const snapshot = params.snapshot;
  const submitOwnerId = params.submit ? trim(snapshot?.ownerId) || trim(params.activeDraftOwnerId) || null : null;
  const triggerSource = normalizeForemanSyncTriggerSource(
    params.context,
    params.mutationKind,
    params.submit || snapshot?.submitRequested === true,
  );

  if (!hasSnapshotContent(snapshot)) {
    return {
      action: "skip_empty",
      snapshot: snapshot ?? null,
      requestId: trim(params.requestId) || null,
      submitted: null,
    };
  }

  if (params.submit && submitOwnerId) {
    if (trim(params.lastSubmittedOwnerId) === submitOwnerId) {
      return {
        action: "throw_duplicate_submit",
        submitOwnerId,
        message: FOREMAN_DUPLICATE_SUBMIT_MESSAGE,
      };
    }
    if (trim(params.submitInFlightOwnerId) === submitOwnerId && params.hasDraftSyncInFlight) {
      return { action: "await_in_flight_submit", submitOwnerId };
    }
  }

  return {
    action: "continue",
    snapshot,
    mutationKind: params.mutationKind,
    triggerSource,
    submitOwnerId,
  };
};

export const resolveForemanSyncDirtyLocalCommandPlan = (params: {
  snapshot: ForemanLocalDraftSnapshot;
  draftKey: string;
  pendingOperationsCount: number;
  durableConflictType: ForemanDraftConflictType;
  networkOnline: boolean | null | undefined;
  triggerSource: ForemanDraftSyncTriggerSource;
  localOnlyRequestId: string;
}): ForemanSyncDirtyLocalCommandPlan => ({
  action: "record_dirty_local",
  commands: FOREMAN_SYNC_DIRTY_LOCAL_COMMANDS,
  dirtyLocal: {
    queueDraftKey: params.draftKey,
    triggerSource: params.triggerSource,
  },
  telemetry: {
    stage: "enqueue",
    result: "progress",
    draftKey: params.draftKey,
    requestId: trim(params.snapshot.requestId) || null,
    localOnlyDraftKey: params.draftKey === params.localOnlyRequestId,
    attemptNumber: 0,
    queueSizeBefore: params.pendingOperationsCount,
    queueSizeAfter: null,
    coalescedCount: 0,
    conflictType: params.durableConflictType,
    recoveryAction: null,
    errorClass: null,
    errorCode: null,
    offlineState: resolveForemanSyncOfflineState(params.networkOnline),
    triggerSource: params.triggerSource,
  },
});

export const planForemanSyncQueueCommand = (params: {
  snapshot: ForemanLocalDraftSnapshot;
  mutationKind: ForemanDraftMutationKind;
  triggerSource: ForemanDraftSyncTriggerSource;
  durableConflictType: ForemanDraftConflictType;
  force: boolean;
  draftKey: string;
  localBeforeCount?: number | null;
  localAfterCount?: number | null;
  submit: boolean;
  activeRequestId: string | number | null | undefined;
}): ForemanSyncQueuePlan => {
  if (!params.force && !isForemanConflictAutoRecoverable(params.durableConflictType)) {
    return {
      action: "block_for_manual_recovery",
      snapshot: params.snapshot,
      durablePatch: {
        snapshot: params.snapshot,
        syncStatus: "dirty_local",
        pendingOperationsCount: 0,
        queueDraftKey: null,
        requestIdKnown: Boolean(params.snapshot.requestId),
        attentionNeeded: true,
        lastTriggerSource: params.triggerSource,
      },
      requestId: trim(params.snapshot.requestId) || trim(params.activeRequestId) || null,
      submitted: null,
    };
  }

  return {
    action: "enqueue_and_flush",
    snapshot: params.snapshot,
    enqueue: {
      draftKey: params.draftKey,
      requestId: trim(params.snapshot.requestId) || null,
      snapshotUpdatedAt: params.snapshot.updatedAt,
      mutationKind: params.mutationKind,
      localBeforeCount: params.localBeforeCount ?? null,
      localAfterCount: params.localAfterCount ?? params.snapshot.items.length,
      submitRequested: params.submit || params.snapshot.submitRequested,
      triggerSource: params.triggerSource,
    },
  };
};

export const planForemanSyncFlushCompletion = <TSubmitted>(params: {
  result: ForemanSyncFlushWorkerResult<TSubmitted>;
  submit: boolean;
  submitOwnerId: string | null | undefined;
}): ForemanSyncFlushCompletionPlan<TSubmitted> => {
  if (params.result.failed) {
    return {
      action: "throw_failed",
      commands: [
        FOREMAN_SYNC_FLUSH_COMPLETION_COMMANDS.refreshBoundarySyncState,
        FOREMAN_SYNC_FLUSH_COMPLETION_COMMANDS.throwQueueFailure,
      ],
      message: params.result.errorMessage || "Foreman mutation queue flush failed.",
    };
  }

  const submitOwnerId = trim(params.submitOwnerId) || null;
  const markLastSubmittedOwnerId =
    params.submit && submitOwnerId && params.result.submitted ? submitOwnerId : null;
  const commands = markLastSubmittedOwnerId
    ? [
        FOREMAN_SYNC_FLUSH_COMPLETION_COMMANDS.refreshBoundarySyncState,
        FOREMAN_SYNC_FLUSH_COMPLETION_COMMANDS.markLastSubmittedOwner,
        FOREMAN_SYNC_FLUSH_COMPLETION_COMMANDS.returnSyncResult,
      ] as const
    : [
        FOREMAN_SYNC_FLUSH_COMPLETION_COMMANDS.refreshBoundarySyncState,
        FOREMAN_SYNC_FLUSH_COMPLETION_COMMANDS.returnSyncResult,
      ] as const;

  return {
    action: "return_success",
    commands,
    markLastSubmittedOwnerId,
    result: {
      requestId: params.result.requestId,
      submitted: params.result.submitted,
    },
  };
};
