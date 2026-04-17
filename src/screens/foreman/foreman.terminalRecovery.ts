import type { ForemanDurableDraftRecord } from "./foreman.durableDraft.store";
import {
  FOREMAN_LOCAL_ONLY_REQUEST_ID,
  hasForemanLocalDraftContent,
  type ForemanLocalDraftSnapshot,
} from "./foreman.localDraft";
import { isDraftLikeStatus, ridStr } from "./foreman.helpers";

export type ForemanTerminalRecoverySource =
  | "active_snapshot"
  | "active_snapshot_display"
  | "durable_snapshot"
  | "durable_snapshot_display"
  | "recoverable_snapshot"
  | "recoverable_snapshot_display"
  | "active_request"
  | "queue_key";

export type ForemanTerminalRecoveryCandidate = {
  requestId: string;
  snapshot: ForemanLocalDraftSnapshot | null;
  source: ForemanTerminalRecoverySource;
};

export type ForemanTerminalCleanupDurablePatchPlan = {
  snapshot: null;
  syncStatus: "idle";
  pendingOperationsCount: 0;
  queueDraftKey: null;
  requestIdKnown: false;
  attentionNeeded: false;
  conflictType: "none";
  lastConflictAt: null;
  recoverableLocalSnapshot: null;
  lastError: null;
  lastErrorAt: null;
  lastErrorStage: null;
  retryCount: 0;
  repeatedFailureStageCount: 0;
  lastTriggerSource: "bootstrap_complete";
  lastSyncAt: "now";
};

export type ForemanTerminalCleanupDurablePatch = Omit<
  ForemanTerminalCleanupDurablePatchPlan,
  "lastSyncAt"
> & {
  lastSyncAt: number;
};

export type ForemanTerminalCleanupPlan = {
  snapshot: ForemanLocalDraftSnapshot | null;
  cleanupKeys: string[];
  cacheClear: {
    snapshot: ForemanLocalDraftSnapshot | null;
    requestId: string;
  };
  activeOwnerReset: {
    nextOwnerId: undefined;
    resetSubmitted: true;
  };
  resetDraftState: true;
  durablePatch: ForemanTerminalCleanupDurablePatchPlan;
  refreshBoundaryRequestId: null;
  devTelemetry: {
    draftId: string;
    requestId: string;
    remoteStatus: string | null;
    submitSuccess: false;
    postSubmitAction: "entered_empty_state";
    staleBannerVisibleAfterSubmit: false;
    activeDraftIdBefore: string;
    activeDraftIdAfter: null;
    freshDraftCreated: false;
    runtimeResult: "cleared_terminal_local_snapshot";
  };
};

const isRequestBoundKey = (value?: string | null) => {
  const key = ridStr(value);
  return Boolean(key && key !== FOREMAN_LOCAL_ONLY_REQUEST_ID);
};

export const isForemanTerminalRemoteStatus = (status?: string | null) =>
  Boolean(status && !isDraftLikeStatus(status));

export const hasForemanDurableRecoverySignal = (
  state: Pick<
    ForemanDurableDraftRecord,
    | "snapshot"
    | "syncStatus"
    | "lastError"
    | "lastErrorAt"
    | "lastErrorStage"
    | "conflictType"
    | "lastConflictAt"
    | "retryCount"
    | "repeatedFailureStageCount"
    | "pendingOperationsCount"
    | "queueDraftKey"
    | "requestIdKnown"
    | "attentionNeeded"
    | "availableRecoveryActions"
    | "recoverableLocalSnapshot"
  >,
) =>
  Boolean(
    (state.snapshot && hasForemanLocalDraftContent(state.snapshot)) ||
      (state.recoverableLocalSnapshot && hasForemanLocalDraftContent(state.recoverableLocalSnapshot)) ||
      state.syncStatus !== "idle" ||
      state.lastError ||
      state.lastErrorAt != null ||
      state.lastErrorStage != null ||
      state.conflictType !== "none" ||
      state.lastConflictAt != null ||
      state.retryCount > 0 ||
      state.repeatedFailureStageCount > 0 ||
      state.pendingOperationsCount > 0 ||
      isRequestBoundKey(state.queueDraftKey) ||
      state.requestIdKnown ||
      state.attentionNeeded ||
      state.availableRecoveryActions.length > 0,
  );

