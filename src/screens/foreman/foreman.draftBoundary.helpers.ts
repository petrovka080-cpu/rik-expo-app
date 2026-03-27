import type { Dispatch, SetStateAction } from "react";

import {
  clearCachedDraftRequestId,
  clearLocalDraftId,
  fetchRequestDetails,
  getLocalDraftId,
  updateRequestMeta,
  type ReqItemRow,
  type RequestDetails,
} from "../../lib/catalog_api";
import type { RequestRecord } from "../../lib/api/types";
import type {
  ForemanDraftConflictType,
  ForemanDraftRecoveryAction,
  ForemanDraftSyncStage,
  ForemanDraftSyncStatus,
} from "../../lib/offline/foremanSyncRuntime";
import { ridStr, toErrorText } from "./foreman.helpers";
import {
  appendRowsToForemanLocalDraft,
  buildForemanDraftRequestDetails,
  buildForemanDraftRestoreId,
  clearForemanLocalDraftSnapshot,
  countForemanDraftSnapshotLines,
  discardForemanLocalDraft,
  hasForemanLocalDraftContent,
  hasForemanLocalDraftPendingSync,
  markForemanLocalDraftSubmitRequested,
  removeForemanLocalDraftItem,
  resolveForemanDraftBootstrap,
  saveForemanLocalDraftSnapshot,
  snapshotToReqItems,
  syncForemanLocalDraftSnapshot,
  updateForemanLocalDraftItemQty,
  type ForemanDraftAppendInput,
  type ForemanLocalDraftSnapshot,
} from "./foreman.localDraft";
import type { RequestDraftMeta } from "./foreman.types";

export type ForemanDraftRestoreSource = "none" | "snapshot" | "remoteDraft";

export type ForemanDraftMutationKind =
  | "catalog_add"
  | "calc_add"
  | "ai_local_add"
  | "qty_update"
  | "row_remove"
  | "whole_cancel"
  | "submit"
  | "background_sync";

export type ForemanDraftBoundaryState = {
  bootstrapReady: boolean;
  restorePhase: "bootstrapping" | "ready";
  restoreSource: ForemanDraftRestoreSource;
  lastRestoredSnapshotId: string | null;
  draftDirty: boolean;
  syncNeeded: boolean;
  syncStatus: ForemanDraftSyncStatus;
  lastSyncAt: number | null;
  lastErrorAt: number | null;
  lastErrorStage: ForemanDraftSyncStage | null;
  conflictType: ForemanDraftConflictType;
  retryCount: number;
  pendingOperationsCount: number;
  queueDraftKey: string | null;
  requestIdKnown: boolean;
  attentionNeeded: boolean;
  availableRecoveryActions: ForemanDraftRecoveryAction[];
};

export const INITIAL_BOUNDARY_STATE: ForemanDraftBoundaryState = {
  bootstrapReady: false,
  restorePhase: "bootstrapping",
  restoreSource: "none",
  lastRestoredSnapshotId: null,
  draftDirty: false,
  syncNeeded: false,
  syncStatus: "idle",
  lastSyncAt: null,
  lastErrorAt: null,
  lastErrorStage: null,
  conflictType: "none",
  retryCount: 0,
  pendingOperationsCount: 0,
  queueDraftKey: null,
  requestIdKnown: false,
  attentionNeeded: false,
  availableRecoveryActions: [],
};

export type ForemanDraftHeaderState = {
  foreman: string;
  comment: string;
  objectType: string;
  level: string;
  system: string;
  zone: string;
};

type DraftBoundaryPatchState = (patch: Partial<ForemanDraftBoundaryState>) => void;

type SetDisplayNoByReq = Dispatch<SetStateAction<Record<string, string>>>;
type SetRequestDetails = Dispatch<SetStateAction<RequestDetails | null>>;

type SetHeaderState = {
  setForeman: (value: string) => void;
  setComment: (value: string) => void;
  setObjectType: (value: string) => void;
  setLevel: (value: string) => void;
  setSystem: (value: string) => void;
  setZone: (value: string) => void;
};

export const logDraftSyncTelemetry = (payload: Record<string, unknown>) => {
  if (!__DEV__) return;
  console.info("[foreman.draft.sync]", payload);
};

export const buildForemanRequestDraftMeta = (
  header: ForemanDraftHeaderState,
): RequestDraftMeta => ({
  foreman_name: header.foreman.trim() || null,
  comment: header.comment.trim() || null,
  object_type_code: header.objectType || null,
  level_code: header.level || null,
  system_code: header.system || null,
  zone_code: header.zone || null,
});

