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
import { runForemanQueueRecovery } from "../../../lib/offline/offlineQueueRecovery";
import {
  classifyForemanSyncError,
  isForemanConflictAutoRecoverable,
  normalizeForemanSyncTriggerSource,
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
  buildForemanDraftRecoveryBoundaryPatch,
  resolveForemanTerminalRecoveryCleanupDecision,
} from "../foreman.draftRecovery.model";
import {
  type ForemanDraftRestoreTriggerPlan,
  getForemanBootstrapReconciliationRequestId,
  planForemanAppActiveRestoreTrigger,
  planForemanBootstrapReenqueueCommand,
  planForemanFocusRestoreTrigger,
  planForemanNetworkBackRestoreTrigger,
  resolveForemanBootstrapCompletionStartPlan,
  resolveForemanBootstrapReconciliationPlan,
  resolveForemanBootstrapStaleDurableResetExecutionPlan,
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
    recordCatchDiscipline({
      screen: "foreman",
      surface: "draft_boundary",
      event: params.event,
      kind: params.kind ?? (classified.retryable ? "degraded_fallback" : "soft_failure"),
      error: params.error,
      sourceKind: params.sourceKind ?? "draft_boundary:auto_recover",
      errorStage: params.stage,
      trigger: normalizeForemanSyncTriggerSource(params.context, null, false),
      extra: {
        conflictType: classified.conflictType,
        context: params.context ?? null,
        errorCode: classified.errorCode,
        queueDraftKey: getDraftQueueKey(snapshot),
        requestId: requestIdForError,
        retryable: classified.retryable,
        ...params.extra,
      },
    });
    return classified;
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
          foreman,
          comment: "",
          objectType,
          level,
          system,
          zone,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO(P1): review deps
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
      await clearTerminalLocalDraft({
        snapshot: remotePlan.currentSnapshot,
        requestId: remotePlan.requestId,
        remoteStatus: remotePlan.remoteStatus,
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

    if (remotePlan.action === "apply_remote_snapshot") {
      setActiveDraftOwnerId(remotePlan.remoteSnapshot.ownerId, { resetSubmitted: true });
      applyLocalDraftSnapshotToBoundary(remotePlan.remoteSnapshot, {
        restoreHeader: true,
        clearWhenEmpty: true,
        restoreSource: "remoteDraft",
        restoreIdentity: remotePlan.restoreIdentity,
      });
      await patchForemanDurableDraftRecoveryState(remotePlan.durablePatch);
      await refreshBoundarySyncState(remotePlan.remoteSnapshot);
    } else {
      setActiveDraftOwnerId(undefined, { resetSubmitted: true });
      persistLocalDraftSnapshot(null);
      setRequestIdState(remotePlan.requestId);
      setRequestDetails(remotePlan.details);
      if (remotePlan.details) {
        syncHeaderFromDetails(remotePlan.details);
      }
      await loadItems(remotePlan.requestId, { forceRemote: true });
      await patchForemanDurableDraftRecoveryState(remotePlan.durablePatch);
      await refreshBoundarySyncState(null);
    }

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
        await clearTerminalLocalDraft({
          snapshot: remotePlan.currentSnapshot,
          requestId: remotePlan.requestId,
          remoteStatus: remotePlan.remoteStatus,
        });
        await pushRecoveryTelemetry({
          recoveryAction: "discard_local",
          result: "success",
          conflictType: "none",
        });
        return;
      }
      if (remotePlan.action === "apply_remote_snapshot") {
        setActiveDraftOwnerId(remotePlan.remoteSnapshot.ownerId, { resetSubmitted: true });
        applyLocalDraftSnapshotToBoundary(remotePlan.remoteSnapshot, {
          restoreHeader: true,
          clearWhenEmpty: true,
          restoreSource: "remoteDraft",
          restoreIdentity: remotePlan.restoreIdentity,
        });
        await patchForemanDurableDraftRecoveryState(remotePlan.durablePatch);
        await refreshBoundarySyncState(remotePlan.remoteSnapshot);
      } else {
        setActiveDraftOwnerId(undefined, { resetSubmitted: true });
        persistLocalDraftSnapshot(null);
        setRequestIdState(remotePlan.requestId);
        setRequestDetails(remotePlan.details);
        if (remotePlan.details) {
          syncHeaderFromDetails(remotePlan.details);
        }
        await loadItems(remotePlan.requestId, { forceRemote: true });
        await patchForemanDurableDraftRecoveryState(remotePlan.durablePatch);
        await refreshBoundarySyncState(null);
      }
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

      if (await clearTerminalRecoveryOwnerIfNeeded("bootstrap_complete", options)) return;

      // ── O4: Queue recovery — classify + reset inflight before any flush ───
      // Runs before snapshot enqueue and flush. Non-blocking: errors are logged
      // internally, result is advisory only. Never removes items.
      await runForemanQueueRecovery({ triggerSource: "bootstrap_complete" });

      const durableSnapshot = getForemanDurableDraftState().snapshot;

      // ── P6.3a: Reset stale sync metadata when bootstrap cleared the snapshot ──
      // When resolveForemanDraftBootstrap detects a terminal remote status, it
      // calls clearDraftCache which clears the snapshot. However, the durable
      // store sync metadata (syncStatus, attentionNeeded, conflictType, etc.)
      // is NOT reset by clearDraftCache. Without this explicit reset, the
      // global PlatformOfflineStatusHost banner keeps reading stale values
      // from the durable store, showing phantom "Нужна проверка" banners.
      const staleDurableState = getForemanDurableDraftState();
      const completionStartPlan = resolveForemanBootstrapCompletionStartPlan({
        durableSnapshot,
        durableState: staleDurableState,
        requestId,
      });
      if (completionStartPlan.action === "reset_stale_durable") {
        const staleResetExecutionPlan = resolveForemanBootstrapStaleDurableResetExecutionPlan({
          resetPlan: completionStartPlan,
          durableState: staleDurableState,
        });
        if (__DEV__) {
          console.info("[foreman.bootstrap] resetting stale durable sync metadata", staleResetExecutionPlan.devTelemetry);
        }
        await patchForemanDurableDraftRecoveryState(staleResetExecutionPlan.durablePatch);
        // P6.3c: Also clear React-level draft state (items, requestDetails,
        // requestId, header). Without this, isDraftActive stays true because
        // requestDetails still holds the old "draft" status, and the persist
        // effect at line ~1497 rebuilds & re-persists the stale snapshot.
        setActiveDraftOwnerId(staleResetExecutionPlan.activeOwnerReset.nextOwnerId, {
          resetSubmitted: staleResetExecutionPlan.activeOwnerReset.resetSubmitted,
        });
        if (staleResetExecutionPlan.resetDraftState) resetDraftState();
        if (staleResetExecutionPlan.clearLocalSnapshotRef) {
          localDraftSnapshotRef.current = staleResetExecutionPlan.nextLocalSnapshot;
        }
        setLocalDraftSnapshot(staleResetExecutionPlan.nextLocalSnapshot);
        await refreshBoundarySyncState(staleResetExecutionPlan.refreshBoundarySnapshot);
        return;
      }

      const ownerPlan = completionStartPlan.ownerPlan;
      if (ownerPlan.action === "set_owner") {
        setActiveDraftOwnerId(ownerPlan.ownerId, { resetSubmitted: true });
      } else if (ownerPlan.action === "reset_owner") {
        setActiveDraftOwnerId(undefined, { resetSubmitted: true });
      }
      if (durableSnapshot && completionStartPlan.hasDurableSnapshotContent) {
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

        // ── P6.3e: Reconciliation MUST run BEFORE re-enqueue ──────────
        // Previous order: enqueue first, reconcile second. This caused
        // the mutation worker to pick up the enqueued mutation concurrently,
        // fail against the terminal server state, and write recovery state
        // back into the durable store — overwriting the reconciliation cleanup.
        // Now we check remote status FIRST then decide whether to enqueue.
        const reconciledRequestId = getForemanBootstrapReconciliationRequestId(durableSnapshot);
        if (reconciledRequestId) {
          try {
            if (options?.cancelled?.()) return;
            const remoteDetails = await fetchRequestDetails(reconciledRequestId);
            const remoteStatus = remoteDetails?.status ?? null;
            const reconciliationPlan = resolveForemanBootstrapReconciliationPlan({
              snapshot: durableSnapshot,
              remoteStatus,
              remoteStatusIsTerminal: Boolean(remoteStatus && !isDraftLikeStatus(remoteStatus)),
            });
            if (reconciliationPlan.action === "clear_terminal") {
              if (__DEV__) {
                console.info("[foreman.bootstrap-reconciliation] clearing stale draft (pre-enqueue)", {
                  requestId: reconciliationPlan.requestId,
                  remoteStatus: reconciliationPlan.remoteStatus,
                  localSnapshotItems: durableSnapshot.items.length,
                  submitRequested: durableSnapshot.submitRequested,
                });
              }
              await clearTerminalLocalDraft({
                snapshot: durableSnapshot,
                requestId: reconciliationPlan.requestId,
                remoteStatus: reconciliationPlan.remoteStatus,
              });
              await refreshBoundarySyncState(null);
              return;
            }
          } catch {
            // Network failure during reconciliation is non-fatal.
            if (__DEV__) {
              console.info("[foreman.bootstrap-reconciliation] skipped (network error)", {
                requestId: reconciledRequestId,
              });
            }
          }
        }

        // Only re-enqueue if reconciliation didn't clear the draft
        const reenqueueState = getForemanDurableDraftState();
        const reenqueuePlan = planForemanBootstrapReenqueueCommand({
          snapshot: durableSnapshot,
          pendingOperationsCount,
          conflictAutoRecoverable: isForemanConflictAutoRecoverable(reenqueueState.conflictType),
          snapshotHasPendingSync: hasForemanLocalDraftPendingSync(durableSnapshot),
          syncStatus: reenqueueState.syncStatus,
          draftKey: getDraftQueueKey(durableSnapshot),
        });
        if (reenqueuePlan.action === "reenqueue") {
          await enqueueForemanMutation(reenqueuePlan.enqueue);
          await markForemanSnapshotQueued(durableSnapshot, {
            queueDraftKey: reenqueuePlan.markQueued.queueDraftKey,
            triggerSource: reenqueuePlan.markQueued.triggerSource,
          });
        }
      }

      await refreshBoundarySyncState(durableSnapshot ?? null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- TODO(P1): review deps
    [
      applyLocalDraftSnapshotToBoundary,
      clearDraftCache,
      clearTerminalLocalDraft,
      clearTerminalRecoveryOwnerIfNeeded,
      getDraftQueueKey,
      getDraftQueueKeys,
      loadItems,
      patchBoundaryState,
      refreshBoundarySyncState,
      resetDraftState,
      setDisplayNoByReq,
      setActiveDraftOwnerId,
      setRequestIdState,
      syncHeaderFromDetails,
    ],
  );

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
