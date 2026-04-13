import {
  clearContractorProgressQueueForProgress,
  enqueueContractorProgress,
  getContractorProgressPendingCount,
  loadContractorProgressQueue,
  markContractorProgressQueueConflicted,
  markContractorProgressQueueFailedNonRetryable,
  markContractorProgressQueueInflight,
  markContractorProgressQueueRetryScheduled,
  peekNextContractorProgressQueueEntry,
  removeContractorProgressQueueEntry,
  resetInflightContractorProgressQueue,
} from "./contractorProgressQueue";
import type { PlatformOfflineRetryTriggerSource } from "./platformOffline.model";
import { recordPlatformOfflineTelemetry } from "./platformOffline.observability";
import {
  buildWorkProgressMaterialsPayload,
  buildWorkProgressNote,
  ensureWorkProgressSubmission,
} from "../../screens/contractor/contractor.progressService";
import {
  getContractorProgressDraft,
  markContractorProgressFailedTerminal,
  markContractorProgressQueued,
  markContractorProgressRetryWait,
  markContractorProgressSynced,
  markContractorProgressSyncing,
  setContractorProgressPendingLogId,
  type ContractorProgressConflictType,
  type ContractorProgressDraftRecord,
  type ContractorProgressFailureClass,
} from "../../screens/contractor/contractor.progressDraft.store";
import {
  classifyOfflineMutationErrorKind,
  isOfflineMutationConflictKind,
} from "./mutation.conflict";
import {
  getOfflineMutationRetryPolicy,
  resolveOfflineMutationFailureDecision,
} from "./mutation.retryPolicy";
import { recordOfflineMutationEvent } from "./mutation.telemetry";
import type { OfflineMutationErrorKind } from "./mutation.types";
import {
  requestOfflineReplay,
  type OfflineReplayPolicy,
} from "./offlineReplayCoordinator";

type ContractorProgressWorkerTriggerSource = PlatformOfflineRetryTriggerSource;

export type ContractorProgressWorkerResult = {
  processedCount: number;
  remainingCount: number;
  failed: boolean;
  errorMessage: string | null;
  failureClass: ContractorProgressFailureClass;
  lastProgressId: string | null;
  lastErrorStage: string | null;
  triggerSource: ContractorProgressWorkerTriggerSource;
};

type ContractorProgressWorkerDeps = {
  supabaseClient: any;
  pickFirstNonEmpty: (...values: any[]) => string | null;
  refreshAfterSuccess?: (progressId: string) => Promise<void>;
  getNetworkOnline?: () => boolean | null;
};

type ContractorProgressFailureAssessment = {
  retryable: boolean;
  failureClass: ContractorProgressFailureClass;
  conflictType: ContractorProgressConflictType;
  errorMessage: string;
  errorKind: OfflineMutationErrorKind;
  errorCode: string;
};

const CONTRACTOR_RETRY_POLICY = getOfflineMutationRetryPolicy("contractor_default");
export const CONTRACTOR_PROGRESS_REPLAY_POLICY = {
  queueKey: "contractor_progress",
  owner: "contractor_progress_worker",
  concurrencyLimit: 1,
  ordering: "created_at_fifo",
  backpressure: "coalesce_triggers_and_rerun_once",
} as const satisfies OfflineReplayPolicy;

const trim = (value: unknown) => String(value ?? "").trim();

const serializeDraft = (draft: ContractorProgressDraftRecord | null) =>
  JSON.stringify({
    fields: draft?.fields ?? null,
    materials: (draft?.materials ?? [])
      .map((material) => ({
        matCode: trim(material.matCode),
        qtyFact: Number(material.qtyFact),
        uom: trim(material.uom),
      }))
      .sort((left, right) => `${left.matCode}:${left.uom}`.localeCompare(`${right.matCode}:${right.uom}`)),
    context: draft?.context ?? null,
  });

