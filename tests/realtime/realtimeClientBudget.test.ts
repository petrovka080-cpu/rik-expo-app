/* eslint-disable import/first */
const mockGetSession = jest.fn();
const mockSetAuth = jest.fn();
const mockChannel = jest.fn();
const mockRemoveChannel = jest.fn();
const mockRecordPlatformObservability = jest.fn();

jest.mock("../../src/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
    realtime: {
      setAuth: (...args: unknown[]) => mockSetAuth(...args),
    },
    channel: (...args: unknown[]) => mockChannel(...args),
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
  },
}));

jest.mock("../../src/lib/observability/platformObservability", () => ({
  recordPlatformObservability: (...args: unknown[]) => mockRecordPlatformObservability(...args),
}));

import {
  clearRealtimeSessionState,
  getRealtimeDebugState,
  REALTIME_ACTIVE_CHANNEL_WARN_AT,
  subscribeChannel,
} from "../../src/lib/realtime/realtime.client";
import type { RealtimeChannelBinding } from "../../src/lib/realtime/realtime.channels";

type MockRealtimeChannel = {
  name: string;
  on: jest.Mock<MockRealtimeChannel, [string, unknown, unknown]>;
  subscribe: jest.Mock<MockRealtimeChannel, [(status?: string) => void]>;
  unsubscribe: jest.Mock<string, []>;
};

const binding: RealtimeChannelBinding = {
  key: "test_binding",
  table: "requests",
  event: "*",
  schema: "public",
  owner: "test",
};

const flushRealtimeSetup = async () => {
  for (let index = 0; index < 6; index += 1) {
    await Promise.resolve();
  }
};

const buildChannel = (name: string): MockRealtimeChannel => {
  const channel = {} as MockRealtimeChannel;
  channel.name = name;
  channel.on = jest.fn<MockRealtimeChannel, [string, unknown, unknown]>(() => channel);
  channel.subscribe = jest.fn<MockRealtimeChannel, [(status?: string) => void]>((callback) => {
    callback?.("SUBSCRIBED");
    return channel;
  });
  channel.unsubscribe = jest.fn<string, []>(() => "ok");
  return channel;
};

const subscribeTestChannel = (name: string) =>
  subscribeChannel({
    name,
    scope: "buyer",
    route: "/buyer",
    surface: "test_realtime",
    bindings: [binding],
    onEvent: jest.fn(),
  });

describe("realtime client budget observability", () => {
  beforeEach(() => {
    clearRealtimeSessionState();
    mockGetSession.mockReset().mockResolvedValue({
      data: { session: { access_token: "test-access-token" } },
    });
    mockSetAuth.mockReset().mockResolvedValue(undefined);
    mockRemoveChannel.mockReset();
    mockRecordPlatformObservability.mockReset();
    mockChannel.mockReset().mockImplementation((name: string) => buildChannel(name));
  });

  afterEach(() => {
    clearRealtimeSessionState();
  });

  it("reports duplicate channel names while replacing the previous channel", async () => {
    subscribeTestChannel("buyer:screen:realtime");
    await flushRealtimeSetup();

    const firstChannel = mockChannel.mock.results[0]?.value as MockRealtimeChannel;

    subscribeTestChannel("buyer:screen:realtime");
    await flushRealtimeSetup();

    expect(firstChannel.unsubscribe).toHaveBeenCalledTimes(1);
    expect(mockRemoveChannel).toHaveBeenCalledWith(firstChannel);
    expect(getRealtimeDebugState()).toEqual(
      expect.objectContaining({
        activeChannelCount: 1,
        activeChannelNames: ["buyer:screen:realtime"],
      }),
    );
    expect(mockRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "realtime_channel_duplicate_detected",
        result: "skipped",
        sourceKind: "supabase:realtime",
        extra: expect.objectContaining({
          channelName: "buyer:screen:realtime",
          reason: "channel_name_replaced",
          owner: "realtime_lifecycle",
        }),
      }),
    );
  });

  it("reports budget warning signals without blocking channel creation", async () => {
    for (let index = 0; index < REALTIME_ACTIVE_CHANNEL_WARN_AT; index += 1) {
      subscribeTestChannel(`test-channel-${index}`);
      await flushRealtimeSetup();
    }

    expect(getRealtimeDebugState()).toEqual(
      expect.objectContaining({
        activeChannelCount: REALTIME_ACTIVE_CHANNEL_WARN_AT,
      }),
    );
    expect(mockRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "realtime_channel_budget_warning",
        result: "success",
        sourceKind: "supabase:realtime",
        extra: expect.objectContaining({
          activeChannelCount: REALTIME_ACTIVE_CHANNEL_WARN_AT,
          reason: "active_channel_warning_threshold",
          owner: "realtime_lifecycle",
        }),
      }),
    );
  });

  it("clears debug state on realtime session reset", async () => {
    subscribeTestChannel("test-channel-reset");
    await flushRealtimeSetup();

    expect(getRealtimeDebugState().activeChannelCount).toBe(1);

    clearRealtimeSessionState();

    expect(getRealtimeDebugState()).toEqual(
      expect.objectContaining({
        activeChannelCount: 0,
        activeChannelNames: [],
        activeBindingCount: 0,
      }),
    );
  });
});
