import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import type { Dispatch, SetStateAction } from "react";
import type { WorkMaterialRow } from "../../../components/WorkMaterialsEditor";
import { ensurePlatformNetworkService } from "../../../lib/offline/platformNetwork.service";
import {
  selectPlatformOnlineFlag,
  type PlatformOfflineRetryTriggerSource,
} from "../../../lib/offline/platformOffline.model";
import { recordPlatformOfflineTelemetry } from "../../../lib/offline/platformOffline.observability";
import {
  getLifecycleCurrentAppState,
  subscribeLifecycleAppActiveTransition,
  subscribeLifecycleNetworkRecovery,
} from "../../../lib/lifecycle/useAppActiveRevalidation";
import type { ContractorWorkRow } from "../contractor.loadWorksService";
import {
  buildContractorProgressSyncUiStatus,
  configureContractorProgressDraftStore,
  getContractorProgressDraft,
  hydrateContractorProgressDraftStore,
  markContractorProgressQueued,
  patchContractorProgressDraftContext,
  setContractorProgressDraftFields,
  setContractorProgressDraftMaterials,
  useContractorProgressDraftStore,
  type ContractorProgressDraftMaterial,
  type ContractorProgressDraftRecord,
} from "../contractor.progressDraft.store";
import {
  configureContractorProgressQueue,
  enqueueContractorProgress,
  getContractorProgressPendingCount,
  getContractorProgressQueueEntry,
} from "../../../lib/offline/contractorProgressQueue";
import { flushContractorProgressQueue } from "../../../lib/offline/contractorProgressWorker";
import { isActiveWork, pickErr } from "../contractor.utils";

type JobHeaderLike = {
  object_name?: string | null;
};

const trim = (value: unknown) => String(value ?? "").trim();

const toDraftMaterials = (rows: WorkMaterialRow[]): ContractorProgressDraftMaterial[] =>
  (rows ?? [])
    .map((row) => ({
      id: trim(row.id) || null,
      materialId: trim(row.material_id) || null,
      matCode: trim(row.mat_code ?? row.code) || null,
      name: trim(row.name) || null,
      uom: trim(row.uom) || null,
      qty: Number(row.qty ?? 0),
      qtyFact: Number(row.qty_fact ?? row.qty ?? 0),
      price: Number.isFinite(Number(row.price)) ? Number(row.price) : null,
      available: Number.isFinite(Number(row.available)) ? Number(row.available) : null,
    }))
    .filter((row) => Number.isFinite(row.qtyFact) && row.qtyFact > 0);

const toWorkMaterials = (rows: ContractorProgressDraftMaterial[]): WorkMaterialRow[] =>
  rows.map((row) => ({
    id: row.id ?? undefined,
    material_id: row.materialId,
    mat_code: row.matCode,
    code: row.matCode,
    name: row.name,
    uom: row.uom,
    qty: row.qty,
    qty_fact: row.qtyFact,
    price: row.price,
    available: row.available ?? undefined,
  }));

const hasDraftPayload = (draft: ContractorProgressDraftRecord | null | undefined) =>
  Boolean(draft?.materials.length) ||
  Boolean(trim(draft?.fields.selectedStage)) ||
  Boolean(trim(draft?.fields.comment)) ||
  Boolean(trim(draft?.fields.location)) ||
  draft?.fields.qtyDone != null ||
  Boolean(trim(draft?.fields.selectedDate));

const shouldHydrateDraft = (draft: ContractorProgressDraftRecord | null | undefined) => {
  if (!draft) return false;
  if (draft.syncStatus === "queued" || draft.syncStatus === "syncing" || draft.syncStatus === "retry_wait") {
    return true;
  }
  if (draft.syncStatus === "dirty_local" || draft.syncStatus === "failed_terminal") {
    return hasDraftPayload(draft);
  }
  return false;
};