const classifyContractorProgressFailure = (error: unknown): ContractorProgressFailureAssessment => {
  const normalized = classifyOfflineMutationErrorKind(error);
  const lower = normalized.message.toLowerCase();

  let failureClass: ContractorProgressFailureClass = "failed_terminal";
  let retryable = false;
  let conflictType: ContractorProgressConflictType = "none";

  if (normalized.errorKind === "network_unreachable") {
    failureClass = "offline_wait";
    retryable = true;
  } else if (
    normalized.errorKind === "timeout" ||
    normalized.errorKind === "transient_server" ||
    normalized.errorKind === "transport" ||
    normalized.errorKind === "runtime"
  ) {
    failureClass = "retryable_sync_failure";
    retryable = true;
  } else if (
    lower.includes("submitted") ||
    lower.includes("finalized") ||
    lower.includes("closed") ||
    lower.includes("cancelled") ||
    lower.includes("canceled")
  ) {
    failureClass = "conflicted";
    conflictType = "server_terminal_conflict";
  } else if (normalized.errorKind === "stale_state") {
    failureClass = "conflicted";
    conflictType = "stale_progress_state";
  } else if (normalized.errorKind === "remote_divergence") {
    failureClass = "conflicted";
    conflictType = "remote_divergence_requires_attention";
  } else if (
    normalized.errorKind === "conflict" ||
    (normalized.errorKind === "contract_validation" &&
      (lower.includes("conflict") || lower.includes("stale") || lower.includes("version")))
  ) {
    failureClass = "conflicted";
    conflictType = lower.includes("stale") || lower.includes("version")
      ? "stale_progress_state"
      : "validation_conflict";
  } else if (isOfflineMutationConflictKind(normalized.errorKind)) {
    failureClass = "conflicted";
    conflictType = "remote_divergence_requires_attention";
  }

  return {
    retryable,
    failureClass,
    conflictType,
    errorMessage: normalized.message,
    errorKind: normalized.errorKind,
    errorCode: normalized.errorCode,
  };
};

const resolvedObjectNameMissing = (
  draft: ContractorProgressDraftRecord | null,
  deps: ContractorProgressWorkerDeps,
) => {
  if (!draft) return true;
  const resolvedObjectName =
    deps.pickFirstNonEmpty(draft.context.rowObjectName, draft.context.jobObjectName) || "";
  return !trim(resolvedObjectName);
};

