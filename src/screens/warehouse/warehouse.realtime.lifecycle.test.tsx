import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { useWarehouseRealtimeLifecycle } from "./warehouse.realtime.lifecycle";
import {
  WAREHOUSE_REALTIME_BINDINGS,
  WAREHOUSE_REALTIME_CHANNEL_NAME,
} from "../../lib/realtime/realtime.channels";
import { WAREHOUSE_TABS } from "./warehouse.types";

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
  tab: (typeof WAREHOUSE_TABS)[number];
  refreshIncoming: () => Promise<void>;
  refreshExpense: () => Promise<void>;
  isIncomingRefreshInFlight: () => boolean;
  isExpenseRefreshInFlight: () => boolean;
}) {
  useWarehouseRealtimeLifecycle(props);
  return null;
}

describe("useWarehouseRealtimeLifecycle", () => {
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

  it("refreshes the incoming scope on the matching tab and cleans up on unmount", async () => {
    const detach = jest.fn();
    let capturedConfig: Record<string, unknown> | null = null;
    mockSubscribeChannel.mockImplementation((config: Record<string, unknown>) => {
      capturedConfig = config;
      return detach;
    });

    const refreshIncoming = jest.fn().mockResolvedValue(undefined);
    const refreshExpense = jest.fn().mockResolvedValue(undefined);

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <Harness
          tab={WAREHOUSE_TABS[0]}
          refreshIncoming={refreshIncoming}
          refreshExpense={refreshExpense}
          isIncomingRefreshInFlight={() => false}
          isExpenseRefreshInFlight={() => false}
        />,
      );
    });

    expect(mockSubscribeChannel).toHaveBeenCalledWith(
      expect.objectContaining({
        name: WAREHOUSE_REALTIME_CHANNEL_NAME,
        scope: "warehouse",
        route: "/warehouse",
        surface: "screen_root",
        bindings: WAREHOUSE_REALTIME_BINDINGS,
      }),
    );

    await act(async () => {
      (capturedConfig?.onEvent as Function)?.({
        binding: {
          key: "warehouse_incoming_items",
          table: "incoming_items",
          owner: "warehouse_realtime",
        },
        payload: { eventType: "UPDATE" },
      });
      await Promise.resolve();
    });

    expect(refreshIncoming).toHaveBeenCalledTimes(1);
    expect(refreshExpense).not.toHaveBeenCalled();
    expect(mockRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: "warehouse",
        surface: "screen_root",
        event: "realtime_refresh_triggered",
      }),
    );

    await act(async () => {
      renderer.unmount();
    });

    expect(detach).toHaveBeenCalledTimes(1);
  });

  it("routes expense refreshes by active tab and skips mismatched tabs without duplicate churn", async () => {
    const detachFirst = jest.fn();
    const detachSecond = jest.fn();
    const configs: Array<Record<string, unknown>> = [];
    mockSubscribeChannel
      .mockImplementationOnce((config: Record<string, unknown>) => {
        configs.push(config);
        return detachFirst;
      })
      .mockImplementationOnce((config: Record<string, unknown>) => {
        configs.push(config);
        return detachSecond;
      });

    const refreshIncoming = jest.fn().mockResolvedValue(undefined);
    const refreshExpense = jest.fn().mockResolvedValue(undefined);

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <Harness
          tab={WAREHOUSE_TABS[0]}
          refreshIncoming={refreshIncoming}
          refreshExpense={refreshExpense}
          isIncomingRefreshInFlight={() => false}
          isExpenseRefreshInFlight={() => false}
        />,
      );
    });

    await act(async () => {
      (configs[0]?.onEvent as Function)?.({
        binding: {
          key: "warehouse_expense_requests",
          table: "warehouse_issues",
          owner: "warehouse_realtime",
        },
        payload: { eventType: "UPDATE" },
      });
      await Promise.resolve();
    });

    expect(refreshExpense).not.toHaveBeenCalled();
    expect(mockRecordPlatformGuardSkip).toHaveBeenCalledWith(
      "inactive_tab",
      expect.objectContaining({
        screen: "warehouse",
        surface: "screen_root",
      }),
    );

    await act(async () => {
      renderer.unmount();
    });

    await act(async () => {
      renderer = TestRenderer.create(
        <Harness
          tab={WAREHOUSE_TABS[2]}
          refreshIncoming={refreshIncoming}
          refreshExpense={refreshExpense}
          isIncomingRefreshInFlight={() => false}
          isExpenseRefreshInFlight={() => false}
        />,
      );
    });

    await act(async () => {
      (configs[1]?.onEvent as Function)?.({
        binding: {
          key: "warehouse_expense_requests",
          table: "warehouse_issues",
          owner: "warehouse_realtime",
        },
        payload: { eventType: "INSERT" },
      });
      await Promise.resolve();
    });

    expect(mockSubscribeChannel).toHaveBeenCalledTimes(2);
    expect(detachFirst).toHaveBeenCalledTimes(1);
    expect(refreshExpense).toHaveBeenCalledTimes(1);

    await act(async () => {
      renderer.unmount();
    });

    expect(detachSecond).toHaveBeenCalledTimes(1);
  });
});