const hasSameDraftPayload = (
  draft: ContractorProgressDraftRecord,
  params: {
    workModalStage: string;
    workModalComment: string;
    workModalLocation: string;
    workModalMaterials: WorkMaterialRow[];
  },
) => {
  const draftMaterials = JSON.stringify(
    draft.materials
      .map((material) => ({
        matCode: trim(material.matCode),
        qtyFact: Number(material.qtyFact),
        uom: trim(material.uom),
      }))
      .sort((left, right) => `${left.matCode}:${left.uom}`.localeCompare(`${right.matCode}:${right.uom}`)),
  );

  const modalMaterials = JSON.stringify(
    toDraftMaterials(params.workModalMaterials)
      .map((material) => ({
        matCode: trim(material.matCode),
        qtyFact: Number(material.qtyFact),
        uom: trim(material.uom),
      }))
      .sort((left, right) => `${left.matCode}:${left.uom}`.localeCompare(`${right.matCode}:${right.uom}`)),
  );

  return (
    trim(draft.fields.selectedStage) === trim(params.workModalStage) &&
    trim(draft.fields.comment) === trim(params.workModalComment) &&
    trim(draft.fields.location) === trim(params.workModalLocation) &&
    draftMaterials === modalMaterials
  );
};

export function useContractorProgressReliability(params: {
  supabaseClient: any;
  workModalVisible: boolean;
  workModalRow: ContractorWorkRow | null;
  jobHeader: JobHeaderLike | null;
  workModalReadOnly: boolean;
  workModalLoading: boolean;
  workModalMaterials: WorkMaterialRow[];
  setWorkModalMaterialsRaw: Dispatch<SetStateAction<WorkMaterialRow[]>>;
  workModalStage: string;
  setWorkModalStageRaw: Dispatch<SetStateAction<string>>;
  workModalComment: string;
  setWorkModalCommentRaw: Dispatch<SetStateAction<string>>;
  workModalLocation: string;
  setWorkModalLocationRaw: Dispatch<SetStateAction<string>>;
  setWorkModalSaving: Dispatch<SetStateAction<boolean>>;
  setWorkModalHint: Dispatch<SetStateAction<string>>;
  closeProgressModal: () => void;
  reloadContractorScreenData: () => Promise<void>;
  pickFirstNonEmpty: (...values: any[]) => string | null;
}) {
  const {
    supabaseClient,
    workModalVisible,
    workModalRow,
    jobHeader,
    workModalReadOnly,
    workModalLoading,
    workModalMaterials,
    setWorkModalMaterialsRaw,
    workModalStage,
    setWorkModalStageRaw,
    workModalComment,
    setWorkModalCommentRaw,
    workModalLocation,
    setWorkModalLocationRaw,
    setWorkModalSaving,
    setWorkModalHint,
    closeProgressModal,
    reloadContractorScreenData,
    pickFirstNonEmpty,
  } = params;

  const activeProgressId = trim(workModalRow?.progress_id);
  const activeProgressIdRef = useRef(activeProgressId);
  const workModalRowRef = useRef(workModalRow);
  const workModalReadOnlyRef = useRef(workModalReadOnly);
  const activeDraft = useContractorProgressDraftStore(
    useCallback(
      (state) => (activeProgressId ? state.drafts[activeProgressId] ?? null : null),
      [activeProgressId],
    ),
  );
  const [runtimeReady, setRuntimeReady] = useState(false);
  const networkOnlineRef = useRef<boolean | null>(null);
  const appStateRef = useRef(getLifecycleCurrentAppState());
  const applyingDraftRef = useRef(false);
  activeProgressIdRef.current = activeProgressId;
  workModalRowRef.current = workModalRow;
  workModalReadOnlyRef.current = workModalReadOnly;

  const flushQueue = useCallback(
    async (triggerSource: PlatformOfflineRetryTriggerSource) =>
      await flushContractorProgressQueue(
        {
          supabaseClient,
          pickFirstNonEmpty,
          refreshAfterSuccess: async () => {
            await reloadContractorScreenData();
          },
          getNetworkOnline: () => networkOnlineRef.current,
          inspectRemoteProgress: async (progressId) => {
            const entityId = trim(progressId);
            const currentRow = workModalRowRef.current;
            if (!entityId || entityId !== activeProgressIdRef.current || !currentRow) {
              return null;
            }
            const active = isActiveWork(currentRow);
            return {
              kind: "contractor_progress",
              entityId,
              status: currentRow.work_status,
              remainingCount: Number(currentRow.qty_left ?? 0),
              terminal: workModalReadOnlyRef.current || !active,
              reason: workModalReadOnlyRef.current
                ? "work_modal_read_only"
                : active
                  ? "work_active"
                  : "work_not_active",
            };
          },
        },
        triggerSource,
      ),
    [pickFirstNonEmpty, reloadContractorScreenData, supabaseClient],
  );

  const syncQueuedDraftIfPossible = useCallback(
    async (triggerSource: PlatformOfflineRetryTriggerSource) => {
      if (!runtimeReady) return null;
      return await flushQueue(triggerSource);
    },
    [flushQueue, runtimeReady],
  );

  useEffect(() => {
    let cancelled = false;

    configureContractorProgressDraftStore();
    configureContractorProgressQueue();

    void (async () => {
      await hydrateContractorProgressDraftStore();
      if (cancelled) return;
      setRuntimeReady(true);
      const snapshot = await ensurePlatformNetworkService();
      if (cancelled) return;
      networkOnlineRef.current = selectPlatformOnlineFlag(snapshot);
      void syncQueuedDraftIfPossible("bootstrap_complete");
    })();

    return () => {
      cancelled = true;
    };
  }, [syncQueuedDraftIfPossible]);

  useEffect(() => {
    if (!runtimeReady) return;

    const unsubscribe = subscribeLifecycleNetworkRecovery({
      networkOnlineRef,
      onRecovered: () => {
        void syncQueuedDraftIfPossible("network_back");
      },
    });

    return unsubscribe;
  }, [runtimeReady, syncQueuedDraftIfPossible]);

  useEffect(() => {
    if (!runtimeReady) return;
    const unsubscribe = subscribeLifecycleAppActiveTransition({
      appStateRef,
      onBecameActive: () => {
        void syncQueuedDraftIfPossible("app_active");
      },
    });
    return unsubscribe;
  }, [runtimeReady, syncQueuedDraftIfPossible]);

  useEffect(() => {
    if (!activeProgressId) return;
    void patchContractorProgressDraftContext(activeProgressId, {
      workUom: trim(workModalRow?.uom_id) || null,
      rowObjectName: trim(workModalRow?.object_name) || null,
      jobObjectName: trim(jobHeader?.object_name) || null,
      workName: trim(workModalRow?.work_name) || null,
    });
  }, [activeProgressId, jobHeader?.object_name, workModalRow?.object_name, workModalRow?.uom_id, workModalRow?.work_name]);

  useEffect(() => {
    if (!workModalVisible || !activeProgressId || workModalLoading || !shouldHydrateDraft(activeDraft)) {
      return;
    }
    if (
      activeDraft &&
      hasSameDraftPayload(activeDraft, {
        workModalStage,
        workModalComment,
        workModalLocation,
        workModalMaterials,
      })
    ) {
      return;
    }

    const draft = getContractorProgressDraft(activeProgressId);
    if (!draft || !shouldHydrateDraft(draft)) return;

    applyingDraftRef.current = true;
    setWorkModalStageRaw(draft.fields.selectedStage ?? "");
    setWorkModalCommentRaw(draft.fields.comment ?? "");
    setWorkModalLocationRaw(draft.fields.location ?? "");
    setWorkModalMaterialsRaw(toWorkMaterials(draft.materials));
    Promise.resolve().then(() => {
      applyingDraftRef.current = false;
    });
  }, [
    activeDraft,
    activeProgressId,
    setWorkModalCommentRaw,
    setWorkModalLocationRaw,
    setWorkModalMaterialsRaw,
    setWorkModalStageRaw,
    workModalComment,
    workModalLoading,
    workModalLocation,
    workModalMaterials,
    workModalStage,
    workModalVisible,
  ]);

  const setWorkModalMaterials = useCallback(
    (value: SetStateAction<WorkMaterialRow[]>) => {
      setWorkModalMaterialsRaw((previous) => {
        const next = typeof value === "function" ? value(previous) : value;
        if (activeProgressId && !applyingDraftRef.current) {
          void setContractorProgressDraftMaterials(activeProgressId, toDraftMaterials(next));
        }
        return next;
      });
    },
    [activeProgressId, setWorkModalMaterialsRaw],
  );

  const setWorkModalStage = useCallback(
    (value: SetStateAction<string>) => {
      setWorkModalStageRaw((previous) => {
        const next = typeof value === "function" ? value(previous) : value;
        if (activeProgressId && !applyingDraftRef.current) {
          void setContractorProgressDraftFields(activeProgressId, { selectedStage: next || null });
        }
        return next;
      });
    },
    [activeProgressId, setWorkModalStageRaw],
  );

  const setWorkModalComment = useCallback(
    (value: SetStateAction<string>) => {
      setWorkModalCommentRaw((previous) => {
        const next = typeof value === "function" ? value(previous) : value;
        if (activeProgressId && !applyingDraftRef.current) {
          void setContractorProgressDraftFields(activeProgressId, { comment: next || null });
        }
        return next;
      });
    },
    [activeProgressId, setWorkModalCommentRaw],
  );

  const setWorkModalLocation = useCallback(
    (value: SetStateAction<string>) => {
      setWorkModalLocationRaw((previous) => {
        const next = typeof value === "function" ? value(previous) : value;
        if (activeProgressId && !applyingDraftRef.current) {
          void setContractorProgressDraftFields(activeProgressId, { location: next || null });
        }
        return next;
      });
    },
    [activeProgressId, setWorkModalLocationRaw],
  );

  const upsertCurrentDraftSnapshot = useCallback(async () => {
    if (!activeProgressId) return null;
    await patchContractorProgressDraftContext(activeProgressId, {
      workUom: trim(workModalRow?.uom_id) || null,
      rowObjectName: trim(workModalRow?.object_name) || null,
      jobObjectName: trim(jobHeader?.object_name) || null,
      workName: trim(workModalRow?.work_name) || null,
    });
    await setContractorProgressDraftFields(activeProgressId, {
      selectedStage: workModalStage || null,
      comment: workModalComment || null,
      location: workModalLocation || null,
    });
    return await setContractorProgressDraftMaterials(activeProgressId, toDraftMaterials(workModalMaterials));
  }, [
    activeProgressId,
    jobHeader?.object_name,
    workModalComment,
    workModalLocation,
    workModalMaterials,
    workModalRow?.object_name,
    workModalRow?.uom_id,
    workModalRow?.work_name,
    workModalStage,
  ]);

  const handleManualResult = useCallback(
    async (progressId: string) => {
      const result = await syncQueuedDraftIfPossible("manual_retry");
      if (!result) return;

      const draft = getContractorProgressDraft(progressId);
      const failedStatus = draft?.syncStatus ?? null;

      if (result.failed) {
        if (failedStatus === "failed_terminal") {
          Alert.alert(
            "Не удалось сохранить",
            draft?.lastError || result.errorMessage || "Проверьте данные прогресса.",
          );
          return;
        }
        setWorkModalHint("Изменения сохранены локально и будут отправлены позже.");
        return;
      }

      setWorkModalHint("");
      closeProgressModal();
      Alert.alert("Готово", "Факт по работе сохранён.");
    },
    [closeProgressModal, setWorkModalHint, syncQueuedDraftIfPossible],
  );

  const submitProgressDraft = useCallback(async () => {
    if (!activeProgressId || !workModalRow || workModalReadOnly || workModalLoading) return;

    try {
      setWorkModalSaving(true);
      const draft = await upsertCurrentDraftSnapshot();
      if (!draft) return;
      const queue = await enqueueContractorProgress(activeProgressId, {
        baseVersion: draft.updatedAt != null ? String(draft.updatedAt) : null,
        serverVersionHint: draft.pendingLogId,
      });
      const queuedEntry = queue.find((entry) => entry.progressId === activeProgressId) ?? null;
      const pendingCount = await getContractorProgressPendingCount(activeProgressId);
      await markContractorProgressQueued(activeProgressId, pendingCount);
      recordPlatformOfflineTelemetry({
        contourKey: "contractor_progress",
        entityKey: activeProgressId,
        syncStatus: "queued",
        queueAction: queuedEntry?.coalescedCount ? "coalesce" : "enqueue",
        coalesced: (queuedEntry?.coalescedCount ?? 0) > 0,
        retryCount: Math.max(0, queuedEntry?.retryCount ?? 0),
        pendingCount,
        failureClass: "none",
        triggerKind: "submit",
        networkKnownOffline: networkOnlineRef.current === false,
        restoredAfterReopen: false,
        manualRetry: false,
        durationMs: null,
      });
      await handleManualResult(activeProgressId);
    } finally {
      setWorkModalSaving(false);
    }
  }, [
    activeProgressId,
    handleManualResult,
    setWorkModalSaving,
    upsertCurrentDraftSnapshot,
    workModalLoading,
    workModalReadOnly,
    workModalRow,
  ]);

  const retryContractorProgressNow = useCallback(async () => {
    if (!activeProgressId || !workModalRow) return;
    try {
      setWorkModalSaving(true);
      await upsertCurrentDraftSnapshot();
      recordPlatformOfflineTelemetry({
        contourKey: "contractor_progress",
        entityKey: activeProgressId,
        syncStatus: activeDraft?.syncStatus === "failed_terminal" ? "failed_terminal" : "queued",
        queueAction: "manual_retry",
        coalesced: false,
        retryCount: Math.max(0, activeDraft?.retryCount ?? 0),
        pendingCount: Math.max(0, activeDraft?.pendingCount ?? 0),
        failureClass:
          activeDraft?.syncStatus === "failed_terminal"
            ? "failed_terminal"
            : networkOnlineRef.current === false
              ? "offline_wait"
              : "retryable_sync_failure",
        triggerKind: "manual_retry",
        networkKnownOffline: networkOnlineRef.current === false,
        restoredAfterReopen: false,
        manualRetry: true,
        durationMs: null,
      });
      const queued = await getContractorProgressQueueEntry(activeProgressId);
      if (!queued) {
        const latestDraft = getContractorProgressDraft(activeProgressId);
        const queue = await enqueueContractorProgress(activeProgressId, {
          baseVersion: latestDraft?.updatedAt != null ? String(latestDraft.updatedAt) : null,
          serverVersionHint: latestDraft?.pendingLogId ?? null,
        });
        const queuedEntry = queue.find((entry) => entry.progressId === activeProgressId) ?? null;
        const pendingCount = await getContractorProgressPendingCount(activeProgressId);
        await markContractorProgressQueued(activeProgressId, pendingCount);
        recordPlatformOfflineTelemetry({
          contourKey: "contractor_progress",
          entityKey: activeProgressId,
          syncStatus: "queued",
          queueAction: queuedEntry?.coalescedCount ? "coalesce" : "enqueue",
          coalesced: (queuedEntry?.coalescedCount ?? 0) > 0,
          retryCount: Math.max(0, queuedEntry?.retryCount ?? 0),
          pendingCount,
          failureClass: "none",
          triggerKind: "manual_retry",
          networkKnownOffline: networkOnlineRef.current === false,
          restoredAfterReopen: false,
          manualRetry: true,
          durationMs: null,
        });
      }
      await handleManualResult(activeProgressId);
    } finally {
      setWorkModalSaving(false);
    }
  }, [
    activeDraft?.pendingCount,
    activeDraft?.retryCount,
    activeDraft?.syncStatus,
    activeProgressId,
    handleManualResult,
    setWorkModalSaving,
    upsertCurrentDraftSnapshot,
    workModalRow,
  ]);

  const activeProgressStatus = useMemo(
    () => buildContractorProgressSyncUiStatus(activeDraft),
    [activeDraft],
  );

  const canRetryProgress = activeDraft?.syncStatus === "retry_wait";
  const canSubmitProgress =
    Boolean(activeProgressId) &&
    !workModalReadOnly &&
    !workModalLoading;

  const lastErrorMessage = useMemo(() => {
    if (!activeDraft?.lastError) return null;
    return pickErr(activeDraft.lastError);
  }, [activeDraft?.lastError]);

  return {
    setWorkModalMaterials,
    setWorkModalStage,
    setWorkModalComment,
    setWorkModalLocation,
    submitProgressDraft,
    retryContractorProgressNow,
    activeProgressStatus,
    canRetryProgress,
    canSubmitProgress,
    activeProgressFailureClass: activeDraft?.failureClass ?? "none",
    lastErrorMessage,
  };
}
