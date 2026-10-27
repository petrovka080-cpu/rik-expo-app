import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import { useWarehouseRealtimeLifecycle } from "./warehouse.realtime.lifecycle";
import { useWarehouseExpenseRealtime } from "./hooks/useWarehouseExpenseRealtime";
import {
  WAREHOUSE_REALTIME_BINDINGS,
  WAREHOUSE_REALTIME_CHANNEL_NAME,
} from "../../lib/realtime/realtime.channels";
import { WAREHOUSE_TABS } from "./warehouse.types";
import type { WarehouseScreenActiveRef } from "./hooks/useWarehouseScreenActivity";

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
  getPlatformNetworkSnapshot: (...args: unknown[]) =>
    mockGetPlatformNetworkSnapshot(...args),
}));

jest.mock("../../lib/observability/platformObservability", () => ({
  recordPlatformObservability: (...args: unknown[]) =>
    mockRecordPlatformObservability(...args),
}));

jest.mock("../../lib/observability/platformGuardDiscipline", () => ({
  isPlatformGuardCoolingDown: (...args: unknown[]) =>
    mockIsPlatformGuardCoolingDown(...args),
  recordPlatformGuardSkip: (...args: unknown[]) =>
    mockRecordPlatformGuardSkip(...args),
}));

function Harness(props: {
  tab: (typeof WAREHOUSE_TABS)[number];
  refreshIncoming: () => Promise<void>;
  refreshExpense: () => Promise<void>;
  isIncomingRefreshInFlight: () => boolean;
  isExpenseRefreshInFlight: () => boolean;
  screenActiveRef?: WarehouseScreenActiveRef;
}) {
  useWarehouseRealtimeLifecycle(props);
  return null;
}

type MockWarehouseExpenseChannel = {
  on: jest.Mock<MockWarehouseExpenseChannel, [string, unknown, () => void]>;
  subscribe: jest.Mock<MockWarehouseExpenseChannel, []>;
  unsubscribe: jest.Mock<void, []>;
};

const buildMockWarehouseExpenseChannel = (): MockWarehouseExpenseChannel => {
  const channel = {} as MockWarehouseExpenseChannel;
  channel.on = jest.fn<MockWarehouseExpenseChannel, [string, unknown, () => void]>(
    () => channel,
  );
  channel.subscribe = jest.fn<MockWarehouseExpenseChannel, []>(() => channel);
  channel.unsubscribe = jest.fn<void, []>();
  return channel;
};

function ExpenseRealtimeHarness(props: {
  supabase: {
    channel: jest.Mock;
    removeChannel: jest.Mock;
  };
  fetchReqHeadsForce: () => Promise<void>;
}) {
  useWarehouseExpenseRealtime({
    supabase: props.supabase as never,
    tab: WAREHOUSE_TABS[2],
    fetchReqHeadsForce: props.fetchReqHeadsForce,
    screenActiveRef: { current: true },
  });
  return null;
}

describe("useWarehouseRealtimeLifecycle", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockSubscribeChannel.mockReset();
    mockGetPlatformNetworkSnapshot.mockReset().mockReturnValue({
      hydrated: false,
      networkKnownOffline: false,
    });
    mockRecordPlatformObservability.mockReset();
    mockRecordPlatformGuardSkip.mockReset();
    mockIsPlatformGuardCoolingDown.mockReset().mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("refreshes the incoming scope on the matching tab and cleans up on unmount", async () => {
    const detach = jest.fn();
    let capturedConfig: Record<string, unknown> | null = null;
    mockSubscribeChannel.mockImplementation(
      (config: Record<string, unknown>) => {
        capturedConfig = config;
        return detach;
      },
    );

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
        route: "/office/warehouse",
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

    // P0: detach is now deferred via setTimeout(0)
    jest.runAllTimers();
    expect(detach).toHaveBeenCalledTimes(1);
  });

  it("routes expense refreshes by active tab and skips mismatched tabs without duplicate churn", async () => {
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

    // P0: detach is now deferred via setTimeout(0)
    jest.runAllTimers();

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

    // P0: detach is now deferred via setTimeout(0)
    jest.runAllTimers();
    expect(detachSecond).toHaveBeenCalledTimes(1);
  });

  it("suppresses realtime refreshes after the warehouse screen is inactive", async () => {
    const detach = jest.fn();
    let capturedConfig: Record<string, unknown> | null = null;
    mockSubscribeChannel.mockImplementation(
      (config: Record<string, unknown>) => {
        capturedConfig = config;
        return detach;
      },
    );

    const refreshIncoming = jest.fn().mockResolvedValue(undefined);
    const refreshExpense = jest.fn().mockResolvedValue(undefined);
    const screenActiveRef = { current: false };

    await act(async () => {
      TestRenderer.create(
        <Harness
          tab={WAREHOUSE_TABS[0]}
          refreshIncoming={refreshIncoming}
          refreshExpense={refreshExpense}
          isIncomingRefreshInFlight={() => false}
          isExpenseRefreshInFlight={() => false}
          screenActiveRef={screenActiveRef}
        />,
      );
    });

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

    expect(refreshIncoming).not.toHaveBeenCalled();
    expect(refreshExpense).not.toHaveBeenCalled();
  });
});

describe("useWarehouseExpenseRealtime lifecycle", () => {
  beforeEach(() => {
    mockSubscribeChannel.mockReset();
  });

  it("shares the warehouse screen channel and detaches on cleanup", async () => {
    const detach = jest.fn();
    mockSubscribeChannel.mockReturnValue(detach);
    const channel = buildMockWarehouseExpenseChannel();
    const supabase = {
      channel: jest.fn(() => channel),
      removeChannel: jest.fn(),
    };

    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <ExpenseRealtimeHarness
          supabase={supabase}
          fetchReqHeadsForce={jest.fn().mockResolvedValue(undefined)}
        />,
      );
    });

    expect(mockSubscribeChannel).toHaveBeenCalledWith(
      expect.objectContaining({
        client: supabase,
        name: WAREHOUSE_REALTIME_CHANNEL_NAME,
        scope: "warehouse",
        route: "/office/warehouse",
        surface: "expense_realtime",
        bindings: WAREHOUSE_REALTIME_BINDINGS,
      }),
    );
    expect(supabase.channel).not.toHaveBeenCalled();
    expect(channel.subscribe).not.toHaveBeenCalled();

    await act(async () => {
      renderer.unmount();
    });

    expect(detach).toHaveBeenCalledTimes(1);
    expect(channel.unsubscribe).not.toHaveBeenCalled();
    expect(supabase.removeChannel).not.toHaveBeenCalled();
  });
});