export const persistForemanLocalDraftSnapshot = async (
  snapshot: ForemanLocalDraftSnapshot | null,
): Promise<void> => {
  if (snapshot && hasForemanLocalDraftContent(snapshot)) {
    await saveForemanLocalDraftSnapshot(snapshot);
    return;
  }
  await clearForemanLocalDraftSnapshot();
};

export const buildSubmittedForemanRequestDetails = (params: {
  requestId: string;
  submitted: RequestRecord | null;
  previous: RequestDetails | null;
  header: ForemanDraftHeaderState;
}): RequestDetails => {
  const { header, previous, requestId, submitted } = params;
  return previous
    ? {
        ...previous,
        id: requestId,
        status: submitted?.status ?? "pending",
        display_no: submitted?.display_no ?? previous.display_no ?? null,
        foreman_name: submitted?.foreman_name ?? previous.foreman_name ?? header.foreman,
        comment: submitted?.comment ?? previous.comment ?? header.comment,
      }
    : {
        id: requestId,
        status: submitted?.status ?? "pending",
        display_no: submitted?.display_no ?? null,
        foreman_name: submitted?.foreman_name ?? header.foreman ?? null,
        comment: submitted?.comment ?? header.comment ?? null,
        object_type_code: header.objectType || null,
        level_code: header.level || null,
        system_code: header.system || null,
        zone_code: header.zone || null,
      };
};

export const patchForemanRequestDetailsName = (
  previous: RequestDetails | null,
  value: string,
): RequestDetails | null => (previous ? { ...previous, foreman_name: value || null } : previous);

export const patchForemanRequestDetailsComment = (
  previous: RequestDetails | null,
  value: string,
): RequestDetails | null => (previous ? { ...previous, comment: value || null } : previous);

export const patchForemanRequestDetailsObjectType = (
  previous: RequestDetails | null,
  code: string,
  objectName?: string | null,
): RequestDetails | null =>
  previous
    ? {
        ...previous,
        object_type_code: code || null,
        object_name_ru: objectName ?? previous.object_name_ru ?? null,
        level_code: null,
        level_name_ru: null,
        system_code: null,
        system_name_ru: null,
        zone_code: null,
        zone_name_ru: null,
      }
    : previous;

export const patchForemanRequestDetailsLevel = (
  previous: RequestDetails | null,
  code: string,
  levelName?: string | null,
): RequestDetails | null =>
  previous
    ? {
        ...previous,
        level_code: code || null,
        level_name_ru: levelName ?? null,
      }
    : previous;

export const patchForemanRequestDetailsSystem = (
  previous: RequestDetails | null,
  code: string,
  systemName?: string | null,
): RequestDetails | null =>
  previous
    ? {
        ...previous,
        system_code: code || null,
        system_name_ru: systemName ?? previous.system_name_ru ?? null,
      }
    : previous;

export const patchForemanRequestDetailsZone = (
  previous: RequestDetails | null,
  code: string,
  zoneName?: string | null,
): RequestDetails | null =>
  previous
    ? {
        ...previous,
        zone_code: code || null,
        zone_name_ru: zoneName ?? null,
      }
    : previous;

export async function syncForemanRequestHeaderMeta(params: {
  requestId: string;
  header: ForemanDraftHeaderState;
  context: string;
}): Promise<void> {
  await updateRequestMeta(params.requestId, buildForemanRequestDraftMeta(params.header)).catch((error) => {
    if (__DEV__) {
      console.warn(`[Foreman] updateMeta err in ${params.context}:`, error);
    }
  });
}

export async function loadForemanRequestDetails(params: {
  requestId?: string | number | null;
  activeRequestId: string;
  setRequestDetails: SetRequestDetails;
  setDisplayNoByReq: SetDisplayNoByReq;
  syncHeaderFromDetails: (details: RequestDetails) => void;
  shouldApply?: () => boolean;
}): Promise<RequestDetails | null> {
  const key = params.requestId != null ? ridStr(params.requestId) : params.activeRequestId;
  if (!key || key === "__foreman_local_draft__") {
    if (params.shouldApply?.() ?? true) {
      params.setRequestDetails(null);
    }
    return null;
  }
  try {
    const details = await fetchRequestDetails(key);
    if (!details) {
      if (params.shouldApply?.() ?? true) {
        params.setRequestDetails(null);
      }
      return null;
    }
    if (!(params.shouldApply?.() ?? true)) {
      return details;
    }
    params.setRequestDetails(details);
    if (details.display_no) {
      params.setDisplayNoByReq((prev) => ({ ...prev, [key]: String(details.display_no) }));
    }
    params.syncHeaderFromDetails(details);
    return details;
  } catch (error) {
    if (__DEV__) {
      console.warn("[Foreman] loadDetails:", toErrorText(error, ""));
    }
    return null;
  }
}

