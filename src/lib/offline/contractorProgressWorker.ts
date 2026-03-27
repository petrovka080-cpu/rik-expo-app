import {
  clearContractorProgressQueueForProgress,
  enqueueContractorProgress,
  getContractorProgressPendingCount,
  loadContractorProgressQueue,
  markContractorProgressQueueFailed,
  markContractorProgressQueueInflight,
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
  type ContractorProgressDraftRecord,
  type ContractorProgressFailureClass,
} from "../../screens/contractor/contractor.progressDraft.store";

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

let flushInFlight: Promise<ContractorProgressWorkerResult> | null = null;

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

const toErrorText = (error: unknown) => {
  if (error instanceof Error) return trim(error.message) || "progress_submit_failed";
  if (error && typeof error === "object" && "message" in error) {
    return trim((error as { message?: unknown }).message) || "progress_submit_failed";
  }
  return trim(error) || "progress_submit_failed";
};

const classifyRetryableError = (errorMessage: string): Extract<
  ContractorProgressFailureClass,
  "offline_wait" | "retryable_sync_failure" | "failed_terminal"
> => {
  const text = trim(errorMessage).toLowerCase();
  if (!text) return "failed_terminal";
  if (text === "offline" || text.includes("network request failed") || text.includes("internet")) {
    return "offline_wait";
  }
  if (
    text.includes("timeout") ||
    text.includes("temporar") ||
    text.includes("fetch") ||
    text.includes("network") ||
    text.includes("connection")
  ) {
    return "retryable_sync_failure";
  }
  return "failed_terminal";
};

const resolvedObjectNameMissing = (draft: ContractorProgressDraftRecord | null, deps: ContractorProgressWorkerDeps) => {
  if (!draft) return true;
  const resolvedObjectName =
    deps.pickFirstNonEmpty(draft.context.rowObjectName, draft.context.jobObjectName) || "";
  return !trim(resolvedObjectName);
};

