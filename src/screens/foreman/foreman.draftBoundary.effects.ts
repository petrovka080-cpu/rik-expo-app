import type { MutableRefObject } from "react";
import { AppState, type AppStateStatus } from "react-native";

import type { ForemanDraftSyncStage } from "../../lib/offline/foremanSyncRuntime";
import {
  ensurePlatformNetworkService,
  subscribePlatformNetwork,
} from "../../lib/offline/platformNetwork.service";
import {
  selectPlatformOnlineFlag,
  type PlatformNetworkSnapshot,
} from "../../lib/offline/platformOffline.model";
import { getForemanDurableDraftState } from "./foreman.durableDraft.store";
import type { ForemanDraftBoundaryState } from "./foreman.draftBoundary.helpers";
import {
  buildForemanDraftRestoreFailureTelemetry,
  planForemanAppActiveRestoreTrigger,
  planForemanNetworkBackRestoreTrigger,
  type ForemanDraftRestoreTriggerPlan,
} from "./foreman.draftLifecycle.model";
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
  kind?: "critical_fail" | "soft_failure" | "degraded_fallback" | "cleanup_only";
  sourceKind?: string;
  extra?: Record<string, unknown>;
}) => unknown;

type RestoreTriggerPlanRunner = (plan: ForemanDraftRestoreTriggerPlan) => void;

type AppStateSubscription = {
  remove: () => void;
};

type AppStateListenerRegistrar = (
  eventType: "change",
  listener: (nextState: AppStateStatus) => void,
) => AppStateSubscription;

type NetworkListener = (
  state: PlatformNetworkSnapshot,
  previous: PlatformNetworkSnapshot,
) => void;

type NetworkSubscriber = (listener: NetworkListener) => () => void;

const defaultAppStateListenerRegistrar: AppStateListenerRegistrar = (
  eventType,
  listener,
) => AppState.addEventListener(eventType, listener);

const reportRestoreDispatchFailure = (params: {
  plan: ForemanDraftRestoreTriggerPlan;
  error: unknown;
  reportDraftBoundaryFailure: BoundaryFailureReporter;
}) => {
  params.reportDraftBoundaryFailure({
    ...buildForemanDraftRestoreFailureTelemetry(params.plan.context),
    error: params.error,
  });
};

export const getForemanDraftBoundaryCurrentAppState = (): AppStateStatus =>
  AppState.currentState;

export const dispatchForemanDraftBoundaryRestorePlanSafely = (params: {
  plan: ForemanDraftRestoreTriggerPlan;
  runRestoreTriggerPlan: RestoreTriggerPlanRunner;
  reportDraftBoundaryFailure: BoundaryFailureReporter;
}): ForemanDraftRestoreTriggerPlan => {
  if (params.plan.action !== "restore") {
    return params.plan;
  }

  try {
    params.runRestoreTriggerPlan(params.plan);
  } catch (error) {
    reportRestoreDispatchFailure({
      plan: params.plan,
      error,
      reportDraftBoundaryFailure: params.reportDraftBoundaryFailure,
    });
  }

  return params.plan;
};

export const handleForemanDraftBoundaryAppStateChange = (params: {
  bootstrapReady: boolean;
  appStateRef: MutableRefObject<AppStateStatus>;
  nextState: AppStateStatus;
  runRestoreTriggerPlan: RestoreTriggerPlanRunner;
  reportDraftBoundaryFailure: BoundaryFailureReporter;
}): ForemanDraftRestoreTriggerPlan => {
  const previousState = params.appStateRef.current;
  params.appStateRef.current = params.nextState;
  const plan = planForemanAppActiveRestoreTrigger({
    bootstrapReady: params.bootstrapReady,
    previousState,
    nextState: params.nextState,
  });

  return dispatchForemanDraftBoundaryRestorePlanSafely({
    plan,
    runRestoreTriggerPlan: params.runRestoreTriggerPlan,
    reportDraftBoundaryFailure: params.reportDraftBoundaryFailure,
  });
};

