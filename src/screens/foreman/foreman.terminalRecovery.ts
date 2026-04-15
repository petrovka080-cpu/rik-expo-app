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
