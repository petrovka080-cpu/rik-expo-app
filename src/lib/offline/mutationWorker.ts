import type { RequestRecord } from "../api/types";
import {
  classifyForemanSyncError,
  type ForemanDraftConflictType,
  type ForemanDraftSyncStage,
  type ForemanDraftSyncTriggerSource,
} from "./foremanSyncRuntime";
import {
  recordPlatformOfflineTelemetry,
  type PlatformOfflineFailureClass,
  type PlatformOfflineQueueAction,
} from "./platformOffline.observability";
import { recordPlatformObservability } from "../observability/platformObservability";
import { trackQueueBacklogMetric } from "../observability/queueBacklogMetrics";
import { normalizeAppError } from "../errors/appError";
import type { PlatformOfflineSyncStatus } from "./platformOffline.model";
import type { RequestDraftMeta } from "../../screens/foreman/foreman.types";
import {
  getForemanDurableDraftState,
  markForemanDurableDraftQueued,
  markForemanDurableDraftSyncFailed,
  markForemanDurableDraftSyncStarted,
  markForemanDurableDraftSyncSucceeded,
  patchForemanDurableDraftRecoveryState,
  pushForemanDurableDraftTelemetry,
} from "../../screens/foreman/foreman.durableDraft.store";
import {
  type ForemanLocalDraftSnapshot,
  type ForemanLocalDraftSyncResult,
} from "../../screens/foreman/foreman.localDraft";
import { FOREMAN_LOCAL_ONLY_REQUEST_ID } from "../../screens/foreman/foreman.localDraft.constants";
import {
  clearForemanMutationsForDraft,
  getForemanMutationQueueSummary,
  getForemanPendingMutationCountForDraftKeys,
  markForemanMutationConflicted,
  markForemanMutationFailedNonRetryable,
  markForemanMutationInflight,
  markForemanMutationRetryScheduled,
  peekNextForemanMutation,
  rekeyForemanMutations,
  removeForemanMutationById,
  resetInflightForemanMutations,
} from "./mutationQueue";
import {
  classifyOfflineMutationErrorKind,
  isOfflineMutationConflictKind,
} from "./mutation.conflict";
import {
  getOfflineMutationRetryPolicy,
  resolveOfflineMutationFailureDecision,
} from "./mutation.retryPolicy";
import { recordOfflineMutationEvent } from "./mutation.telemetry";
import {
  requestOfflineReplay,
  type OfflineReplayPolicy,
} from "./offlineReplayCoordinator";

type ForemanMutationWorkerResult = {
  processedCount: number;
  remainingCount: number;
  requestId: string | null;
  submitted: RequestRecord | null;
  failed: boolean;
  errorMessage: string | null;
};

type ForemanMutationWorkerDeps = {
  getSnapshot: () => ForemanLocalDraftSnapshot | null;
  buildRequestDraftMeta: () => RequestDraftMeta;
  persistSnapshot: (
    snapshot: ForemanLocalDraftSnapshot | null,
  ) => void | Promise<void>;
  applySnapshotToBoundary: (
    snapshot: ForemanLocalDraftSnapshot | null,
    options?: {
      restoreHeader?: boolean;
      clearWhenEmpty?: boolean;
      restoreSource?: "none" | "snapshot" | "remoteDraft";
      restoreIdentity?: string | null;
    },
  ) => void | Promise<void>;
  onSubmitted?: (
    requestId: string,
    submitted: RequestRecord | null,
  ) => void | Promise<void>;
  getNetworkOnline?: () => boolean | null;
  inspectRemoteDraft?: (params: {
    requestId: string;
    localSnapshot: ForemanLocalDraftSnapshot | null;
  }) => Promise<{
    snapshot: ForemanLocalDraftSnapshot | null;
    status: string | null;
    isTerminal: boolean;
  }>;
  syncSnapshot: (params: {
    snapshot: ForemanLocalDraftSnapshot;
    headerMeta: RequestDraftMeta;
    mutationKind?:
      | "catalog_add"
      | "calc_add"
      | "ai_local_add"
      | "qty_update"
      | "row_remove"
      | "whole_cancel"
      | "submit"
      | "background_sync";
    localBeforeCount?: number | null;
    localAfterCount?: number | null;
  }) => Promise<ForemanLocalDraftSyncResult>;
};

