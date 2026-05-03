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
  buildRealtimeReconnectBackoffPlan,
  clearRealtimeSessionState,
  getRealtimeDebugState,
  REALTIME_ACTIVE_CHANNEL_WARN_AT,
  REALTIME_RECONNECT_BACKOFF_BASE_MS,
  REALTIME_RECONNECT_BACKOFF_MAX_MS,
  redactRealtimeChannelNameForTelemetry,
  subscribeChannel,
} from "../../src/lib/realtime/realtime.client";
import type { RealtimeChannelBinding } from "../../src/lib/realtime/realtime.channels";

type MockRealtimeChannel = {
  name: string;
  on: jest.Mock<MockRealtimeChannel, [string, unknown, unknown]>;
  subscribe: jest.Mock<MockRealtimeChannel, [(status?: string) => void]>;
  unsubscribe: jest.Mock<string, []>;
  postgresHandlers: Array<(payload: unknown) => void>;
  statusCallback: ((status: string) => void) | null;
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
  channel.postgresHandlers = [];
  channel.statusCallback = null;
  channel.on = jest.fn<MockRealtimeChannel, [string, unknown, unknown]>((event, _filter, callback) => {
    if (event === "postgres_changes" && typeof callback === "function") {
      channel.postgresHandlers.push(callback as (payload: unknown) => void);
    }
    return channel;
  });
  channel.subscribe = jest.fn<MockRealtimeChannel, [(status?: string) => void]>((callback) => {
    channel.statusCallback = typeof callback === "function" ? callback : null;
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

  it("shares duplicate channel names and ref-counts cleanup", async () => {
    const onFirstEvent = jest.fn();
    const onSecondEvent = jest.fn();
    const unsubscribeFirst = subscribeChannel({
      name: "buyer:screen:realtime",
      scope: "buyer",
      route: "/buyer",
      surface: "test_realtime",
      bindings: [binding],
      onEvent: onFirstEvent,
    });
    await flushRealtimeSetup();

    const firstChannel = mockChannel.mock.results[0]?.value as MockRealtimeChannel;

    const unsubscribeSecond = subscribeChannel({
      name: "buyer:screen:realtime",
      scope: "buyer",
      route: "/buyer",
      surface: "test_realtime",
      bindings: [binding],
      onEvent: onSecondEvent,
    });
    await flushRealtimeSetup();

    expect(mockChannel).toHaveBeenCalledTimes(1);
    expect(getRealtimeDebugState()).toEqual(
      expect.objectContaining({
        activeChannelCount: 1,
        activeChannelNames: ["buyer:screen:realtime"],
        activeSubscriberCount: 2,
      }),
    );

    firstChannel.postgresHandlers[0]?.({ eventType: "UPDATE", new: { id: "row-1" } });
    expect(onFirstEvent).toHaveBeenCalledTimes(1);
    expect(onSecondEvent).toHaveBeenCalledTimes(1);
    const observabilityJson = JSON.stringify(mockRecordPlatformObservability.mock.calls);
    expect(observabilityJson).not.toContain("row-1");
    expect(observabilityJson).not.toContain("access_token");
    expect(observabilityJson).not.toContain("payload");

    unsubscribeFirst();
    expect(firstChannel.unsubscribe).not.toHaveBeenCalled();
    expect(mockRemoveChannel).not.toHaveBeenCalled();
    expect(getRealtimeDebugState()).toEqual(
      expect.objectContaining({
        activeChannelCount: 1,
        activeSubscriberCount: 1,
      }),
    );

    unsubscribeSecond();
    expect(firstChannel.unsubscribe).toHaveBeenCalledTimes(1);
    expect(mockRemoveChannel).toHaveBeenCalledWith(firstChannel);
    expect(getRealtimeDebugState()).toEqual(
      expect.objectContaining({
        activeChannelCount: 0,
        activeSubscriberCount: 0,
      }),
    );
    expect(mockRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "realtime_channel_duplicate_detected",
        result: "success",
        sourceKind: "supabase:realtime",
        extra: expect.objectContaining({
          channelName: "buyer:screen:realtime",
          reason: "channel_name_shared_ref_counted",
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
        activeSubscriberCount: 0,
        reconnectBackoffAttemptCount: 0,
      }),
    );
  });

  it("builds bounded deterministic reconnect backoff plans with redacted dynamic channel names", () => {
    const first = buildRealtimeReconnectBackoffPlan({
      activeChannelCount: 8,
      attempt: 3,
      channelName: "chat:listing:listing-secret-123",
      reason: "channel_error",
      route: "/chat/listing-secret-123",
      scope: "market",
    });
    const second = buildRealtimeReconnectBackoffPlan({
      activeChannelCount: 8,
      attempt: 3,
      channelName: "chat:listing:listing-secret-123",
      reason: "channel_error",
      route: "/chat/listing-secret-123",
      scope: "market",
    });

    expect(first).toEqual(second);
    expect(first.delayMs).toBeGreaterThanOrEqual(first.baseDelayMs);
    expect(first.delayMs).toBeLessThanOrEqual(REALTIME_RECONNECT_BACKOFF_MAX_MS);
    expect(first.redactedChannelName).toBe("chat:listing:<redacted>");
    expect(redactRealtimeChannelNameForTelemetry("supplier:abc-123")).toBe("supplier:<redacted>");
  });

  it("keeps repeated reconnect failures on nonzero bounded backoff instead of a tight loop", () => {
    const plans = Array.from({ length: 6 }, (_, index) =>
      buildRealtimeReconnectBackoffPlan({
        activeChannelCount: 50,
        attempt: index + 1,
        channelName: "chat:listing:listing-secret-123",
        reason: "channel_error",
        route: "/chat/listing-secret-123",
        scope: "market",
      }),
    );

    for (const plan of plans) {
      expect(plan.delayMs).toBeGreaterThan(0);
      expect(plan.delayMs).toBeGreaterThanOrEqual(REALTIME_RECONNECT_BACKOFF_BASE_MS);
      expect(plan.delayMs).toBeGreaterThanOrEqual(plan.baseDelayMs);
      expect(plan.delayMs).toBeLessThanOrEqual(REALTIME_RECONNECT_BACKOFF_MAX_MS);
      expect(plan.activeChannelSpreadMs).toBeGreaterThan(0);
      expect(plan.redactedChannelName).toBe("chat:listing:<redacted>");
    }

    for (let index = 1; index < plans.length; index += 1) {
      expect(plans[index]!.delayMs).toBeGreaterThanOrEqual(plans[index - 1]!.delayMs);
    }
    expect(plans[plans.length - 1]!.delayMs).toBeGreaterThan(plans[0]!.delayMs);
  });

  it("records reconnect backoff on timeout without logging dynamic channel ids or payloads", async () => {
    subscribeChannel({
      name: "chat:listing:listing-secret-123",
      scope: "market",
      route: "/chat/listing-secret-123",
      surface: "listing_chat",
      bindings: [
        {
          key: "listing_chat_messages",
          table: "chat_messages",
          event: "*",
          filter: "supplier_id=eq.listing-secret-123",
          schema: "public",
          owner: "table:chat_messages",
        },
      ],
      onEvent: jest.fn(),
    });
    await flushRealtimeSetup();

    const channel = mockChannel.mock.results[0]?.value as MockRealtimeChannel;
    channel.statusCallback?.("TIMED_OUT");

    expect(mockRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "realtime_reconnect_backoff_scheduled",
        result: "success",
        sourceKind: "supabase:realtime",
        extra: expect.objectContaining({
          channelName: "chat:listing:<redacted>",
          reason: "timed_out",
          attempt: 1,
          owner: "realtime_reconnect_backoff",
        }),
      }),
    );
    expect(getRealtimeDebugState().reconnectBackoffAttemptCount).toBe(1);

    const logged = JSON.stringify(mockRecordPlatformObservability.mock.calls);
    expect(logged).not.toContain("listing-secret-123");
    expect(logged).not.toContain("payload");
    expect(logged).not.toContain("access_token");
  });
});
