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
  isForemanConflictAutoRecoverable,
  normalizeForemanSyncTriggerSource,
  type ForemanDraftRecoveryAction,
} from "../../../lib/offline/foremanSyncRuntime";
import { selectPlatformOnlineFlag } from "../../../lib/offline/platformOffline.model";
import type { RequestRecord } from "../../../lib/api/types";
import {
  formatQtyInput,
  isDraftLikeStatus,
  ridStr,
} from "../foreman.helpers";
import {
  FOREMAN_LOCAL_ONLY_REQUEST_ID,
  buildFreshForemanLocalDraftSnapshot,
  buildForemanLocalDraftSnapshot,
  hasForemanLocalDraftContent,
  hasForemanLocalDraftPendingSync,
  loadForemanRemoteDraftSnapshot,
  markForemanLocalDraftSubmitRequested,
  syncForemanLocalDraftSnapshot,
  type ForemanDraftAppendInput,
  type ForemanLocalDraftSnapshot,
} from "../foreman.localDraft";
import type { RequestDraftMeta } from "../foreman.types";
import {
  INITIAL_BOUNDARY_STATE,
  appendForemanLocalDraftRows,
  applyForemanLocalDraftSnapshotToBoundary as applyForemanLocalDraftSnapshotToBoundaryHelper,
  bootstrapForemanDraftBoundary,
  buildForemanRequestDraftMeta,
  clearForemanDraftCacheState,
  discardWholeForemanDraftInBoundary,
  ensureForemanDraftRequestId,
  loadForemanRequestDetails,
  patchForemanRequestDetailsComment,
  patchForemanRequestDetailsLevel,
  patchForemanRequestDetailsName,
  patchForemanRequestDetailsObjectType,
  patchForemanRequestDetailsSystem,
  patchForemanRequestDetailsZone,
  persistForemanLocalDraftSnapshot,
  removeForemanLocalDraftRowInBoundary,
  syncForemanRequestHeaderMeta,
  type ForemanDraftBoundaryState,
  type ForemanDraftMutationKind,
  type ForemanDraftRestoreSource,
  updateForemanLocalDraftQtyInBoundary,
} from "../foreman.draftBoundary.helpers";
import {
  getForemanDurableDraftState,
  markForemanDurableDraftDirtyLocal,
  patchForemanDurableDraftRecoveryState,
  pushForemanDurableDraftTelemetry,
} from "../foreman.durableDraft.store";
import { useForemanUiStore } from "../foremanUi.store";
import { useForemanHeader } from "./useForemanHeader";
import { useForemanItemsState } from "./useForemanItemsState";

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