const toErrorText = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const FOREMAN_RETRY_POLICY = getOfflineMutationRetryPolicy("foreman_default");
export const FOREMAN_MUTATION_REPLAY_POLICY = {
  queueKey: "foreman_draft",
  owner: "foreman_mutation_worker",
  concurrencyLimit: 1,
  ordering: "created_at_fifo",
  backpressure: "coalesce_triggers_and_rerun_once",
} as const satisfies OfflineReplayPolicy;

const getDraftKeyFromSnapshot = (snapshot: ForemanLocalDraftSnapshot | null) =>
  String(snapshot?.requestId ?? FOREMAN_LOCAL_ONLY_REQUEST_ID).trim() ||
  FOREMAN_LOCAL_ONLY_REQUEST_ID;

const getDraftQueueKeysFromSnapshot = (
  snapshot: ForemanLocalDraftSnapshot | null,
) => {
  const requestId = String(snapshot?.requestId ?? "").trim();
  return requestId
    ? [requestId, FOREMAN_LOCAL_ONLY_REQUEST_ID]
    : [FOREMAN_LOCAL_ONLY_REQUEST_ID];
};

const getPendingCountForSnapshot = async (
  snapshot: ForemanLocalDraftSnapshot | null,
) =>
  await getForemanPendingMutationCountForDraftKeys(
    getDraftQueueKeysFromSnapshot(snapshot),
  );

const toOfflineState = (isOnline: boolean | null | undefined) => {
  if (isOnline === true) return "online" as const;
  if (isOnline === false) return "offline" as const;
  return "unknown" as const;
};

const extractSubmittedRequestId = (value: unknown): string | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const requestId = String((value as { id?: unknown }).id ?? "").trim();
  return requestId || null;
};

const reportPostSubmitCleanupFailure = (params: {
  error: unknown;
  requestId: string;
  draftKey: string;
  triggerSource: ForemanDraftSyncTriggerSource;
}) => {
  recordPlatformObservability({
    screen: "foreman",
    surface: "draft_sync",
    category: "ui",
    event: "post_submit_cleanup_failed_after_server_accept",
    result: "error",
    errorClass: params.error instanceof Error ? params.error.name : undefined,
    errorMessage:
      params.error instanceof Error
        ? params.error.message
        : String(params.error ?? "post_submit_cleanup_failed"),
    extra: {
      owner: "mutation_worker",
      requestId: params.requestId,
      draftKey: params.draftKey,
      triggerSource: params.triggerSource,
      stage: "post_submit_cleanup",
      serverAccepted: true,
    },
  });
};

const syncSnapshotWithWorker = async (
  deps: ForemanMutationWorkerDeps,
  snapshot: ForemanLocalDraftSnapshot,
  entry: NonNullable<Awaited<ReturnType<typeof peekNextForemanMutation>>>,
) => {
  return await deps.syncSnapshot({
    snapshot,
    headerMeta: deps.buildRequestDraftMeta(),
    mutationKind: entry.payload.mutationKind,
    localBeforeCount: entry.payload.localBeforeCount,
    localAfterCount: entry.payload.localAfterCount,
  });
};