export const subscribeForemanDraftBoundaryAppState = (params: {
  bootstrapReady: boolean;
  appStateRef: MutableRefObject<AppStateStatus>;
  runRestoreTriggerPlan: RestoreTriggerPlanRunner;
  reportDraftBoundaryFailure: BoundaryFailureReporter;
  addAppStateListener?: AppStateListenerRegistrar;
}) => {
  const registerListener =
    params.addAppStateListener ?? defaultAppStateListenerRegistrar;
  const subscription = registerListener("change", (nextState) => {
    handleForemanDraftBoundaryAppStateChange({
      bootstrapReady: params.bootstrapReady,
      appStateRef: params.appStateRef,
      nextState,
      runRestoreTriggerPlan: params.runRestoreTriggerPlan,
      reportDraftBoundaryFailure: params.reportDraftBoundaryFailure,
    });
  });

  let removed = false;
  return () => {
    if (removed) return;
    removed = true;
    subscription.remove();
  };
};

const syncForemanDraftBoundaryNetworkOnline = (params: {
  networkOnlineRef: MutableRefObject<boolean | null>;
  setNetworkOnline: (value: boolean | null) => void;
  nextOnline: boolean | null;
}) => {
  params.networkOnlineRef.current = params.nextOnline;
  params.setNetworkOnline(params.nextOnline);
};

export const handleForemanDraftBoundaryNetworkChange = (params: {
  bootstrapReady: boolean;
  networkOnlineRef: MutableRefObject<boolean | null>;
  setNetworkOnline: (value: boolean | null) => void;
  state: PlatformNetworkSnapshot;
  previous: PlatformNetworkSnapshot;
  runRestoreTriggerPlan: RestoreTriggerPlanRunner;
  reportDraftBoundaryFailure: BoundaryFailureReporter;
}): ForemanDraftRestoreTriggerPlan => {
  const nextOnline = selectPlatformOnlineFlag(params.state);
  const previousOnline = selectPlatformOnlineFlag(params.previous);

  syncForemanDraftBoundaryNetworkOnline({
    networkOnlineRef: params.networkOnlineRef,
    setNetworkOnline: params.setNetworkOnline,
    nextOnline,
  });

  const plan = planForemanNetworkBackRestoreTrigger({
    bootstrapReady: params.bootstrapReady,
    previousOnline,
    nextOnline,
  });

  return dispatchForemanDraftBoundaryRestorePlanSafely({
    plan,
    runRestoreTriggerPlan: params.runRestoreTriggerPlan,
    reportDraftBoundaryFailure: params.reportDraftBoundaryFailure,
  });
};

export const startForemanDraftBoundaryNetworkRuntime = (params: {
  bootstrapReady: boolean;
  networkOnlineRef: MutableRefObject<boolean | null>;
  setNetworkOnline: (value: boolean | null) => void;
  runRestoreTriggerPlan: RestoreTriggerPlanRunner;
  reportDraftBoundaryFailure: BoundaryFailureReporter;
  ensureNetworkService?: () => Promise<PlatformNetworkSnapshot>;
  subscribeNetwork?: NetworkSubscriber;
}) => {
  const ensureNetworkService =
    params.ensureNetworkService ?? ensurePlatformNetworkService;
  const subscribeNetwork = params.subscribeNetwork ?? subscribePlatformNetwork;

  let disposed = false;
  const safeSyncOnlineState = (nextOnline: boolean | null) => {
    if (disposed) return;
    syncForemanDraftBoundaryNetworkOnline({
      networkOnlineRef: params.networkOnlineRef,
      setNetworkOnline: params.setNetworkOnline,
      nextOnline,
    });
  };

  const ready = ensureNetworkService()
    .then((snapshot) => {
      safeSyncOnlineState(selectPlatformOnlineFlag(snapshot));
    })
    .catch((error) => {
      if (disposed) return;
      safeSyncOnlineState(null);
      params.reportDraftBoundaryFailure({
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

  const unsubscribe = subscribeNetwork((state, previous) => {
    if (disposed) return;
    handleForemanDraftBoundaryNetworkChange({
      bootstrapReady: params.bootstrapReady,
      networkOnlineRef: params.networkOnlineRef,
      setNetworkOnline: params.setNetworkOnline,
      state,
      previous,
      runRestoreTriggerPlan: params.runRestoreTriggerPlan,
      reportDraftBoundaryFailure: params.reportDraftBoundaryFailure,
    });
  });

  let unsubscribed = false;
  return {
    ready,
    dispose: () => {
      if (unsubscribed) return;
      disposed = true;
      unsubscribed = true;
      unsubscribe();
    },
  };
};

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
