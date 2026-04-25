import type { AppStateStatus } from "react-native";

import type { PlatformNetworkSnapshot } from "../../src/lib/offline/platformOffline.model";
import {
  dispatchForemanDraftBoundaryRestorePlanSafely,
  handleForemanDraftBoundaryAppStateChange,
  handleForemanDraftBoundaryNetworkChange,
  startForemanDraftBoundaryNetworkRuntime,
  subscribeForemanDraftBoundaryAppState,
} from "../../src/screens/foreman/foreman.draftBoundary.effects";

const createNetworkSnapshot = (
  patch: Partial<PlatformNetworkSnapshot> = {},
): PlatformNetworkSnapshot => ({
  hydrated: true,
  isConnected: true,
  isInternetReachable: true,
  offlineState: "online",
  networkKnownOffline: false,
  lastOnlineAt: null,
  networkRestoredAt: null,
  appCameOnlineSinceLastOffline: false,
  connectionKind: "wifi",
  updatedAt: null,
  ...patch,
});

describe("foreman draft boundary runtime subscriptions", () => {
  it("dispatches the existing app-active restore plan only when the app becomes active", () => {
    const appStateRef = { current: "background" as AppStateStatus };
    const runRestoreTriggerPlan = jest.fn();
    const reportDraftBoundaryFailure = jest.fn();

    const plan = handleForemanDraftBoundaryAppStateChange({
      bootstrapReady: true,
      appStateRef,
      nextState: "active",
      runRestoreTriggerPlan,
      reportDraftBoundaryFailure,
    });

    expect(plan).toEqual({
      action: "restore",
      context: "app_active",
      failureTelemetry: {
        event: "restore_draft_on_app_active_failed",
        context: "app_active",
        stage: "recovery",
        sourceKind: "draft_boundary:app_active_restore",
      },
    });
    expect(appStateRef.current).toBe("active");
    expect(runRestoreTriggerPlan).toHaveBeenCalledWith(plan);
    expect(reportDraftBoundaryFailure).not.toHaveBeenCalled();
  });

  it("does not dispatch duplicate app-active restore attempts on unchanged active state", () => {
    const appStateRef = { current: "active" as AppStateStatus };
    const runRestoreTriggerPlan = jest.fn();

    const plan = handleForemanDraftBoundaryAppStateChange({
      bootstrapReady: true,
      appStateRef,
      nextState: "active",
      runRestoreTriggerPlan,
      reportDraftBoundaryFailure: jest.fn(),
    });

    expect(plan).toEqual({
      action: "skip",
      context: "app_active",
      reason: "app_not_becoming_active",
    });
    expect(runRestoreTriggerPlan).not.toHaveBeenCalled();
  });

  it("reports synchronous restore dispatch failures through the existing failure path", () => {
    const error = new Error("restore dispatch failed");
    const runRestoreTriggerPlan = jest.fn(() => {
      throw error;
    });
    const reportDraftBoundaryFailure = jest.fn();
    const plan = {
      action: "restore" as const,
      context: "network_back" as const,
      failureTelemetry: {
        event: "restore_draft_on_network_back_failed" as const,
        context: "network_back" as const,
        stage: "recovery" as const,
        sourceKind: "draft_boundary:network_restore" as const,
      },
    };

    const result = dispatchForemanDraftBoundaryRestorePlanSafely({
      plan,
      runRestoreTriggerPlan,
      reportDraftBoundaryFailure,
    });

    expect(result).toBe(plan);
    expect(reportDraftBoundaryFailure).toHaveBeenCalledWith({
      event: "restore_draft_on_network_back_failed",
      context: "network_back",
      stage: "recovery",
      sourceKind: "draft_boundary:network_restore",
      error,
    });
  });

  it("syncs online state and dispatches the existing network-back restore plan only on recovery", () => {
    const networkOnlineRef = { current: null as boolean | null };
    const setNetworkOnline = jest.fn();
    const runRestoreTriggerPlan = jest.fn();

    const plan = handleForemanDraftBoundaryNetworkChange({
      bootstrapReady: true,
      networkOnlineRef,
      setNetworkOnline,
      state: createNetworkSnapshot({
        offlineState: "online",
        isConnected: true,
        isInternetReachable: true,
      }),
      previous: createNetworkSnapshot({
        offlineState: "offline",
        isConnected: false,
        isInternetReachable: false,
        networkKnownOffline: true,
      }),
      runRestoreTriggerPlan,
      reportDraftBoundaryFailure: jest.fn(),
    });

    expect(networkOnlineRef.current).toBe(true);
    expect(setNetworkOnline).toHaveBeenCalledWith(true);
    expect(plan).toEqual({
      action: "restore",
      context: "network_back",
      failureTelemetry: {
        event: "restore_draft_on_network_back_failed",
        context: "network_back",
        stage: "recovery",
        sourceKind: "draft_boundary:network_restore",
      },
    });
    expect(runRestoreTriggerPlan).toHaveBeenCalledWith(plan);
  });

  it("tears down app state listeners exactly once", () => {
    const remove = jest.fn();
    const addAppStateListener = jest.fn((_event, _listener) => ({ remove }));

    const unsubscribe = subscribeForemanDraftBoundaryAppState({
      bootstrapReady: true,
      appStateRef: { current: "background" as AppStateStatus },
      runRestoreTriggerPlan: jest.fn(),
      reportDraftBoundaryFailure: jest.fn(),
      addAppStateListener,
    });

    unsubscribe();
    unsubscribe();

    expect(addAppStateListener).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("bootstraps the network runtime, reports bootstrap failures, and disposes listeners once", async () => {
    const unsubscribe = jest.fn();
    const reportDraftBoundaryFailure = jest.fn();
    const networkOnlineRef = { current: null as boolean | null };
    const setNetworkOnline = jest.fn();
    const bootstrapError = new Error("network bootstrap failed");

    const runtime = startForemanDraftBoundaryNetworkRuntime({
      bootstrapReady: true,
      networkOnlineRef,
      setNetworkOnline,
      runRestoreTriggerPlan: jest.fn(),
      reportDraftBoundaryFailure,
      ensureNetworkService: jest.fn().mockRejectedValue(bootstrapError),
      subscribeNetwork: jest.fn(() => unsubscribe),
    });

    await expect(runtime.ready).resolves.toBeUndefined();
    expect(networkOnlineRef.current).toBeNull();
    expect(setNetworkOnline).toHaveBeenCalledWith(null);
    expect(reportDraftBoundaryFailure).toHaveBeenCalledWith({
      event: "network_service_bootstrap_failed",
      error: bootstrapError,
      context: "network_service_bootstrap",
      stage: "hydrate",
      sourceKind: "draft_boundary:network_service",
      extra: {
        fallbackReason: "network_online_unknown",
      },
    });

    runtime.dispose();
    runtime.dispose();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
