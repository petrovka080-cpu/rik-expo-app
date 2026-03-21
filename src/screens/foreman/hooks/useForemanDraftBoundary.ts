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
  clearCachedDraftRequestId,
  clearLocalDraftId,
  fetchRequestDetails,
  getLocalDraftId,
  updateRequestMeta,
  type ReqItemRow,
  type RequestDetails,
} from "../../../lib/catalog_api";
import {
  formatQtyInput,
  isDraftLikeStatus,
  ridStr,
  toErrorText,
} from "../foreman.helpers";
import {
  FOREMAN_LOCAL_ONLY_REQUEST_ID,
  appendRowsToForemanLocalDraft,
  areForemanLocalDraftSnapshotsEqual,
  buildForemanLocalDraftSnapshot,
  clearForemanLocalDraftSnapshot,
  discardForemanLocalDraft,
  hasForemanLocalDraftContent,
  hasForemanLocalDraftPendingSync,
  loadForemanLocalDraftSnapshot,
  markForemanLocalDraftSubmitRequested,
  removeForemanLocalDraftItem,
  saveForemanLocalDraftSnapshot,
  snapshotToReqItems,
  syncForemanLocalDraftSnapshot,
  updateForemanLocalDraftItemQty,
  type ForemanDraftAppendInput,
  type ForemanLocalDraftSnapshot,
} from "../foreman.localDraft";
import type { RequestDraftMeta } from "../foreman.types";
import { useForemanHeader } from "./useForemanHeader";
import { useForemanItemsState } from "./useForemanItemsState";

type UseForemanDraftBoundaryProps = {
  isScreenFocused: boolean;
  preloadDisplayNo: (rid?: string | number | null) => Promise<void>;
  setDisplayNoByReq: Dispatch<SetStateAction<Record<string, string>>>;
};

type ForemanDraftRestoreSource = "none" | "snapshot" | "remoteDraft";
type ForemanDraftMutationKind =
  | "catalog_add"
  | "calc_add"
  | "ai_local_add"
  | "qty_update"
  | "row_remove"
  | "whole_cancel"
  | "submit"
  | "background_sync";

type ForemanDraftBoundaryState = {
  bootstrapReady: boolean;
  restorePhase: "bootstrapping" | "ready";
  restoreSource: ForemanDraftRestoreSource;
  lastRestoredSnapshotId: string | null;
  draftDirty: boolean;
  syncNeeded: boolean;
};

const INITIAL_BOUNDARY_STATE: ForemanDraftBoundaryState = {
  bootstrapReady: false,
  restorePhase: "bootstrapping",
  restoreSource: "none",
  lastRestoredSnapshotId: null,
  draftDirty: false,
  syncNeeded: false,
};

const buildSnapshotRestoreId = (snapshot: ForemanLocalDraftSnapshot | null | undefined): string | null => {
  if (!snapshot) return null;
  const requestKey = ridStr(snapshot.requestId) || FOREMAN_LOCAL_ONLY_REQUEST_ID;
  return `snapshot:${requestKey}:${snapshot.updatedAt}`;
};

const countSnapshotLines = (snapshot: ForemanLocalDraftSnapshot | null | undefined): number => {
  if (!snapshot) return 0;
  return snapshot.items.filter((item) => Number.isFinite(item.qty) && item.qty > 0).length;
};

