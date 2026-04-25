import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { AppStateStatus } from "react-native";

import type { ForemanDraftBoundaryState } from "../foreman.draftBoundary.helpers";
import {
  getForemanDraftBoundaryCurrentAppState,
  runForemanDraftBoundaryLiveCleanupEffect,
  runForemanDraftBoundaryRemoteDetailsEffect,
  runForemanDraftBoundaryRemoteItemsEffect,
  startForemanDraftBoundaryNetworkRuntime,
  subscribeForemanDraftBoundaryAppState,
} from "../foreman.draftBoundary.effects";
import {
  planForemanFocusRestoreTrigger,
  type ForemanDraftRestoreTriggerPlan,
} from "../foreman.draftLifecycle.model";
import type { ForemanLocalDraftSnapshot } from "../foreman.localDraft";

type BoundaryFailureReporter = Parameters<
  typeof runForemanDraftBoundaryLiveCleanupEffect
>[0]["reportDraftBoundaryFailure"];

type ClearTerminalLocalDraft = Parameters<
  typeof runForemanDraftBoundaryLiveCleanupEffect
>[0]["clearTerminalLocalDraft"];

type RestoreTriggerPlanRunner = Parameters<
  typeof subscribeForemanDraftBoundaryAppState
>[0]["runRestoreTriggerPlan"];

type UseForemanDraftBoundaryRuntimeSubscriptionsArgs = {
  bootstrapReady: boolean;
  boundaryConflictType: ForemanDraftBoundaryState["conflictType"];
  isScreenFocused: boolean;
  requestId: string;
  requestDetailsStatus?: string | null;
  skipRemoteDraftEffects: boolean;
  preloadDisplayNo: (rid?: string | number | null) => Promise<void>;
  loadDetails: (rid?: string | number | null) => Promise<unknown>;
  loadItems: () => Promise<void>;
  bootstrapDraft: (options: { cancelled: () => boolean }) => Promise<void>;
  setNetworkOnline: Dispatch<SetStateAction<boolean | null>>;
  appStateRef: MutableRefObject<AppStateStatus>;
  networkOnlineRef: MutableRefObject<boolean | null>;
  wasScreenFocusedRef: MutableRefObject<boolean>;
  localDraftSnapshotRef: MutableRefObject<ForemanLocalDraftSnapshot | null>;
  skipRemoteHydrationRequestIdRef: MutableRefObject<string | null>;
  clearTerminalLocalDraft: ClearTerminalLocalDraft;
  runRestoreTriggerPlan: RestoreTriggerPlanRunner;
  reportDraftBoundaryFailure: BoundaryFailureReporter;
};

export const buildForemanDraftBoundaryInitialAppState = (): AppStateStatus =>
  getForemanDraftBoundaryCurrentAppState();

export function useForemanDraftBoundaryRuntimeSubscriptions(
  args: UseForemanDraftBoundaryRuntimeSubscriptionsArgs,
) {
  const {
    appStateRef,
    bootstrapDraft,
    bootstrapReady,
    boundaryConflictType,
    clearTerminalLocalDraft,
    isScreenFocused,
    loadDetails,
    loadItems,
    localDraftSnapshotRef,
    networkOnlineRef,
    preloadDisplayNo,
    reportDraftBoundaryFailure,
    requestDetailsStatus,
    requestId,
    runRestoreTriggerPlan,
    setNetworkOnline,
    skipRemoteDraftEffects,
    skipRemoteHydrationRequestIdRef,
    wasScreenFocusedRef,
  } = args;

  useEffect(() => {
    if (!bootstrapReady) return;

    runForemanDraftBoundaryLiveCleanupEffect({
      bootstrapReady,
      boundaryConflictType,
      requestId,
      requestDetailsStatus,
      localDraftSnapshotRef,
      clearTerminalLocalDraft,
      reportDraftBoundaryFailure,
    });
  }, [
    bootstrapReady,
    boundaryConflictType,
    clearTerminalLocalDraft,
    localDraftSnapshotRef,
    reportDraftBoundaryFailure,
    requestDetailsStatus,
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
    const plan: ForemanDraftRestoreTriggerPlan = planForemanFocusRestoreTrigger({
      bootstrapReady,
      isScreenFocused,
      wasScreenFocused: wasFocused,
    });
    runRestoreTriggerPlan(plan);
  }, [bootstrapReady, isScreenFocused, runRestoreTriggerPlan, wasScreenFocusedRef]);

  useEffect(() => {
    return subscribeForemanDraftBoundaryAppState({
      bootstrapReady,
      appStateRef,
      runRestoreTriggerPlan,
      reportDraftBoundaryFailure,
    });
  }, [
    appStateRef,
    bootstrapReady,
    reportDraftBoundaryFailure,
    runRestoreTriggerPlan,
  ]);

  useEffect(() => {
    const runtime = startForemanDraftBoundaryNetworkRuntime({
      bootstrapReady,
      networkOnlineRef,
      setNetworkOnline,
      runRestoreTriggerPlan,
      reportDraftBoundaryFailure,
    });
    return () => {
      runtime.dispose();
    };
  }, [
    bootstrapReady,
    networkOnlineRef,
    reportDraftBoundaryFailure,
    runRestoreTriggerPlan,
    setNetworkOnline,
  ]);

  useEffect(() => {
    runForemanDraftBoundaryRemoteDetailsEffect({
      bootstrapReady,
      requestId,
      skipRemoteDraftEffects,
      skipRemoteHydrationRequestId: skipRemoteHydrationRequestIdRef.current,
      preloadDisplayNo,
      loadDetails,
    });
  }, [
    bootstrapReady,
    loadDetails,
    preloadDisplayNo,
    requestId,
    skipRemoteDraftEffects,
    skipRemoteHydrationRequestIdRef,
  ]);

  useEffect(() => {
    runForemanDraftBoundaryRemoteItemsEffect({
      bootstrapReady,
      requestId,
      skipRemoteDraftEffects,
      skipRemoteHydrationRequestIdRef,
      loadItems,
    });
  }, [
    bootstrapReady,
    loadItems,
    requestId,
    skipRemoteDraftEffects,
    skipRemoteHydrationRequestIdRef,
  ]);
}
