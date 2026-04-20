import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { AppState } from "react-native";

import {
  fetchRequestDetails,
  type ReqItemRow,
  type RequestDetails,
} from "../../../lib/catalog_api";
import {
  clearForemanMutationsForDraft,
  enqueueForemanMutation,
  getForemanPendingMutationCountForDraftKeys,
} from "../../../lib/offline/mutationQueue";
import {
  ensurePlatformNetworkService,
  subscribePlatformNetwork,
} from "../../../lib/offline/platformNetwork.service";
import {
  clearForemanMutationQueueTail,
  flushForemanMutationQueue,
  markForemanSnapshotQueued,
} from "../../../lib/offline/mutationWorker";
import {
  classifyForemanSyncError,
  isForemanConflictAutoRecoverable,
  type ForemanDraftSyncStage,
  type ForemanDraftRecoveryAction,
} from "../../../lib/offline/foremanSyncRuntime";
import { selectPlatformOnlineFlag } from "../../../lib/offline/platformOffline.model";
import type { RequestRecord } from "../../../lib/api/types";
import { recordCatchDiscipline, type CatchDisciplineKind } from "../../../lib/observability/catchDiscipline";
import {
  formatQtyInput,
  isDraftLikeStatus,
  ridStr,
} from "../foreman.helpers";
import {
  buildForemanTerminalCleanupDurablePatch,
  collectForemanTerminalRecoveryCandidates,
  hasForemanDurableRecoverySignal,
  isForemanTerminalRemoteStatus,
  resolveForemanTerminalCleanupPlan,
} from "../foreman.terminalRecovery";
import {
  FOREMAN_LOCAL_ONLY_REQUEST_ID,
  buildFreshForemanLocalDraftSnapshot,
  buildForemanLocalDraftSnapshot,
  hasForemanLocalDraftContent,
  loadForemanRemoteDraftSnapshot,
  markForemanLocalDraftSubmitRequested,
  syncForemanLocalDraftSnapshot,
  type ForemanDraftAppendInput,
  type ForemanLocalDraftSnapshot,
} from "../foreman.localDraft";
import type { RequestDraftMeta } from "../foreman.types";
import { resolveForemanDraftBoundaryFailureReportPlan } from "../foreman.draftBoundaryFailure.model";
import {
  INITIAL_BOUNDARY_STATE,
  appendForemanLocalDraftRows,
  applyForemanLocalDraftSnapshotToBoundary as applyForemanLocalDraftSnapshotToBoundaryHelper,
  applyForemanManualRecoveryRemotePlanToBoundary,
  buildForemanRequestDraftMeta,
  clearForemanDraftCacheState,
  discardWholeForemanDraftInBoundary,
  ensureForemanDraftRequestId,
  loadForemanRequestDetails,
  persistForemanLocalDraftSnapshot,
  removeForemanLocalDraftRowInBoundary,
  syncForemanRequestHeaderMeta,
  type ForemanDraftBoundaryState,
  type ForemanDraftMutationKind,
  type ForemanDraftRestoreSource,
  updateForemanLocalDraftQtyInBoundary,
} from "../foreman.draftBoundary.helpers";
import {
  buildForemanDraftRecoveryBoundaryPatch,
  resolveForemanTerminalRecoveryCleanupDecision,
} from "../foreman.draftRecovery.model";
import {
  applyForemanDraftHeaderEditPlanToRequestDetails,
  buildForemanDraftHeaderState,
  canEditForemanRequestItem,
  normalizeForemanDraftOwnerId,
  planForemanItemsLoadEffect,
  planForemanRemoteDetailsLoadEffect,
  resolveForemanDraftActivityState,
  resolveForemanDraftHeaderEditPlan,
  resolveForemanDraftQueueKey,
  resolveForemanDraftQueueKeys,
  type ForemanDraftHeaderEditPlan,
} from "../foreman.draftBoundaryIdentity.model";
import {
  type ForemanDraftRestoreTriggerPlan,
  planForemanAppActiveRestoreTrigger,
  planForemanFocusRestoreTrigger,
  planForemanNetworkBackRestoreTrigger,
  resolveForemanActiveLocalDraftSnapshotPlan,
  resolveForemanDraftCacheClearPlan,
  resolveForemanRestoreRemoteCheckPlan,
  resolveForemanRestoreRemoteStatusPlan,
  shouldPersistForemanLifecycleSnapshot,
  shouldSkipForemanRemoteDraftEffects,
  shouldSyncForemanDraftAfterRestoreCheck,
} from "../foreman.draftLifecycle.model";
import {
  planForemanSyncInactiveGate,
  planForemanSyncFlushCompletion,
  planForemanSyncQueueCommand,
  planForemanSyncSnapshotPreflight,
  resolveForemanSyncDirtyLocalCommandPlan,
  resolveForemanSyncMutationKind,
} from "../foreman.draftSyncPlan.model";
import {
  planForemanClearFailedQueueTailAction,
  planForemanDiscardLocalAction,
  planForemanDiscardLocalRemoteAction,
  planForemanRehydrateServerAction,
  planForemanRehydrateServerRemoteAction,
  planForemanRestoreLocalAction,
  planForemanRetryNowAction,
  resolveForemanManualRecoveryTelemetryPlan,
} from "../foreman.manualRecovery.model";
import {
  resolveForemanPostSubmitDraftPlan,
  resolveForemanPostSubmitSubmittedOwnerId,
} from "../foreman.postSubmitDraftPlan.model";
import {
  getForemanDurableDraftState,
  markForemanDurableDraftDirtyLocal,
  patchForemanDurableDraftRecoveryState,
  pushForemanDurableDraftTelemetry,
} from "../foreman.durableDraft.store";
import { useForemanUiStore } from "../foremanUi.store";
import { useForemanHeader } from "./useForemanHeader";
import { useForemanItemsState } from "./useForemanItemsState";
import { useForemanBootstrapCoordinator } from "./useForemanBootstrapCoordinator";

type UseForemanDraftBoundaryProps = {
  isScreenFocused: boolean;
  preloadDisplayNo: (rid?: string | number | null) => Promise<void>;
  setDisplayNoByReq: Dispatch<SetStateAction<Record<string, string>>>;
};

type ForemanDraftSyncResultPayload = {
  requestId: string | null;
  submitted: RequestRecord | null;
};