export const collectForemanTerminalRecoveryCandidates = (params: {
  activeSnapshot?: ForemanLocalDraftSnapshot | null;
  durableSnapshot?: ForemanLocalDraftSnapshot | null;
  recoverableSnapshot?: ForemanLocalDraftSnapshot | null;
  activeRequestId?: string | null;
  queueDraftKey?: string | null;
  hasRecoverySignal?: boolean;
}): ForemanTerminalRecoveryCandidate[] => {
  const seen = new Set<string>();
  const candidates: ForemanTerminalRecoveryCandidate[] = [];

  const add = (
    requestId: string | null | undefined,
    source: ForemanTerminalRecoverySource,
    snapshot: ForemanLocalDraftSnapshot | null,
  ) => {
    const key = ridStr(requestId);
    if (!isRequestBoundKey(key) || seen.has(key)) return;
    seen.add(key);
    candidates.push({ requestId: key, snapshot, source });
  };

  const addSnapshot = (
    snapshot: ForemanLocalDraftSnapshot | null | undefined,
    source: ForemanTerminalRecoverySource,
  ) => {
    if (!snapshot || !hasForemanLocalDraftContent(snapshot)) return;
    add(snapshot.requestId, source, snapshot);
    add(
      snapshot.displayNo,
      `${source}_display` as ForemanTerminalRecoverySource,
      snapshot,
    );
  };

  addSnapshot(params.activeSnapshot, "active_snapshot");
  addSnapshot(params.durableSnapshot, "durable_snapshot");
  addSnapshot(params.recoverableSnapshot, "recoverable_snapshot");

  if (params.hasRecoverySignal) {
    add(params.activeRequestId, "active_request", null);
    add(params.queueDraftKey, "queue_key", null);
  }

  return candidates;
};

export const collectForemanTerminalCleanupDraftKeys = (params: {
  requestId: string;
  snapshots?: (ForemanLocalDraftSnapshot | null | undefined)[];
  queueDraftKey?: string | null;
}) => {
  const keys = new Set<string>([FOREMAN_LOCAL_ONLY_REQUEST_ID]);
  const add = (value?: string | null) => {
    const key = ridStr(value);
    if (key) keys.add(key);
  };

  add(params.requestId);
  add(params.queueDraftKey);
  for (const snapshot of params.snapshots ?? []) {
    add(snapshot?.requestId);
    add(snapshot?.displayNo);
  }

  return Array.from(keys);
};

export const buildForemanTerminalCleanupDurablePatch = (
  plan: ForemanTerminalCleanupDurablePatchPlan,
  lastSyncAt: number,
): ForemanTerminalCleanupDurablePatch => ({
  ...plan,
  lastSyncAt,
});

export const resolveForemanTerminalCleanupPlan = (params: {
  requestId: string;
  remoteStatus?: string | null;
  optionSnapshot?: ForemanLocalDraftSnapshot | null;
  activeSnapshot?: ForemanLocalDraftSnapshot | null;
  durableSnapshot?: ForemanLocalDraftSnapshot | null;
  recoverableSnapshot?: ForemanLocalDraftSnapshot | null;
  queueDraftKey?: string | null;
}): ForemanTerminalCleanupPlan => {
  const snapshot =
    params.optionSnapshot ??
    params.activeSnapshot ??
    params.durableSnapshot ??
    params.recoverableSnapshot ??
    null;
  const cleanupKeys = collectForemanTerminalCleanupDraftKeys({
    requestId: params.requestId,
    snapshots: [
      snapshot,
      params.activeSnapshot,
      params.durableSnapshot,
      params.recoverableSnapshot,
    ],
    queueDraftKey: params.queueDraftKey,
  });
  const draftId = ridStr(snapshot?.requestId) || params.requestId;

  return {
    snapshot,
    cleanupKeys,
    cacheClear: {
      snapshot,
      requestId: params.requestId,
    },
    activeOwnerReset: {
      nextOwnerId: undefined,
      resetSubmitted: true,
    },
    resetDraftState: true,
    durablePatch: {
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
      lastSyncAt: "now",
    },
    refreshBoundaryRequestId: null,
    devTelemetry: {
      draftId,
      requestId: params.requestId,
      remoteStatus: params.remoteStatus ?? null,
      submitSuccess: false,
      postSubmitAction: "entered_empty_state",
      staleBannerVisibleAfterSubmit: false,
      activeDraftIdBefore: draftId,
      activeDraftIdAfter: null,
      freshDraftCreated: false,
      runtimeResult: "cleared_terminal_local_snapshot",
    },
  };
};
