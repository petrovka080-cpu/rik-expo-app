import { isDraftLikeStatus, ridStr } from "./foreman.helpers";
import {
  buildForemanDraftHeaderState as buildForemanDraftHeaderStateModel,
  canEditForemanRequestItem,
  planForemanItemsLoadEffect,
  planForemanRemoteDetailsLoadEffect,
  resolveForemanDraftActivityState,
} from "./foreman.draftBoundaryIdentity.model";
import {
  buildForemanRequestDraftMeta,
  type ForemanDraftBoundaryState,
  type ForemanDraftHeaderState,
} from "./foreman.draftBoundary.helpers";
import { hasForemanLocalDraftContent, type ForemanLocalDraftSnapshot } from "./foreman.localDraft";
import type { ReqItemRow } from "../../lib/catalog_api";
import {
  resolveForemanActiveLocalDraftSnapshotPlan,
  shouldPersistForemanLifecycleSnapshot,
  shouldSkipForemanRemoteDraftEffects,
} from "./foreman.draftLifecycle.model";
import { resolveForemanTerminalRecoveryCleanupDecision } from "./foreman.draftRecovery.model";
import type { ForemanDurableDraftRecord } from "./foreman.durableDraft.store";

export type ForemanDraftBoundaryViewState = {
  activeLocalDraftSnapshot: ForemanLocalDraftSnapshot | null;
  draftActivityState: ReturnType<typeof resolveForemanDraftActivityState>;
  requestDraftMeta: ReturnType<typeof buildForemanRequestDraftMeta>;
  skipRemoteDraftEffects: boolean;
  detailsRequestId: string;
};

export const buildForemanDraftBoundaryHeaderState = (params: {
  foreman: string;
  comment: string;
  objectType: string;
  level: string;
  system: string;
  zone: string;
}): ForemanDraftHeaderState =>
  buildForemanDraftHeaderStateModel({
    foreman: params.foreman,
    comment: params.comment,
    objectType: params.objectType,
    level: params.level,
    system: params.system,
    zone: params.zone,
  });

export const buildForemanDraftBoundaryViewState = (params: {
  localSnapshot: ForemanLocalDraftSnapshot | null;
  activeDraftOwnerId: string | null;
  requestId: string;
  requestStatus?: string | null;
  requestDetailsId?: string | null;
  headerState: ForemanDraftHeaderState;
  bootstrapReady: boolean;
}): ForemanDraftBoundaryViewState => {
  const activeLocalDraftSnapshot = resolveForemanActiveLocalDraftSnapshotPlan({
    snapshot: params.localSnapshot,
    activeDraftOwnerId: params.activeDraftOwnerId,
    activeRequestId: params.requestId,
  }).snapshot;
  const draftActivityState = resolveForemanDraftActivityState({
    activeLocalDraftSnapshot,
    requestStatus: params.requestStatus,
  });

  return {
    activeLocalDraftSnapshot,
    draftActivityState,
    requestDraftMeta: buildForemanRequestDraftMeta(params.headerState),
    skipRemoteDraftEffects: shouldSkipForemanRemoteDraftEffects({
      bootstrapReady: params.bootstrapReady,
      activeSnapshot: activeLocalDraftSnapshot,
      requestId: params.requestId,
    }),
    detailsRequestId: ridStr(params.requestDetailsId),
  };
};

export const resolveForemanDraftBoundaryPersistPlan = (params: {
  bootstrapReady: boolean;
  isDraftActive: boolean;
  localDraftSnapshotRefCleared: boolean;
  hasRequestDetails: boolean;
  detailsRequestId: string;
  requestId: string;
  hasLocalDraft: boolean;
  snapshot: ForemanLocalDraftSnapshot | null;
}) => {
  const shouldPersist = shouldPersistForemanLifecycleSnapshot({
    bootstrapReady: params.bootstrapReady,
    isDraftActive: params.isDraftActive,
    localDraftSnapshotRefCleared: params.localDraftSnapshotRefCleared,
    hasRequestDetails: params.hasRequestDetails,
    detailsRequestId: params.detailsRequestId,
    requestId: params.requestId,
    hasLocalDraft: params.hasLocalDraft,
  });

  if (!shouldPersist || !params.snapshot || !hasForemanLocalDraftContent(params.snapshot)) {
    return {
      action: "skip" as const,
    };
  }

  return {
    action: "persist" as const,
    snapshot: params.snapshot,
  };
};

export const resolveForemanDraftBoundaryRemoteEffectsPlan = (params: {
  bootstrapReady: boolean;
  requestId: string;
  skipRemoteDraftEffects: boolean;
  skipRemoteHydrationRequestId: string | null;
}) => ({
  detailsPlan: planForemanRemoteDetailsLoadEffect({
    bootstrapReady: params.bootstrapReady,
    requestId: params.requestId,
    skipRemoteDraftEffects: params.skipRemoteDraftEffects,
    skipRemoteHydrationRequestId: params.skipRemoteHydrationRequestId,
  }),
  itemsPlan: planForemanItemsLoadEffect({
    bootstrapReady: params.bootstrapReady,
    requestId: params.requestId,
    skipRemoteDraftEffects: params.skipRemoteDraftEffects,
    skipRemoteHydrationRequestId: params.skipRemoteHydrationRequestId,
  }),
});

export const resolveForemanDraftBoundaryLiveCleanupPlan = (params: {
  bootstrapReady: boolean;
  boundaryConflictType: ForemanDraftBoundaryState["conflictType"];
  requestId: string;
  remoteStatus?: string | null;
  snapshot: ForemanLocalDraftSnapshot | null;
  durableState: ForemanDurableDraftRecord;
}) =>
  resolveForemanTerminalRecoveryCleanupDecision({
    bootstrapReady: params.bootstrapReady,
    boundaryConflictType: params.boundaryConflictType,
    requestId: params.requestId,
    remoteStatus: params.remoteStatus,
    snapshot: params.snapshot,
    durableState: params.durableState,
  });

export const resolveForemanDraftBoundaryCanEditItem = (params: {
  row?: ReqItemRow | null;
  isDraftActive: boolean;
  requestDetailsId?: string | null;
  requestStatus?: string | null;
  requestId: string;
  localOnlyRequestId: string;
}) =>
  canEditForemanRequestItem({
    row: params.row,
    isDraftActive: params.isDraftActive,
    activeRequestDetailsId: params.requestDetailsId,
    activeRequestStatusIsDraftLike: isDraftLikeStatus(params.requestStatus),
    requestId: params.requestId,
    localOnlyRequestId: params.localOnlyRequestId,
  });