export const clearForemanDraftCacheState = async (
  persistLocalDraftSnapshot: (snapshot: ForemanLocalDraftSnapshot | null) => void,
  patchBoundaryState: DraftBoundaryPatchState,
) => {
  clearLocalDraftId();
  clearCachedDraftRequestId();
  persistLocalDraftSnapshot(null);
  patchBoundaryState({
    restoreSource: "none",
    lastRestoredSnapshotId: null,
  });
};

export const updateForemanDraftMarkers = (
  snapshot: ForemanLocalDraftSnapshot | null,
  patchBoundaryState: DraftBoundaryPatchState,
) => {
  patchBoundaryState({
    draftDirty: Boolean(snapshot && hasForemanLocalDraftContent(snapshot)),
    syncNeeded: hasForemanLocalDraftPendingSync(snapshot),
  });
};

export const applyForemanLocalDraftSnapshotToBoundary = (params: {
  snapshot: ForemanLocalDraftSnapshot | null;
  options?: {
    restoreHeader?: boolean;
    clearWhenEmpty?: boolean;
    restoreSource?: ForemanDraftRestoreSource;
    restoreIdentity?: string | null;
  };
  persistLocalDraftSnapshot: (snapshot: ForemanLocalDraftSnapshot | null) => void;
  hydrateLocalDraft: (payload: {
    requestId: string;
    items: ReqItemRow[];
    qtyDrafts: Record<string, string>;
  }) => void;
  setDisplayNoByReq: SetDisplayNoByReq;
  setRequestDetails: SetRequestDetails;
  setHeaderState: SetHeaderState;
  patchBoundaryState: DraftBoundaryPatchState;
}) => {
  const { options, snapshot } = params;
  params.persistLocalDraftSnapshot(snapshot);

  if (!snapshot) {
    if (options?.clearWhenEmpty) {
      params.hydrateLocalDraft({ requestId: "", items: [], qtyDrafts: {} });
      params.setRequestDetails(null);
    }
    if (options?.restoreSource) {
      params.patchBoundaryState({
        bootstrapReady: true,
        restorePhase: "ready",
        restoreSource: options.restoreSource,
        lastRestoredSnapshotId: options.restoreIdentity ?? null,
      });
    }
    return;
  }

  params.hydrateLocalDraft({
    requestId: snapshot.requestId,
    items: snapshotToReqItems(snapshot),
    qtyDrafts: snapshot.qtyDrafts,
  });

  if (snapshot.requestId && snapshot.displayNo) {
    params.setDisplayNoByReq((prev) => ({ ...prev, [snapshot.requestId]: snapshot.displayNo! }));
  }

  params.setRequestDetails((prev) => buildForemanDraftRequestDetails(snapshot, prev));

  if (options?.restoreHeader) {
    params.setHeaderState.setForeman(snapshot.header.foreman);
    params.setHeaderState.setComment(snapshot.header.comment);
    params.setHeaderState.setObjectType(snapshot.header.objectType);
    params.setHeaderState.setLevel(snapshot.header.level);
    params.setHeaderState.setSystem(snapshot.header.system);
    params.setHeaderState.setZone(snapshot.header.zone);
  }

  if (options?.restoreSource) {
    params.patchBoundaryState({
      bootstrapReady: true,
      restorePhase: "ready",
      restoreSource: options.restoreSource,
      lastRestoredSnapshotId: options.restoreIdentity ?? buildForemanDraftRestoreId(snapshot),
    });
  }
};