const pushStageTelemetry = async (params: {
  stage: ForemanDraftSyncStage;
  result: "progress" | "success" | "retryable_failure" | "terminal_failure";
  draftKey: string;
  requestId: string | null;
  localOnlyDraftKey: boolean;
  attemptNumber: number;
  queueSizeBefore: number | null;
  queueSizeAfter: number | null;
  coalescedCount: number;
  offlineState: "online" | "offline" | "unknown";
  triggerSource: ForemanDraftSyncTriggerSource;
  errorClass?: string | null;
  errorCode?: string | null;
  conflictType?: ForemanDraftConflictType;
  recoveryAction?:
    | "retry_now"
    | "restore_local"
    | "rehydrate_server"
    | "discard_local"
    | "clear_failed_queue"
    | null;
}) => {
  await pushForemanDurableDraftTelemetry({
    stage: params.stage,
    result: params.result,
    draftKey: params.draftKey,
    requestId: params.requestId,
    localOnlyDraftKey: params.localOnlyDraftKey,
    attemptNumber: params.attemptNumber,
    queueSizeBefore: params.queueSizeBefore,
    queueSizeAfter: params.queueSizeAfter,
    coalescedCount: params.coalescedCount,
    conflictType: params.conflictType ?? "none",
    recoveryAction: params.recoveryAction ?? null,
    errorClass: params.errorClass ?? null,
    errorCode: params.errorCode ?? null,
    offlineState: params.offlineState,
    triggerSource: params.triggerSource,
  });

  const queueAction: PlatformOfflineQueueAction =
    params.stage === "hydrate"
      ? "hydrate"
      : params.stage === "enqueue"
        ? params.coalescedCount > 0
          ? "coalesce"
          : "enqueue"
        : params.result === "terminal_failure"
          ? "sync_failed_terminal"
          : params.result === "retryable_failure"
            ? "sync_retry_wait"
            : params.result === "success"
              ? "sync_success"
              : "sync_start";

  const syncStatus: PlatformOfflineSyncStatus =
    params.result === "terminal_failure"
      ? "failed_terminal"
      : params.result === "retryable_failure"
        ? "retry_wait"
        : params.stage === "enqueue"
          ? "queued"
          : params.stage === "flush_start" ||
              params.stage === "prepare_snapshot" ||
              params.stage === "sync_rpc"
            ? "syncing"
            : params.stage === "hydrate"
              ? "dirty_local"
              : params.result === "success"
                ? "synced"
                : "idle";

  const failureClass: PlatformOfflineFailureClass =
    params.result === "terminal_failure"
      ? "failed_terminal"
      : params.result === "retryable_failure"
        ? params.offlineState === "offline"
          ? "offline_wait"
          : "retryable_sync_failure"
        : "none";

  recordPlatformOfflineTelemetry({
    contourKey: "foreman_draft",
    entityKey: params.requestId ?? params.draftKey,
    syncStatus,
    queueAction,
    coalesced: params.coalescedCount > 0,
    retryCount: Math.max(0, params.attemptNumber - 1),
    pendingCount: Math.max(
      0,
      Number(params.queueSizeAfter ?? params.queueSizeBefore ?? 0) || 0,
    ),
    failureClass,
    triggerKind:
      params.triggerSource === "submit" || params.triggerSource === "focus"
        ? "unknown"
        : params.triggerSource,
    networkKnownOffline: params.offlineState === "offline",
    restoredAfterReopen:
      params.stage === "hydrate" && params.result === "success",
    manualRetry: params.triggerSource === "manual_retry",
    durationMs: null,
  });
};

const trackForemanMutationBacklog = (
  summary: Awaited<ReturnType<typeof getForemanMutationQueueSummary>>,
  event: string,
  extra?: Record<string, unknown>,
) => {
  trackQueueBacklogMetric({
    queue: "foreman_mutation",
    event,
    size: summary.activeCount,
    oldestAgeMs: summary.oldestActiveAgeMs,
    processingCount: summary.inflightCount,
    failedCount: summary.failedCount + summary.failedNonRetryableCount + summary.conflictedCount,
    retryScheduledCount: summary.retryScheduledCount,
    coalescedCount: summary.coalescedCount,
    extra: {
      totalCount: summary.totalCount,
      pendingCount: summary.pendingCount,
      ...extra,
    },
  });
};

