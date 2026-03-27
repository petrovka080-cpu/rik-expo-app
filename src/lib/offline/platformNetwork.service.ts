import * as Network from "expo-network";
import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";

import { recordPlatformOfflineTelemetry } from "./platformOffline.observability";
import {
  normalizePlatformOfflineState,
  type PlatformConnectionKind,
  type PlatformNetworkSnapshot,
} from "./platformOffline.model";

const initialState: PlatformNetworkSnapshot = {
  hydrated: false,
  isConnected: null,
  isInternetReachable: null,
  offlineState: "unknown",
  networkKnownOffline: false,
  lastOnlineAt: null,
  networkRestoredAt: null,
  appCameOnlineSinceLastOffline: false,
  connectionKind: null,
  updatedAt: null,
};

export const platformNetworkStore = createStore<PlatformNetworkSnapshot>(() => initialState);

let serviceStarted = false;
let bootstrapPromise: Promise<PlatformNetworkSnapshot> | null = null;

const normalizeConnectionKind = (value: unknown): PlatformConnectionKind => {
  const text = String(value ?? "").trim().toLowerCase();
  return text || null;
};

const applyNetworkSnapshot = (params: {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  connectionKind: PlatformConnectionKind;
}): PlatformNetworkSnapshot => {
  const previous = platformNetworkStore.getState();
  const nextOfflineState = normalizePlatformOfflineState({
    isConnected: params.isConnected,
    isInternetReachable: params.isInternetReachable,
  });
  const now = Date.now();
  const recovered = previous.offlineState === "offline" && nextOfflineState === "online";
  const appCameOnlineSinceLastOffline =
    nextOfflineState === "offline"
      ? false
      : recovered || (previous.appCameOnlineSinceLastOffline && nextOfflineState === "online");

  const next: PlatformNetworkSnapshot = {
    hydrated: true,
    isConnected: params.isConnected,
    isInternetReachable: params.isInternetReachable,
    offlineState: nextOfflineState,
    networkKnownOffline: nextOfflineState === "offline",
    lastOnlineAt: nextOfflineState === "online" ? now : previous.lastOnlineAt,
    networkRestoredAt: recovered ? now : previous.networkRestoredAt,
    appCameOnlineSinceLastOffline,
    connectionKind: params.connectionKind,
    updatedAt: now,
  };

  platformNetworkStore.setState(next);
  if (
    previous.offlineState !== next.offlineState ||
    previous.networkKnownOffline !== next.networkKnownOffline ||
    previous.appCameOnlineSinceLastOffline !== next.appCameOnlineSinceLastOffline
  ) {
    recordPlatformOfflineTelemetry({
      contourKey: "platform_network",
      entityKey: null,
      syncStatus: "idle",
      queueAction: "network_state",
      coalesced: false,
      retryCount: 0,
      pendingCount: 0,
      failureClass: "none",
      triggerKind: "system",
      networkKnownOffline: next.networkKnownOffline,
      restoredAfterReopen: false,
      manualRetry: false,
      durationMs: null,
    });
  }
  return next;
};

const refreshNetworkSnapshot = async (): Promise<PlatformNetworkSnapshot> => {
  try {
    const snapshot = await Network.getNetworkStateAsync();
    return applyNetworkSnapshot({
      isConnected: snapshot.isConnected ?? null,
      isInternetReachable: snapshot.isInternetReachable ?? null,
      connectionKind: normalizeConnectionKind(snapshot.type),
    });
  } catch {
    const previous = platformNetworkStore.getState();
    const next: PlatformNetworkSnapshot = {
      ...previous,
      hydrated: true,
      networkKnownOffline: previous.offlineState === "offline",
      updatedAt: Date.now(),
    };
    platformNetworkStore.setState(next);
    return next;
  }
};

export const ensurePlatformNetworkService = async (): Promise<PlatformNetworkSnapshot> => {
  if (!bootstrapPromise) {
    bootstrapPromise = refreshNetworkSnapshot();
  }

  if (!serviceStarted) {
    serviceStarted = true;
    Network.addNetworkStateListener((snapshot) => {
      applyNetworkSnapshot({
        isConnected: snapshot.isConnected ?? null,
        isInternetReachable: snapshot.isInternetReachable ?? null,
        connectionKind: normalizeConnectionKind(snapshot.type),
      });
    });
  }

  return await bootstrapPromise;
};

export const getPlatformNetworkSnapshot = () => platformNetworkStore.getState();

export const subscribePlatformNetwork = (
  listener: (state: PlatformNetworkSnapshot, previous: PlatformNetworkSnapshot) => void,
) => platformNetworkStore.subscribe(listener);

export const usePlatformNetworkStore = <T,>(
  selector: (state: PlatformNetworkSnapshot) => T,
) => useStore(platformNetworkStore, selector);