const normalizeDraftOwnerId = (value: string | null | undefined) => String(value || "").trim();

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
    setItems,
    qtyDrafts,
    setQtyDrafts,
    qtyBusyMap,
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
    const nextOwnerId = normalizeDraftOwnerId(ownerId) || createEphemeralForemanDraftOwnerId();
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

  const getDraftQueueKey = useCallback(
    (snapshot?: ForemanLocalDraftSnapshot | null, fallbackRequestId?: string | null) => {
      const snapshotRequestId = ridStr(snapshot?.requestId);
      const currentRequestId = ridStr(fallbackRequestId ?? requestId);
      return snapshotRequestId || currentRequestId || FOREMAN_LOCAL_ONLY_REQUEST_ID;
    },
    [requestId],
  );

  const getDraftQueueKeys = useCallback(
    (snapshot?: ForemanLocalDraftSnapshot | null, fallbackRequestId?: string | null) => {
      const snapshotRequestId = ridStr(snapshot?.requestId);
      const currentRequestId = ridStr(fallbackRequestId ?? requestId);
      if (snapshotRequestId) {
        return [snapshotRequestId, FOREMAN_LOCAL_ONLY_REQUEST_ID];
      }
      if (currentRequestId) {
        return [currentRequestId, FOREMAN_LOCAL_ONLY_REQUEST_ID];
      }
      return [FOREMAN_LOCAL_ONLY_REQUEST_ID];
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
      patchBoundaryState({
        draftDirty:
          Boolean(snapshot && hasForemanLocalDraftContent(snapshot)) &&
          (durableState.syncStatus !== "synced" || pendingOperationsCount > 0 || Boolean(durableState.lastError)),
        syncNeeded:
          pendingOperationsCount > 0 ||
          durableState.syncStatus === "retry_wait" ||
          durableState.syncStatus === "failed_terminal" ||
          durableState.conflictType !== "none" ||
          Boolean(snapshot && hasForemanLocalDraftPendingSync(snapshot)),
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
      });
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
      await pushForemanDurableDraftTelemetry({
        stage: "recovery",
        result: params.result,
        draftKey: getDraftQueueKey(snapshot),
        requestId: ridStr(snapshot?.requestId) || null,
        localOnlyDraftKey: getDraftQueueKey(snapshot) === FOREMAN_LOCAL_ONLY_REQUEST_ID,
        attemptNumber: durableState.retryCount + 1,
        queueSizeBefore: durableState.pendingOperationsCount,
        queueSizeAfter: durableState.pendingOperationsCount,
        coalescedCount: 0,
        conflictType: params.conflictType ?? durableState.conflictType,
        recoveryAction: params.recoveryAction,
        errorClass: params.errorClass ?? null,
        errorCode: params.errorCode ?? null,
        offlineState:
          networkOnlineRef.current === true ? "online" : networkOnlineRef.current === false ? "offline" : "unknown",
        triggerSource: "manual_retry",
      });
    },
    [getDraftQueueKey],
  );

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
      const snapshot = localDraftSnapshotRef.current;
      if (!snapshot || !hasForemanLocalDraftContent(snapshot)) return null;

      const snapshotOwnerId = normalizeDraftOwnerId(snapshot.ownerId);
      const activeOwnerId = normalizeDraftOwnerId(activeDraftOwnerIdRef.current);
      if (snapshotOwnerId && activeOwnerId && snapshotOwnerId !== activeOwnerId) {
        return null;
      }

      const currentRequestId = ridStr(targetRequestId ?? requestId);
      const snapshotRequestId = ridStr(snapshot.requestId);

      if (!snapshotRequestId) {
        return currentRequestId ? null : snapshot;
      }

      return snapshotRequestId === currentRequestId ? snapshot : null;
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

  const buildCurrentLocalDraftSnapshot = useCallback(() => {
    return buildForemanLocalDraftSnapshot({
      base: localDraftSnapshotRef.current,
      ownerId: activeDraftOwnerIdRef.current,
      requestId,
      displayNo: requestDetails?.display_no ?? null,
      status: requestDetails?.status ?? (items.length ? "draft" : null),
      header: {
        foreman,
        comment,
        objectType,
        level,
        system,
        zone,
      },
      items,
      qtyDrafts,
    });
  }, [
    comment,
    foreman,
    items,
    level,
    objectType,
    qtyDrafts,
    requestDetails?.display_no,
    requestDetails?.status,
    requestId,
    system,
    zone,
  ]);

  const activeLocalDraftSnapshot = useMemo(() => getActiveLocalDraftSnapshot(), [getActiveLocalDraftSnapshot]);

  const hasLocalDraft = useMemo(
    () => Boolean(activeLocalDraftSnapshot && hasForemanLocalDraftContent(activeLocalDraftSnapshot)),
    [activeLocalDraftSnapshot],
  );

  const isDraftActive = useMemo(
    () => hasLocalDraft || isDraftLikeStatus(requestDetails?.status),
    [hasLocalDraft, requestDetails?.status],
  );

  const canEditRequestItem = useCallback(
    (row?: ReqItemRow | null) => {
      if (!row) return false;
      const activeRequestId = String(requestDetails?.id ?? "").trim();
      const localRequestId = String(requestId || FOREMAN_LOCAL_ONLY_REQUEST_ID).trim();
      if (!isDraftActive) return false;
      const itemRequest = String(row.request_id ?? "").trim();
      if (activeRequestId && itemRequest === activeRequestId && isDraftLikeStatus(requestDetails?.status)) return true;
      return itemRequest === localRequestId || itemRequest === FOREMAN_LOCAL_ONLY_REQUEST_ID;
    },
    [isDraftActive, requestDetails?.id, requestDetails?.status, requestId],
  );

  const buildRequestDraftMeta = useCallback(
    (): RequestDraftMeta =>
      buildForemanRequestDraftMeta({
        foreman,
        comment,
        objectType,
        level,
        system,
        zone,
      }),
    [comment, foreman, level, objectType, system, zone],
  );

  const syncRequestHeaderMeta = useCallback(
    async (rid: string, context: string) => {
      await syncForemanRequestHeaderMeta({
        requestId: rid,
        context,
        header: { foreman, comment, objectType, level, system, zone },
      });
    },
    [comment, foreman, level, objectType, system, zone],
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
    const cleanupRequestId =
      ridStr(options?.requestId) || ridStr(activeSnapshot?.requestId) || ridStr(requestId);
    const queueKeys = new Set<string>([
      FOREMAN_LOCAL_ONLY_REQUEST_ID,
      ...getDraftQueueKeys(activeSnapshot, cleanupRequestId),
    ]);
    await Promise.all(
      Array.from(queueKeys)
        .filter(Boolean)
        .map(async (key) => {
          await clearForemanMutationsForDraft(key);
        }),
    );
    await clearForemanDraftCacheState(persistLocalDraftSnapshot, patchBoundaryState);
    await refreshBoundarySyncState(null);
  }, [getDraftQueueKeys, patchBoundaryState, persistLocalDraftSnapshot, refreshBoundarySyncState, requestId]);

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
      const activeDraftIdBefore = ridStr(localDraftSnapshotRef.current?.requestId) || ridStr(requestId) || rid || null;
      const submittedOwnerId =
        normalizeDraftOwnerId(localDraftSnapshotRef.current?.ownerId)
        || normalizeDraftOwnerId(activeDraftOwnerIdRef.current)
        || null;
      if (submittedOwnerId) {
        lastSubmittedOwnerIdRef.current = submittedOwnerId;
      }
      const freshDraftSnapshot = buildFreshForemanLocalDraftSnapshot({
        base: localDraftSnapshotRef.current,
        header: {
          foreman,
          comment: "",
          objectType,
          level,
          system,
          zone,
        },
      });
      setActiveDraftOwnerId(freshDraftSnapshot.ownerId);
      if (submitted?.display_no) {
        setDisplayNoByReq((prev) => ({ ...prev, [rid]: String(submitted.display_no) }));
      }

      skipRemoteHydrationRequestIdRef.current = null;
      invalidateRequestDetailsLoads();
      useForemanUiStore.getState().resetAiQuickUi();
      useForemanUiStore.getState().clearAiQuickSessionHistory();
      applyLocalDraftSnapshotToBoundary(freshDraftSnapshot, {
        restoreHeader: true,
        clearWhenEmpty: true,
        restoreSource: "snapshot",
        restoreIdentity: `post-submit:fresh:${freshDraftSnapshot.updatedAt}`,
      });

      await patchForemanDurableDraftRecoveryState({
        snapshot: freshDraftSnapshot,
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
        lastTriggerSource: "submit",
        lastSyncAt: Date.now(),
      });
      await refreshBoundarySyncState(freshDraftSnapshot);

      if (__DEV__) {
        const durableState = getForemanDurableDraftState();
        console.info("[foreman.post-submit]", {
          draftId: activeDraftIdBefore,
          requestId: rid,
          submitSuccess: true,
          postSubmitAction: "promoted_fresh_local_draft",
          staleBannerVisibleAfterSubmit:
            durableState.conflictType !== "none" || durableState.availableRecoveryActions.length > 0,
          activeDraftIdBefore,
          activeDraftIdAfter: FOREMAN_LOCAL_ONLY_REQUEST_ID,
          activeDraftOwnerIdAfter: freshDraftSnapshot.ownerId,
          freshDraftCreated: true,
          runtimeResult: "post_submit_fresh_draft_state",
        });
      }
    },
    [
      applyLocalDraftSnapshotToBoundary,
      comment,
      foreman,
      invalidateRequestDetailsLoads,
      level,
      objectType,
      refreshBoundarySyncState,
      requestId,
      setActiveDraftOwnerId,
      setDisplayNoByReq,
      system,
      zone,
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
      const snapshot = options.snapshot ?? localDraftSnapshotRef.current ?? getForemanDurableDraftState().snapshot;
      await clearDraftCache({
        snapshot,
        requestId: options.requestId,
      });
      setActiveDraftOwnerId(undefined, { resetSubmitted: true });
      resetDraftState();
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
        lastTriggerSource: "bootstrap_complete",
        lastSyncAt: Date.now(),
      });
      await refreshBoundarySyncState(null);

      if (__DEV__) {
        console.info("[foreman.terminal-cleanup]", {
          draftId: ridStr(snapshot?.requestId) || options.requestId,
          requestId: options.requestId,
          remoteStatus: options.remoteStatus ?? null,
          submitSuccess: false,
          postSubmitAction: "entered_empty_state",
          staleBannerVisibleAfterSubmit: false,
          activeDraftIdBefore: ridStr(snapshot?.requestId) || options.requestId,
          activeDraftIdAfter: null,
          freshDraftCreated: false,
          runtimeResult: "cleared_terminal_local_snapshot",
        });
      }
    },
    [clearDraftCache, refreshBoundarySyncState, resetDraftState, setActiveDraftOwnerId],
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
      const mutationKind =
        options?.mutationKind ?? (options?.submit ? "submit" : "background_sync");

      if (!isDraftActive && !options?.overrideSnapshot && mutationKind !== "background_sync") {
        return { requestId: ridStr(requestId) || null, submitted: null };
      }

      let snapshot = options?.overrideSnapshot ?? buildCurrentLocalDraftSnapshot();
      if (options?.submit) {
        snapshot = markForemanLocalDraftSubmitRequested(snapshot);
      }
      const submitOwnerId =
        options?.submit === true ? normalizeDraftOwnerId(snapshot?.ownerId) || activeDraftOwnerIdRef.current : null;
      const triggerSource = normalizeForemanSyncTriggerSource(
        options?.context,
        mutationKind,
        options?.submit === true || snapshot?.submitRequested === true,
      );

      if (!snapshot || !hasForemanLocalDraftContent(snapshot)) {
        await refreshBoundarySyncState(snapshot ?? null);
        return { requestId: ridStr(requestId) || null, submitted: null };
      }

      if (options?.submit === true && submitOwnerId) {
        if (lastSubmittedOwnerIdRef.current === submitOwnerId) {
          throw new Error("Этот черновик уже отправлен. Откройте новый активный черновик.");
        }
        if (submitInFlightOwnerIdRef.current === submitOwnerId && draftSyncInFlightRef.current) {
          return await draftSyncInFlightRef.current;
        }
      }

      const pendingOperationsCount = await getForemanPendingMutationCountForDraftKeys(
        getDraftQueueKeys(snapshot),
      );
      const durableState = getForemanDurableDraftState();
      await markForemanDurableDraftDirtyLocal(snapshot, {
        queueDraftKey: getDraftQueueKey(snapshot),
        triggerSource,
      });
      persistLocalDraftSnapshot(snapshot);
      await pushForemanDurableDraftTelemetry({
        stage: "enqueue",
        result: "progress",
        draftKey: getDraftQueueKey(snapshot),
        requestId: ridStr(snapshot.requestId) || null,
        localOnlyDraftKey: getDraftQueueKey(snapshot) === FOREMAN_LOCAL_ONLY_REQUEST_ID,
        attemptNumber: 0,
        queueSizeBefore: pendingOperationsCount,
        queueSizeAfter: null,
        coalescedCount: 0,
        conflictType: durableState.conflictType,
        recoveryAction: null,
        errorClass: null,
        errorCode: null,
        offlineState:
          networkOnlineRef.current === true ? "online" : networkOnlineRef.current === false ? "offline" : "unknown",
        triggerSource,
      });

      if (!options?.force && !isForemanConflictAutoRecoverable(durableState.conflictType)) {
        await patchForemanDurableDraftRecoveryState({
          snapshot,
          syncStatus: "dirty_local",
          pendingOperationsCount: 0,
          queueDraftKey: null,
          requestIdKnown: Boolean(snapshot.requestId),
          attentionNeeded: true,
          lastTriggerSource: triggerSource,
        });
        await refreshBoundarySyncState(snapshot);
        return { requestId: ridStr(snapshot.requestId) || ridStr(requestId) || null, submitted: null };
      }

      await enqueueForemanMutation({
        draftKey: getDraftQueueKey(snapshot),
        requestId: ridStr(snapshot.requestId) || null,
        snapshotUpdatedAt: snapshot.updatedAt,
        mutationKind,
        localBeforeCount: options?.localBeforeCount ?? null,
        localAfterCount: options?.localAfterCount ?? snapshot.items.length,
        submitRequested: options?.submit === true || snapshot.submitRequested,
        triggerSource,
      });

      await markForemanSnapshotQueued(snapshot, {
        queueDraftKey: getDraftQueueKey(snapshot),
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
        if (result.failed) {
          throw new Error(result.errorMessage || "Foreman mutation queue flush failed.");
        }
        if (options?.submit === true && submitOwnerId && result.submitted) {
          lastSubmittedOwnerIdRef.current = submitOwnerId;
        }
        return {
          requestId: result.requestId,
          submitted: result.submitted,
        };
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
    if (!snapshot || !hasForemanLocalDraftContent(snapshot)) return;
    await pushRecoveryTelemetry({
      recoveryAction: "retry_now",
      result: "progress",
    });
    try {
      await syncLocalDraftNow({
        context: "retryNow",
        overrideSnapshot: snapshot,
        mutationKind: snapshot.submitRequested ? "submit" : "background_sync",
        localBeforeCount: snapshot.items.length,
        localAfterCount: snapshot.items.length,
        force: true,
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
    const targetRequestId = ridStr(currentSnapshot?.requestId) || ridStr(requestId);
    if (!targetRequestId) return;

    await pushRecoveryTelemetry({
      recoveryAction: "rehydrate_server",
      result: "progress",
    });

    const remote = await loadForemanRemoteDraftSnapshot({
      requestId: targetRequestId,
      localSnapshot: currentSnapshot,
    });

    await clearForemanMutationsForDraft(FOREMAN_LOCAL_ONLY_REQUEST_ID);
    await clearForemanMutationsForDraft(targetRequestId);

    if (remote.snapshot) {
      setActiveDraftOwnerId(remote.snapshot.ownerId, { resetSubmitted: true });
      applyLocalDraftSnapshotToBoundary(remote.snapshot, {
        restoreHeader: true,
        clearWhenEmpty: true,
        restoreSource: "remoteDraft",
        restoreIdentity: `manual:remote:${targetRequestId}`,
      });
      await patchForemanDurableDraftRecoveryState({
        snapshot: remote.snapshot,
        syncStatus: "synced",
        pendingOperationsCount: 0,
        queueDraftKey: null,
        requestIdKnown: true,
        attentionNeeded: false,
        conflictType: "none",
        lastConflictAt: null,
        recoverableLocalSnapshot: currentSnapshot,
        lastError: null,
        lastErrorAt: null,
        lastErrorStage: null,
        retryCount: 0,
        repeatedFailureStageCount: 0,
        lastTriggerSource: "manual_retry",
        lastSyncAt: Date.now(),
      });
      await refreshBoundarySyncState(remote.snapshot);
    } else {
      setActiveDraftOwnerId(undefined, { resetSubmitted: true });
      persistLocalDraftSnapshot(null);
      setRequestIdState(targetRequestId);
      setRequestDetails(remote.details);
      if (remote.details) {
        syncHeaderFromDetails(remote.details);
      }
      await loadItems(targetRequestId, { forceRemote: true });
      await patchForemanDurableDraftRecoveryState({
        snapshot: null,
        syncStatus: "idle",
        pendingOperationsCount: 0,
        queueDraftKey: null,
        requestIdKnown: Boolean(targetRequestId),
        attentionNeeded: false,
        conflictType: "none",
        lastConflictAt: null,
        recoverableLocalSnapshot: currentSnapshot,
        lastError: null,
        lastErrorAt: null,
        lastErrorStage: null,
        retryCount: 0,
        repeatedFailureStageCount: 0,
        lastTriggerSource: "manual_retry",
        lastSyncAt: Date.now(),
      });
      await refreshBoundarySyncState(null);
    }

    await pushRecoveryTelemetry({
      recoveryAction: "rehydrate_server",
      result: "success",
      conflictType: "none",
    });
  }, [
    applyLocalDraftSnapshotToBoundary,
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
    const recoverableSnapshot = durableState.recoverableLocalSnapshot;
    if (!recoverableSnapshot || !hasForemanLocalDraftContent(recoverableSnapshot)) return;
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
      restoreIdentity: `manual:restore:${recoverableSnapshot.updatedAt}`,
    });
    await patchForemanDurableDraftRecoveryState({
      snapshot: recoverableSnapshot,
      syncStatus: "dirty_local",
      pendingOperationsCount: 0,
      queueDraftKey: null,
      requestIdKnown: Boolean(recoverableSnapshot.requestId),
      attentionNeeded: true,
      conflictType: recoverableSnapshot.requestId ? "stale_local_snapshot" : "retryable_sync_failure",
      lastConflictAt: Date.now(),
      recoverableLocalSnapshot: null,
      lastTriggerSource: "manual_retry",
    });
    await refreshBoundarySyncState(recoverableSnapshot);
    await pushRecoveryTelemetry({
      recoveryAction: "restore_local",
      result: "success",
      conflictType: recoverableSnapshot.requestId ? "stale_local_snapshot" : "retryable_sync_failure",
    });
  }, [applyLocalDraftSnapshotToBoundary, pushRecoveryTelemetry, refreshBoundarySyncState, setActiveDraftOwnerId]);

  const discardLocalDraftNow = useCallback(async () => {
    const durableState = getForemanDurableDraftState();
    const currentSnapshot = localDraftSnapshotRef.current ?? durableState.snapshot;
    const targetRequestId = ridStr(currentSnapshot?.requestId) || ridStr(requestId);

    await pushRecoveryTelemetry({
      recoveryAction: "discard_local",
      result: "progress",
      conflictType: durableState.conflictType,
    });

    await clearForemanMutationsForDraft(FOREMAN_LOCAL_ONLY_REQUEST_ID);
    if (targetRequestId) {
      await clearForemanMutationsForDraft(targetRequestId);
    }

    if (targetRequestId) {
      const remote = await loadForemanRemoteDraftSnapshot({
        requestId: targetRequestId,
        localSnapshot: currentSnapshot,
      });
      if (remote.snapshot) {
        setActiveDraftOwnerId(remote.snapshot.ownerId, { resetSubmitted: true });
        applyLocalDraftSnapshotToBoundary(remote.snapshot, {
          restoreHeader: true,
          clearWhenEmpty: true,
          restoreSource: "remoteDraft",
          restoreIdentity: `manual:discard:${targetRequestId}`,
        });
        await patchForemanDurableDraftRecoveryState({
          snapshot: remote.snapshot,
          syncStatus: "synced",
          pendingOperationsCount: 0,
          queueDraftKey: null,
          requestIdKnown: true,
          attentionNeeded: false,
          conflictType: "none",
          lastConflictAt: null,
          recoverableLocalSnapshot: null,
          lastError: null,
          lastErrorAt: null,
          lastErrorStage: null,
          retryCount: 0,
          repeatedFailureStageCount: 0,
          lastTriggerSource: "manual_retry",
          lastSyncAt: Date.now(),
        });
        await refreshBoundarySyncState(remote.snapshot);
      } else {
        setActiveDraftOwnerId(undefined, { resetSubmitted: true });
        persistLocalDraftSnapshot(null);
        setRequestIdState(targetRequestId);
        setRequestDetails(remote.details);
        if (remote.details) {
          syncHeaderFromDetails(remote.details);
        }
        await loadItems(targetRequestId, { forceRemote: true });
        await patchForemanDurableDraftRecoveryState({
          snapshot: null,
          syncStatus: "idle",
          pendingOperationsCount: 0,
          queueDraftKey: null,
          requestIdKnown: Boolean(targetRequestId),
          attentionNeeded: false,
          conflictType: "none",
          lastConflictAt: null,
          recoverableLocalSnapshot: null,
          lastError: null,
          lastErrorAt: null,
          lastErrorStage: null,
          retryCount: 0,
          repeatedFailureStageCount: 0,
          lastTriggerSource: "manual_retry",
          lastSyncAt: Date.now(),
        });
        await refreshBoundarySyncState(null);
      }
    } else {
      await clearDraftCache();
      resetDraftState();
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
        lastTriggerSource: "manual_retry",
        lastSyncAt: durableState.lastSyncAt,
      });
    }

    await pushRecoveryTelemetry({
      recoveryAction: "discard_local",
      result: "success",
      conflictType: "none",
    });
  }, [
    applyLocalDraftSnapshotToBoundary,
    clearDraftCache,
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
    await pushRecoveryTelemetry({
      recoveryAction: "clear_failed_queue",
      result: "progress",
    });
    await clearForemanMutationQueueTail({
      snapshot,
      draftKey: getDraftQueueKey(snapshot),
      triggerSource: "manual_retry",
    });
    await refreshBoundarySyncState(snapshot);
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

  const setForeman = useCallback(
    (value: string) => {
      setForemanState(value);
      setRequestDetails((prev) => patchForemanRequestDetailsName(prev, value));
    },
    [setForemanState],
  );

  const setComment = useCallback(
    (value: string) => {
      setCommentState(value);
      setRequestDetails((prev) => patchForemanRequestDetailsComment(prev, value));
    },
    [setCommentState],
  );

  const applyObjectTypeSelection = useCallback(
    (code: string, objectName?: string | null) => {
      setObjectTypeState(code);
      setLevelState("");
      setSystemState("");
      setZoneState("");
      setRequestDetails((prev) => patchForemanRequestDetailsObjectType(prev, code, objectName));
    },
    [setLevelState, setObjectTypeState, setSystemState, setZoneState],
  );

  const applyLevelSelection = useCallback(
    (code: string, levelName?: string | null) => {
      setLevelState(code);
      setRequestDetails((prev) => patchForemanRequestDetailsLevel(prev, code, levelName));
    },
    [setLevelState],
  );

  const applySystemSelection = useCallback(
    (code: string, systemName?: string | null) => {
      setSystemState(code);
      setRequestDetails((prev) => patchForemanRequestDetailsSystem(prev, code, systemName));
    },
    [setSystemState],
  );

  const applyZoneSelection = useCallback(
    (code: string, zoneName?: string | null) => {
      setZoneState(code);
      setRequestDetails((prev) => patchForemanRequestDetailsZone(prev, code, zoneName));
    },
    [setZoneState],
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
      loadItems,
      persistLocalDraftSnapshot,
      refreshBoundarySyncState,
      setActiveDraftOwnerId,
      setRequestIdState,
      syncHeaderFromDetails,
    ],
  );

  const bootstrapDraft = useCallback(
    async (options?: { cancelled?: () => boolean }) => {
      await bootstrapForemanDraftBoundary({
        cancelled: options?.cancelled,
        patchBoundaryState,
        clearDraftCache,
        applyLocalDraftSnapshotToBoundary,
        setSkipRemoteHydrationRequestId: (rid) => {
          skipRemoteHydrationRequestIdRef.current = rid;
        },
        setRequestIdState,
        setRequestDetails,
        syncHeaderFromDetails,
        setDisplayNoByReq,
        loadItems,
      });
      if (options?.cancelled?.()) return;

      const durableSnapshot = getForemanDurableDraftState().snapshot;
      if (durableSnapshot?.ownerId) {
        setActiveDraftOwnerId(durableSnapshot.ownerId, { resetSubmitted: true });
      } else if (!ridStr(requestId)) {
        setActiveDraftOwnerId(undefined, { resetSubmitted: true });
      }
      if (durableSnapshot && hasForemanLocalDraftContent(durableSnapshot)) {
        await pushForemanDurableDraftTelemetry({
          stage: "hydrate",
          result: "success",
          draftKey: getDraftQueueKey(durableSnapshot),
          requestId: ridStr(durableSnapshot.requestId) || null,
          localOnlyDraftKey: getDraftQueueKey(durableSnapshot) === FOREMAN_LOCAL_ONLY_REQUEST_ID,
          attemptNumber: 0,
          queueSizeBefore: null,
          queueSizeAfter: null,
          coalescedCount: 0,
          conflictType: getForemanDurableDraftState().conflictType,
          recoveryAction: null,
          errorClass: null,
          errorCode: null,
          offlineState:
            networkOnlineRef.current === true ? "online" : networkOnlineRef.current === false ? "offline" : "unknown",
          triggerSource: "bootstrap_complete",
        });
        const pendingOperationsCount = await getForemanPendingMutationCountForDraftKeys(
          getDraftQueueKeys(durableSnapshot),
        );
        if (
          pendingOperationsCount === 0 &&
          isForemanConflictAutoRecoverable(getForemanDurableDraftState().conflictType) &&
          (durableSnapshot.submitRequested ||
            hasForemanLocalDraftPendingSync(durableSnapshot) ||
            getForemanDurableDraftState().syncStatus === "dirty_local" ||
            getForemanDurableDraftState().syncStatus === "retry_wait" ||
            getForemanDurableDraftState().syncStatus === "failed_terminal")
        ) {
          await enqueueForemanMutation({
            draftKey: getDraftQueueKey(durableSnapshot),
            requestId: ridStr(durableSnapshot.requestId) || null,
            snapshotUpdatedAt: durableSnapshot.updatedAt,
            mutationKind: durableSnapshot.submitRequested ? "submit" : "background_sync",
            localBeforeCount: durableSnapshot.items.length,
            localAfterCount: durableSnapshot.items.length,
            submitRequested: durableSnapshot.submitRequested,
            triggerSource: "bootstrap_complete",
          });
          await markForemanSnapshotQueued(durableSnapshot, {
            queueDraftKey: getDraftQueueKey(durableSnapshot),
            triggerSource: "bootstrap_complete",
          });
        }
      }

      await refreshBoundarySyncState(durableSnapshot ?? null);
    },
    [
      applyLocalDraftSnapshotToBoundary,
      clearDraftCache,
      getDraftQueueKey,
      getDraftQueueKeys,
      loadItems,
      patchBoundaryState,
      refreshBoundarySyncState,
      setDisplayNoByReq,
      setActiveDraftOwnerId,
      setRequestIdState,
      syncHeaderFromDetails,
    ],
  );

  const restoreDraftIfNeeded = useCallback(
    async (context: string) => {
      if (!boundaryState.bootstrapReady) return;
      if (!isForemanConflictAutoRecoverable(getForemanDurableDraftState().conflictType)) return;
      await syncLocalDraftNow({ context });
    },
    [boundaryState.bootstrapReady, syncLocalDraftNow],
  );

  const detailsRequestId = ridStr(requestDetails?.id);
  const skipRemoteDraftEffects = useMemo(() => {
    if (!boundaryState.bootstrapReady) return true;
    const snapshot = getActiveLocalDraftSnapshot();
    if (!snapshot) return false;
    if (ridStr(snapshot.requestId)) return ridStr(snapshot.requestId) === ridStr(requestId);
    return !ridStr(requestId);
  }, [boundaryState.bootstrapReady, getActiveLocalDraftSnapshot, requestId]);

  useEffect(() => {
    if (!boundaryState.bootstrapReady) return;
    if (!isDraftActive) return;
    if (
      requestDetails &&
      detailsRequestId &&
      ridStr(requestId) &&
      detailsRequestId !== ridStr(requestId) &&
      !hasLocalDraft
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

  useEffect(() => {
    if (!boundaryState.bootstrapReady) return;
    if (boundaryState.conflictType !== "server_terminal_conflict") return;

    const snapshot = localDraftSnapshotRef.current ?? getForemanDurableDraftState().snapshot;
    const terminalRequestId = ridStr(snapshot?.requestId) || ridStr(requestId);
    if (!snapshot || !hasForemanLocalDraftContent(snapshot) || !terminalRequestId) return;

    void clearTerminalLocalDraft({
      snapshot,
      requestId: terminalRequestId,
      remoteStatus: requestDetails?.status ?? null,
    }).catch(() => undefined);
  }, [
    boundaryState.bootstrapReady,
    boundaryState.conflictType,
    clearTerminalLocalDraft,
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
    if (!isScreenFocused || wasFocused || !boundaryState.bootstrapReady) return;
    void restoreDraftIfNeeded("focus").catch(() => undefined);
  }, [boundaryState.bootstrapReady, isScreenFocused, restoreDraftIfNeeded]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;
      if (!boundaryState.bootstrapReady) return;
      if (prevState !== "active" && nextState === "active") {
        void restoreDraftIfNeeded("app_active").catch(() => undefined);
      }
    });
    return () => sub.remove();
  }, [boundaryState.bootstrapReady, restoreDraftIfNeeded]);

  useEffect(() => {
    let disposed = false;
    void ensurePlatformNetworkService()
      .then((snapshot) => {
        if (disposed) return;
        networkOnlineRef.current = selectPlatformOnlineFlag(snapshot);
        setNetworkOnline(networkOnlineRef.current);
      })
      .catch(() => undefined);
    const unsubscribe = subscribePlatformNetwork((state, previous) => {
      if (disposed) return;
      const nextOnline = selectPlatformOnlineFlag(state);
      const wasOnline = selectPlatformOnlineFlag(previous);
      networkOnlineRef.current = nextOnline;
      setNetworkOnline(nextOnline);
      if (!boundaryState.bootstrapReady) return;
      if (wasOnline === false && nextOnline === true) {
        void restoreDraftIfNeeded("network_back").catch(() => undefined);
      }
    });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [boundaryState.bootstrapReady, restoreDraftIfNeeded]);

  useEffect(() => {
    if (!boundaryState.bootstrapReady || !requestId || skipRemoteDraftEffects) return;
    const rid = ridStr(requestId);
    if (!rid) return;
    if (skipRemoteHydrationRequestIdRef.current === rid) return;
    void preloadDisplayNo(rid);
    void loadDetails(rid);
  }, [boundaryState.bootstrapReady, loadDetails, preloadDisplayNo, requestId, skipRemoteDraftEffects]);

  useEffect(() => {
    if (!boundaryState.bootstrapReady || skipRemoteDraftEffects) return;
    const rid = ridStr(requestId);
    if (rid && skipRemoteHydrationRequestIdRef.current === rid) {
      skipRemoteHydrationRequestIdRef.current = null;
      return;
    }
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