const runFlush = async (
  deps: ContractorProgressWorkerDeps,
  triggerSource: ContractorProgressWorkerTriggerSource,
): Promise<ContractorProgressWorkerResult> => {
  const inflightBeforeReset = (await loadContractorProgressQueue({ includeFinal: true })).filter(
    (entry) => entry.lifecycleStatus === "processing",
  ).length;
  await resetInflightContractorProgressQueue();
  const restoredInflightCount = inflightBeforeReset;
  if (restoredInflightCount > 0) {
    recordPlatformOfflineTelemetry({
      contourKey: "contractor_progress",
      entityKey: null,
      syncStatus: "queued",
      queueAction: "reset_inflight",
      coalesced: false,
      retryCount: 0,
      pendingCount: restoredInflightCount,
      failureClass: "none",
      triggerKind: triggerSource,
      networkKnownOffline: deps.getNetworkOnline?.() === false,
      restoredAfterReopen: true,
      manualRetry: triggerSource === "manual_retry",
      durationMs: null,
    });
  }

  let processedCount = 0;
  let lastProgressId: string | null = null;
  let lastErrorStage: string | null = null;

  while (true) {
    const entry = await peekNextContractorProgressQueueEntry({
      triggerSource,
    });
    if (!entry) {
      return {
        processedCount,
        remainingCount: await getContractorProgressPendingCount(),
        failed: false,
        errorMessage: null,
        failureClass: "none",
        lastProgressId,
        lastErrorStage,
        triggerSource,
      };
    }

    const inflight = await markContractorProgressQueueInflight(entry.id);
    if (!inflight) continue;

    if (deps.getNetworkOnline?.() === false) {
      const decision = resolveOfflineMutationFailureDecision({
        policy: CONTRACTOR_RETRY_POLICY,
        attemptCount: inflight.attemptCount,
        retryable: true,
        conflicted: false,
        errorKind: "network_unreachable",
      });
      if (decision.lifecycleStatus === "retry_scheduled") {
        await markContractorProgressQueueRetryScheduled({
          queueId: entry.id,
          errorMessage: "offline",
          errorCode: "offline",
          errorKind: "network_unreachable",
          nextRetryAt: decision.nextRetryAt,
        });
        await markContractorProgressRetryWait(entry.progressId, {
          errorMessage: "offline",
          errorStage: "sync_rpc",
          pendingCount: await getContractorProgressPendingCount(entry.progressId),
          failureClass: "offline_wait",
          errorKind: "network_unreachable",
          errorCode: "offline",
          nextRetryAt: decision.nextRetryAt,
        });
      } else {
        await markContractorProgressQueueFailedNonRetryable({
          queueId: entry.id,
          errorMessage: "offline",
          errorCode: "offline",
          errorKind: "network_unreachable",
          exhausted: decision.retryExhausted,
        });
        await markContractorProgressFailedTerminal(entry.progressId, {
          errorMessage: "offline",
          errorStage: "sync_rpc",
          failureClass: "failed_terminal",
          errorKind: "network_unreachable",
          errorCode: "offline",
        });
      }
      recordPlatformOfflineTelemetry({
        contourKey: "contractor_progress",
        entityKey: entry.progressId,
        syncStatus: decision.lifecycleStatus === "retry_scheduled" ? "retry_wait" : "failed_terminal",
        queueAction: decision.lifecycleStatus === "retry_scheduled" ? "sync_retry_wait" : "sync_failed_terminal",
        coalesced: inflight.coalescedCount > 0,
        retryCount:
          decision.lifecycleStatus === "retry_scheduled" ? inflight.retryCount + 1 : inflight.retryCount,
        pendingCount: await getContractorProgressPendingCount(entry.progressId),
        failureClass:
          decision.lifecycleStatus === "retry_scheduled" ? "offline_wait" : "failed_terminal",
        triggerKind: triggerSource,
        networkKnownOffline: true,
        restoredAfterReopen: false,
        manualRetry: triggerSource === "manual_retry",
        durationMs: null,
      });
      return {
        processedCount,
        remainingCount: await getContractorProgressPendingCount(),
        failed: true,
        errorMessage: "offline",
        failureClass: decision.lifecycleStatus === "retry_scheduled" ? "offline_wait" : "failed_terminal",
        lastProgressId,
        lastErrorStage: "sync_rpc",
        triggerSource,
      };
    }

    const draftBefore = getContractorProgressDraft(entry.progressId);
    if (!draftBefore) {
      recordOfflineMutationEvent({
        owner: "contractor",
        entityId: inflight.entityId,
        mutationId: inflight.id,
        dedupeKey: inflight.dedupeKey,
        lifecycleStatus: "discarded_by_policy",
        action: "discarded_by_policy",
        attemptCount: inflight.attemptCount,
        retryCount: inflight.retryCount,
        triggerSource,
        errorKind: inflight.lastErrorKind,
        errorCode: inflight.lastErrorCode,
        nextRetryAt: null,
        coalescedCount: inflight.coalescedCount,
        extra: {
          reason: "draft_missing",
        },
      });
      await removeContractorProgressQueueEntry(entry.id);
      await clearContractorProgressQueueForProgress(entry.progressId);
      await markContractorProgressSynced(entry.progressId, { pendingCount: 0 });
      continue;
    }

    if (resolvedObjectNameMissing(draftBefore, deps)) {
      await markContractorProgressQueueFailedNonRetryable({
        queueId: entry.id,
        errorMessage: "missing_object",
        errorCode: "missing_object",
        errorKind: "contract_validation",
      });
      await markContractorProgressFailedTerminal(entry.progressId, {
        errorMessage: "Не удалось определить объект для сохранения факта.",
        errorStage: "prepare_snapshot",
        pendingLogId: draftBefore.pendingLogId,
        failureClass: "failed_terminal",
        errorKind: "contract_validation",
        errorCode: "missing_object",
      });
      return {
        processedCount,
        remainingCount: await getContractorProgressPendingCount(),
        failed: true,
        errorMessage: "missing_object",
        failureClass: "failed_terminal",
        lastProgressId,
        lastErrorStage: "prepare_snapshot",
        triggerSource,
      };
    }

    const snapshotKey = serializeDraft(draftBefore);
    const pendingBefore = await getContractorProgressPendingCount(entry.progressId);
    await markContractorProgressSyncing(entry.progressId, pendingBefore);
    recordPlatformOfflineTelemetry({
      contourKey: "contractor_progress",
      entityKey: entry.progressId,
      syncStatus: "syncing",
      queueAction: "sync_start",
      coalesced: inflight.coalescedCount > 0,
      retryCount: inflight.retryCount,
      pendingCount: pendingBefore,
      failureClass: "none",
      triggerKind: triggerSource,
      networkKnownOffline: deps.getNetworkOnline?.() === false,
      restoredAfterReopen: false,
      manualRetry: triggerSource === "manual_retry",
      durationMs: null,
    });
    const startedAt = Date.now();

    const finalizeFailure = async (
      error: unknown,
      stage: "sync_rpc" | "sync_log" | "sync_materials" | "prepare_snapshot",
      pendingLogId?: string | null,
    ) => {
      const failure = classifyContractorProgressFailure(error);
      const decision = resolveOfflineMutationFailureDecision({
        policy: CONTRACTOR_RETRY_POLICY,
        attemptCount: inflight.attemptCount,
        retryable: failure.retryable,
        conflicted: failure.conflictType !== "none",
        errorKind: failure.errorKind as any,
      });

      if (decision.lifecycleStatus === "retry_scheduled") {
        await markContractorProgressQueueRetryScheduled({
          queueId: entry.id,
          errorMessage: failure.errorMessage,
          errorCode: failure.errorCode,
          errorKind: failure.errorKind,
          nextRetryAt: decision.nextRetryAt,
        });
        await markContractorProgressRetryWait(entry.progressId, {
          errorMessage: failure.errorMessage,
          errorStage: stage,
          pendingCount: await getContractorProgressPendingCount(entry.progressId),
          failureClass: failure.failureClass === "offline_wait" ? "offline_wait" : "retryable_sync_failure",
          pendingLogId,
          errorKind: failure.errorKind,
          errorCode: failure.errorCode,
          nextRetryAt: decision.nextRetryAt,
        });
      } else if (decision.lifecycleStatus === "conflicted") {
        await markContractorProgressQueueConflicted({
          queueId: entry.id,
          errorMessage: failure.errorMessage,
          errorCode: failure.errorCode,
          errorKind: failure.errorKind,
          serverVersionHint: pendingLogId ?? null,
        });
        await markContractorProgressFailedTerminal(entry.progressId, {
          errorMessage: failure.errorMessage,
          errorStage: stage,
          pendingLogId,
          failureClass: "conflicted",
          conflictType: failure.conflictType,
          errorKind: failure.errorKind,
          errorCode: failure.errorCode,
        });
      } else {
        await markContractorProgressQueueFailedNonRetryable({
          queueId: entry.id,
          errorMessage: failure.errorMessage,
          errorCode: failure.errorCode,
          errorKind: failure.errorKind,
          exhausted: decision.retryExhausted,
        });
        await markContractorProgressFailedTerminal(entry.progressId, {
          errorMessage: failure.errorMessage,
          errorStage: stage,
          pendingLogId,
          failureClass: failure.failureClass === "conflicted" ? "conflicted" : "failed_terminal",
          conflictType: failure.conflictType,
          errorKind: failure.errorKind,
          errorCode: failure.errorCode,
        });
      }

      recordPlatformOfflineTelemetry({
        contourKey: "contractor_progress",
        entityKey: entry.progressId,
        syncStatus: decision.lifecycleStatus === "retry_scheduled" ? "retry_wait" : "failed_terminal",
        queueAction: decision.lifecycleStatus === "retry_scheduled" ? "sync_retry_wait" : "sync_failed_terminal",
        coalesced: inflight.coalescedCount > 0,
        retryCount:
          decision.lifecycleStatus === "retry_scheduled" ? inflight.retryCount + 1 : inflight.retryCount,
        pendingCount: await getContractorProgressPendingCount(entry.progressId),
        failureClass:
          decision.lifecycleStatus === "retry_scheduled"
            ? failure.failureClass === "offline_wait"
              ? "offline_wait"
              : "retryable_sync_failure"
            : "failed_terminal",
        triggerKind: triggerSource,
        networkKnownOffline: deps.getNetworkOnline?.() === false,
        restoredAfterReopen: false,
        manualRetry: triggerSource === "manual_retry",
        durationMs: Date.now() - startedAt,
      });

      return {
        processedCount,
        remainingCount: await getContractorProgressPendingCount(),
        failed: true,
        errorMessage: failure.errorMessage,
        failureClass:
          decision.lifecycleStatus === "retry_scheduled"
            ? failure.failureClass === "offline_wait"
              ? "offline_wait"
              : "retryable_sync_failure"
            : failure.failureClass === "conflicted"
              ? "conflicted"
              : "failed_terminal",
        lastProgressId,
        lastErrorStage: stage,
        triggerSource,
      } satisfies ContractorProgressWorkerResult;
    };

    try {
      const submitResult = await ensureWorkProgressSubmission({
        supabaseClient: deps.supabaseClient,
        progressId: draftBefore.progressId,
        workUom: draftBefore.context.workUom,
        stageNote: draftBefore.fields.selectedStage,
        note: buildWorkProgressNote(draftBefore.fields.location, draftBefore.fields.comment),
        qty: draftBefore.fields.qtyDone ?? 1,
        materialsPayload: buildWorkProgressMaterialsPayload(draftBefore.materials),
        existingLogId: draftBefore.pendingLogId,
      });

      if (submitResult.ok === false) {
        const submitFailureStage = submitResult.stage === "log" ? "sync_log" : "sync_materials";
        lastErrorStage = submitFailureStage;
        return await finalizeFailure(
          submitResult.error,
          submitFailureStage,
          submitResult.logId ?? draftBefore.pendingLogId,
        );
      }

      await setContractorProgressPendingLogId(entry.progressId, submitResult.logId);
      recordOfflineMutationEvent({
        owner: "contractor",
        entityId: inflight.entityId,
        mutationId: inflight.id,
        dedupeKey: inflight.dedupeKey,
        lifecycleStatus: "succeeded",
        action: "succeeded",
        attemptCount: inflight.attemptCount,
        retryCount: inflight.retryCount,
        triggerSource,
        errorKind: "none",
        errorCode: null,
        nextRetryAt: null,
        coalescedCount: inflight.coalescedCount,
        extra: {
          logId: submitResult.logId,
        },
      });
      await removeContractorProgressQueueEntry(entry.id);
      processedCount += 1;
      lastProgressId = entry.progressId;

      const draftAfter = getContractorProgressDraft(entry.progressId);
      const snapshotChangedWhileSyncing =
        draftAfter != null &&
        serializeDraft(draftAfter) !== snapshotKey &&
        (draftAfter.materials.length > 0 ||
          trim(draftAfter.fields.selectedStage) ||
          trim(draftAfter.fields.comment) ||
          trim(draftAfter.fields.location));

      if (snapshotChangedWhileSyncing) {
        await setContractorProgressPendingLogId(entry.progressId, null);
        await enqueueContractorProgress(entry.progressId, {
          baseVersion: draftAfter?.updatedAt != null ? String(draftAfter.updatedAt) : null,
          serverVersionHint: submitResult.logId,
        });
        await markContractorProgressQueued(
          entry.progressId,
          await getContractorProgressPendingCount(entry.progressId),
        );
      } else {
        await markContractorProgressSynced(entry.progressId, {
          pendingCount: 0,
        });
      }

      recordPlatformOfflineTelemetry({
        contourKey: "contractor_progress",
        entityKey: entry.progressId,
        syncStatus: snapshotChangedWhileSyncing ? "queued" : "synced",
        queueAction: "sync_success",
        coalesced: inflight.coalescedCount > 0,
        retryCount: inflight.retryCount,
        pendingCount: snapshotChangedWhileSyncing ? await getContractorProgressPendingCount(entry.progressId) : 0,
        failureClass: "none",
        triggerKind: triggerSource,
        networkKnownOffline: false,
        restoredAfterReopen: restoredInflightCount > 0,
        manualRetry: triggerSource === "manual_retry",
        durationMs: Date.now() - startedAt,
      });

      if (deps.refreshAfterSuccess) {
        try {
          await deps.refreshAfterSuccess(entry.progressId);
        } catch (error) {
          console.warn("[contractor.offline] refreshAfterSuccess failed", error);
        }
      }
    } catch (error) {
      lastErrorStage = "sync_rpc";
      return await finalizeFailure(error, "sync_rpc", draftBefore.pendingLogId);
    }
  }
};

export const flushContractorProgressQueue = async (
  deps: ContractorProgressWorkerDeps,
  triggerSource: ContractorProgressWorkerTriggerSource,
): Promise<ContractorProgressWorkerResult> => {
  return await requestOfflineReplay(
    CONTRACTOR_PROGRESS_REPLAY_POLICY,
    triggerSource,
    async (scheduledTriggerSource) =>
      await runFlush(
        deps,
        scheduledTriggerSource as ContractorProgressWorkerTriggerSource,
      ),
  );
};
