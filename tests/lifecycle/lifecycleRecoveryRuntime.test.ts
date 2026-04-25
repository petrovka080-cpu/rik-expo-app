import type { AppStateStatus } from "react-native";

import type { PlatformNetworkSnapshot } from "../../src/lib/offline/platformOffline.model";
import {
  handleLifecycleAppActiveTransition,
  subscribeLifecycleAppActiveTransition,
  subscribeLifecycleNetworkRecovery,
} from "../../src/lib/lifecycle/useAppActiveRevalidation";

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

describe("lifecycle recovery runtime helpers", () => {
  it("dispatches app-active work only for background/inactive to active transitions", () => {
    const appStateRef = { current: "background" as AppStateStatus };
    const onBecameActive = jest.fn();

    const becameActive = handleLifecycleAppActiveTransition({
      appStateRef,
      nextState: "active",
      onBecameActive,
    });

    expect(becameActive).toBe(true);
    expect(appStateRef.current).toBe("active");
    expect(onBecameActive).toHaveBeenCalledTimes(1);

    onBecameActive.mockClear();

    const duplicateActive = handleLifecycleAppActiveTransition({
      appStateRef,
      nextState: "active",
      onBecameActive,
    });

    expect(duplicateActive).toBe(false);
    expect(onBecameActive).not.toHaveBeenCalled();
  });

  it("tears down shared app state listeners exactly once", () => {
    const remove = jest.fn();
    const addAppStateListener = jest.fn((_event, _listener) => ({ remove }));

    const unsubscribe = subscribeLifecycleAppActiveTransition({
      appStateRef: { current: "inactive" as AppStateStatus },
      onBecameActive: jest.fn(),
      addAppStateListener,
    });

    unsubscribe();
    unsubscribe();

    expect(addAppStateListener).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("syncs network state and only dispatches recovery on false to true transitions", () => {
    let listener:
      | ((state: PlatformNetworkSnapshot, previous: PlatformNetworkSnapshot) => void)
      | undefined;
    const networkOnlineRef = { current: null as boolean | null };
    const onRecovered = jest.fn();
    const onNetworkStateChange = jest.fn();
    const subscribeNetwork = jest.fn((nextListener) => {
      listener = nextListener;
      return jest.fn();
    });

    const unsubscribe = subscribeLifecycleNetworkRecovery({
      networkOnlineRef,
      onRecovered,
      onNetworkStateChange,
      subscribeNetwork,
    });

    expect(listener).toBeDefined();

    listener!(
      createNetworkSnapshot({
        offlineState: "online",
        isConnected: true,
        isInternetReachable: true,
      }),
      createNetworkSnapshot({
        offlineState: "offline",
        isConnected: false,
        isInternetReachable: false,
        networkKnownOffline: true,
      }),
    );

    expect(networkOnlineRef.current).toBe(true);
    expect(onNetworkStateChange).toHaveBeenCalledWith(true, false);
    expect(onRecovered).toHaveBeenCalledTimes(1);

    onRecovered.mockClear();
    onNetworkStateChange.mockClear();

    listener!(
      createNetworkSnapshot({
        offlineState: "online",
        isConnected: true,
        isInternetReachable: true,
      }),
      createNetworkSnapshot({
        offlineState: "online",
        isConnected: true,
        isInternetReachable: true,
      }),
    );

    expect(onNetworkStateChange).toHaveBeenCalledWith(true, true);
    expect(onRecovered).not.toHaveBeenCalled();

    unsubscribe();
  });
});
