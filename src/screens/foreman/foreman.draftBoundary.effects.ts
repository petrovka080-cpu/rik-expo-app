import type { MutableRefObject } from "react";

import type { ForemanDraftSyncStage } from "../../lib/offline/foremanSyncRuntime";
import { getForemanDurableDraftState } from "./foreman.durableDraft.store";
import type { ForemanDraftBoundaryState } from "./foreman.draftBoundary.helpers";
import type { ForemanLocalDraftSnapshot } from "./foreman.localDraft";
import {
  resolveForemanDraftBoundaryLiveCleanupPlan,
  resolveForemanDraftBoundaryRemoteEffectsPlan,
} from "./foreman.draftBoundary.plan";

type BoundaryFailureReporter = (params: {
  event: string;
  error: unknown;
  context?: string;
  stage: ForemanDraftSyncStage;
  kind?: "critical_fail" | "soft_failure" | "degraded_fallback";
  sourceKind?: string;
  extra?: Record<string, unknown>;
}) => unknown;

export const runForemanDraftBoundaryLiveCleanupEffect = (deps: {
  bootstrapReady: boolean;
  boundaryConflictType: ForemanDraftBoundaryState["conflictType"];
  requestId: string;
  requestDetailsStatus?: string | null;
  localDraftSnapshotRef: MutableRefObject<ForemanLocalDraftSnapshot | null>;
  clearTerminalLocalDraft: (options: {
    snapshot?: ForemanLocalDraftSnapshot | null;
    requestId: string;
    remoteStatus?: string | null;
  }) => Promise<void>;
  reportDraftBoundaryFailure: BoundaryFailureReporter;
}) => {
  const durableState = getForemanDurableDraftState();
  const snapshot =
    deps.localDraftSnapshotRef.current ??
    durableState.snapshot ??
    durableState.recoverableLocalSnapshot;
  const cleanupDecision = resolveForemanDraftBoundaryLiveCleanupPlan({
    bootstrapReady: deps.bootstrapReady,
    boundaryConflictType: deps.boundaryConflictType,
    requestId: deps.requestId,
    remoteStatus: deps.requestDetailsStatus,
    snapshot,
    durableState,
  });

  if (!cleanupDecision.shouldClear || !cleanupDecision.requestId) {
    return cleanupDecision;
  }

  if (__DEV__) {
    console.info("[foreman.live-reconciliation] clearing stale state for terminal request", {
      requestId: cleanupDecision.requestId,
      isTerminalConflict: cleanupDecision.isTerminalConflict,
      isTerminalStatus: cleanupDecision.isTerminalStatus,
      remoteStatus: deps.requestDetailsStatus ?? null,
    });
  }

  void deps.clearTerminalLocalDraft({
    snapshot: cleanupDecision.snapshotForCleanup,
    requestId: cleanupDecision.requestId,
    remoteStatus: cleanupDecision.remoteStatus,
  }).catch((error) => {
    deps.reportDraftBoundaryFailure({
      event: "live_terminal_local_cleanup_failed",
      error,
      context: cleanupDecision.isTerminalConflict
        ? "server_terminal_conflict"
        : "live_reconciliation",
      stage: "cleanup",
      kind: "critical_fail",
      sourceKind: "draft_boundary:terminal_cleanup",
      extra: {
        remoteStatus: cleanupDecision.remoteStatus,
        isTerminalConflict: cleanupDecision.isTerminalConflict,
      },
    });
  });

  return cleanupDecision;
};

export const runForemanDraftBoundaryRemoteDetailsEffect = (deps: {
  bootstrapReady: boolean;
  requestId: string;
  skipRemoteDraftEffects: boolean;
  skipRemoteHydrationRequestId: string | null;
  preloadDisplayNo: (rid?: string | number | null) => Promise<void>;
  loadDetails: (rid?: string | number | null) => Promise<unknown>;
}) => {
  const remoteEffectsPlan = resolveForemanDraftBoundaryRemoteEffectsPlan({
    bootstrapReady: deps.bootstrapReady,
    requestId: deps.requestId,
    skipRemoteDraftEffects: deps.skipRemoteDraftEffects,
    skipRemoteHydrationRequestId: deps.skipRemoteHydrationRequestId,
  });
  const plan = remoteEffectsPlan.detailsPlan;
  if (plan.action !== "load") {
    return plan;
  }
  void deps.preloadDisplayNo(plan.requestId);
  void deps.loadDetails(plan.requestId);
  return plan;
};

export const runForemanDraftBoundaryRemoteItemsEffect = (deps: {
  bootstrapReady: boolean;
  requestId: string;
  skipRemoteDraftEffects: boolean;
  skipRemoteHydrationRequestIdRef: MutableRefObject<string | null>;
  loadItems: () => Promise<void>;
}) => {
  const remoteEffectsPlan = resolveForemanDraftBoundaryRemoteEffectsPlan({
    bootstrapReady: deps.bootstrapReady,
    requestId: deps.requestId,
    skipRemoteDraftEffects: deps.skipRemoteDraftEffects,
    skipRemoteHydrationRequestId: deps.skipRemoteHydrationRequestIdRef.current,
  });
  const plan = remoteEffectsPlan.itemsPlan;
  if (plan.action === "clear_skip_remote_hydration") {
    deps.skipRemoteHydrationRequestIdRef.current = null;
    return plan;
  }
  if (plan.action !== "load_items") {
    return plan;
  }
  void deps.loadItems();
  return plan;
};
