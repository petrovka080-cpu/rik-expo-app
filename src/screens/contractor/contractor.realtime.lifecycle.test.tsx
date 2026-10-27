import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { useContractorRealtimeLifecycle } from "./contractor.realtime.lifecycle";
import {
  CONTRACTOR_REALTIME_BINDINGS,
  CONTRACTOR_REALTIME_CHANNEL_NAME,
} from "../../lib/realtime/realtime.channels";

const mockSubscribeChannel = jest.fn();
const mockGetPlatformNetworkSnapshot = jest.fn();
const mockRecordPlatformObservability = jest.fn();
const mockRecordPlatformGuardSkip = jest.fn();
const mockIsPlatformGuardCoolingDown = jest.fn();

jest.mock("expo-router", () => {
  const ReactRuntime = require("react");
  return {
    useFocusEffect: (callback: () => void | (() => void)) => {
      ReactRuntime.useEffect(() => callback(), [callback]);
    },
  };
});

jest.mock("../../lib/realtime/realtime.client", () => ({
  subscribeChannel: (...args: unknown[]) => mockSubscribeChannel(...args),
}));

jest.mock("../../lib/offline/platformNetwork.service", () => ({
  getPlatformNetworkSnapshot: (...args: unknown[]) => mockGetPlatformNetworkSnapshot(...args),
}));

jest.mock("../../lib/observability/platformObservability", () => ({
  recordPlatformObservability: (...args: unknown[]) => mockRecordPlatformObservability(...args),
}));

jest.mock("../../lib/observability/platformGuardDiscipline", () => ({
  isPlatformGuardCoolingDown: (...args: unknown[]) => mockIsPlatformGuardCoolingDown(...args),
  recordPlatformGuardSkip: (...args: unknown[]) => mockRecordPlatformGuardSkip(...args),
}));

function Harness(props: {
  focusedRef: React.MutableRefObject<boolean>;
  refreshVisibleContractorScopes: (params: {
    trigger?: "realtime";
    scopes: readonly ("works_bundle" | "inbox_scope")[];
    force?: boolean;
  }) => Promise<void> | void;
  isRefreshInFlight: () => boolean;
}) {
  useContractorRealtimeLifecycle(props);
  return null;
}

describe("useContractorRealtimeLifecycle", () => {
  beforeEach(() => {
    mockSubscribeChannel.mockReset();
    mockGetPlatformNetworkSnapshot.mockReset().mockReturnValue({
      hydrated: false,
      networkKnownOffline: false,
    });
    mockRecordPlatformObservability.mockReset();
    mockRecordPlatformGuardSkip.mockReset();
    mockIsPlatformGuardCoolingDown.mockReset().mockReturnValue(false);
  });

  it("subscribes once, refreshes visible scopes, and cleans up on unmount", async () => {
    const detach = jest.fn();
    let capturedConfig: Record<string, unknown> | null = null;
    mockSubscribeChannel.mockImplementation((config: Record<string, unknown>) => {
      capturedConfig = config;
      return detach;
    });

    const focusedRef = { current: true };
    const refreshVisibleContractorScopes = jest.fn();

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <Harness
          focusedRef={focusedRef}
          refreshVisibleContractorScopes={refreshVisibleContractorScopes}
          isRefreshInFlight={() => false}
        />,
      );
    });

    expect(mockSubscribeChannel).toHaveBeenCalledWith(
      expect.objectContaining({
        name: CONTRACTOR_REALTIME_CHANNEL_NAME,
        scope: "contractor",
        route: "/contractor",
        surface: "screen_root",
        bindings: CONTRACTOR_REALTIME_BINDINGS,
      }),
    );

    await act(async () => {
      (capturedConfig?.onEvent as Function)?.({
        binding: {
          key: "contractor_progress",
          table: "work_progress_log",
          owner: "contractor_realtime",
        },
        payload: { eventType: "INSERT" },
      });
      await Promise.resolve();
    });

    expect(refreshVisibleContractorScopes).toHaveBeenCalledWith({
      trigger: "realtime",
      scopes: ["works_bundle", "inbox_scope"],
      force: true,
    });
    expect(mockRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: "contractor",
        surface: "screen_root",
        event: "realtime_refresh_triggered",
      }),
    );

    await act(async () => {
      renderer.unmount();
    });

    expect(detach).toHaveBeenCalledTimes(1);
  });

  it("resubscribes cleanly on remount and skips refresh while hidden", async () => {
    const detachFirst = jest.fn();
    const detachSecond = jest.fn();
    const configs: Record<string, unknown>[] = [];
    mockSubscribeChannel
      .mockImplementationOnce((config: Record<string, unknown>) => {
        configs.push(config);
        return detachFirst;
      })
      .mockImplementationOnce((config: Record<string, unknown>) => {
        configs.push(config);
        return detachSecond;
      });

    const focusedRef = { current: false };
    const refreshVisibleContractorScopes = jest.fn();

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <Harness
          focusedRef={focusedRef}
          refreshVisibleContractorScopes={refreshVisibleContractorScopes}
          isRefreshInFlight={() => false}
        />,
      );
    });

    await act(async () => {
      (configs[0]?.onEvent as Function)?.({
        binding: {
          key: "contractor_progress",
          table: "work_progress_log",
          owner: "contractor_realtime",
        },
        payload: { eventType: "UPDATE" },
      });
      await Promise.resolve();
    });

    expect(refreshVisibleContractorScopes).not.toHaveBeenCalled();
    expect(mockRecordPlatformGuardSkip).toHaveBeenCalledWith(
      "not_focused",
      expect.objectContaining({
        screen: "contractor",
        surface: "screen_root",
      }),
    );

    await act(async () => {
      renderer.unmount();
    });

    await act(async () => {
      renderer = TestRenderer.create(
        <Harness
          focusedRef={{ current: true }}
          refreshVisibleContractorScopes={refreshVisibleContractorScopes}
          isRefreshInFlight={() => false}
        />,
      );
    });

    expect(mockSubscribeChannel).toHaveBeenCalledTimes(2);
    expect(detachFirst).toHaveBeenCalledTimes(1);

    await act(async () => {
      renderer.unmount();
    });

    expect(detachSecond).toHaveBeenCalledTimes(1);
  });
});