export async function runForemanDraftSyncCycle(params: {
  requestId: string;
  isDraftActive: boolean;
  buildCurrentLocalDraftSnapshot: () => ForemanLocalDraftSnapshot | null;
  persistLocalDraftSnapshot: (snapshot: ForemanLocalDraftSnapshot | null) => void;
  applyLocalDraftSnapshotToBoundary: (
    snapshot: ForemanLocalDraftSnapshot | null,
    options?: {
      restoreHeader?: boolean;
      clearWhenEmpty?: boolean;
      restoreSource?: ForemanDraftRestoreSource;
      restoreIdentity?: string | null;
    },
  ) => void;
  buildRequestDraftMeta: () => RequestDraftMeta;
  options?: {
    submit?: boolean;
    context?: string;
    overrideSnapshot?: ForemanLocalDraftSnapshot | null;
    mutationKind?: ForemanDraftMutationKind;
    localBeforeCount?: number | null;
    localAfterCount?: number | null;
  };
}): Promise<{ requestId: string | null; submitted: RequestRecord | null }> {
  if (!params.isDraftActive) {
    return { requestId: ridStr(params.requestId) || null, submitted: null };
  }

  let snapshot = params.options?.overrideSnapshot ?? params.buildCurrentLocalDraftSnapshot();
  if (params.options?.submit) {
    snapshot = markForemanLocalDraftSubmitRequested(snapshot);
  }

  const mutationKind =
    params.options?.mutationKind ?? (params.options?.submit ? "submit" : "background_sync");
  const localBeforeCount = params.options?.localBeforeCount ?? null;
  const localAfterCount = params.options?.localAfterCount ?? countForemanDraftSnapshotLines(snapshot);
  const syncPayloadLineCount = countForemanDraftSnapshotLines(snapshot);
  const activeRequestId = ridStr(snapshot?.requestId) || ridStr(params.requestId) || null;

  if (!snapshot || !hasForemanLocalDraftContent(snapshot)) {
    logDraftSyncTelemetry({
      phase: "skip",
      mutationKind,
      context: params.options?.context ?? null,
      requestId: activeRequestId,
      beforeLineCount: localBeforeCount,
      afterLocalSnapshotLineCount: localAfterCount,
      syncPayloadLineCount,
      reason: "empty_snapshot",
    });
    return { requestId: ridStr(params.requestId) || null, submitted: null };
  }

  logDraftSyncTelemetry({
    phase: "request",
    mutationKind,
    context: params.options?.context ?? null,
    requestId: activeRequestId,
    beforeLineCount: localBeforeCount,
    afterLocalSnapshotLineCount: localAfterCount,
    syncPayloadLineCount,
    submitRequested: params.options?.submit === true,
  });

  if (
    syncPayloadLineCount === 0 &&
    (mutationKind === "catalog_add" || mutationKind === "calc_add" || mutationKind === "ai_local_add")
  ) {
    console.warn("[foreman.draft.sync] zero-line payload for add mutation", {
      mutationKind,
      context: params.options?.context ?? null,
      requestId: activeRequestId,
    });
  }

  params.persistLocalDraftSnapshot(snapshot);

  try {
    const result = await syncForemanLocalDraftSnapshot({
      snapshot,
      headerMeta: params.buildRequestDraftMeta(),
      mutationKind,
      localBeforeCount,
      localAfterCount,
    });

    if (result.snapshot) {
      params.applyLocalDraftSnapshotToBoundary(result.snapshot);
      logDraftSyncTelemetry({
        phase: "result",
        mutationKind,
        context: params.options?.context ?? null,
        requestId:
          ridStr(result.snapshot.requestId) || ridStr(snapshot.requestId) || ridStr(params.requestId) || null,
        beforeLineCount: localBeforeCount,
        afterLocalSnapshotLineCount: localAfterCount,
        syncPayloadLineCount,
        syncResultLineCount: result.rows.length,
        sourcePath: result.branchMeta?.sourcePath ?? "rpc_v2",
        submitted: result.submitted != null,
      });
      return {
        requestId:
          ridStr(result.snapshot.requestId) || ridStr(snapshot.requestId) || ridStr(params.requestId) || null,
        submitted: (result.submitted as RequestRecord | null) ?? null,
      };
    }

    params.persistLocalDraftSnapshot(null);
    logDraftSyncTelemetry({
      phase: "result",
      mutationKind,
      context: params.options?.context ?? null,
      requestId: ridStr(snapshot.requestId) || ridStr(params.requestId) || null,
      beforeLineCount: localBeforeCount,
      afterLocalSnapshotLineCount: localAfterCount,
      syncPayloadLineCount,
      syncResultLineCount: result.rows.length,
      sourcePath: result.branchMeta?.sourcePath ?? "rpc_v2",
      submitted: result.submitted != null,
    });
    return {
      requestId: ridStr(snapshot.requestId) || ridStr(params.requestId) || null,
      submitted: (result.submitted as RequestRecord | null) ?? null,
    };
  } catch (error) {
    console.warn("[foreman.draft.sync] sync failed", {
      mutationKind,
      context: params.options?.context ?? null,
      requestId: activeRequestId,
      beforeLineCount: localBeforeCount,
      afterLocalSnapshotLineCount: localAfterCount,
      syncPayloadLineCount,
      error: toErrorText(error, params.options?.context || "syncLocalDraftNow"),
    });
    params.persistLocalDraftSnapshot({
      ...snapshot,
      lastError: toErrorText(error, params.options?.context || "syncLocalDraftNow"),
      updatedAt: new Date().toISOString(),
    });
    throw error;
  }
}