const logDraftSyncTelemetry = (payload: Record<string, unknown>) => {
  if (!__DEV__) return;
  console.info("[foreman.draft.sync]", payload);
};

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
    ensureAndGetId,
  } = useForemanItemsState(formatQtyInput);

  const [requestDetails, setRequestDetails] = useState<RequestDetails | null>(null);
  const [localDraftSnapshot, setLocalDraftSnapshot] = useState<ForemanLocalDraftSnapshot | null>(null);
  const [boundaryState, setBoundaryState] = useState<ForemanDraftBoundaryState>(INITIAL_BOUNDARY_STATE);

  const localDraftSnapshotRef = useRef<ForemanLocalDraftSnapshot | null>(null);
  const draftSyncInFlightRef = useRef<Promise<void> | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const wasScreenFocusedRef = useRef(false);
  const skipRemoteHydrationRequestIdRef = useRef<string | null>(null);

  useEffect(() => {
    localDraftSnapshotRef.current = localDraftSnapshot;
  }, [localDraftSnapshot]);

  const patchBoundaryState = useCallback((patch: Partial<ForemanDraftBoundaryState>) => {
    setBoundaryState((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateDraftMarkers = useCallback(
    (snapshot: ForemanLocalDraftSnapshot | null) => {
      patchBoundaryState({
        draftDirty: Boolean(snapshot && hasForemanLocalDraftContent(snapshot)),
        syncNeeded: hasForemanLocalDraftPendingSync(snapshot),
      });
    },
    [patchBoundaryState],
  );

  const persistLocalDraftSnapshot = useCallback(
    (snapshot: ForemanLocalDraftSnapshot | null) => {
      if (
        areForemanLocalDraftSnapshotsEqual(localDraftSnapshotRef.current, snapshot, {
          ignoreUpdatedAt: true,
        })
      ) {
        updateDraftMarkers(snapshot);
        return;
      }

      setLocalDraftSnapshot(snapshot);
      updateDraftMarkers(snapshot);
      void (snapshot && hasForemanLocalDraftContent(snapshot)
        ? saveForemanLocalDraftSnapshot(snapshot)
        : clearForemanLocalDraftSnapshot());
    },
    [updateDraftMarkers],
  );

  const getActiveLocalDraftSnapshot = useCallback(
    (targetRequestId?: string | null) => {
      const snapshot = localDraftSnapshotRef.current;
      if (!snapshot || !hasForemanLocalDraftContent(snapshot)) return null;

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
      persistLocalDraftSnapshot(snapshot);

      if (!snapshot) {
        if (options?.clearWhenEmpty) {
          hydrateLocalDraft({ requestId: "", items: [], qtyDrafts: {} });
        }
        if (options?.restoreSource) {
          patchBoundaryState({
            bootstrapReady: true,
            restorePhase: "ready",
            restoreSource: options.restoreSource,
            lastRestoredSnapshotId: options.restoreIdentity ?? null,
          });
        }
        return;
      }

      hydrateLocalDraft({
        requestId: snapshot.requestId,
        items: snapshotToReqItems(snapshot),
        qtyDrafts: snapshot.qtyDrafts,
      });

      if (snapshot.requestId && snapshot.displayNo) {
        setDisplayNoByReq((prev) => ({ ...prev, [snapshot.requestId]: snapshot.displayNo! }));
      }

      setRequestDetails((prev) => ({
        ...(prev ?? { id: snapshot.requestId || FOREMAN_LOCAL_ONLY_REQUEST_ID }),
        id: snapshot.requestId || FOREMAN_LOCAL_ONLY_REQUEST_ID,
        status: snapshot.status ?? prev?.status ?? "draft",
        display_no: snapshot.displayNo ?? prev?.display_no ?? null,
        foreman_name: snapshot.header.foreman || prev?.foreman_name || null,
        comment: snapshot.header.comment || prev?.comment || null,
        object_type_code: snapshot.header.objectType || prev?.object_type_code || null,
        level_code: snapshot.header.level || prev?.level_code || null,
        system_code: snapshot.header.system || prev?.system_code || null,
        zone_code: snapshot.header.zone || prev?.zone_code || null,
      }));

      if (options?.restoreHeader) {
        setForemanState(snapshot.header.foreman);
        setCommentState(snapshot.header.comment);
        setObjectTypeState(snapshot.header.objectType);
        setLevelState(snapshot.header.level);
        setSystemState(snapshot.header.system);
        setZoneState(snapshot.header.zone);
      }

      if (options?.restoreSource) {
        patchBoundaryState({
          bootstrapReady: true,
          restorePhase: "ready",
          restoreSource: options.restoreSource,
          lastRestoredSnapshotId: options.restoreIdentity ?? buildSnapshotRestoreId(snapshot),
        });
      }
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
    (): RequestDraftMeta => ({
      foreman_name: foreman.trim() || null,
      comment: comment.trim() || null,
      object_type_code: objectType || null,
      level_code: level || null,
      system_code: system || null,
      zone_code: zone || null,
    }),
    [comment, foreman, level, objectType, system, zone],
  );

  const syncRequestHeaderMeta = useCallback(
    async (rid: string, context: string) => {
      await updateRequestMeta(rid, buildRequestDraftMeta()).catch((error) => {
        if (__DEV__) {
          console.warn(`[Foreman] updateMeta err in ${context}:`, error);
        }
      });
    },
    [buildRequestDraftMeta],
  );

  const loadDetails = useCallback(
    async (rid?: string | number | null) => {
      const key = rid != null ? ridStr(rid) : requestId;
      if (!key || key === FOREMAN_LOCAL_ONLY_REQUEST_ID) {
        setRequestDetails(null);
        return null;
      }
      try {
        const details = await fetchRequestDetails(key);
        if (!details) {
          setRequestDetails(null);
          return null;
        }
        setRequestDetails(details);
        if (details.display_no) {
          setDisplayNoByReq((prev) => ({ ...prev, [key]: String(details.display_no) }));
        }
        syncHeaderFromDetails(details);
        return details;
      } catch (error) {
        if (__DEV__) {
          console.warn("[Foreman] loadDetails:", toErrorText(error, ""));
        }
        return null;
      }
    },
    [requestId, setDisplayNoByReq, syncHeaderFromDetails],
  );

  const clearDraftCache = useCallback(() => {
    clearLocalDraftId();
    clearCachedDraftRequestId();
    persistLocalDraftSnapshot(null);
    patchBoundaryState({
      restoreSource: "none",
      lastRestoredSnapshotId: null,
    });
  }, [patchBoundaryState, persistLocalDraftSnapshot]);

  const resetDraftState = useCallback(() => {
    setRequestIdState("");
    setRequestDetails(null);
    setItems([]);
    setQtyDrafts({});
    setQtyBusyMap({});
    resetHeader();
  }, [resetHeader, setItems, setQtyBusyMap, setQtyDrafts, setRequestIdState]);

  const appendLocalDraftRows = useCallback(
    (rows: ForemanDraftAppendInput[]) => {
      const next = appendRowsToForemanLocalDraft(buildCurrentLocalDraftSnapshot(), rows);
      applyLocalDraftSnapshotToBoundary(next);
      return next;
    },
    [applyLocalDraftSnapshotToBoundary, buildCurrentLocalDraftSnapshot],
  );

  const updateLocalDraftQty = useCallback(
    (item: ReqItemRow, qty: number) => {
      const next = updateForemanLocalDraftItemQty(buildCurrentLocalDraftSnapshot(), item.id, qty);
      applyLocalDraftSnapshotToBoundary(next);
      return next;
    },
    [applyLocalDraftSnapshotToBoundary, buildCurrentLocalDraftSnapshot],
  );

  const removeLocalDraftRow = useCallback(
    (item: ReqItemRow) => {
      const next = removeForemanLocalDraftItem(buildCurrentLocalDraftSnapshot(), item.id);
      applyLocalDraftSnapshotToBoundary(next);
      return next;
    },
    [applyLocalDraftSnapshotToBoundary, buildCurrentLocalDraftSnapshot],
  );

  const syncLocalDraftNow = useCallback(
    async (options?: {
      submit?: boolean;
      context?: string;
      overrideSnapshot?: ForemanLocalDraftSnapshot | null;
      mutationKind?: ForemanDraftMutationKind;
      localBeforeCount?: number | null;
      localAfterCount?: number | null;
    }) => {
      if (draftSyncInFlightRef.current) {
        await draftSyncInFlightRef.current;
      }

      const run = (async () => {
        if (!isDraftActive) {
          return { requestId: ridStr(requestId) || null, submitted: null };
        }

        let snapshot = options?.overrideSnapshot ?? buildCurrentLocalDraftSnapshot();
        if (options?.submit) {
          snapshot = markForemanLocalDraftSubmitRequested(snapshot);
        }

        const mutationKind = options?.mutationKind ?? (options?.submit ? "submit" : "background_sync");
        const localBeforeCount = options?.localBeforeCount ?? null;
        const localAfterCount = options?.localAfterCount ?? countSnapshotLines(snapshot);
        const syncPayloadLineCount = countSnapshotLines(snapshot);
        const activeRequestId = ridStr(snapshot?.requestId) || ridStr(requestId) || null;

        if (!snapshot || !hasForemanLocalDraftContent(snapshot)) {
          logDraftSyncTelemetry({
            phase: "skip",
            mutationKind,
            context: options?.context ?? null,
            requestId: activeRequestId,
            beforeLineCount: localBeforeCount,
            afterLocalSnapshotLineCount: localAfterCount,
            syncPayloadLineCount,
            reason: "empty_snapshot",
          });
          return { requestId: ridStr(requestId) || null, submitted: null };
        }

        logDraftSyncTelemetry({
          phase: "request",
          mutationKind,
          context: options?.context ?? null,
          requestId: activeRequestId,
          beforeLineCount: localBeforeCount,
          afterLocalSnapshotLineCount: localAfterCount,
          syncPayloadLineCount,
          submitRequested: options?.submit === true,
        });

        if (
          syncPayloadLineCount === 0 &&
          (mutationKind === "catalog_add" || mutationKind === "calc_add" || mutationKind === "ai_local_add")
        ) {
          console.warn("[foreman.draft.sync] zero-line payload for add mutation", {
            mutationKind,
            context: options?.context ?? null,
            requestId: activeRequestId,
          });
        }

        persistLocalDraftSnapshot(snapshot);

        try {
          const result = await syncForemanLocalDraftSnapshot({
            snapshot,
            headerMeta: buildRequestDraftMeta(),
          });

          if (result.snapshot) {
            applyLocalDraftSnapshotToBoundary(result.snapshot);
            logDraftSyncTelemetry({
              phase: "result",
              mutationKind,
              context: options?.context ?? null,
              requestId:
                ridStr(result.snapshot.requestId) || ridStr(snapshot.requestId) || ridStr(requestId) || null,
              beforeLineCount: localBeforeCount,
              afterLocalSnapshotLineCount: localAfterCount,
              syncPayloadLineCount,
              syncResultLineCount: result.rows.length,
              sourcePath: result.branchMeta?.sourcePath ?? "legacy_fallback",
              submitted: result.submitted != null,
            });
            return {
              requestId: ridStr(result.snapshot.requestId) || ridStr(snapshot.requestId) || ridStr(requestId) || null,
              submitted: result.submitted ?? null,
            };
          }

          persistLocalDraftSnapshot(null);
          logDraftSyncTelemetry({
            phase: "result",
            mutationKind,
            context: options?.context ?? null,
            requestId: ridStr(snapshot.requestId) || ridStr(requestId) || null,
            beforeLineCount: localBeforeCount,
            afterLocalSnapshotLineCount: localAfterCount,
            syncPayloadLineCount,
            syncResultLineCount: result.rows.length,
            sourcePath: result.branchMeta?.sourcePath ?? "legacy_fallback",
            submitted: result.submitted != null,
          });
          return {
            requestId: ridStr(snapshot.requestId) || ridStr(requestId) || null,
            submitted: result.submitted ?? null,
          };
        } catch (error) {
          console.warn("[foreman.draft.sync] sync failed", {
            mutationKind,
            context: options?.context ?? null,
            requestId: activeRequestId,
            beforeLineCount: localBeforeCount,
            afterLocalSnapshotLineCount: localAfterCount,
            syncPayloadLineCount,
            error: toErrorText(error, options?.context || "syncLocalDraftNow"),
          });
          persistLocalDraftSnapshot({
            ...snapshot,
            lastError: toErrorText(error, options?.context || "syncLocalDraftNow"),
            updatedAt: new Date().toISOString(),
          });
          throw error;
        } finally {
          draftSyncInFlightRef.current = null;
        }
      })();

      draftSyncInFlightRef.current = run.then(
        () => undefined,
        () => undefined,
      );

      return await run;
    },
    [
      applyLocalDraftSnapshotToBoundary,
      buildCurrentLocalDraftSnapshot,
      buildRequestDraftMeta,
      isDraftActive,
      persistLocalDraftSnapshot,
      requestId,
    ],
  );

  const discardWholeDraft = useCallback(async () => {
    const currentSnapshot = buildCurrentLocalDraftSnapshot();
    const beforeLineCount = countSnapshotLines(currentSnapshot);
    const discardSnapshot = discardForemanLocalDraft(currentSnapshot);

    if (!discardSnapshot) {
      clearDraftCache();
      resetDraftState();
      return;
    }

    applyLocalDraftSnapshotToBoundary(discardSnapshot);

    try {
      await syncLocalDraftNow({
        context: "discardWholeDraft",
        overrideSnapshot: discardSnapshot,
        mutationKind: "whole_cancel",
        localBeforeCount: beforeLineCount,
        localAfterCount: 0,
      });
      clearDraftCache();
      resetDraftState();
    } catch (error) {
      applyLocalDraftSnapshotToBoundary(currentSnapshot, { clearWhenEmpty: true });
      throw error;
    }
  }, [
    applyLocalDraftSnapshotToBoundary,
    buildCurrentLocalDraftSnapshot,
    clearDraftCache,
    resetDraftState,
    syncLocalDraftNow,
  ]);

  const ensureRequestId = useCallback(async () => {
    const snapshot = buildCurrentLocalDraftSnapshot();
    if (snapshot && hasForemanLocalDraftContent(snapshot)) {
      const synced = await syncLocalDraftNow({ context: "ensureRequestId" });
      const syncedRequestId = ridStr(synced?.requestId) || ridStr(snapshot.requestId) || ridStr(requestId);
      if (syncedRequestId) return syncedRequestId;
    }

    return await ensureAndGetId(buildRequestDraftMeta(), (id, no) =>
      setDisplayNoByReq((prev) => ({ ...prev, [id]: no })),
    );
  }, [
    buildCurrentLocalDraftSnapshot,
    buildRequestDraftMeta,
    ensureAndGetId,
    requestId,
    setDisplayNoByReq,
    syncLocalDraftNow,
  ]);

  const applySubmittedRequestState = useCallback(
    (rid: string, submitted: any) => {
      if (submitted?.display_no) {
        setDisplayNoByReq((prev) => ({ ...prev, [rid]: String(submitted.display_no) }));
      }
      setRequestIdState(rid);
      setRequestDetails((prev) =>
        prev
          ? {
              ...prev,
              id: rid,
              status: submitted?.status ?? "pending",
              display_no: submitted?.display_no ?? prev.display_no ?? null,
              foreman_name: submitted?.foreman_name ?? prev.foreman_name ?? foreman,
              comment: submitted?.comment ?? prev.comment ?? comment,
            }
          : {
              id: rid,
              status: submitted?.status ?? "pending",
              display_no: submitted?.display_no ?? null,
              foreman_name: submitted?.foreman_name ?? foreman ?? null,
              comment: submitted?.comment ?? comment ?? null,
              object_type_code: objectType || null,
              level_code: level || null,
              system_code: system || null,
              zone_code: zone || null,
            },
      );
    },
    [comment, foreman, level, objectType, setDisplayNoByReq, setRequestIdState, system, zone],
  );

  const setForeman = useCallback(
    (value: string) => {
      setForemanState(value);
      setRequestDetails((prev) => (prev ? { ...prev, foreman_name: value || null } : prev));
    },
    [setForemanState],
  );

  const setComment = useCallback(
    (value: string) => {
      setCommentState(value);
      setRequestDetails((prev) => (prev ? { ...prev, comment: value || null } : prev));
    },
    [setCommentState],
  );

  const applyObjectTypeSelection = useCallback(
    (code: string, objectName?: string | null) => {
      setObjectTypeState(code);
      setLevelState("");
      setSystemState("");
      setZoneState("");
      setRequestDetails((prev) =>
        prev
          ? {
              ...prev,
              object_type_code: code || null,
              object_name_ru: objectName ?? prev.object_name_ru ?? null,
              level_code: null,
              level_name_ru: null,
              system_code: null,
              system_name_ru: null,
              zone_code: null,
              zone_name_ru: null,
            }
          : prev,
      );
    },
    [setLevelState, setObjectTypeState, setSystemState, setZoneState],
  );

  const applyLevelSelection = useCallback(
    (code: string, levelName?: string | null) => {
      setLevelState(code);
      setRequestDetails((prev) =>
        prev
          ? {
              ...prev,
              level_code: code || null,
              level_name_ru: levelName ?? null,
            }
          : prev,
      );
    },
    [setLevelState],
  );

  const applySystemSelection = useCallback(
    (code: string, systemName?: string | null) => {
      setSystemState(code);
      setRequestDetails((prev) =>
        prev
          ? {
              ...prev,
              system_code: code || null,
              system_name_ru: systemName ?? prev.system_name_ru ?? null,
            }
          : prev,
      );
    },
    [setSystemState],
  );

  const applyZoneSelection = useCallback(
    (code: string, zoneName?: string | null) => {
      setZoneState(code);
      setRequestDetails((prev) =>
        prev
          ? {
              ...prev,
              zone_code: code || null,
              zone_name_ru: zoneName ?? null,
            }
          : prev,
      );
    },
    [setZoneState],
  );

  const openRequestById = useCallback(
    (targetId: string | number | null | undefined) => {
      const id = ridStr(targetId);
      if (!id) return;
      setRequestDetails(null);
      setRequestIdState(id);
      void loadItems(id, { forceRemote: true });
    },
    [loadItems, setRequestIdState],
  );

  const bootstrapDraft = useCallback(
    async (options?: { cancelled?: () => boolean }) => {
      patchBoundaryState({
        bootstrapReady: false,
        restorePhase: "bootstrapping",
      });

      const snapshot = await loadForemanLocalDraftSnapshot();
      if (options?.cancelled?.()) return;

      if (snapshot && hasForemanLocalDraftContent(snapshot)) {
        applyLocalDraftSnapshotToBoundary(snapshot, {
          restoreHeader: true,
          restoreSource: "snapshot",
          restoreIdentity: buildSnapshotRestoreId(snapshot),
        });
        patchBoundaryState({
          bootstrapReady: true,
          restorePhase: "ready",
        });
        return;
      }

      const localId = ridStr(getLocalDraftId());
      if (localId) {
        try {
          const details = await fetchRequestDetails(localId);
          if (options?.cancelled?.()) return;

          if (details && isDraftLikeStatus(details.status)) {
            skipRemoteHydrationRequestIdRef.current = localId;
            setRequestIdState(localId);
            setRequestDetails(details);
            syncHeaderFromDetails(details);
            if (details.display_no) {
              setDisplayNoByReq((prev) => ({ ...prev, [localId]: String(details.display_no) }));
            }
            await loadItems(localId, { forceRemote: true });
            if (options?.cancelled?.()) return;

            patchBoundaryState({
              bootstrapReady: true,
              restorePhase: "ready",
              restoreSource: "remoteDraft",
              lastRestoredSnapshotId: `remote:${localId}`,
            });
            return;
          }

          clearDraftCache();
        } catch {
          clearDraftCache();
        }
      }

      if (options?.cancelled?.()) return;

      patchBoundaryState({
        bootstrapReady: true,
        restorePhase: "ready",
        restoreSource: "none",
        lastRestoredSnapshotId: null,
      });
    },
    [
      applyLocalDraftSnapshotToBoundary,
      clearDraftCache,
      loadItems,
      patchBoundaryState,
      setDisplayNoByReq,
      setRequestIdState,
      syncHeaderFromDetails,
    ],
  );

  const restoreDraftIfNeeded = useCallback(
    async (context: string) => {
      if (!boundaryState.bootstrapReady) return;
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
        void restoreDraftIfNeeded("appActive").catch(() => undefined);
      }
    });
    return () => sub.remove();
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
    items,
    qtyDrafts,
    setQtyDrafts,
    qtyBusyMap,
    setRowBusy,
    requestDetails,
    canEditRequestItem,
    hasLocalDraft,
    isDraftActive,
    localDraftBootstrapReady: boundaryState.bootstrapReady,
    draftDirty: boundaryState.draftDirty,
    syncNeeded: boundaryState.syncNeeded,
    restoreSource: boundaryState.restoreSource,
    lastRestoredSnapshotId: boundaryState.lastRestoredSnapshotId,
    clearDraftCache,
    resetDraftState,
    syncLocalDraftNow,
    ensureRequestId,
    syncRequestHeaderMeta,
    appendLocalDraftRows,
    updateLocalDraftQty,
    removeLocalDraftRow,
    discardWholeDraft,
    applySubmittedRequestState,
    openRequestById,
    applyObjectTypeSelection,
    applyLevelSelection,
    applySystemSelection,
    applyZoneSelection,
  };
}