const runFlush = async (
  deps: ContractorProgressWorkerDeps,
  triggerSource: ContractorProgressWorkerTriggerSource,
): Promise<ContractorProgressWorkerResult> => {
  const inflightBeforeReset = (await loadContractorProgressQueue()).filter((entry) => entry.status === "inflight").length;
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
    const entry = await peekNextContractorProgressQueueEntry();
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
      await markContractorProgressQueueFailed(entry.id, "offline");
      await markContractorProgressRetryWait(entry.progressId, {
        errorMessage: "offline",
        errorStage: "sync_rpc",
        pendingCount: await getContractorProgressPendingCount(entry.progressId),
        failureClass: "offline_wait",
      });
      recordPlatformOfflineTelemetry({
        contourKey: "contractor_progress",
        entityKey: entry.progressId,
        syncStatus: "retry_wait",
        queueAction: "sync_retry_wait",
        coalesced: inflight.coalescedCount > 0,
        retryCount: inflight.retryCount + 1,
        pendingCount: await getContractorProgressPendingCount(entry.progressId),
        failureClass: "offline_wait",
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
        failureClass: "offline_wait",
        lastProgressId,
        lastErrorStage: "sync_rpc",
        triggerSource,
      };
    }

    const draftBefore = getContractorProgressDraft(entry.progressId);
    if (!draftBefore) {
      await removeContractorProgressQueueEntry(entry.id);
      await clearContractorProgressQueueForProgress(entry.progressId);
      await markContractorProgressSynced(entry.progressId, { pendingCount: 0 });
      continue;
    }

    if (resolvedObjectNameMissing(draftBefore, deps)) {
      await removeContractorProgressQueueEntry(entry.id);
      await markContractorProgressFailedTerminal(entry.progressId, {
        errorMessage: "Не удалось определить объект для сохранения факта.",
        errorStage: "prepare_snapshot",
        pendingLogId: draftBefore.pendingLogId,
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
        const errorMessage = toErrorText(submitResult.error);
        const failureClass = classifyRetryableError(errorMessage);
        lastErrorStage = submitResult.stage === "log" ? "sync_log" : "sync_materials";

        if (failureClass === "failed_terminal") {
          await removeContractorProgressQueueEntry(entry.id);
          await markContractorProgressFailedTerminal(entry.progressId, {
            errorMessage,
            errorStage: lastErrorStage,
            pendingLogId: submitResult.logId ?? draftBefore.pendingLogId,
          });
        } else {
          await markContractorProgressQueueFailed(entry.id, errorMessage);
          await markContractorProgressRetryWait(entry.progressId, {
            errorMessage,
            errorStage: lastErrorStage,
            pendingCount: await getContractorProgressPendingCount(entry.progressId),
            failureClass,
            pendingLogId: submitResult.logId ?? draftBefore.pendingLogId,
          });
        }

        recordPlatformOfflineTelemetry({
          contourKey: "contractor_progress",
          entityKey: entry.progressId,
          syncStatus: failureClass === "failed_terminal" ? "failed_terminal" : "retry_wait",
          queueAction: failureClass === "failed_terminal" ? "sync_failed_terminal" : "sync_retry_wait",
          coalesced: inflight.coalescedCount > 0,
          retryCount: inflight.retryCount + (failureClass === "failed_terminal" ? 0 : 1),
          pendingCount: await getContractorProgressPendingCount(entry.progressId),
          failureClass,
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
          errorMessage,
          failureClass,
          lastProgressId,
          lastErrorStage,
          triggerSource,
        };
      }

      await setContractorProgressPendingLogId(entry.progressId, submitResult.logId);
      await removeContractorProgressQueueEntry(entry.id);
      processedCount += 1;
      lastProgressId = entry.progressId;

      const draftAfter = getContractorProgressDraft(entry.progressId);
      const snapshotChangedWhileSyncing =
        draftAfter != null &&
        serializeDraft(draftAfter) !== snapshotKey &&
        (draftAfter.materials.length > 0 || trim(draftAfter.fields.selectedStage) || trim(draftAfter.fields.comment) || trim(draftAfter.fields.location));

      if (snapshotChangedWhileSyncing) {
        await setContractorProgressPendingLogId(entry.progressId, null);
        await enqueueContractorProgress(entry.progressId);
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
        } catch {
          // Submit already succeeded; refresh can recover on next screen lifecycle.
        }
      }
    } catch (error) {
      const errorMessage = toErrorText(error);
      const failureClass = classifyRetryableError(errorMessage);
      lastErrorStage = "sync_rpc";
      if (failureClass === "failed_terminal") {
        await removeContractorProgressQueueEntry(entry.id);
        await markContractorProgressFailedTerminal(entry.progressId, {
          errorMessage,
          errorStage: "sync_rpc",
          pendingLogId: draftBefore.pendingLogId,
        });
      } else {
        await markContractorProgressQueueFailed(entry.id, errorMessage);
        await markContractorProgressRetryWait(entry.progressId, {
          errorMessage,
          errorStage: "sync_rpc",
          pendingCount: await getContractorProgressPendingCount(entry.progressId),
          failureClass,
          pendingLogId: draftBefore.pendingLogId,
        });
      }
      recordPlatformOfflineTelemetry({
        contourKey: "contractor_progress",
        entityKey: entry.progressId,
        syncStatus: failureClass === "failed_terminal" ? "failed_terminal" : "retry_wait",
        queueAction: failureClass === "failed_terminal" ? "sync_failed_terminal" : "sync_retry_wait",
        coalesced: inflight.coalescedCount > 0,
        retryCount: inflight.retryCount + (failureClass === "failed_terminal" ? 0 : 1),
        pendingCount: await getContractorProgressPendingCount(entry.progressId),
        failureClass,
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
        errorMessage,
        failureClass,
        lastProgressId,
        lastErrorStage,
        triggerSource,
      };
    }
  }
};

export const flushContractorProgressQueue = async (
  deps: ContractorProgressWorkerDeps,
  triggerSource: ContractorProgressWorkerTriggerSource,
): Promise<ContractorProgressWorkerResult> => {
  if (flushInFlight) {
    return await flushInFlight;
  }

  flushInFlight = runFlush(deps, triggerSource).finally(() => {
    flushInFlight = null;
  });

  return await flushInFlight;
};