const deriveConflictFromFailure = async (params: {
  deps: ForemanMutationWorkerDeps;
  snapshot: ForemanLocalDraftSnapshot | null;
  requestId: string | null;
  error: unknown;
}) => {
  const normalized = classifyOfflineMutationErrorKind(params.error);
  const classified = classifyForemanSyncError(params.error);
  let conflictType = classified.conflictType;
  let remoteSnapshot: ForemanLocalDraftSnapshot | null = null;
  let remoteStatus: string | null = null;

  if (params.requestId && params.deps.inspectRemoteDraft) {
    try {
      const remote = await params.deps.inspectRemoteDraft({
        requestId: params.requestId,
        localSnapshot: params.snapshot,
      });
      remoteSnapshot = remote.snapshot;
      remoteStatus = remote.status;
      if (remote.isTerminal) {
        conflictType = "server_terminal_conflict";
      } else if (
        conflictType === "retryable_sync_failure" &&
        remote.snapshot &&
        params.snapshot &&
        JSON.stringify({
          ...params.snapshot,
          updatedAt: "",
          lastError: null,
        }) !==
          JSON.stringify({
            ...remote.snapshot,
            updatedAt: "",
            lastError: null,
          })
      ) {
        conflictType = "remote_divergence_requires_attention";
      }
    } catch (error) {
      const appError = normalizeAppError(
        error,
        "foreman_mutation_worker_remote_inspection",
        "warn",
      );
      recordPlatformObservability({
        screen: "foreman",
        surface: "offline_mutation_worker",
        category: "fetch",
        event: "remote_draft_inspection_failed",
        result: "error",
        sourceKind: "offline:foreman_draft",
        errorStage: appError.context,
        errorClass: appError.code,
        errorMessage: appError.message,
        extra: {
          requestId: params.requestId,
          appErrorCode: appError.code,
          appErrorContext: appError.context,
          appErrorSeverity: appError.severity,
        },
      });
      // Remote inspection is best-effort. Primary failure classification stays based on sync error.
    }
  }

  return {
    ...classified,
    errorKind: normalized.errorKind,
    message: normalized.message,
    conflictType,
    remoteSnapshot,
    remoteStatus,
  };
};

