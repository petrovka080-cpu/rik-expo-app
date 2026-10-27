import type { RequestRecord } from "../api/types";
import {
  type ForemanDraftSyncStage,
  type ForemanDraftSyncTriggerSource,
} from "./foremanSyncRuntime";
import { recordPlatformObservability } from "../observability/platformObservability";
import { normalizeAppError } from "../errors/appError";
import {
  getForemanDurableDraftState,
  markForemanDurableDraftSyncFailed,
  markForemanDurableDraftSyncStarted,
  markForemanDurableDraftSyncSucceeded,
  patchForemanDurableDraftRecoveryState,
  markForemanDurableDraftQueued,
} from "../../screens/foreman/foreman.durableDraft.store";
import {
  type ForemanLocalDraftSnapshot,
} from "../../screens/foreman/foreman.localDraft";
import { FOREMAN_LOCAL_ONLY_REQUEST_ID } from "../../screens/foreman/foreman.localDraft.constants";
import {
  clearForemanMutationsForDraft,
  extractSubmittedRequestId,
  getForemanDraftKeyFromSnapshot,
  getForemanDraftQueueKeysFromSnapshot,
  getForemanMutationQueueSummary,
  getForemanPendingCountForSnapshot,
  markForemanMutationConflicted,
  markForemanMutationFailedNonRetryable,
  markForemanMutationInflight,
  markForemanMutationRetryScheduled,
  peekNextForemanMutation,
  rekeyForemanMutations,
  removeForemanMutationById,
  resetInflightForemanMutations,
} from "./mutationQueue";
import { isOfflineMutationConflictKind } from "./mutation.conflict";
import {
  FOREMAN_DRAIN_BATCH_SIZE,
  FOREMAN_MUTATION_REPLAY_POLICY,
  FOREMAN_RETRY_POLICY,
  normalizeForemanMutationLoopIterationLimit,
  resolveOfflineMutationFailureDecision,
} from "./mutation.retryPolicy";
import {
  pushForemanMutationStageTelemetry,
  recordOfflineMutationEvent,
  reportForemanPostSubmitCleanupFailure,
  toErrorText,
  toForemanOfflineState,
  trackForemanMutationBacklog,
} from "./mutation.telemetry";
import {
  classifyReplayFailure,
  recordReplayFailure,
  recordReplaySuccess,
  requestOfflineReplay,
  shouldAllowReplay,
} from "./offlineReplayCoordinator";
import {
  classifyForemanConflict,
  deriveForemanConflictFromFailure,
  shouldHoldForemanReplayForAttention,
} from "./offlineConflictClassifier";
import type {
  ForemanMutationWorkerDeps,
  ForemanMutationWorkerResult,
} from "./mutation.types";

export {
  FOREMAN_DRAIN_BATCH_SIZE,
  FOREMAN_MUTATION_FLUSH_LOOP_CEILING,
  FOREMAN_MUTATION_REPLAY_POLICY,
} from "./mutation.retryPolicy";

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