export const appendForemanLocalDraftRows = (
  buildCurrentLocalDraftSnapshot: () => ForemanLocalDraftSnapshot | null,
  applyLocalDraftSnapshotToBoundary: (
    snapshot: ForemanLocalDraftSnapshot | null,
    options?: {
      restoreHeader?: boolean;
      clearWhenEmpty?: boolean;
      restoreSource?: ForemanDraftRestoreSource;
      restoreIdentity?: string | null;
    },
  ) => void,
  rows: ForemanDraftAppendInput[],
) => {
  const next = appendRowsToForemanLocalDraft(buildCurrentLocalDraftSnapshot(), rows);
  applyLocalDraftSnapshotToBoundary(next);
  return next;
};

export const updateForemanLocalDraftQtyInBoundary = (
  buildCurrentLocalDraftSnapshot: () => ForemanLocalDraftSnapshot | null,
  applyLocalDraftSnapshotToBoundary: (
    snapshot: ForemanLocalDraftSnapshot | null,
    options?: {
      restoreHeader?: boolean;
      clearWhenEmpty?: boolean;
      restoreSource?: ForemanDraftRestoreSource;
      restoreIdentity?: string | null;
    },
  ) => void,
  item: ReqItemRow,
  qty: number,
) => {
  const next = updateForemanLocalDraftItemQty(buildCurrentLocalDraftSnapshot(), item.id, qty);
  applyLocalDraftSnapshotToBoundary(next);
  return next;
};

export const removeForemanLocalDraftRowInBoundary = (
  buildCurrentLocalDraftSnapshot: () => ForemanLocalDraftSnapshot | null,
  applyLocalDraftSnapshotToBoundary: (
    snapshot: ForemanLocalDraftSnapshot | null,
    options?: {
      restoreHeader?: boolean;
      clearWhenEmpty?: boolean;
      restoreSource?: ForemanDraftRestoreSource;
      restoreIdentity?: string | null;
    },
  ) => void,
  item: ReqItemRow,
) => {
  const next = removeForemanLocalDraftItem(buildCurrentLocalDraftSnapshot(), item.id);
  applyLocalDraftSnapshotToBoundary(next);
  return next;
};

export async function discardWholeForemanDraftInBoundary(params: {
  buildCurrentLocalDraftSnapshot: () => ForemanLocalDraftSnapshot | null;
  applyLocalDraftSnapshotToBoundary: (
    snapshot: ForemanLocalDraftSnapshot | null,
    options?: {
      restoreHeader?: boolean;
      clearWhenEmpty?: boolean;
      restoreSource?: ForemanDraftRestoreSource;
      restoreIdentity?: string | null;
    },
  ) => void;
  syncLocalDraftNow: (options?: {
    submit?: boolean;
    context?: string;
    overrideSnapshot?: ForemanLocalDraftSnapshot | null;
    mutationKind?: ForemanDraftMutationKind;
    localBeforeCount?: number | null;
    localAfterCount?: number | null;
  }) => Promise<unknown>;
  clearDraftCache: () => void | Promise<void>;
  resetDraftState: () => void;
}) {
  const currentSnapshot = params.buildCurrentLocalDraftSnapshot();
  const beforeLineCount = countForemanDraftSnapshotLines(currentSnapshot);
  const discardSnapshot = discardForemanLocalDraft(currentSnapshot);

  if (!discardSnapshot) {
    await params.clearDraftCache();
    params.resetDraftState();
    return;
  }

  params.applyLocalDraftSnapshotToBoundary(discardSnapshot);

  try {
    await params.syncLocalDraftNow({
      context: "discardWholeDraft",
      overrideSnapshot: discardSnapshot,
      mutationKind: "whole_cancel",
      localBeforeCount: beforeLineCount,
      localAfterCount: 0,
    });
    await params.clearDraftCache();
    params.resetDraftState();
  } catch (error) {
    params.applyLocalDraftSnapshotToBoundary(currentSnapshot, { clearWhenEmpty: true });
    throw error;
  }
}