const runFlush = async (
  deps: ForemanMutationWorkerDeps,
  triggerSourceOverride?: ForemanDraftSyncTriggerSource | null,
): Promise<ForemanMutationWorkerResult> => {
  await resetInflightForemanMutations();

  let processedCount = 0;
  let latestRequestId: string | null = null;
  let latestSubmitted: RequestRecord | null = null;

  while (true) {
    const entry = await peekNextForemanMutation({
      triggerSource: triggerSourceOverride ?? null,
    });
    if (!entry) {
      return {
        processedCount,
        remainingCount: await getPendingCountForSnapshot(deps.getSnapshot()),
        requestId: latestRequestId,
        submitted: latestSubmitted,
        failed: false,
        errorMessage: null,
      };
    }

    const inflight = await markForemanMutationInflight(entry.id);
    if (!inflight) {
      continue;
    }

    const snapshot =
      deps.getSnapshot() ?? getForemanDurableDraftState().snapshot;
    const queueSummaryBefore = await getForemanMutationQueueSummary([
      entry.payload.draftKey,
    ]);
    trackForemanMutationBacklog(queueSummaryBefore, "foreman_mutation_backlog_before_flush", {
      draftKey: entry.payload.draftKey,
      triggerSource: triggerSourceOverride ?? entry.payload.triggerSource,
    });
    const pendingBefore = await getPendingCountForSnapshot(snapshot);
    const attemptNumber = inflight.attemptCount;
    const offlineState = toOfflineState(deps.getNetworkOnline?.());
    const effectiveTriggerSource =
      triggerSourceOverride ?? entry.payload.triggerSource;

    // ── P6.3e: Terminal-request guard ──────────────────────────
    // Before attempting to sync, check if the request is already terminal
    // on the server. If so, remove the mutation and clean up instead of
    // syncing — which would fail and write recovery state back into the
    // durable store, overwriting any prior cleanup.
    const requestIdForGuard =
      String(snapshot?.requestId ?? entry.payload.requestId ?? "").trim() || null;
    if (requestIdForGuard && deps.inspectRemoteDraft) {
      try {
        const remoteInspection = await deps.inspectRemoteDraft({
          requestId: requestIdForGuard,
          localSnapshot: snapshot,
        });
        if (remoteInspection.isTerminal) {
          if (__DEV__) {
            console.info("[foreman.mutation-worker] skipping terminal request", {
              requestId: requestIdForGuard,
              remoteStatus: remoteInspection.status,
            });
          }
          await removeForemanMutationById(entry.id);
          // Clear all remaining mutations for this draft key
          await clearForemanMutationsForDraft(entry.payload.draftKey);
          if (
            requestIdForGuard !== FOREMAN_LOCAL_ONLY_REQUEST_ID &&
            entry.payload.draftKey !== requestIdForGuard
          ) {
            await clearForemanMutationsForDraft(requestIdForGuard);
          }
          await patchForemanDurableDraftRecoveryState({
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
            lastTriggerSource: effectiveTriggerSource,
            lastSyncAt: Date.now(),
          });
          return {
            processedCount,
            remainingCount: 0,
            requestId: requestIdForGuard,
            submitted: latestSubmitted,
            failed: false,
            errorMessage: null,
          };
        }
      } catch {
        // Remote inspection failure is non-fatal; proceed with normal sync.
      }
    }

    await markForemanDurableDraftSyncStarted(pendingBefore, {
      queueDraftKey: entry.payload.draftKey,
      triggerSource: effectiveTriggerSource,
    });
    await pushStageTelemetry({
      stage: "flush_start",
      result: "progress",
      draftKey: entry.payload.draftKey,
      requestId:
        String(snapshot?.requestId ?? entry.payload.requestId ?? "").trim() ||
        null,
      localOnlyDraftKey:
        entry.payload.draftKey === FOREMAN_LOCAL_ONLY_REQUEST_ID,
      attemptNumber,
      queueSizeBefore: queueSummaryBefore.totalCount,
      queueSizeAfter: null,
      coalescedCount: inflight.coalescedCount,
      offlineState,
      triggerSource: effectiveTriggerSource,
    });

    if (!snapshot) {
      recordOfflineMutationEvent({
        owner: "foreman",
        entityId: inflight.entityId,
        mutationId: inflight.id,
        dedupeKey: inflight.dedupeKey,
        lifecycleStatus: "succeeded",
        action: "succeeded",
        attemptCount: inflight.attemptCount,
        retryCount: inflight.retryCount,
        triggerSource: effectiveTriggerSource,
        errorKind: inflight.lastErrorKind,
        errorCode: inflight.lastErrorCode,
        nextRetryAt: null,
        coalescedCount: inflight.coalescedCount,
        extra: {
          reason: "missing_snapshot_cleanup",
        },
      });
      await removeForemanMutationById(entry.id);
      await markForemanDurableDraftSyncSucceeded(null, 0, {
        queueDraftKey: null,
        triggerSource: effectiveTriggerSource,
      });
      await pushStageTelemetry({
        stage: "cleanup",
        result: "success",
        draftKey: entry.payload.draftKey,
        requestId: entry.payload.requestId,
        localOnlyDraftKey:
          entry.payload.draftKey === FOREMAN_LOCAL_ONLY_REQUEST_ID,
        attemptNumber,
        queueSizeBefore: queueSummaryBefore.totalCount,
        queueSizeAfter: 0,
        coalescedCount: inflight.coalescedCount,
        offlineState,
        triggerSource: effectiveTriggerSource,
      });
      continue;
    }

    const finalizeFailure = async (
      stage: ForemanDraftSyncStage,
      error: unknown,
    ) => {
      const message = toErrorText(error);
      const requestId =
        String(snapshot?.requestId ?? entry.payload.requestId ?? "").trim() ||
        latestRequestId ||
        null;
      const errorInfo = await deriveConflictFromFailure({
        deps,
        snapshot,
        requestId,
        error,
      });
      const decision = resolveOfflineMutationFailureDecision({
        policy: FOREMAN_RETRY_POLICY,
        attemptCount: inflight.attemptCount,
        retryable: errorInfo.retryable,
        conflicted:
          errorInfo.conflictType !== "retryable_sync_failure" &&
          (isOfflineMutationConflictKind(errorInfo.errorKind) ||
            errorInfo.conflictType === "server_terminal_conflict" ||
            errorInfo.conflictType === "validation_conflict" ||
            errorInfo.conflictType === "remote_divergence_requires_attention" ||
            errorInfo.conflictType === "stale_local_snapshot"),
        errorKind: errorInfo.errorKind,
      });
      if (decision.lifecycleStatus === "retry_scheduled") {
        await markForemanMutationRetryScheduled({
          mutationId: entry.id,
          errorMessage: message,
          errorCode: errorInfo.errorCode,
          errorKind: errorInfo.errorKind,
          nextRetryAt: decision.nextRetryAt,
        });
      } else if (decision.lifecycleStatus === "conflicted") {
        await markForemanMutationConflicted({
          mutationId: entry.id,
          errorMessage: message,
          errorCode: errorInfo.errorCode,
          errorKind: errorInfo.errorKind,
          serverVersionHint: errorInfo.remoteStatus,
        });
      } else {
        await markForemanMutationFailedNonRetryable({
          mutationId: entry.id,
          errorMessage: message,
          errorCode: errorInfo.errorCode,
          errorKind: errorInfo.errorKind,
          exhausted: decision.retryExhausted,
        });
      }
      const failedSnapshot =
        deps.getSnapshot() ??
        getForemanDurableDraftState().snapshot ??
        snapshot;
      const pendingCount = await getPendingCountForSnapshot(failedSnapshot);
      await markForemanDurableDraftSyncFailed(
        failedSnapshot,
        message,
        pendingCount,
        {
          stage,
          retryable: decision.lifecycleStatus === "retry_scheduled",
          conflictType: errorInfo.conflictType,
          queueDraftKey: entry.payload.draftKey,
          triggerSource: effectiveTriggerSource,
          recoverableLocalSnapshot:
            errorInfo.conflictType === "retryable_sync_failure"
              ? null
              : failedSnapshot,
        },
      );
      await pushStageTelemetry({
        stage,
        result:
          decision.lifecycleStatus === "retry_scheduled"
            ? "retryable_failure"
            : "terminal_failure",
        draftKey: entry.payload.draftKey,
        requestId:
          String(
            failedSnapshot?.requestId ?? entry.payload.requestId ?? "",
          ).trim() || null,
        localOnlyDraftKey:
          entry.payload.draftKey === FOREMAN_LOCAL_ONLY_REQUEST_ID,
        attemptNumber,
        queueSizeBefore: queueSummaryBefore.totalCount,
        queueSizeAfter: pendingCount,
        coalescedCount: inflight.coalescedCount,
        conflictType: errorInfo.conflictType,
        offlineState,
        triggerSource: effectiveTriggerSource,
        errorClass:
          decision.retryExhausted === true
            ? `${errorInfo.errorClass}:retry_exhausted`
            : errorInfo.errorClass,
        errorCode: errorInfo.errorCode,
      });
      await pushStageTelemetry({
        stage: "finalize",
        result:
          decision.lifecycleStatus === "retry_scheduled"
            ? "retryable_failure"
            : "terminal_failure",
        draftKey: entry.payload.draftKey,
        requestId:
          String(
            failedSnapshot?.requestId ?? entry.payload.requestId ?? "",
          ).trim() || null,
        localOnlyDraftKey:
          entry.payload.draftKey === FOREMAN_LOCAL_ONLY_REQUEST_ID,
        attemptNumber,
        queueSizeBefore: queueSummaryBefore.totalCount,
        queueSizeAfter: pendingCount,
        coalescedCount: inflight.coalescedCount,
        conflictType: errorInfo.conflictType,
        offlineState,
        triggerSource: effectiveTriggerSource,
        errorClass:
          decision.retryExhausted === true
            ? `${errorInfo.errorClass}:retry_exhausted`
            : errorInfo.errorClass,
        errorCode: errorInfo.errorCode,
      });
      return {
        processedCount,
        remainingCount: pendingCount,
        requestId: latestRequestId,
        submitted: latestSubmitted,
        failed: true,
        errorMessage: message,
      };
    };

    try {
      const previousDraftKey =
        String(inflight.payload.draftKey ?? "").trim() ||
        getDraftKeyFromSnapshot(snapshot);
      await pushStageTelemetry({
        stage: "prepare_snapshot",
        result: "progress",
        draftKey: previousDraftKey,
        requestId:
          String(snapshot.requestId ?? entry.payload.requestId ?? "").trim() ||
          null,
        localOnlyDraftKey: previousDraftKey === FOREMAN_LOCAL_ONLY_REQUEST_ID,
        attemptNumber,
        queueSizeBefore: queueSummaryBefore.totalCount,
        queueSizeAfter: null,
        coalescedCount: inflight.coalescedCount,
        conflictType: "none",
        offlineState,
        triggerSource: effectiveTriggerSource,
      });

      await pushStageTelemetry({
        stage: "sync_rpc",
        result: "progress",
        draftKey: previousDraftKey,
        requestId:
          String(snapshot.requestId ?? entry.payload.requestId ?? "").trim() ||
          null,
        localOnlyDraftKey: previousDraftKey === FOREMAN_LOCAL_ONLY_REQUEST_ID,
        attemptNumber,
        queueSizeBefore: queueSummaryBefore.totalCount,
        queueSizeAfter: null,
        coalescedCount: inflight.coalescedCount,
        conflictType: "none",
        offlineState,
        triggerSource: effectiveTriggerSource,
      });
      const result = await syncSnapshotWithWorker(deps, snapshot, entry);
      const submittedRequestId = extractSubmittedRequestId(result.submitted);
      latestRequestId =
        String(
          result.snapshot?.requestId ??
            submittedRequestId ??
            snapshot.requestId ??
            "",
        ).trim() || latestRequestId;
      latestSubmitted =
        (result.submitted as RequestRecord | null) ?? latestSubmitted;

      if (
        previousDraftKey === FOREMAN_LOCAL_ONLY_REQUEST_ID &&
        latestRequestId &&
        latestRequestId !== FOREMAN_LOCAL_ONLY_REQUEST_ID
      ) {
        await rekeyForemanMutations(previousDraftKey, latestRequestId);
        await pushStageTelemetry({
          stage: "rekey",
          result: "success",
          draftKey: latestRequestId,
          requestId: latestRequestId,
          localOnlyDraftKey: false,
          attemptNumber,
          queueSizeBefore: queueSummaryBefore.totalCount,
          queueSizeAfter: null,
          coalescedCount: inflight.coalescedCount,
          conflictType: "none",
          offlineState,
          triggerSource: effectiveTriggerSource,
        });
      }

      if (result.snapshot) {
        await deps.applySnapshotToBoundary(result.snapshot);
      } else {
        await deps.persistSnapshot(null);
      }

      recordOfflineMutationEvent({
        owner: "foreman",
        entityId: inflight.entityId,
        mutationId: inflight.id,
        dedupeKey: inflight.dedupeKey,
        lifecycleStatus: "succeeded",
        action: "succeeded",
        attemptCount: inflight.attemptCount,
        retryCount: inflight.retryCount,
        triggerSource: effectiveTriggerSource,
        errorKind: "none",
        errorCode: null,
        nextRetryAt: null,
        coalescedCount: inflight.coalescedCount,
        extra: {
          submitted: Boolean(result.submitted),
          requestId: latestRequestId,
        },
      });
      await removeForemanMutationById(entry.id);

      const requestKeyForCleanup =
        String(
          result.snapshot?.requestId ??
            submittedRequestId ??
            snapshot.requestId ??
            entry.payload.requestId ??
            "",
        ).trim() || null;
      if (!result.snapshot && requestKeyForCleanup) {
        await clearForemanMutationsForDraft(FOREMAN_LOCAL_ONLY_REQUEST_ID);
        if (requestKeyForCleanup !== FOREMAN_LOCAL_ONLY_REQUEST_ID) {
          await clearForemanMutationsForDraft(requestKeyForCleanup);
        }
      }

      const remainingCount = await getPendingCountForSnapshot(
        result.snapshot ?? null,
      );
      await markForemanDurableDraftSyncSucceeded(
        result.snapshot ?? null,
        remainingCount,
        {
          queueDraftKey:
            remainingCount > 0
              ? (latestRequestId ?? entry.payload.draftKey)
              : null,
          triggerSource: effectiveTriggerSource,
        },
      );

      const queueSummaryAfter = await getForemanMutationQueueSummary(
        result.snapshot
          ? getDraftQueueKeysFromSnapshot(result.snapshot)
          : [requestKeyForCleanup],
      );
      trackForemanMutationBacklog(queueSummaryAfter, "foreman_mutation_backlog_after_flush", {
        draftKey: latestRequestId ?? entry.payload.draftKey,
        triggerSource: effectiveTriggerSource,
        processedCount,
      });
      await pushStageTelemetry({
        stage: "cleanup",
        result: "success",
        draftKey: latestRequestId ?? entry.payload.draftKey,
        requestId: latestRequestId,
        localOnlyDraftKey: false,
        attemptNumber,
        queueSizeBefore: queueSummaryBefore.totalCount,
        queueSizeAfter: queueSummaryAfter.totalCount,
        coalescedCount: inflight.coalescedCount,
        conflictType: "none",
        offlineState,
        triggerSource: effectiveTriggerSource,
      });
      await pushStageTelemetry({
        stage: "finalize",
        result: "success",
        draftKey: latestRequestId ?? entry.payload.draftKey,
        requestId: latestRequestId,
        localOnlyDraftKey: false,
        attemptNumber,
        queueSizeBefore: queueSummaryBefore.totalCount,
        queueSizeAfter: queueSummaryAfter.totalCount,
        coalescedCount: inflight.coalescedCount,
        conflictType: "none",
        offlineState,
        triggerSource: effectiveTriggerSource,
      });

      if (!result.snapshot && latestRequestId && latestSubmitted) {
        try {
          await deps.onSubmitted?.(latestRequestId, latestSubmitted);
        } catch (error) {
          reportPostSubmitCleanupFailure({
            error,
            requestId: latestRequestId,
            draftKey: entry.payload.draftKey,
            triggerSource: effectiveTriggerSource,
          });
        }
      }

      processedCount += 1;
    } catch (error) {
      const message = toErrorText(error);
      const stage: ForemanDraftSyncStage = message
        .toLowerCase()
        .includes("rekey")
        ? "rekey"
        : message.toLowerCase().includes("cleanup")
          ? "cleanup"
          : "sync_rpc";
      return await finalizeFailure(stage, error);
    }
  }
};