const runFlush = async (
  deps: ForemanMutationWorkerDeps,
  triggerSourceOverride?: ForemanDraftSyncTriggerSource | null,
): Promise<ForemanMutationWorkerResult> => {
  const circuitDecision = shouldAllowReplay();
  if (!circuitDecision.allow) {
    const remainingCount = await getForemanPendingCountForSnapshot(deps.getSnapshot());
    recordPlatformObservability({
      screen: "foreman",
      surface: "offline_replay_circuit",
      category: "fetch",
      event: "offline_replay_circuit_skip",
      result: "success",
      sourceKind: "offline:foreman_draft",
      extra: {
        worker: "mutation",
        remainingCount,
        retryAfterMs: circuitDecision.retryAfterMs,
        triggerSource: triggerSourceOverride ?? "unknown",
      },
    });
    return {
      processedCount: 0,
      remainingCount,
      requestId: null,
      submitted: null,
      failed: false,
      errorMessage: null,
      batchLimitReached: false,
      drainDurationMs: 0,
    };
  }

  await resetInflightForemanMutations();

  let processedCount = 0;
  let latestRequestId: string | null = null;
  let latestSubmitted: RequestRecord | null = null;
  const drainStartedAt = Date.now();
  const loopIterationLimit = normalizeForemanMutationLoopIterationLimit(deps.loopIterationLimit);

  for (let loopIteration = 0; loopIteration < loopIterationLimit; loopIteration += 1) {
    // O3.2: Bounded drain РІР‚вЂќ exit after FOREMAN_DRAIN_BATCH_SIZE items per pass.
    // The coordinator re-triggers if items remain, yielding the JS thread between passes.
    if (processedCount >= FOREMAN_DRAIN_BATCH_SIZE) {
      const remainingCount = await getForemanPendingCountForSnapshot(deps.getSnapshot());
      recordPlatformObservability({
        screen: "foreman",
        surface: "offline_mutation_worker",
        category: "ui",
        event: "drain_batch_limit_reached",
        result: "success",
        extra: {
          processedCount,
          remainingCount,
          drainBatchSize: FOREMAN_DRAIN_BATCH_SIZE,
          drainDurationMs: Date.now() - drainStartedAt,
          triggerSource: triggerSourceOverride ?? "unknown",
        },
      });
      return {
        processedCount,
        remainingCount,
        requestId: latestRequestId,
        submitted: latestSubmitted,
        failed: false,
        errorMessage: null,
        batchLimitReached: true,
        drainDurationMs: Date.now() - drainStartedAt,
      };
    }

    const entry = await peekNextForemanMutation({
      triggerSource: triggerSourceOverride ?? null,
    });
    if (!entry) {
      return {
        processedCount,
        remainingCount: await getForemanPendingCountForSnapshot(deps.getSnapshot()),
        requestId: latestRequestId,
        submitted: latestSubmitted,
        failed: false,
        errorMessage: null,
        batchLimitReached: false,
        drainDurationMs: Date.now() - drainStartedAt,
      };
    }

    const durableStateBeforeInflight = getForemanDurableDraftState();
    const entryDraftKey =
      String(entry.payload.draftKey ?? "").trim() || null;
    const entryRequestId =
      String(entry.payload.requestId ?? "").trim() || null;
    if (
      shouldHoldForemanReplayForAttention({
        conflictType: durableStateBeforeInflight.conflictType,
        attentionNeeded: durableStateBeforeInflight.attentionNeeded,
        entryDraftKey,
        entryRequestId,
        queueDraftKey: durableStateBeforeInflight.queueDraftKey,
        snapshotRequestId: durableStateBeforeInflight.snapshot?.requestId ?? null,
        recoverableRequestId:
          durableStateBeforeInflight.recoverableLocalSnapshot?.requestId ?? null,
      })
    ) {
      const heldSummary = await getForemanMutationQueueSummary(
        entryDraftKey ? [entryDraftKey] : undefined,
      );
      recordPlatformObservability({
        screen: "foreman",
        surface: "offline_mutation_worker",
        category: "ui",
        event: "offline_replay_attention_hold",
        result: "skipped",
        sourceKind: "offline:foreman_draft",
        extra: {
          draftKey: entryDraftKey,
          requestId: entryRequestId,
          conflictType: durableStateBeforeInflight.conflictType,
          triggerSource: triggerSourceOverride ?? entry.payload.triggerSource,
          pendingCount: heldSummary.pendingCount,
          retryScheduledCount: heldSummary.retryScheduledCount,
          conflictedCount: heldSummary.conflictedCount,
        },
      });
      return {
        processedCount,
        remainingCount: heldSummary.activeCount,
        requestId: entryRequestId,
        submitted: latestSubmitted,
        failed: true,
        errorMessage: "offline replay held for attention-required conflict",
        batchLimitReached: false,
        drainDurationMs: Date.now() - drainStartedAt,
      };
    }

    const inflight = await markForemanMutationInflight(entry.id);
    if (!inflight) {
      continue;
    }

    const snapshot =
      deps.getSnapshot() ?? getForemanDurableDraftState().snapshot;
    const [queueSummaryBefore, pendingBefore] = await Promise.all([
      getForemanMutationQueueSummary([
        entry.payload.draftKey,
      ]),
      getForemanPendingCountForSnapshot(snapshot),
    ]);
    trackForemanMutationBacklog(queueSummaryBefore, "foreman_mutation_backlog_before_flush", {
      draftKey: entry.payload.draftKey,
      triggerSource: triggerSourceOverride ?? entry.payload.triggerSource,
    });
    const attemptNumber = inflight.attemptCount;
    const offlineState = toForemanOfflineState(deps.getNetworkOnline?.());
    const effectiveTriggerSource =
      triggerSourceOverride ?? entry.payload.triggerSource;

    // РІвЂќР‚РІвЂќР‚ P6.3e: Terminal-request guard РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚РІвЂќР‚
    // Before attempting to sync, check if the request is already terminal
    // on the server. If so, remove the mutation and clean up instead of
    // syncing РІР‚вЂќ which would fail and write recovery state back into the
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
            batchLimitReached: false,
            drainDurationMs: Date.now() - drainStartedAt,
          };
        }

        const replayConflict = classifyForemanConflict({
          localSnapshot: snapshot,
          remoteSnapshot: remoteInspection.snapshot,
          remoteStatus: remoteInspection.status,
          remoteIsTerminal: remoteInspection.isTerminal,
          remoteMissing: remoteInspection.snapshot == null,
          pendingCount: Math.max(
            pendingBefore,
            queueSummaryBefore.pendingCount + queueSummaryBefore.inflightCount,
          ),
          requestIdKnown: Boolean(requestIdForGuard),
        });

        if (
          replayConflict.conflictClass ===
          "local_queue_pending_against_new_remote"
        ) {
          const message =
            "pending offline queue is behind a newer remote draft revision";
          await markForemanMutationConflicted({
            mutationId: entry.id,
            errorMessage: message,
            errorCode: "offline_c3_pre_sync",
            errorKind: "remote_divergence",
            serverVersionHint: replayConflict.remoteBaseRevision,
          });
          const pendingCountAfter = await getForemanPendingCountForSnapshot(snapshot);
          await markForemanDurableDraftSyncFailed(
            snapshot,
            message,
            pendingCountAfter,
            {
              stage: "prepare_snapshot",
              retryable: false,
              conflictType: "remote_divergence_requires_attention",
              queueDraftKey: entry.payload.draftKey,
              triggerSource: effectiveTriggerSource,
              recoverableLocalSnapshot: snapshot,
            },
          );
          recordPlatformObservability({
            screen: "foreman",
            surface: "offline_conflict",
            category: "ui",
            event: "pre_sync_conflict_c3_blocked",
            result: "error",
            sourceKind: "offline:foreman_draft",
            errorClass: "local_queue_pending_against_new_remote",
            extra: {
              requestId: requestIdForGuard,
              draftKey: entry.payload.draftKey,
              localBaseRevision: replayConflict.localBaseRevision,
              remoteBaseRevision: replayConflict.remoteBaseRevision,
              pendingCount: replayConflict.pendingCount,
              revisionAdvanced: replayConflict.revisionAdvanced,
              deterministic: replayConflict.deterministic,
            },
          });
          await pushForemanMutationStageTelemetry({
            stage: "prepare_snapshot",
            result: "terminal_failure",
            draftKey: entry.payload.draftKey,
            requestId: requestIdForGuard,
            localOnlyDraftKey:
              entry.payload.draftKey === FOREMAN_LOCAL_ONLY_REQUEST_ID,
            attemptNumber,
            queueSizeBefore: queueSummaryBefore.totalCount,
            queueSizeAfter: pendingCountAfter,
            coalescedCount: inflight.coalescedCount,
            conflictType: "remote_divergence_requires_attention",
            offlineState,
            triggerSource: effectiveTriggerSource,
            errorClass: "local_queue_pending_against_new_remote",
            errorCode: "offline_c3_pre_sync",
          });
          await pushForemanMutationStageTelemetry({
            stage: "finalize",
            result: "terminal_failure",
            draftKey: entry.payload.draftKey,
            requestId: requestIdForGuard,
            localOnlyDraftKey:
              entry.payload.draftKey === FOREMAN_LOCAL_ONLY_REQUEST_ID,
            attemptNumber,
            queueSizeBefore: queueSummaryBefore.totalCount,
            queueSizeAfter: pendingCountAfter,
            coalescedCount: inflight.coalescedCount,
            conflictType: "remote_divergence_requires_attention",
            offlineState,
            triggerSource: effectiveTriggerSource,
            errorClass: "local_queue_pending_against_new_remote",
            errorCode: "offline_c3_pre_sync",
          });
          return {
            processedCount,
            remainingCount: pendingCountAfter,
            requestId: requestIdForGuard,
            submitted: latestSubmitted,
            failed: true,
            errorMessage: message,
            batchLimitReached: false,
            drainDurationMs: Date.now() - drainStartedAt,
          };
        }
      } catch (error) {
        const appError = normalizeAppError(
          error,
          "foreman_mutation_worker_terminal_guard",
          "warn",
        );
        recordPlatformObservability({
          screen: "foreman",
          surface: "offline_mutation_worker",
          category: "fetch",
          event: "terminal_guard_remote_inspection_failed",
          result: "error",
          sourceKind: "offline:foreman_draft",
          errorStage: appError.context,
          errorClass: appError.code,
          errorMessage: appError.message,
          extra: {
            requestId: requestIdForGuard,
            draftKey: entry.payload.draftKey,
            appErrorCode: appError.code,
            appErrorContext: appError.context,
            appErrorSeverity: appError.severity,
            fallbackReason: "proceed_with_normal_sync",
          },
        });
        // Remote inspection failure is non-fatal; proceed with normal sync.
      }
    }

    await markForemanDurableDraftSyncStarted(pendingBefore, {
      queueDraftKey: entry.payload.draftKey,
      triggerSource: effectiveTriggerSource,
    });
    await pushForemanMutationStageTelemetry({
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
      await pushForemanMutationStageTelemetry({
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
      const errorInfo = await deriveForemanConflictFromFailure({
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
        const replayFailure = classifyReplayFailure(error);
        if (replayFailure) {
          recordReplayFailure({
            worker: "mutation",
            ...replayFailure,
          });
        }
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
      const pendingCount = await getForemanPendingCountForSnapshot(failedSnapshot);
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
      await pushForemanMutationStageTelemetry({
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
      await pushForemanMutationStageTelemetry({
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
        batchLimitReached: false,
        drainDurationMs: Date.now() - drainStartedAt,
      };
    };

    try {
      const previousDraftKey =
        String(inflight.payload.draftKey ?? "").trim() ||
        getForemanDraftKeyFromSnapshot(snapshot);
      await pushForemanMutationStageTelemetry({
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

      await pushForemanMutationStageTelemetry({
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
        await pushForemanMutationStageTelemetry({
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
      recordReplaySuccess("mutation");

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

      const queueSummaryKeys = result.snapshot
        ? getForemanDraftQueueKeysFromSnapshot(result.snapshot)
        : [requestKeyForCleanup];
      const [remainingCount, queueSummaryAfter] = await Promise.all([
        getForemanPendingCountForSnapshot(result.snapshot ?? null),
        getForemanMutationQueueSummary(queueSummaryKeys),
      ]);
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

      trackForemanMutationBacklog(queueSummaryAfter, "foreman_mutation_backlog_after_flush", {
        draftKey: latestRequestId ?? entry.payload.draftKey,
        triggerSource: effectiveTriggerSource,
        processedCount,
      });
      await pushForemanMutationStageTelemetry({
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
      await pushForemanMutationStageTelemetry({
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
          reportForemanPostSubmitCleanupFailure({
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

  const loopCeilingSummary = await getForemanMutationQueueSummary();
  const remainingCount = loopCeilingSummary.activeCount;
  if (remainingCount === 0) {
    return {
      processedCount,
      remainingCount,
      requestId: latestRequestId,
      submitted: latestSubmitted,
      failed: false,
      errorMessage: null,
      batchLimitReached: false,
      drainDurationMs: Date.now() - drainStartedAt,
    };
  }
  recordPlatformObservability({
    screen: "foreman",
    surface: "offline_mutation_worker",
    category: "ui",
    event: "worker_loop_ceiling_reached",
    result: "skipped",
    sourceKind: "offline:foreman_draft",
    rowCount: remainingCount,
    extra: {
      worker: "foreman_mutation",
      processedCount,
      remainingCount,
      loopIterationLimit,
      drainDurationMs: Date.now() - drainStartedAt,
      triggerSource: triggerSourceOverride ?? "unknown",
    },
  });
  return {
    processedCount,
    remainingCount,
    requestId: latestRequestId,
    submitted: latestSubmitted,
    failed: false,
    errorMessage: null,
    batchLimitReached: true,
    drainDurationMs: Date.now() - drainStartedAt,
  };
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
  const pendingCount = await getForemanPendingCountForSnapshot(snapshot);
  await markForemanDurableDraftQueued(snapshot, pendingCount, {
    queueDraftKey: options?.queueDraftKey ?? getForemanDraftKeyFromSnapshot(snapshot),
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
  const pendingCount = await getForemanPendingCountForSnapshot(params.snapshot);
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
