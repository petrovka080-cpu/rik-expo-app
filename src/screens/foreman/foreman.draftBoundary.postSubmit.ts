import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import type { RequestRecord } from "../../lib/api/types";
import {
  getForemanDurableDraftState,
  patchForemanDurableDraftRecoveryState,
} from "./foreman.durableDraft.store";
import type {
  ForemanDraftHeaderState,
  ForemanDraftSnapshotApplyOptions,
} from "./foreman.draftBoundary.helpers";
import {
  buildFreshForemanLocalDraftSnapshot,
  type ForemanLocalDraftSnapshot,
} from "./foreman.localDraft";
import {
  resolveForemanPostSubmitDraftPlan,
  resolveForemanPostSubmitSubmittedOwnerId,
} from "./foreman.postSubmitDraftPlan.model";
import { useForemanUiStore } from "./foremanUi.store";

type SetDisplayNoByReq = Dispatch<SetStateAction<Record<string, string>>>;

type SetActiveDraftOwnerId = (
  ownerId?: string | null,
  options?: { resetSubmitted?: boolean },
) => string;

type ApplyLocalDraftSnapshotToBoundary = (
  snapshot: ForemanLocalDraftSnapshot | null,
  options?: ForemanDraftSnapshotApplyOptions,
) => void;

export type ForemanDraftBoundaryPostSubmitDeps = {
  localDraftSnapshotRef: MutableRefObject<ForemanLocalDraftSnapshot | null>;
  activeDraftOwnerIdRef: MutableRefObject<string | null>;
  lastSubmittedOwnerIdRef: MutableRefObject<string | null>;
  skipRemoteHydrationRequestIdRef: MutableRefObject<string | null>;
  requestId: string;
  currentHeaderState: ForemanDraftHeaderState;
  setActiveDraftOwnerId: SetActiveDraftOwnerId;
  setDisplayNoByReq: SetDisplayNoByReq;
  invalidateRequestDetailsLoads: () => void;
  applyLocalDraftSnapshotToBoundary: ApplyLocalDraftSnapshotToBoundary;
  refreshBoundarySyncState: (
    snapshotOverride?: ForemanLocalDraftSnapshot | null,
  ) => Promise<void>;
};

export async function runForemanDraftBoundaryPostSubmitSuccess(
  deps: ForemanDraftBoundaryPostSubmitDeps,
  params: {
    rid: string;
    submitted: RequestRecord | null;
  },
) {
  const activeSnapshot = deps.localDraftSnapshotRef.current;
  const submittedOwnerId = resolveForemanPostSubmitSubmittedOwnerId({
    activeSnapshot,
    activeDraftOwnerId: deps.activeDraftOwnerIdRef.current,
  });
  if (submittedOwnerId) {
    deps.lastSubmittedOwnerIdRef.current = submittedOwnerId;
  }

  const freshDraftSnapshot = buildFreshForemanLocalDraftSnapshot({
    base: activeSnapshot,
    header: {
      foreman: deps.currentHeaderState.foreman,
      comment: "",
      objectType: deps.currentHeaderState.objectType,
      level: deps.currentHeaderState.level,
      system: deps.currentHeaderState.system,
      zone: deps.currentHeaderState.zone,
    },
  });
  const postSubmitPlan = resolveForemanPostSubmitDraftPlan({
    rid: params.rid,
    activeRequestId: deps.requestId,
    activeSnapshot,
    submitted: params.submitted,
    submittedOwnerId,
    freshDraftSnapshot,
  });

  deps.setActiveDraftOwnerId(postSubmitPlan.nextActiveDraftOwnerId);

  const displayNoPatch = postSubmitPlan.displayNoPatch;
  if (displayNoPatch) {
    deps.setDisplayNoByReq((prev) => ({
      ...prev,
      [displayNoPatch.requestId]: displayNoPatch.displayNo,
    }));
  }

  if (postSubmitPlan.clearSkipRemoteHydrationRequestId) {
    deps.skipRemoteHydrationRequestIdRef.current = null;
  }
  if (postSubmitPlan.invalidateRequestDetailsLoads) {
    deps.invalidateRequestDetailsLoads();
  }

  if (postSubmitPlan.resetAiQuickUi) {
    useForemanUiStore.getState().resetAiQuickUi();
  }
  if (postSubmitPlan.clearAiQuickSessionHistory) {
    useForemanUiStore.getState().clearAiQuickSessionHistory();
  }

  deps.applyLocalDraftSnapshotToBoundary(
    postSubmitPlan.applySnapshot.snapshot,
    postSubmitPlan.applySnapshot.options,
  );

  await patchForemanDurableDraftRecoveryState({
    ...postSubmitPlan.durablePatch,
    lastSyncAt: Date.now(),
  });
  await deps.refreshBoundarySyncState(postSubmitPlan.refreshBoundarySnapshot);

  if (__DEV__) {
    const durableState = getForemanDurableDraftState();
    console.info("[foreman.post-submit]", {
      ...postSubmitPlan.devTelemetry,
      staleBannerVisibleAfterSubmit:
        durableState.conflictType !== "none" ||
        durableState.availableRecoveryActions.length > 0,
    });
  }
}
