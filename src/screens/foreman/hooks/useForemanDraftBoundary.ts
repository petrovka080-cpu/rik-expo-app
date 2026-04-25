import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import {
  type ReqItemRow,
  type RequestDetails,
} from "../../../lib/catalog_api";
import {
  clearForemanMutationsForDraft,
  getForemanPendingMutationCountForDraftKeys,
} from "../../../lib/offline/mutationQueue";
import {
  type ForemanDraftSyncStage,
  type ForemanDraftRecoveryAction,
} from "../../../lib/offline/foremanSyncRuntime";
import type { RequestRecord } from "../../../lib/api/types";
import { formatQtyInput } from "../foreman.helpers";
import {
  FOREMAN_LOCAL_ONLY_REQUEST_ID,
  buildForemanLocalDraftSnapshot,
  type ForemanDraftAppendInput,
  type ForemanLocalDraftSnapshot,
} from "../foreman.localDraft";
import type { RequestDraftMeta } from "../foreman.types";
import {
  INITIAL_BOUNDARY_STATE,
  appendForemanLocalDraftRows,
  applyForemanLocalDraftSnapshotToBoundary as applyForemanLocalDraftSnapshotToBoundaryHelper,
  clearForemanDraftCacheState,
  ensureForemanDraftRequestId,
  persistForemanLocalDraftSnapshot,
  removeForemanLocalDraftRowInBoundary,
  syncForemanRequestHeaderMeta,
  type ForemanDraftBoundaryState,
  type ForemanDraftMutationKind,
  type ForemanDraftRestoreSource,
  updateForemanLocalDraftQtyInBoundary,
} from "../foreman.draftBoundary.helpers";
import {
  normalizeForemanDraftOwnerId,
  resolveForemanDraftHeaderEditPlan,
  resolveForemanDraftQueueKey,
  resolveForemanDraftQueueKeys,
  type ForemanDraftHeaderEditPlan,
} from "../foreman.draftBoundaryIdentity.model";
import {
  type ForemanDraftRestoreTriggerPlan,
  planForemanFocusRestoreTrigger,
  resolveForemanActiveLocalDraftSnapshotPlan,
  resolveForemanDraftCacheClearPlan,
} from "../foreman.draftLifecycle.model";
import {
  resolveForemanDraftBoundaryRefreshPlan,
  resolveForemanDraftBoundarySnapshot,
} from "../foreman.draftBoundary.logic";
import {
  getForemanDurableDraftState,
} from "../foreman.durableDraft.store";
import { applyForemanDraftHeaderEditToBoundary } from "../foreman.draftBoundary.apply";
import {
  buildForemanDraftBoundaryHeaderState,
  buildForemanDraftBoundaryViewState,
  resolveForemanDraftBoundaryCanEditItem,
  resolveForemanDraftBoundaryPersistPlan,
} from "../foreman.draftBoundary.plan";
import {
  runForemanClearTerminalLocalDraft,
  runForemanClearTerminalRecoveryOwnerIfNeeded,
  runForemanDiscardLocalDraftNow,
  runForemanDiscardWholeDraft,
  runForemanOpenRequestById,
  runForemanRehydrateDraftFromServer,
  runForemanRestoreDraftIfNeeded,
  runForemanRestoreLocalDraftAfterConflict,
  runForemanRestoreTriggerPlan,
} from "../foreman.draftBoundary.recovery";
import {
  runForemanDraftBoundaryClearFailedQueueTailNow,
  runForemanDraftBoundaryRetrySyncNow,
  runForemanDraftBoundarySyncNow,
  type ForemanDraftBoundarySyncResultPayload,
} from "../foreman.draftBoundary.sync";
import {
  getForemanDraftBoundaryCurrentAppState,
  runForemanDraftBoundaryLiveCleanupEffect,
  runForemanDraftBoundaryRemoteDetailsEffect,
  runForemanDraftBoundaryRemoteItemsEffect,
  startForemanDraftBoundaryNetworkRuntime,
  subscribeForemanDraftBoundaryAppState,
} from "../foreman.draftBoundary.effects";
import {
  loadForemanDraftBoundaryRequestDetails,
  invalidateForemanDraftBoundaryRequestDetailsLoads,
} from "../foreman.draftBoundary.requestDetails";
import {
  pushForemanDraftBoundaryRecoveryTelemetry,
  reportForemanDraftBoundaryFailure,
} from "../foreman.draftBoundary.telemetry";
import { runForemanDraftBoundaryPostSubmitSuccess } from "../foreman.draftBoundary.postSubmit";
import { useForemanHeader } from "./useForemanHeader";
import { useForemanItemsState } from "./useForemanItemsState";
import { useForemanBootstrapCoordinator } from "./useForemanBootstrapCoordinator";