export const flushForemanMutationQueue = async (
  deps: ForemanMutationWorkerDeps,
  triggerSource?: ForemanDraftSyncTriggerSource | null,
): Promise<ForemanMutationWorkerResult> => {
  const initialTriggerSource = triggerSource ?? "unknown";
  return await requestOfflineReplay(
    FOREMAN_MUTATION_REPLAY_POLICY,
    initialTriggerSource,
    async (scheduledTriggerSource) =>
      await runFlush(
        deps,
        scheduledTriggerSource as ForemanDraftSyncTriggerSource,
      ),
  );
};

export const markForemanSnapshotQueued = async (
  snapshot: ForemanLocalDraftSnapshot | null,
  options?: {
    queueDraftKey?: string | null;
    triggerSource?: ForemanDraftSyncTriggerSource;
  },
) => {
  const pendingCount = await getPendingCountForSnapshot(snapshot);
  await markForemanDurableDraftQueued(snapshot, pendingCount, {
    queueDraftKey: options?.queueDraftKey ?? getDraftKeyFromSnapshot(snapshot),
    triggerSource: options?.triggerSource ?? "unknown",
  });
  return pendingCount;
};

export const clearForemanMutationQueueTail = async (params: {
  snapshot: ForemanLocalDraftSnapshot | null;
  draftKey?: string | null;
  triggerSource?: ForemanDraftSyncTriggerSource;
}) => {
  const requestId = String(params.snapshot?.requestId ?? "").trim();
  await clearForemanMutationsForDraft(FOREMAN_LOCAL_ONLY_REQUEST_ID);
  if (requestId && requestId !== FOREMAN_LOCAL_ONLY_REQUEST_ID) {
    await clearForemanMutationsForDraft(requestId);
  }
  const pendingCount = await getPendingCountForSnapshot(params.snapshot);
  await patchForemanDurableDraftRecoveryState({
    snapshot: params.snapshot,
    syncStatus: params.snapshot ? "dirty_local" : "idle",
    pendingOperationsCount: pendingCount,
    queueDraftKey: null,
    attentionNeeded: true,
    recoverableLocalSnapshot: params.snapshot,
    lastTriggerSource: params.triggerSource ?? "manual_retry",
  });
  return pendingCount;
};