const createEphemeralForemanDraftOwnerId = () =>
  `fdo-boundary-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function useForemanDraftBoundary({
  isScreenFocused,
  preloadDisplayNo,
  setDisplayNoByReq,
}: UseForemanDraftBoundaryProps) {
  const {
    foreman,
    setForeman: setForemanState,
    comment,
    setComment: setCommentState,
    objectType,
    setObjectType: setObjectTypeState,
    level,
    setLevel: setLevelState,
    system,
    setSystem: setSystemState,
    zone,
    setZone: setZoneState,
    syncHeaderFromDetails,
    resetHeader,
  } = useForemanHeader();

  const {
    requestId,
    setRequestId: setRequestIdState,
    items,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setItems,
    qtyDrafts,
    setQtyDrafts,
    qtyBusyMap,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setQtyBusyMap,
    loadItems,
    setRowBusy,
    hydrateLocalDraft,
    clearItemsState,
    ensureAndGetId,
  } = useForemanItemsState(formatQtyInput);

  const [requestDetails, setRequestDetails] = useState<RequestDetails | null>(null);
  const [localDraftSnapshot, setLocalDraftSnapshot] = useState<ForemanLocalDraftSnapshot | null>(null);
  const [boundaryState, setBoundaryState] = useState<ForemanDraftBoundaryState>(INITIAL_BOUNDARY_STATE);
  const [networkOnline, setNetworkOnline] = useState<boolean | null>(null);

  const localDraftSnapshotRef = useRef<ForemanLocalDraftSnapshot | null>(null);
  const draftSyncInFlightRef = useRef<Promise<ForemanDraftSyncResultPayload> | null>(null);
  const activeDraftOwnerIdRef = useRef(createEphemeralForemanDraftOwnerId());
  const [activeDraftOwnerId, setActiveDraftOwnerIdState] = useState<string | null>(
    activeDraftOwnerIdRef.current,
  );
  const submitInFlightOwnerIdRef = useRef<string | null>(null);
  const lastSubmittedOwnerIdRef = useRef<string | null>(null);
  const handlePostSubmitSuccessRef = useRef<
    (rid: string, submitted: RequestRecord | null) => Promise<void>
  >(async () => undefined);
  const appStateRef = useRef(AppState.currentState);
  const networkOnlineRef = useRef<boolean | null>(null);
  const wasScreenFocusedRef = useRef(false);
  const skipRemoteHydrationRequestIdRef = useRef<string | null>(null);
  const requestDetailsLoadSeqRef = useRef(0);

  useEffect(() => {
    localDraftSnapshotRef.current = localDraftSnapshot;
  }, [localDraftSnapshot]);

  const setActiveDraftOwnerId = useCallback((ownerId?: string | null, options?: { resetSubmitted?: boolean }) => {
    const nextOwnerId = normalizeForemanDraftOwnerId(ownerId) || createEphemeralForemanDraftOwnerId();
    if (options?.resetSubmitted) {
      lastSubmittedOwnerIdRef.current = null;
    }
    activeDraftOwnerIdRef.current = nextOwnerId;
    setActiveDraftOwnerIdState(nextOwnerId);
    return nextOwnerId;
  }, []);

  const patchBoundaryState = useCallback((patch: Partial<ForemanDraftBoundaryState>) => {
    setBoundaryState((prev) => ({ ...prev, ...patch }));
  }, []);

  const setSkipRemoteHydrationRequestId = useCallback((rid: string | null) => {
    skipRemoteHydrationRequestIdRef.current = rid;
  }, []);

  const getDraftQueueKey = useCallback(
    (snapshot?: ForemanLocalDraftSnapshot | null, fallbackRequestId?: string | null) => {
      return resolveForemanDraftQueueKey({
        snapshot,
        fallbackRequestId,
        activeRequestId: requestId,
        localOnlyRequestId: FOREMAN_LOCAL_ONLY_REQUEST_ID,
      });
    },
    [requestId],
  );

  const getDraftQueueKeys = useCallback(
    (snapshot?: ForemanLocalDraftSnapshot | null, fallbackRequestId?: string | null) => {
      return resolveForemanDraftQueueKeys({
        snapshot,
        fallbackRequestId,
        activeRequestId: requestId,
        localOnlyRequestId: FOREMAN_LOCAL_ONLY_REQUEST_ID,
      });
    },
    [requestId],
  );

  const refreshBoundarySyncState = useCallback(
    async (snapshotOverride?: ForemanLocalDraftSnapshot | null) => {
      const durableState = getForemanDurableDraftState();
      const snapshot =
        snapshotOverride === undefined ? durableState.snapshot ?? localDraftSnapshotRef.current : snapshotOverride;
      const pendingOperationsCount = await getForemanPendingMutationCountForDraftKeys(
        getDraftQueueKeys(snapshot),
      );
      patchBoundaryState(
        buildForemanDraftRecoveryBoundaryPatch({
          durableState,
          snapshot,
          pendingOperationsCount,
        }),
      );
    },
    [getDraftQueueKeys, patchBoundaryState],
  );

  const pushRecoveryTelemetry = useCallback(
    async (params: {
      recoveryAction: ForemanDraftRecoveryAction;
      result: "progress" | "success" | "retryable_failure" | "terminal_failure";
      conflictType?: ReturnType<typeof getForemanDurableDraftState>["conflictType"];
      errorClass?: string | null;
      errorCode?: string | null;
    }) => {
      const durableState = getForemanDurableDraftState();
      const snapshot = localDraftSnapshotRef.current ?? durableState.snapshot;
      const recoveryDraftKey = getDraftQueueKey(snapshot);
      const recoveryTelemetryPlan = resolveForemanManualRecoveryTelemetryPlan({
        snapshot,
        draftKey: recoveryDraftKey,
        durableState,
        recoveryAction: params.recoveryAction,
        result: params.result,
        conflictType: params.conflictType,
        errorClass: params.errorClass,
        errorCode: params.errorCode,
        networkOnline: networkOnlineRef.current,
        localOnlyRequestId: FOREMAN_LOCAL_ONLY_REQUEST_ID,
      });
      await pushForemanDurableDraftTelemetry(recoveryTelemetryPlan.telemetry);
    },
    [getDraftQueueKey],
  );

  const reportDraftBoundaryFailure = useCallback((params: {
    event: string;
    error: unknown;
    context?: string;
    stage: ForemanDraftSyncStage;
    kind?: CatchDisciplineKind;
    sourceKind?: string;
    extra?: Record<string, unknown>;
  }) => {
    const classified = classifyForemanSyncError(params.error);
    const snapshot = localDraftSnapshotRef.current ?? getForemanDurableDraftState().snapshot;
    const requestIdForError = ridStr(snapshot?.requestId) || ridStr(requestId) || null;
    const failurePlan = resolveForemanDraftBoundaryFailureReportPlan({
      event: params.event,
      error: params.error,
      context: params.context,
      stage: params.stage,
      kind: params.kind,
      sourceKind: params.sourceKind,
      extra: params.extra,
      classified,
      queueDraftKey: getDraftQueueKey(snapshot),
      requestId: requestIdForError,
    });
    recordCatchDiscipline(failurePlan.catchDiscipline);
    return failurePlan.classified;
  }, [getDraftQueueKey, requestId]);

  const persistLocalDraftSnapshot = useCallback(
    (snapshot: ForemanLocalDraftSnapshot | null) => {
      if (snapshot?.ownerId) {
        setActiveDraftOwnerId(snapshot.ownerId);
      }
      localDraftSnapshotRef.current = snapshot;
      setLocalDraftSnapshot(snapshot);
      void persistForemanLocalDraftSnapshot(snapshot).then(() => refreshBoundarySyncState(snapshot));
    },
    [refreshBoundarySyncState, setActiveDraftOwnerId],
  );

  const getActiveLocalDraftSnapshot = useCallback(
    (targetRequestId?: string | null) => {
      const activeDraftPlan = resolveForemanActiveLocalDraftSnapshotPlan({
        snapshot: localDraftSnapshotRef.current,
        activeDraftOwnerId: activeDraftOwnerIdRef.current,
        targetRequestId,
        activeRequestId: requestId,
      });
      return activeDraftPlan.snapshot;
    },
    [requestId],
  );

  const applyLocalDraftSnapshotToBoundary = useCallback(
    (
      snapshot: ForemanLocalDraftSnapshot | null,
      options?: {
        restoreHeader?: boolean;
        clearWhenEmpty?: boolean;
        restoreSource?: ForemanDraftRestoreSource;
        restoreIdentity?: string | null;
      },
    ) => {
      applyForemanLocalDraftSnapshotToBoundaryHelper({
        snapshot,
        options,
        persistLocalDraftSnapshot,
        hydrateLocalDraft,
        setDisplayNoByReq,
        setRequestDetails,
        setHeaderState: {
          setForeman: setForemanState,
          setComment: setCommentState,
          setObjectType: setObjectTypeState,
          setLevel: setLevelState,
          setSystem: setSystemState,
          setZone: setZoneState,
        },
        patchBoundaryState,
      });
    },
    [
      hydrateLocalDraft,
      patchBoundaryState,
      persistLocalDraftSnapshot,
      setCommentState,
      setDisplayNoByReq,
      setForemanState,
      setLevelState,
      setObjectTypeState,
      setSystemState,
      setZoneState,
    ],
  );

  const currentHeaderState = useMemo(
    () =>
      buildForemanDraftHeaderState({
        foreman,
        comment,
        objectType,
        level,
        system,
        zone,
      }),
    [comment, foreman, level, objectType, system, zone],
  );

  const buildCurrentLocalDraftSnapshot = useCallback(() => {
    return buildForemanLocalDraftSnapshot({
      base: localDraftSnapshotRef.current,
      ownerId: activeDraftOwnerIdRef.current,
      requestId,
      displayNo: requestDetails?.display_no ?? null,
      status: requestDetails?.status ?? (items.length ? "draft" : null),
      header: currentHeaderState,
      items,
      qtyDrafts,
    });
  }, [
    currentHeaderState,
    items,
    qtyDrafts,
    requestDetails?.display_no,
    requestDetails?.status,
    requestId,
  ]);

  const activeLocalDraftSnapshot = useMemo(() => getActiveLocalDraftSnapshot(), [getActiveLocalDraftSnapshot]);

  const draftActivityState = useMemo(
    () =>
      resolveForemanDraftActivityState({
        activeLocalDraftSnapshot,
        requestStatus: requestDetails?.status,
      }),
    [activeLocalDraftSnapshot, requestDetails?.status],
  );
  const { hasLocalDraft, isDraftActive } = draftActivityState;

  const canEditRequestItem = useCallback(
    (row?: ReqItemRow | null) => {
      return canEditForemanRequestItem({
        row,
        isDraftActive,
        activeRequestDetailsId: requestDetails?.id,
        activeRequestStatusIsDraftLike: isDraftLikeStatus(requestDetails?.status),
        requestId,
        localOnlyRequestId: FOREMAN_LOCAL_ONLY_REQUEST_ID,
      });
    },
    [isDraftActive, requestDetails?.id, requestDetails?.status, requestId],
  );

  const buildRequestDraftMeta = useCallback(
    (): RequestDraftMeta =>
      buildForemanRequestDraftMeta(currentHeaderState),
    [currentHeaderState],
  );

  const syncRequestHeaderMeta = useCallback(
    async (rid: string, context: string) => {
      await syncForemanRequestHeaderMeta({
        requestId: rid,
        context,
        header: currentHeaderState,
      });
    },
    [currentHeaderState],
  );

  const loadDetails = useCallback(
    async (rid?: string | number | null) => {
      const requestSeq = ++requestDetailsLoadSeqRef.current;
      return await loadForemanRequestDetails({
        requestId: rid,
        activeRequestId: requestId,
        setRequestDetails,
        setDisplayNoByReq,
        syncHeaderFromDetails,
        shouldApply: () => requestSeq === requestDetailsLoadSeqRef.current,
      });
    },
    [requestId, setDisplayNoByReq, syncHeaderFromDetails],
  );

  const invalidateRequestDetailsLoads = useCallback(() => {
    requestDetailsLoadSeqRef.current += 1;
  }, []);

  const clearDraftCache = useCallback(async (options?: {
    snapshot?: ForemanLocalDraftSnapshot | null;
    requestId?: string | null;
  }) => {
    const activeSnapshot = options?.snapshot ?? localDraftSnapshotRef.current;
    const cacheClearPlan = resolveForemanDraftCacheClearPlan({
      activeSnapshot,
      optionRequestId: options?.requestId,
      activeRequestId: requestId,
      localOnlyRequestId: FOREMAN_LOCAL_ONLY_REQUEST_ID,
    });
    await Promise.all(
      Array.from(cacheClearPlan.queueKeys)
        .map(async (key) => {
          await clearForemanMutationsForDraft(key);
        }),
    );
    await clearForemanDraftCacheState(persistLocalDraftSnapshot, patchBoundaryState);
    await refreshBoundarySyncState(null);
  }, [patchBoundaryState, persistLocalDraftSnapshot, refreshBoundarySyncState, requestId]);

  const resetDraftState = useCallback(() => {
    invalidateRequestDetailsLoads();
    clearItemsState();
    setRequestDetails(null);
    resetHeader();
  }, [clearItemsState, invalidateRequestDetailsLoads, resetHeader]);

  const appendLocalDraftRows = useCallback(
    (rows: ForemanDraftAppendInput[]) => {
      return appendForemanLocalDraftRows(
        buildCurrentLocalDraftSnapshot,
        applyLocalDraftSnapshotToBoundary,
        rows,
      );
    },
    [applyLocalDraftSnapshotToBoundary, buildCurrentLocalDraftSnapshot],
  );

  const updateLocalDraftQty = useCallback(
    (item: ReqItemRow, qty: number) => {
      return updateForemanLocalDraftQtyInBoundary(
        buildCurrentLocalDraftSnapshot,
        applyLocalDraftSnapshotToBoundary,
        item,
        qty,
      );
    },
    [applyLocalDraftSnapshotToBoundary, buildCurrentLocalDraftSnapshot],
  );

  const removeLocalDraftRow = useCallback(
    (item: ReqItemRow) => {
      return removeForemanLocalDraftRowInBoundary(
        buildCurrentLocalDraftSnapshot,
        applyLocalDraftSnapshotToBoundary,
        item,
      );
    },
    [applyLocalDraftSnapshotToBoundary, buildCurrentLocalDraftSnapshot],
  );

  const handlePostSubmitSuccess = useCallback(
    async (rid: string, submitted: RequestRecord | null) => {
      const activeSnapshot = localDraftSnapshotRef.current;
      const submittedOwnerId = resolveForemanPostSubmitSubmittedOwnerId({
        activeSnapshot,
        activeDraftOwnerId: activeDraftOwnerIdRef.current,
      });
      if (submittedOwnerId) {
        lastSubmittedOwnerIdRef.current = submittedOwnerId;
      }
      const freshDraftSnapshot = buildFreshForemanLocalDraftSnapshot({
        base: activeSnapshot,
        header: {
          foreman: currentHeaderState.foreman,
          comment: "",
          objectType: currentHeaderState.objectType,
          level: currentHeaderState.level,
          system: currentHeaderState.system,
          zone: currentHeaderState.zone,
        },
      });
      const postSubmitPlan = resolveForemanPostSubmitDraftPlan({
        rid,
        activeRequestId: requestId,
        activeSnapshot,
        submitted,
        submittedOwnerId,
        freshDraftSnapshot,
      });
      setActiveDraftOwnerId(postSubmitPlan.nextActiveDraftOwnerId);
      const displayNoPatch = postSubmitPlan.displayNoPatch;
      if (displayNoPatch) {
        setDisplayNoByReq((prev) => ({
          ...prev,
          [displayNoPatch.requestId]: displayNoPatch.displayNo,
        }));
      }

      if (postSubmitPlan.clearSkipRemoteHydrationRequestId) skipRemoteHydrationRequestIdRef.current = null;
      if (postSubmitPlan.invalidateRequestDetailsLoads) invalidateRequestDetailsLoads();
      if (postSubmitPlan.resetAiQuickUi) useForemanUiStore.getState().resetAiQuickUi();
      if (postSubmitPlan.clearAiQuickSessionHistory) useForemanUiStore.getState().clearAiQuickSessionHistory();
      applyLocalDraftSnapshotToBoundary(
        postSubmitPlan.applySnapshot.snapshot,
        postSubmitPlan.applySnapshot.options,
      );

      await patchForemanDurableDraftRecoveryState({
        ...postSubmitPlan.durablePatch,
        lastSyncAt: Date.now(),
      });
      await refreshBoundarySyncState(postSubmitPlan.refreshBoundarySnapshot);

      if (__DEV__) {
        const durableState = getForemanDurableDraftState();
        console.info("[foreman.post-submit]", {
          ...postSubmitPlan.devTelemetry,
          staleBannerVisibleAfterSubmit:
            durableState.conflictType !== "none" || durableState.availableRecoveryActions.length > 0,
        });
      }
    },
    [
      applyLocalDraftSnapshotToBoundary,
      currentHeaderState,
      invalidateRequestDetailsLoads,
      refreshBoundarySyncState,
      requestId,
      setActiveDraftOwnerId,
      setDisplayNoByReq,
    ],
  );

  useEffect(() => {
    handlePostSubmitSuccessRef.current = handlePostSubmitSuccess;
  }, [handlePostSubmitSuccess]);

  const clearTerminalLocalDraft = useCallback(
    async (options: {
      snapshot?: ForemanLocalDraftSnapshot | null;
      requestId: string;
      remoteStatus?: string | null;
    }) => {
      const durableState = getForemanDurableDraftState();
      const cleanupPlan = resolveForemanTerminalCleanupPlan({
        requestId: options.requestId,
        remoteStatus: options.remoteStatus,
        optionSnapshot: options.snapshot,
        activeSnapshot: localDraftSnapshotRef.current,
        durableSnapshot: durableState.snapshot,
        recoverableSnapshot: durableState.recoverableLocalSnapshot,
        queueDraftKey: durableState.queueDraftKey,
      });
      for (const key of cleanupPlan.cleanupKeys) {
        await clearForemanMutationsForDraft(key);
      }
      await clearDraftCache(cleanupPlan.cacheClear);
      setActiveDraftOwnerId(cleanupPlan.activeOwnerReset.nextOwnerId, {
        resetSubmitted: cleanupPlan.activeOwnerReset.resetSubmitted,
      });
      if (cleanupPlan.resetDraftState) resetDraftState();
      await patchForemanDurableDraftRecoveryState(
        buildForemanTerminalCleanupDurablePatch(cleanupPlan.durablePatch, Date.now()),
      );
      await refreshBoundarySyncState(cleanupPlan.refreshBoundaryRequestId);

      if (__DEV__) {
        console.info("[foreman.terminal-cleanup]", cleanupPlan.devTelemetry);
      }
    },
    [clearDraftCache, refreshBoundarySyncState, resetDraftState, setActiveDraftOwnerId],
  );

  const clearTerminalRecoveryOwnerIfNeeded = useCallback(
    async (context: string, options?: { cancelled?: () => boolean }) => {
      const durableState = getForemanDurableDraftState();
      const candidates = collectForemanTerminalRecoveryCandidates({
        activeSnapshot: localDraftSnapshotRef.current,
        durableSnapshot: durableState.snapshot,
        recoverableSnapshot: durableState.recoverableLocalSnapshot,
        activeRequestId: requestId,
        queueDraftKey: durableState.queueDraftKey,
        hasRecoverySignal: hasForemanDurableRecoverySignal(durableState),
      });

      for (const candidate of candidates) {
        if (options?.cancelled?.()) return true;
        try {
          const remoteDetails = await fetchRequestDetails(candidate.requestId);
          const remoteStatus = remoteDetails?.status ?? null;
          if (!isForemanTerminalRemoteStatus(remoteStatus)) continue;
          if (__DEV__) {
            console.info("[foreman.terminal-recovery] clearing request-bound recovery owner", {
              requestId: candidate.requestId,
              remoteStatus,
              source: candidate.source,
              context,
            });
          }
          await clearTerminalLocalDraft({
            snapshot: candidate.snapshot,
            requestId: candidate.requestId,
            remoteStatus,
          });
          return true;
        } catch {
          // Network failure during reconciliation is non-fatal.
        }
      }

      return false;
    },
    [clearTerminalLocalDraft, requestId],
  );

  const syncLocalDraftNow = useCallback(
    async (options?: {
      submit?: boolean;
      context?: string;
      overrideSnapshot?: ForemanLocalDraftSnapshot | null;
      mutationKind?: ForemanDraftMutationKind;
      localBeforeCount?: number | null;
      localAfterCount?: number | null;
      force?: boolean;
    }) => {
      const mutationKind = resolveForemanSyncMutationKind({
        optionMutationKind: options?.mutationKind,
        submit: options?.submit === true,
      });

      const inactiveGatePlan = planForemanSyncInactiveGate({
        isDraftActive,
        hasOverrideSnapshot: Boolean(options?.overrideSnapshot),
        mutationKind,
        requestId,
      });
      if (inactiveGatePlan.action === "skip_inactive") {
        return inactiveGatePlan;
      }

      let snapshot = options?.overrideSnapshot ?? buildCurrentLocalDraftSnapshot();
      if (options?.submit) {
        snapshot = markForemanLocalDraftSubmitRequested(snapshot);
      }
      const currentDraftSyncInFlight = draftSyncInFlightRef.current;
      const preflightPlan = planForemanSyncSnapshotPreflight({
        snapshot,
        submit: options?.submit === true,
        mutationKind,
        context: options?.context,
        requestId,
        activeDraftOwnerId: activeDraftOwnerIdRef.current,
        lastSubmittedOwnerId: lastSubmittedOwnerIdRef.current,
        submitInFlightOwnerId: submitInFlightOwnerIdRef.current,
        hasDraftSyncInFlight: Boolean(currentDraftSyncInFlight),
      });

      if (preflightPlan.action === "skip_empty") {
        await refreshBoundarySyncState(preflightPlan.snapshot);
        return {
          requestId: preflightPlan.requestId,
          submitted: preflightPlan.submitted,
        };
      }
      if (preflightPlan.action === "throw_duplicate_submit") {
        throw new Error(preflightPlan.message);
      }
      if (preflightPlan.action === "await_in_flight_submit") {
        return await currentDraftSyncInFlight!;
      }

      snapshot = preflightPlan.snapshot;
      const triggerSource = preflightPlan.triggerSource;
      const submitOwnerId = preflightPlan.submitOwnerId;

      const pendingOperationsCount = await getForemanPendingMutationCountForDraftKeys(
        getDraftQueueKeys(snapshot),
      );
      const durableState = getForemanDurableDraftState();
      const draftKey = getDraftQueueKey(snapshot);
      const dirtyLocalPlan = resolveForemanSyncDirtyLocalCommandPlan({
        snapshot,
        draftKey,
        pendingOperationsCount,
        durableConflictType: durableState.conflictType,
        networkOnline: networkOnlineRef.current,
        triggerSource,
        localOnlyRequestId: FOREMAN_LOCAL_ONLY_REQUEST_ID,
      });
      await markForemanDurableDraftDirtyLocal(snapshot, dirtyLocalPlan.dirtyLocal);
      persistLocalDraftSnapshot(snapshot);
      await pushForemanDurableDraftTelemetry(dirtyLocalPlan.telemetry);

      const queuePlan = planForemanSyncQueueCommand({
        snapshot,
        mutationKind,
        triggerSource,
        durableConflictType: durableState.conflictType,
        force: options?.force === true,
        draftKey,
        localBeforeCount: options?.localBeforeCount,
        localAfterCount: options?.localAfterCount,
        submit: options?.submit === true,
        activeRequestId: requestId,
      });

      if (queuePlan.action === "block_for_manual_recovery") {
        await patchForemanDurableDraftRecoveryState(queuePlan.durablePatch);
        await refreshBoundarySyncState(snapshot);
        return { requestId: queuePlan.requestId, submitted: queuePlan.submitted };
      }

      await enqueueForemanMutation(queuePlan.enqueue);

      await markForemanSnapshotQueued(snapshot, {
        queueDraftKey: queuePlan.enqueue.draftKey,
        triggerSource,
      });
      await refreshBoundarySyncState(snapshot);

      if (draftSyncInFlightRef.current) {
        await draftSyncInFlightRef.current;
      }

      if (options?.submit === true && submitOwnerId) {
        submitInFlightOwnerIdRef.current = submitOwnerId;
      }

      const run = flushForemanMutationQueue({
        getSnapshot: () => localDraftSnapshotRef.current,
        buildRequestDraftMeta,
        persistSnapshot: persistLocalDraftSnapshot,
        applySnapshotToBoundary: applyLocalDraftSnapshotToBoundary,
        getNetworkOnline: () => networkOnlineRef.current,
        inspectRemoteDraft: async ({ requestId: draftRequestId, localSnapshot }) => {
          const remote = await loadForemanRemoteDraftSnapshot({
            requestId: draftRequestId,
            localSnapshot,
          });
          return {
            snapshot: remote.snapshot,
            status: remote.details?.status ?? null,
            isTerminal: remote.isTerminal,
          };
        },
        syncSnapshot: syncForemanLocalDraftSnapshot,
        onSubmitted: (rid, submitted) => {
          return handlePostSubmitSuccessRef.current(rid, submitted);
        },
      }, triggerSource).then(async (result) => {
        await refreshBoundarySyncState(localDraftSnapshotRef.current);
        const flushCompletionPlan = planForemanSyncFlushCompletion({
          result,
          submit: options?.submit === true,
          submitOwnerId,
        });
        if (flushCompletionPlan.action === "throw_failed") {
          throw new Error(flushCompletionPlan.message);
        }
        if (flushCompletionPlan.markLastSubmittedOwnerId) {
          lastSubmittedOwnerIdRef.current = flushCompletionPlan.markLastSubmittedOwnerId;
        }
        return flushCompletionPlan.result;
      });

      draftSyncInFlightRef.current = run;
      try {
        return await run;
      } finally {
        if (options?.submit === true && submitOwnerId && submitInFlightOwnerIdRef.current === submitOwnerId) {
          submitInFlightOwnerIdRef.current = null;
        }
        draftSyncInFlightRef.current = null;
      }
    },
    [
      applyLocalDraftSnapshotToBoundary,
      buildCurrentLocalDraftSnapshot,
      buildRequestDraftMeta,
      getDraftQueueKey,
      getDraftQueueKeys,
      isDraftActive,
      persistLocalDraftSnapshot,
      refreshBoundarySyncState,
      requestId,
    ],
  );

  const retryDraftSyncNow = useCallback(async () => {
    const snapshot = localDraftSnapshotRef.current ?? getForemanDurableDraftState().snapshot;
    const retryPlan = planForemanRetryNowAction({ snapshot });
    if (retryPlan.action === "skip") return;
    await pushRecoveryTelemetry({
      recoveryAction: "retry_now",
      result: "progress",
    });
    try {
      await syncLocalDraftNow({
        context: "retryNow",
        overrideSnapshot: retryPlan.snapshot,
        mutationKind: retryPlan.mutationKind,
        localBeforeCount: retryPlan.localBeforeCount,
        localAfterCount: retryPlan.localAfterCount,
        force: retryPlan.force,
      });
      await pushRecoveryTelemetry({
        recoveryAction: "retry_now",
        result: "success",
        conflictType: "none",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error ?? "");
      await pushRecoveryTelemetry({
        recoveryAction: "retry_now",
        result: "terminal_failure",
        errorClass: "recovery",
        errorCode: message.slice(0, 48) || "retry_failed",
      });
      throw error;
    }
  }, [pushRecoveryTelemetry, syncLocalDraftNow]);

  const rehydrateDraftFromServer = useCallback(async () => {
    const durableState = getForemanDurableDraftState();
    const currentSnapshot = localDraftSnapshotRef.current ?? durableState.snapshot;
    const rehydratePlan = planForemanRehydrateServerAction({
      currentSnapshot,
      requestId,
    });
    if (rehydratePlan.action === "skip") return;

    await pushRecoveryTelemetry({
      recoveryAction: "rehydrate_server",
      result: "progress",
    });

    const remote = await loadForemanRemoteDraftSnapshot({
      requestId: rehydratePlan.requestId,
      localSnapshot: rehydratePlan.currentSnapshot,
    });

    const remotePlan = planForemanRehydrateServerRemoteAction({
      requestId: rehydratePlan.requestId,
      currentSnapshot: rehydratePlan.currentSnapshot,
      remote,
      now: Date.now(),
    });

    if (remotePlan.action === "clear_terminal") {
      await applyForemanManualRecoveryRemotePlanToBoundary({
        remotePlan,
        clearTerminalLocalDraft,
        setActiveDraftOwnerId,
        applyLocalDraftSnapshotToBoundary,
        patchForemanDurableDraftRecoveryState,
        refreshBoundarySyncState,
        persistLocalDraftSnapshot,
        setRequestIdState,
        setRequestDetails,
        syncHeaderFromDetails,
        loadItems,
      });
      await pushRecoveryTelemetry({
        recoveryAction: "rehydrate_server",
        result: "success",
        conflictType: "none",
      });
      return;
    }

    await clearForemanMutationsForDraft(FOREMAN_LOCAL_ONLY_REQUEST_ID);
    await clearForemanMutationsForDraft(rehydratePlan.requestId);

    await applyForemanManualRecoveryRemotePlanToBoundary({
      remotePlan,
      clearTerminalLocalDraft,
      setActiveDraftOwnerId,
      applyLocalDraftSnapshotToBoundary,
      patchForemanDurableDraftRecoveryState,
      refreshBoundarySyncState,
      persistLocalDraftSnapshot,
      setRequestIdState,
      setRequestDetails,
      syncHeaderFromDetails,
      loadItems,
    });

    await pushRecoveryTelemetry({
      recoveryAction: "rehydrate_server",
      result: "success",
      conflictType: "none",
    });
  }, [
    applyLocalDraftSnapshotToBoundary,
    clearTerminalLocalDraft,
    loadItems,
    persistLocalDraftSnapshot,
    pushRecoveryTelemetry,
    refreshBoundarySyncState,
    requestId,
    setActiveDraftOwnerId,
    setRequestIdState,
    syncHeaderFromDetails,
  ]);

  const restoreLocalDraftAfterConflict = useCallback(async () => {
    const durableState = getForemanDurableDraftState();
    const restorePlan = planForemanRestoreLocalAction({
      durableState,
      now: Date.now(),
    });
    if (restorePlan.action === "skip") return;
    const recoverableSnapshot = restorePlan.snapshot;
    setActiveDraftOwnerId(recoverableSnapshot.ownerId, { resetSubmitted: true });

    await pushRecoveryTelemetry({
      recoveryAction: "restore_local",
      result: "progress",
      conflictType: durableState.conflictType,
    });

    applyLocalDraftSnapshotToBoundary(recoverableSnapshot, {
      restoreHeader: true,
      clearWhenEmpty: true,
      restoreSource: "snapshot",
      restoreIdentity: restorePlan.restoreIdentity,
    });
    await patchForemanDurableDraftRecoveryState(restorePlan.durablePatch);
    await refreshBoundarySyncState(recoverableSnapshot);
    await pushRecoveryTelemetry({
      recoveryAction: "restore_local",
      result: "success",
      conflictType: restorePlan.conflictType,
    });
  }, [applyLocalDraftSnapshotToBoundary, pushRecoveryTelemetry, refreshBoundarySyncState, setActiveDraftOwnerId]);

  const discardLocalDraftNow = useCallback(async () => {
    const durableState = getForemanDurableDraftState();
    const currentSnapshot = localDraftSnapshotRef.current ?? durableState.snapshot;
    const discardPlan = planForemanDiscardLocalAction({
      durableState,
      currentSnapshot,
      requestId,
    });

    await pushRecoveryTelemetry({
      recoveryAction: "discard_local",
      result: "progress",
      conflictType: durableState.conflictType,
    });

    await clearForemanMutationsForDraft(FOREMAN_LOCAL_ONLY_REQUEST_ID);
    if (discardPlan.action === "load_remote") {
      await clearForemanMutationsForDraft(discardPlan.requestId);
    }

    if (discardPlan.action === "load_remote") {
      const remote = await loadForemanRemoteDraftSnapshot({
        requestId: discardPlan.requestId,
        localSnapshot: discardPlan.currentSnapshot,
      });
      const remotePlan = planForemanDiscardLocalRemoteAction({
        requestId: discardPlan.requestId,
        currentSnapshot: discardPlan.currentSnapshot,
        remote,
        now: Date.now(),
      });
      if (remotePlan.action === "clear_terminal") {
        await applyForemanManualRecoveryRemotePlanToBoundary({
          remotePlan,
          clearTerminalLocalDraft,
          setActiveDraftOwnerId,
          applyLocalDraftSnapshotToBoundary,
          patchForemanDurableDraftRecoveryState,
          refreshBoundarySyncState,
          persistLocalDraftSnapshot,
          setRequestIdState,
          setRequestDetails,
          syncHeaderFromDetails,
          loadItems,
        });
        await pushRecoveryTelemetry({
          recoveryAction: "discard_local",
          result: "success",
          conflictType: "none",
        });
        return;
      }
      await applyForemanManualRecoveryRemotePlanToBoundary({
        remotePlan,
        clearTerminalLocalDraft,
        setActiveDraftOwnerId,
        applyLocalDraftSnapshotToBoundary,
        patchForemanDurableDraftRecoveryState,
        refreshBoundarySyncState,
        persistLocalDraftSnapshot,
        setRequestIdState,
        setRequestDetails,
        syncHeaderFromDetails,
        loadItems,
      });
    } else {
      await clearDraftCache();
      resetDraftState();
      await patchForemanDurableDraftRecoveryState(discardPlan.durablePatch);
    }

    await pushRecoveryTelemetry({
      recoveryAction: "discard_local",
      result: "success",
      conflictType: "none",
    });
  }, [
    applyLocalDraftSnapshotToBoundary,
    clearDraftCache,
    clearTerminalLocalDraft,
    loadItems,
    persistLocalDraftSnapshot,
    pushRecoveryTelemetry,
    refreshBoundarySyncState,
    requestId,
    resetDraftState,
    setActiveDraftOwnerId,
    setRequestIdState,
    syncHeaderFromDetails,
  ]);

  const clearFailedQueueTailNow = useCallback(async () => {
    const snapshot = localDraftSnapshotRef.current ?? getForemanDurableDraftState().snapshot;
    const clearPlan = planForemanClearFailedQueueTailAction({ snapshot });
    await pushRecoveryTelemetry({
      recoveryAction: "clear_failed_queue",
      result: "progress",
    });
    await clearForemanMutationQueueTail({
      snapshot: clearPlan.snapshot,
      draftKey: getDraftQueueKey(clearPlan.snapshot),
      triggerSource: clearPlan.triggerSource,
    });
    await refreshBoundarySyncState(clearPlan.snapshot);
    await pushRecoveryTelemetry({
      recoveryAction: "clear_failed_queue",
      result: "success",
    });
  }, [getDraftQueueKey, pushRecoveryTelemetry, refreshBoundarySyncState]);

  const discardWholeDraft = useCallback(async () => {
    await discardWholeForemanDraftInBoundary({
      buildCurrentLocalDraftSnapshot,
      applyLocalDraftSnapshotToBoundary,
      syncLocalDraftNow,
      clearDraftCache,
      resetDraftState,
    });
  }, [
    applyLocalDraftSnapshotToBoundary,
    buildCurrentLocalDraftSnapshot,
    clearDraftCache,
    resetDraftState,
    syncLocalDraftNow,
  ]);

  const ensureRequestId = useCallback(async () => {
    return await ensureForemanDraftRequestId({
      requestId,
      buildCurrentLocalDraftSnapshot,
      syncLocalDraftNow,
      buildRequestDraftMeta,
      ensureAndGetId,
      setDisplayNoByReq,
    });
  }, [
    buildCurrentLocalDraftSnapshot,
    buildRequestDraftMeta,
    ensureAndGetId,
    requestId,
    setDisplayNoByReq,
    syncLocalDraftNow,
  ]);

  const applyHeaderEditPlan = useCallback(
    (plan: ForemanDraftHeaderEditPlan) => {
      if (plan.headerPatch.foreman !== undefined) setForemanState(plan.headerPatch.foreman);
      if (plan.headerPatch.comment !== undefined) setCommentState(plan.headerPatch.comment);
      if (plan.headerPatch.objectType !== undefined) setObjectTypeState(plan.headerPatch.objectType);
      if (plan.headerPatch.level !== undefined) setLevelState(plan.headerPatch.level);
      if (plan.headerPatch.system !== undefined) setSystemState(plan.headerPatch.system);
      if (plan.headerPatch.zone !== undefined) setZoneState(plan.headerPatch.zone);
      setRequestDetails((prev) => applyForemanDraftHeaderEditPlanToRequestDetails(prev, plan));
    },
    [
      setCommentState,
      setForemanState,
      setLevelState,
      setObjectTypeState,
      setSystemState,
      setZoneState,
    ],
  );

  const setForeman = useCallback(
    (value: string) => {
      applyHeaderEditPlan(resolveForemanDraftHeaderEditPlan({ field: "foreman", value }));
    },
    [applyHeaderEditPlan],
  );

  const setComment = useCallback(
    (value: string) => {
      applyHeaderEditPlan(resolveForemanDraftHeaderEditPlan({ field: "comment", value }));
    },
    [applyHeaderEditPlan],
  );

  const applyObjectTypeSelection = useCallback(
    (code: string, objectName?: string | null) => {
      applyHeaderEditPlan(resolveForemanDraftHeaderEditPlan({
        field: "objectType",
        code,
        name: objectName,
      }));
    },
    [applyHeaderEditPlan],
  );

  const applyLevelSelection = useCallback(
    (code: string, levelName?: string | null) => {
      applyHeaderEditPlan(resolveForemanDraftHeaderEditPlan({
        field: "level",
        code,
        name: levelName,
      }));
    },
    [applyHeaderEditPlan],
  );

  const applySystemSelection = useCallback(
    (code: string, systemName?: string | null) => {
      applyHeaderEditPlan(resolveForemanDraftHeaderEditPlan({
        field: "system",
        code,
        name: systemName,
      }));
    },
    [applyHeaderEditPlan],
  );

  const applyZoneSelection = useCallback(
    (code: string, zoneName?: string | null) => {
      applyHeaderEditPlan(resolveForemanDraftHeaderEditPlan({
        field: "zone",
        code,
        name: zoneName,
      }));
    },
    [applyHeaderEditPlan],
  );

  const openRequestById = useCallback(
    async (targetId: string | number | null | undefined) => {
      const id = ridStr(targetId);
      if (!id) return null;
      setActiveDraftOwnerId(undefined, { resetSubmitted: true });
      setRequestDetails(null);
      const remote = await loadForemanRemoteDraftSnapshot({
        requestId: id,
        localSnapshot: localDraftSnapshotRef.current,
      });
      if (remote.isTerminal) {
        const durableState = getForemanDurableDraftState();
        await clearTerminalLocalDraft({
          snapshot:
            localDraftSnapshotRef.current ??
            durableState.snapshot ??
            durableState.recoverableLocalSnapshot,
          requestId: id,
          remoteStatus: remote.details?.status ?? null,
        });
        return null;
      }
      if (remote.snapshot) {
        applyLocalDraftSnapshotToBoundary(remote.snapshot, {
          restoreHeader: true,
          clearWhenEmpty: true,
          restoreSource: "remoteDraft",
          restoreIdentity: `open:${id}`,
        });
        await refreshBoundarySyncState(remote.snapshot);
        return id;
      }
      persistLocalDraftSnapshot(null);
      setRequestIdState(id);
      setRequestDetails(remote.details);
      if (remote.details) {
        syncHeaderFromDetails(remote.details);
      }
      await loadItems(id, { forceRemote: true });
      return id;
    },
    [
      applyLocalDraftSnapshotToBoundary,
      clearTerminalLocalDraft,
      loadItems,
      persistLocalDraftSnapshot,
      refreshBoundarySyncState,
      setActiveDraftOwnerId,
      setRequestIdState,
      syncHeaderFromDetails,
    ],
  );

  const { bootstrapDraft } = useForemanBootstrapCoordinator({
    patchBoundaryState,
    setActiveDraftOwnerId,
    setRequestIdState,
    setRequestDetails,
    setDisplayNoByReq,
    setLocalDraftSnapshot,
    localDraftSnapshotRef,
    networkOnlineRef,
    syncHeaderFromDetails,
    setSkipRemoteHydrationRequestId,
    clearDraftCache,
    applyLocalDraftSnapshotToBoundary,
    clearTerminalLocalDraft,
    clearTerminalRecoveryOwnerIfNeeded,
    getDraftQueueKey,
    getDraftQueueKeys,
    loadItems,
    refreshBoundarySyncState,
    resetDraftState,
    requestId,
  });

  const restoreDraftIfNeeded = useCallback(
    async (context: string) => {
      if (!boundaryState.bootstrapReady) return;
      if (await clearTerminalRecoveryOwnerIfNeeded(context)) return;

      // ── P6.3d: On focus/foreground, check if active snapshot's request
      // is already terminal on the server. skipRemoteDraftEffects prevents
      // loadDetails from running, so P6.3c live reconciliation has no way
      // to discover the terminal status. This explicit check closes that gap.
      const durableState = getForemanDurableDraftState();
      const snapshot = localDraftSnapshotRef.current ?? durableState.snapshot;
      const remoteCheckPlan = resolveForemanRestoreRemoteCheckPlan({ snapshot });
      if (remoteCheckPlan.action === "check_terminal") {
        try {
          const remoteDetails = await fetchRequestDetails(remoteCheckPlan.requestId);
          const remoteStatus = remoteDetails?.status ?? null;
          const remoteStatusPlan = resolveForemanRestoreRemoteStatusPlan({
            requestId: remoteCheckPlan.requestId,
            remoteStatus,
            remoteStatusIsTerminal: Boolean(remoteStatus && !isDraftLikeStatus(remoteStatus)),
          });
          if (remoteStatusPlan.action === "clear_terminal") {
            if (__DEV__) {
              console.info("[foreman.live-reconciliation] foreground check found terminal request", {
                requestId: remoteStatusPlan.requestId,
                remoteStatus: remoteStatusPlan.remoteStatus,
                context,
              });
            }
            await clearTerminalLocalDraft({
              snapshot,
              requestId: remoteStatusPlan.requestId,
              remoteStatus: remoteStatusPlan.remoteStatus,
            });
            return;
          }
        } catch {
          // Network failure is non-fatal; will retry on next foreground event.
        }
      }

      if (
        !shouldSyncForemanDraftAfterRestoreCheck({
          conflictAutoRecoverable: isForemanConflictAutoRecoverable(durableState.conflictType),
        })
      ) return;
      await syncLocalDraftNow({ context });
    },
    [
      boundaryState.bootstrapReady,
      clearTerminalLocalDraft,
      clearTerminalRecoveryOwnerIfNeeded,
      syncLocalDraftNow,
    ],
  );

  const runRestoreTriggerPlan = useCallback(
    (plan: ForemanDraftRestoreTriggerPlan) => {
      if (plan.action !== "restore") return;
      void restoreDraftIfNeeded(plan.context).catch((error) => {
        reportDraftBoundaryFailure({
          ...plan.failureTelemetry,
          error,
        });
      });
    },
    [reportDraftBoundaryFailure, restoreDraftIfNeeded],
  );

  const detailsRequestId = ridStr(requestDetails?.id);
  const skipRemoteDraftEffects = useMemo(() => {
    return shouldSkipForemanRemoteDraftEffects({
      bootstrapReady: boundaryState.bootstrapReady,
      activeSnapshot: getActiveLocalDraftSnapshot(),
      requestId,
    });
  }, [boundaryState.bootstrapReady, getActiveLocalDraftSnapshot, requestId]);

  useEffect(() => {
    // ── P6.3d: Prevent persist effect from re-creating a snapshot that was
    // just cleared by clearTerminalLocalDraft / bootstrap reconciliation.
    // clearDraftCache sets localDraftSnapshotRef.current = null synchronously,
    // but resetDraftState() uses async React setState. During the next render
    // cycle, items/requestDetails still hold old values, so
    // buildCurrentLocalDraftSnapshot() would rebuild a stale snapshot and
    // write it right back into the durable store — undoing the cleanup.
    if (
      !shouldPersistForemanLifecycleSnapshot({
        bootstrapReady: boundaryState.bootstrapReady,
        isDraftActive,
        localDraftSnapshotRefCleared: localDraftSnapshotRef.current === null,
        hasRequestDetails: Boolean(requestDetails),
        detailsRequestId,
        requestId,
        hasLocalDraft,
      })
    ) {
      return;
    }

    const snapshot = buildCurrentLocalDraftSnapshot();
    if (!snapshot || !hasForemanLocalDraftContent(snapshot)) return;
    persistLocalDraftSnapshot(snapshot);
  }, [
    boundaryState.bootstrapReady,
    buildCurrentLocalDraftSnapshot,
    detailsRequestId,
    hasLocalDraft,
    isDraftActive,
    persistLocalDraftSnapshot,
    requestDetails,
    requestId,
  ]);

  // ── P6.3c: Live Reconciliation Path ──────────────────────────
  useEffect(() => {
    if (!boundaryState.bootstrapReady) return;

    const durableState = getForemanDurableDraftState();
    const snapshot =
      localDraftSnapshotRef.current ?? durableState.snapshot ?? durableState.recoverableLocalSnapshot;
    const currentStatus = requestDetails?.status;
    const cleanupDecision = resolveForemanTerminalRecoveryCleanupDecision({
      bootstrapReady: boundaryState.bootstrapReady,
      boundaryConflictType: boundaryState.conflictType,
      requestId,
      remoteStatus: currentStatus,
      snapshot,
      durableState,
    });

    if (!cleanupDecision.shouldClear || !cleanupDecision.requestId) return;

    if (__DEV__) {
      console.info("[foreman.live-reconciliation] clearing stale state for terminal request", {
        requestId: cleanupDecision.requestId,
        isTerminalConflict: cleanupDecision.isTerminalConflict,
        isTerminalStatus: cleanupDecision.isTerminalStatus,
        remoteStatus: currentStatus ?? null,
      });
    }

    void clearTerminalLocalDraft({
      snapshot: cleanupDecision.snapshotForCleanup,
      requestId: cleanupDecision.requestId,
      remoteStatus: cleanupDecision.remoteStatus,
    }).catch((error) => {
      reportDraftBoundaryFailure({
        event: "live_terminal_local_cleanup_failed",
        error,
        context: cleanupDecision.isTerminalConflict ? "server_terminal_conflict" : "live_reconciliation",
        stage: "cleanup",
        kind: "critical_fail",
        sourceKind: "draft_boundary:terminal_cleanup",
        extra: {
          remoteStatus: cleanupDecision.remoteStatus,
          isTerminalConflict: cleanupDecision.isTerminalConflict,
        },
      });
    });
  }, [
    boundaryState.bootstrapReady,
    boundaryState.conflictType,
    clearTerminalLocalDraft,
    reportDraftBoundaryFailure,
    requestDetails?.status,
    requestId,
  ]);

  useEffect(() => {
    let cancelled = false;
    void bootstrapDraft({ cancelled: () => cancelled });
    return () => {
      cancelled = true;
    };
  }, [bootstrapDraft]);

  useEffect(() => {
    const wasFocused = wasScreenFocusedRef.current;
    wasScreenFocusedRef.current = isScreenFocused;
    runRestoreTriggerPlan(planForemanFocusRestoreTrigger({
      bootstrapReady: boundaryState.bootstrapReady,
      isScreenFocused,
      wasScreenFocused: wasFocused,
    }));
  }, [boundaryState.bootstrapReady, isScreenFocused, runRestoreTriggerPlan]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;
      runRestoreTriggerPlan(planForemanAppActiveRestoreTrigger({
        bootstrapReady: boundaryState.bootstrapReady,
        previousState: prevState,
        nextState,
      }));
    });
    return () => sub.remove();
  }, [boundaryState.bootstrapReady, runRestoreTriggerPlan]);

  useEffect(() => {
    let disposed = false;
    void ensurePlatformNetworkService()
      .then((snapshot) => {
        if (disposed) return;
        networkOnlineRef.current = selectPlatformOnlineFlag(snapshot);
        setNetworkOnline(networkOnlineRef.current);
      })
      .catch((error) => {
        if (disposed) return;
        networkOnlineRef.current = null;
        setNetworkOnline(null);
        reportDraftBoundaryFailure({
          event: "network_service_bootstrap_failed",
          error,
          context: "network_service_bootstrap",
          stage: "hydrate",
          sourceKind: "draft_boundary:network_service",
          extra: {
            fallbackReason: "network_online_unknown",
          },
        });
      });
    const unsubscribe = subscribePlatformNetwork((state, previous) => {
      if (disposed) return;
      const nextOnline = selectPlatformOnlineFlag(state);
      const wasOnline = selectPlatformOnlineFlag(previous);
      networkOnlineRef.current = nextOnline;
      setNetworkOnline(nextOnline);
      runRestoreTriggerPlan(planForemanNetworkBackRestoreTrigger({
        bootstrapReady: boundaryState.bootstrapReady,
        previousOnline: wasOnline,
        nextOnline,
      }));
    });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [boundaryState.bootstrapReady, reportDraftBoundaryFailure, runRestoreTriggerPlan]);

  useEffect(() => {
    const plan = planForemanRemoteDetailsLoadEffect({
      bootstrapReady: boundaryState.bootstrapReady,
      requestId,
      skipRemoteDraftEffects,
      skipRemoteHydrationRequestId: skipRemoteHydrationRequestIdRef.current,
    });
    if (plan.action !== "load") return;
    void preloadDisplayNo(plan.requestId);
    void loadDetails(plan.requestId);
  }, [boundaryState.bootstrapReady, loadDetails, preloadDisplayNo, requestId, skipRemoteDraftEffects]);

  useEffect(() => {
    const plan = planForemanItemsLoadEffect({
      bootstrapReady: boundaryState.bootstrapReady,
      requestId,
      skipRemoteDraftEffects,
      skipRemoteHydrationRequestId: skipRemoteHydrationRequestIdRef.current,
    });
    if (plan.action === "clear_skip_remote_hydration") {
      skipRemoteHydrationRequestIdRef.current = null;
      return;
    }
    if (plan.action !== "load_items") return;
    void loadItems();
  }, [boundaryState.bootstrapReady, loadItems, requestId, skipRemoteDraftEffects]);

  return {
    foreman,
    setForeman,
    comment,
    setComment,
    objectType,
    level,
    system,
    zone,
    requestId,
    activeDraftOwnerId,
    items,
    qtyDrafts,
    setQtyDrafts,
    qtyBusyMap,
    setRowBusy,
    requestDetails,
    canEditRequestItem,
    networkOnline,
    hasLocalDraft,
    isDraftActive,
    localDraftBootstrapReady: boundaryState.bootstrapReady,
    draftDirty: boundaryState.draftDirty,
    syncNeeded: boundaryState.syncNeeded,
    draftSyncStatus: boundaryState.syncStatus,
    draftLastSyncAt: boundaryState.lastSyncAt,
    draftLastErrorAt: boundaryState.lastErrorAt,
    draftLastErrorStage: boundaryState.lastErrorStage,
    draftConflictType: boundaryState.conflictType,
    draftRetryCount: boundaryState.retryCount,
    pendingOperationsCount: boundaryState.pendingOperationsCount,
    draftQueueKey: boundaryState.queueDraftKey,
    draftRequestIdKnown: boundaryState.requestIdKnown,
    draftSyncAttentionNeeded: boundaryState.attentionNeeded,
    availableDraftRecoveryActions: boundaryState.availableRecoveryActions,
    restoreSource: boundaryState.restoreSource,
    lastRestoredSnapshotId: boundaryState.lastRestoredSnapshotId,
    clearDraftCache,
    resetDraftState,
    syncLocalDraftNow,
    retryDraftSyncNow,
    rehydrateDraftFromServer,
    restoreLocalDraftAfterConflict,
    discardLocalDraftNow,
    clearFailedQueueTailNow,
    ensureRequestId,
    syncRequestHeaderMeta,
    appendLocalDraftRows,
    updateLocalDraftQty,
    removeLocalDraftRow,
    discardWholeDraft,
    openRequestById,
    applyObjectTypeSelection,
    applyLevelSelection,
    applySystemSelection,
    applyZoneSelection,
  };
}