type UseForemanDraftBoundaryProps = {
  isScreenFocused: boolean;
  preloadDisplayNo: (rid?: string | number | null) => Promise<void>;
  setDisplayNoByReq: Dispatch<SetStateAction<Record<string, string>>>;
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
    qtyDrafts,
    setQtyDrafts,
    qtyBusyMap,
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
  const draftSyncInFlightRef = useRef<Promise<ForemanDraftBoundarySyncResultPayload> | null>(null);
  const activeDraftOwnerIdRef = useRef(createEphemeralForemanDraftOwnerId());
  const [activeDraftOwnerId, setActiveDraftOwnerIdState] = useState<string | null>(
    activeDraftOwnerIdRef.current,
  );
  const submitInFlightOwnerIdRef = useRef<string | null>(null);
  const lastSubmittedOwnerIdRef = useRef<string | null>(null);
  const handlePostSubmitSuccessRef = useRef<
    (rid: string, submitted: RequestRecord | null) => Promise<void>
  >(async () => undefined);
  const appStateRef = useRef(getForemanDraftBoundaryCurrentAppState());
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
      const refreshSnapshot = resolveForemanDraftBoundarySnapshot({
        durableSnapshot: durableState.snapshot,
        localSnapshot: localDraftSnapshotRef.current,
        snapshotOverride,
      });
      const pendingOperationsCount = await getForemanPendingMutationCountForDraftKeys(
        getDraftQueueKeys(refreshSnapshot),
      );
      const refreshPlan = resolveForemanDraftBoundaryRefreshPlan({
        durableState,
        localSnapshot: localDraftSnapshotRef.current,
        snapshotOverride,
        pendingOperationsCount,
      });
      patchBoundaryState(refreshPlan.boundaryPatch);
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
    }) =>
      await pushForemanDraftBoundaryRecoveryTelemetry(
        {
          localDraftSnapshotRef,
          requestId,
          localOnlyRequestId: FOREMAN_LOCAL_ONLY_REQUEST_ID,
          networkOnlineRef,
        },
        params,
      ),
    [requestId],
  );

  const reportDraftBoundaryFailure = useCallback((params: {
    event: string;
    error: unknown;
    context?: string;
    stage: ForemanDraftSyncStage;
    kind?: "critical_fail" | "soft_failure" | "degraded_fallback" | "cleanup_only";
    sourceKind?: string;
    extra?: Record<string, unknown>;
  }) =>
    reportForemanDraftBoundaryFailure(
      {
        localDraftSnapshotRef,
        requestId,
        localOnlyRequestId: FOREMAN_LOCAL_ONLY_REQUEST_ID,
      },
      params,
    ), [requestId]);

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
      buildForemanDraftBoundaryHeaderState({
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
  const boundaryViewState = useMemo(
    () =>
      buildForemanDraftBoundaryViewState({
        localSnapshot: activeLocalDraftSnapshot,
        activeDraftOwnerId,
        requestId,
        requestStatus: requestDetails?.status,
        requestDetailsId: requestDetails?.id ?? null,
        headerState: currentHeaderState,
        bootstrapReady: boundaryState.bootstrapReady,
      }),
    [
      activeDraftOwnerId,
      activeLocalDraftSnapshot,
      boundaryState.bootstrapReady,
      currentHeaderState,
      requestDetails?.id,
      requestDetails?.status,
      requestId,
    ],
  );
  const draftActivityState = boundaryViewState.draftActivityState;
  const { hasLocalDraft, isDraftActive } = draftActivityState;

  const canEditRequestItem = useCallback(
    (row?: ReqItemRow | null) => {
      return resolveForemanDraftBoundaryCanEditItem({
        row,
        isDraftActive,
        requestDetailsId: requestDetails?.id,
        requestStatus: requestDetails?.status,
        requestId,
        localOnlyRequestId: FOREMAN_LOCAL_ONLY_REQUEST_ID,
      });
    },
    [isDraftActive, requestDetails?.id, requestDetails?.status, requestId],
  );

  const buildRequestDraftMeta = useCallback(
    (): RequestDraftMeta => boundaryViewState.requestDraftMeta,
    [boundaryViewState.requestDraftMeta],
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
    async (rid?: string | number | null) =>
      await loadForemanDraftBoundaryRequestDetails(
        {
          requestDetailsLoadSeqRef,
          requestId,
          setRequestDetails,
          setDisplayNoByReq,
          syncHeaderFromDetails,
        },
        rid,
      ),
    [requestId, setDisplayNoByReq, syncHeaderFromDetails],
  );

  const invalidateRequestDetailsLoads = useCallback(() => {
    invalidateForemanDraftBoundaryRequestDetailsLoads(requestDetailsLoadSeqRef);
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
    async (rid: string, submitted: RequestRecord | null) =>
      await runForemanDraftBoundaryPostSubmitSuccess(
        {
          localDraftSnapshotRef,
          activeDraftOwnerIdRef,
          lastSubmittedOwnerIdRef,
          skipRemoteHydrationRequestIdRef,
          requestId,
          currentHeaderState,
          setActiveDraftOwnerId,
          setDisplayNoByReq,
          invalidateRequestDetailsLoads,
          applyLocalDraftSnapshotToBoundary,
          refreshBoundarySyncState,
        },
        { rid, submitted },
      ),
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
    }) =>
      await runForemanClearTerminalLocalDraft(
        {
          localDraftSnapshotRef,
          requestId,
          clearDraftCache,
          setActiveDraftOwnerId,
          resetDraftState,
          refreshBoundarySyncState,
        },
        options,
      ),
    [clearDraftCache, refreshBoundarySyncState, requestId, resetDraftState, setActiveDraftOwnerId],
  );

  const clearTerminalRecoveryOwnerIfNeeded = useCallback(
    async (context: string, options?: { cancelled?: () => boolean }) =>
      await runForemanClearTerminalRecoveryOwnerIfNeeded(
        {
          localDraftSnapshotRef,
          requestId,
          clearTerminalLocalDraft,
          reportDraftBoundaryFailure,
        },
        context,
        options,
      ),
    [clearTerminalLocalDraft, reportDraftBoundaryFailure, requestId],
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
    }) =>
      await runForemanDraftBoundarySyncNow(
        {
          isDraftActive,
          requestId,
          buildCurrentLocalDraftSnapshot,
          getDraftQueueKey,
          getDraftQueueKeys,
          refreshBoundarySyncState,
          persistLocalDraftSnapshot,
          buildRequestDraftMeta,
          applyLocalDraftSnapshotToBoundary,
          localDraftSnapshotRef,
          networkOnlineRef,
          draftSyncInFlightRef,
          activeDraftOwnerIdRef,
          lastSubmittedOwnerIdRef,
          submitInFlightOwnerIdRef,
          handlePostSubmitSuccessRef,
        },
        options,
      ),
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

  const retryDraftSyncNow = useCallback(
    async () =>
      await runForemanDraftBoundaryRetrySyncNow({
        localDraftSnapshotRef,
        pushRecoveryTelemetry,
        syncLocalDraftNow,
      }),
    [pushRecoveryTelemetry, syncLocalDraftNow],
  );

  const rehydrateDraftFromServer = useCallback(
    async () =>
      await runForemanRehydrateDraftFromServer({
        localDraftSnapshotRef,
        requestId,
        clearTerminalLocalDraft,
        setActiveDraftOwnerId,
        applyLocalDraftSnapshotToBoundary,
        refreshBoundarySyncState,
        persistLocalDraftSnapshot,
        setRequestIdState,
        setRequestDetails,
        syncHeaderFromDetails,
        loadItems,
        pushRecoveryTelemetry,
      }),
    [
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
    ],
  );

  const restoreLocalDraftAfterConflict = useCallback(
    async () =>
      await runForemanRestoreLocalDraftAfterConflict({
        setActiveDraftOwnerId,
        applyLocalDraftSnapshotToBoundary,
        refreshBoundarySyncState,
        pushRecoveryTelemetry,
      }),
    [applyLocalDraftSnapshotToBoundary, pushRecoveryTelemetry, refreshBoundarySyncState, setActiveDraftOwnerId],
  );

  const discardLocalDraftNow = useCallback(
    async () =>
      await runForemanDiscardLocalDraftNow({
        localDraftSnapshotRef,
        requestId,
        clearDraftCache,
        resetDraftState,
        clearTerminalLocalDraft,
        setActiveDraftOwnerId,
        applyLocalDraftSnapshotToBoundary,
        refreshBoundarySyncState,
        persistLocalDraftSnapshot,
        setRequestIdState,
        setRequestDetails,
        syncHeaderFromDetails,
        loadItems,
        pushRecoveryTelemetry,
      }),
    [
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
    ],
  );

  const clearFailedQueueTailNow = useCallback(
    async () =>
      await runForemanDraftBoundaryClearFailedQueueTailNow({
        localDraftSnapshotRef,
        getDraftQueueKey,
        refreshBoundarySyncState,
        pushRecoveryTelemetry,
      }),
    [getDraftQueueKey, pushRecoveryTelemetry, refreshBoundarySyncState],
  );

  const discardWholeDraft = useCallback(
    async () =>
      await runForemanDiscardWholeDraft({
        buildCurrentLocalDraftSnapshot,
        applyLocalDraftSnapshotToBoundary,
        syncLocalDraftNow,
        clearDraftCache,
        resetDraftState,
      }),
    [
      applyLocalDraftSnapshotToBoundary,
      buildCurrentLocalDraftSnapshot,
      clearDraftCache,
      resetDraftState,
      syncLocalDraftNow,
    ],
  );

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
      applyForemanDraftHeaderEditToBoundary({
        plan,
        setHeaderState: {
          setForeman: setForemanState,
          setComment: setCommentState,
          setObjectType: setObjectTypeState,
          setLevel: setLevelState,
          setSystem: setSystemState,
          setZone: setZoneState,
        },
        setRequestDetails,
      });
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
    async (targetId: string | number | null | undefined) =>
      await runForemanOpenRequestById(
        {
          localDraftSnapshotRef,
          clearTerminalLocalDraft,
          setActiveDraftOwnerId,
          applyLocalDraftSnapshotToBoundary,
          refreshBoundarySyncState,
          persistLocalDraftSnapshot,
          setRequestIdState,
          setRequestDetails,
          syncHeaderFromDetails,
          loadItems,
        },
        targetId,
      ),
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
    async (context: string) =>
      await runForemanRestoreDraftIfNeeded(
        {
          bootstrapReady: boundaryState.bootstrapReady,
          localDraftSnapshotRef,
          clearTerminalRecoveryOwnerIfNeeded,
          clearTerminalLocalDraft,
          reportDraftBoundaryFailure,
          syncLocalDraftNow,
        },
        context,
      ),

      // ── P6.3d: On focus/foreground, check if active snapshot's request
      // is already terminal on the server. skipRemoteDraftEffects prevents
      // loadDetails from running, so P6.3c live reconciliation has no way
      // to discover the terminal status. This explicit check closes that gap.
    [
      boundaryState.bootstrapReady,
      clearTerminalLocalDraft,
      clearTerminalRecoveryOwnerIfNeeded,
      reportDraftBoundaryFailure,
      syncLocalDraftNow,
    ],
  );

  const runRestoreTriggerPlan = useCallback(
    (plan: ForemanDraftRestoreTriggerPlan) =>
      runForemanRestoreTriggerPlan(plan, {
        restoreDraftIfNeeded,
        reportDraftBoundaryFailure,
      }),
    [reportDraftBoundaryFailure, restoreDraftIfNeeded],
  );

  const detailsRequestId = boundaryViewState.detailsRequestId;
  const skipRemoteDraftEffects = boundaryViewState.skipRemoteDraftEffects;

  useEffect(() => {
    // ── P6.3d: Prevent persist effect from re-creating a snapshot that was
    // just cleared by clearTerminalLocalDraft / bootstrap reconciliation.
    // clearDraftCache sets localDraftSnapshotRef.current = null synchronously,
    // but resetDraftState() uses async React setState. During the next render
    // cycle, items/requestDetails still hold old values, so
    // buildCurrentLocalDraftSnapshot() would rebuild a stale snapshot and
    // write it right back into the durable store — undoing the cleanup.
    const persistPlan = resolveForemanDraftBoundaryPersistPlan({
      bootstrapReady: boundaryState.bootstrapReady,
      isDraftActive,
      localDraftSnapshotRefCleared: localDraftSnapshotRef.current === null,
      hasRequestDetails: Boolean(requestDetails),
      detailsRequestId,
      requestId,
      hasLocalDraft,
      snapshot: buildCurrentLocalDraftSnapshot(),
    });
    if (persistPlan.action !== "persist") return;
    persistLocalDraftSnapshot(persistPlan.snapshot);
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

      runForemanDraftBoundaryLiveCleanupEffect({
        bootstrapReady: boundaryState.bootstrapReady,
        boundaryConflictType: boundaryState.conflictType,
        requestId,
        requestDetailsStatus: requestDetails?.status,
        localDraftSnapshotRef,
        clearTerminalLocalDraft,
        reportDraftBoundaryFailure,
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
    return subscribeForemanDraftBoundaryAppState({
      bootstrapReady: boundaryState.bootstrapReady,
      appStateRef,
      runRestoreTriggerPlan,
      reportDraftBoundaryFailure,
    });
  }, [boundaryState.bootstrapReady, reportDraftBoundaryFailure, runRestoreTriggerPlan]);

  useEffect(() => {
    const runtime = startForemanDraftBoundaryNetworkRuntime({
      bootstrapReady: boundaryState.bootstrapReady,
      networkOnlineRef,
      setNetworkOnline,
      runRestoreTriggerPlan,
      reportDraftBoundaryFailure,
    });
    return () => {
      runtime.dispose();
    };
  }, [boundaryState.bootstrapReady, reportDraftBoundaryFailure, runRestoreTriggerPlan]);

  useEffect(() => {
    runForemanDraftBoundaryRemoteDetailsEffect({
      bootstrapReady: boundaryState.bootstrapReady,
      requestId,
      skipRemoteDraftEffects,
      skipRemoteHydrationRequestId: skipRemoteHydrationRequestIdRef.current,
      preloadDisplayNo,
      loadDetails,
    });
  }, [boundaryState.bootstrapReady, loadDetails, preloadDisplayNo, requestId, skipRemoteDraftEffects]);

  useEffect(() => {
    runForemanDraftBoundaryRemoteItemsEffect({
      bootstrapReady: boundaryState.bootstrapReady,
      requestId,
      skipRemoteDraftEffects,
      skipRemoteHydrationRequestIdRef,
      loadItems,
    });
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