export async function ensureForemanDraftRequestId(params: {
  requestId: string;
  buildCurrentLocalDraftSnapshot: () => ForemanLocalDraftSnapshot | null;
  syncLocalDraftNow: (options?: {
    submit?: boolean;
    context?: string;
    overrideSnapshot?: ForemanLocalDraftSnapshot | null;
    mutationKind?: ForemanDraftMutationKind;
    localBeforeCount?: number | null;
    localAfterCount?: number | null;
  }) => Promise<{ requestId: string | null; submitted: RequestRecord | null }>;
  buildRequestDraftMeta: () => RequestDraftMeta;
  ensureAndGetId: (
    meta: RequestDraftMeta,
    onReady: (id: string, no: string) => void,
  ) => Promise<string>;
  setDisplayNoByReq: SetDisplayNoByReq;
}) {
  const snapshot = params.buildCurrentLocalDraftSnapshot();
  if (snapshot && hasForemanLocalDraftContent(snapshot)) {
    const synced = await params.syncLocalDraftNow({ context: "ensureRequestId" });
    const syncedRequestId = ridStr(synced?.requestId) || ridStr(snapshot.requestId) || ridStr(params.requestId);
    if (syncedRequestId) return syncedRequestId;
  }

  return await params.ensureAndGetId(params.buildRequestDraftMeta(), (id, no) =>
    params.setDisplayNoByReq((prev) => ({ ...prev, [id]: no })),
  );
}

export async function bootstrapForemanDraftBoundary(params: {
  cancelled?: () => boolean;
  patchBoundaryState: DraftBoundaryPatchState;
  clearDraftCache: (options?: {
    snapshot?: ForemanLocalDraftSnapshot | null;
    requestId?: string | null;
  }) => void | Promise<void>;
  applyLocalDraftSnapshotToBoundary: (
    snapshot: ForemanLocalDraftSnapshot | null,
    options?: {
      restoreHeader?: boolean;
      clearWhenEmpty?: boolean;
      restoreSource?: ForemanDraftRestoreSource;
      restoreIdentity?: string | null;
    },
  ) => void;
  setSkipRemoteHydrationRequestId: (requestId: string | null) => void;
  setRequestIdState: (requestId: string) => void;
  setRequestDetails: SetRequestDetails;
  syncHeaderFromDetails: (details: RequestDetails) => void;
  setDisplayNoByReq: SetDisplayNoByReq;
  loadItems: (requestId?: string, options?: { forceRemote?: boolean }) => Promise<unknown>;
}) {
  params.patchBoundaryState({
    bootstrapReady: false,
    restorePhase: "bootstrapping",
  });

  const resolution = await resolveForemanDraftBootstrap({
    localDraftId: ridStr(getLocalDraftId()),
    clearDraftCache: params.clearDraftCache,
    fetchDetails: async (requestId) => await fetchRequestDetails(requestId),
  });
  if (params.cancelled?.()) return;

  if (resolution.kind === "snapshot") {
    params.applyLocalDraftSnapshotToBoundary(resolution.snapshot, {
      restoreHeader: true,
      restoreSource: resolution.restoreSource,
      restoreIdentity: resolution.restoreIdentity,
    });
    params.patchBoundaryState({
      bootstrapReady: true,
      restorePhase: "ready",
    });
    return;
  }

  if (resolution.kind === "remoteDraft") {
    params.setSkipRemoteHydrationRequestId(resolution.requestId);
    params.setRequestIdState(resolution.requestId);
    params.setRequestDetails(resolution.details);
    params.syncHeaderFromDetails(resolution.details);
    if (resolution.details.display_no) {
      params.setDisplayNoByReq((prev) => ({
        ...prev,
        [resolution.requestId]: String(resolution.details.display_no),
      }));
    }
    await params.loadItems(resolution.requestId, { forceRemote: true });
    if (params.cancelled?.()) return;

    params.patchBoundaryState({
      bootstrapReady: true,
      restorePhase: "ready",
      restoreSource: resolution.restoreSource,
      lastRestoredSnapshotId: resolution.restoreIdentity,
    });
    return;
  }

  if (params.cancelled?.()) return;

  params.patchBoundaryState({
    bootstrapReady: true,
    restorePhase: "ready",
    restoreSource: "none",
    lastRestoredSnapshotId: null,
  });
}
