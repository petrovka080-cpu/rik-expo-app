import type {
  ForemanDraftConflictType,
  ForemanDraftSyncStage,
  ForemanDraftSyncStatus,
  ForemanDraftSyncTriggerSource,
} from "../../lib/offline/foremanSyncRuntime";
import type { ForemanLocalDraftSnapshot } from "./foreman.localDraft";
import { FOREMAN_LOCAL_ONLY_REQUEST_ID } from "./foreman.localDraft.constants";

type SubmittedRequestSnapshot = {
  display_no?: unknown;
} | null;

export type ForemanPostSubmitSnapshotApplyCommand = {
  snapshot: ForemanLocalDraftSnapshot;
  options: {
    restoreHeader: true;
    clearWhenEmpty: true;
    restoreSource: "snapshot";
    restoreIdentity: string;
  };
};

export type ForemanPostSubmitDurablePatch = {
  snapshot: ForemanLocalDraftSnapshot;
  syncStatus: ForemanDraftSyncStatus;
  pendingOperationsCount: number;
  queueDraftKey: string | null;
  requestIdKnown: boolean;
  attentionNeeded: boolean;
  conflictType: ForemanDraftConflictType;
  lastConflictAt: number | null;
  recoverableLocalSnapshot: ForemanLocalDraftSnapshot | null;
  lastError: string | null;
  lastErrorAt: number | null;
  lastErrorStage: ForemanDraftSyncStage | null;
  retryCount: number;
  repeatedFailureStageCount: number;
  lastTriggerSource: ForemanDraftSyncTriggerSource;
};

export type ForemanPostSubmitDevTelemetryPlan = {
  draftId: string | null;
  requestId: string;
  submitSuccess: true;
  postSubmitAction: "promoted_fresh_local_draft";
  activeDraftIdBefore: string | null;
  activeDraftIdAfter: typeof FOREMAN_LOCAL_ONLY_REQUEST_ID;
  activeDraftOwnerIdAfter: string;
  freshDraftCreated: true;
  runtimeResult: "post_submit_fresh_draft_state";
};

export type ForemanPostSubmitDraftPlan = {
  submittedOwnerId: string | null;
  nextActiveDraftOwnerId: string;
  displayNoPatch: { requestId: string; displayNo: string } | null;
  clearSkipRemoteHydrationRequestId: true;
  invalidateRequestDetailsLoads: true;
  resetAiQuickUi: true;
  clearAiQuickSessionHistory: true;
  applySnapshot: ForemanPostSubmitSnapshotApplyCommand;
  durablePatch: ForemanPostSubmitDurablePatch;
  refreshBoundarySnapshot: ForemanLocalDraftSnapshot;
  devTelemetry: ForemanPostSubmitDevTelemetryPlan;
};

const trim = (value: unknown): string => String(value ?? "").trim();

export const resolveForemanPostSubmitSubmittedOwnerId = (params: {
  activeSnapshot: ForemanLocalDraftSnapshot | null;
  activeDraftOwnerId: string | null | undefined;
}): string | null =>
  trim(params.activeSnapshot?.ownerId) || trim(params.activeDraftOwnerId) || null;

export const resolveForemanPostSubmitDraftPlan = (params: {
  rid: string;
  activeRequestId: string | number | null | undefined;
  activeSnapshot: ForemanLocalDraftSnapshot | null;
  submitted: SubmittedRequestSnapshot;
  submittedOwnerId: string | null;
  freshDraftSnapshot: ForemanLocalDraftSnapshot;
}): ForemanPostSubmitDraftPlan => {
  const activeDraftIdBefore =
    trim(params.activeSnapshot?.requestId) || trim(params.activeRequestId) || params.rid || null;
  const displayNoRaw = params.submitted?.display_no;
  const displayNoPatch = displayNoRaw
    ? { requestId: params.rid, displayNo: String(displayNoRaw) }
    : null;
  const restoreIdentity = `post-submit:fresh:${params.freshDraftSnapshot.updatedAt}`;

  return {
    submittedOwnerId: params.submittedOwnerId,
    nextActiveDraftOwnerId: params.freshDraftSnapshot.ownerId,
    displayNoPatch,
    clearSkipRemoteHydrationRequestId: true,
    invalidateRequestDetailsLoads: true,
    resetAiQuickUi: true,
    clearAiQuickSessionHistory: true,
    applySnapshot: {
      snapshot: params.freshDraftSnapshot,
      options: {
        restoreHeader: true,
        clearWhenEmpty: true,
        restoreSource: "snapshot",
        restoreIdentity,
      },
    },
    durablePatch: {
      snapshot: params.freshDraftSnapshot,
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
    },
    refreshBoundarySnapshot: params.freshDraftSnapshot,
    devTelemetry: {
      draftId: activeDraftIdBefore,
      requestId: params.rid,
      submitSuccess: true,
      postSubmitAction: "promoted_fresh_local_draft",
      activeDraftIdBefore,
      activeDraftIdAfter: FOREMAN_LOCAL_ONLY_REQUEST_ID,
      activeDraftOwnerIdAfter: params.freshDraftSnapshot.ownerId,
      freshDraftCreated: true,
      runtimeResult: "post_submit_fresh_draft_state",
    },
  };
};
