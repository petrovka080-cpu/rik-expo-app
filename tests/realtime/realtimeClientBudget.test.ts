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
  REALTIME_INITIAL_JOIN_BASE_DELAY_MS,
  REALTIME_INITIAL_JOIN_STAGGER_MAX_MS,
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
  for (let index = 0; index < 20; index += 1) {
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

  it("keeps initial realtime joins after first paint instead of racing route startup", () => {
    const plan = buildRealtimeReconnectBackoffPlan({
      activeChannelCount: 0,
      attempt: 1,
      channelName: "director:screen",
      reason: "initial_join",
      route: "/office/director",
      scope: "director",
    });

    expect(plan.baseDelayMs).toBe(REALTIME_INITIAL_JOIN_BASE_DELAY_MS);
    expect(plan.delayMs).toBeGreaterThanOrEqual(REALTIME_INITIAL_JOIN_BASE_DELAY_MS);
    expect(plan.delayMs).toBeLessThanOrEqual(
      REALTIME_INITIAL_JOIN_BASE_DELAY_MS + REALTIME_INITIAL_JOIN_STAGGER_MAX_MS,
    );
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

  it("does not deliver an old session event to a new same-name subscription", async () => {
    subscribeTestChannel("buyer:session-reused");
    await flushRealtimeSetup();
    const oldChannel = mockChannel.mock.results[0]!.value as MockRealtimeChannel;
    clearRealtimeSessionState();
    const onNew = jest.fn();
    subscribeChannel({ name: "buyer:session-reused", scope: "buyer", route: "/buyer", bindings: [binding], onEvent: onNew });
    await flushRealtimeSetup();
    const newChannel = mockChannel.mock.results[1]!.value as MockRealtimeChannel;
    oldChannel.postgresHandlers[0]!({ eventType: "UPDATE", new: { id: "old-session-row" } });
    expect(onNew).not.toHaveBeenCalled();
    newChannel.postgresHandlers[0]!({ eventType: "UPDATE", new: { id: "new-session-row" } });
    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it("an old primary disposer cannot remove the reused subscriber token after logout", async () => {
    const disposeOld = subscribeTestChannel("buyer:disposer-reused");
    await flushRealtimeSetup();
    clearRealtimeSessionState();
    const disposeNew = subscribeTestChannel("buyer:disposer-reused");
    await flushRealtimeSetup();
    const newChannel = mockChannel.mock.results[1]!.value as MockRealtimeChannel;
    disposeOld();
    expect(getRealtimeDebugState().activeSubscriberCount).toBe(1);
    expect(newChannel.unsubscribe).not.toHaveBeenCalled();
    disposeNew();
    expect(getRealtimeDebugState().activeSubscriberCount).toBe(0);
    expect(newChannel.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("an old shared disposer cannot remove a new session's second subscriber", async () => {
    subscribeTestChannel("buyer:shared-disposer");
    const disposeOldShared = subscribeTestChannel("buyer:shared-disposer");
    await flushRealtimeSetup();
    clearRealtimeSessionState();
    subscribeTestChannel("buyer:shared-disposer");
    const onNewSecond = jest.fn();
    subscribeChannel({ name: "buyer:shared-disposer", scope: "buyer", route: "/buyer", bindings: [binding], onEvent: onNewSecond });
    await flushRealtimeSetup();
    disposeOldShared();
    expect(getRealtimeDebugState().activeSubscriberCount).toBe(2);
    const newChannel = mockChannel.mock.results[1]!.value as MockRealtimeChannel;
    newChannel.postgresHandlers[0]!({ eventType: "UPDATE", new: { id: "new-row" } });
    expect(onNewSecond).toHaveBeenCalledTimes(1);
  });

  it("ignores late payloads and status from a replaced binding entry", async () => {
    const disposeOld = subscribeTestChannel("buyer:binding-replaced");
    await flushRealtimeSetup();
    const oldChannel = mockChannel.mock.results[0]!.value as MockRealtimeChannel;
    const onNew = jest.fn();
    subscribeChannel({ name: "buyer:binding-replaced", scope: "buyer", route: "/buyer", bindings: [{ ...binding, filter: "id=eq.new" }], onEvent: onNew });
    await flushRealtimeSetup();
    oldChannel.postgresHandlers[0]!({ eventType: "UPDATE", new: { id: "old-row" } });
    oldChannel.statusCallback!("TIMED_OUT");
    disposeOld();
    expect(onNew).not.toHaveBeenCalled();
    expect(getRealtimeDebugState().reconnectBackoffAttemptCount).toBe(0);
    expect(getRealtimeDebugState().activeSubscriberCount).toBe(1);
  });

  it("stops dispatch when the first subscriber resets the session", async () => {
    const onNew = jest.fn();
    subscribeChannel({ name: "buyer:dispatch-reset", scope: "buyer", route: "/buyer", bindings: [binding], onEvent: () => {
      clearRealtimeSessionState();
      subscribeChannel({ name: "buyer:dispatch-reset", scope: "buyer", route: "/buyer", bindings: [binding], onEvent: onNew });
    } });
    const onOldSecond = jest.fn();
    subscribeChannel({ name: "buyer:dispatch-reset", scope: "buyer", route: "/buyer", bindings: [binding], onEvent: onOldSecond });
    await flushRealtimeSetup();
    const oldChannel = mockChannel.mock.results[0]!.value as MockRealtimeChannel;
    oldChannel.postgresHandlers[0]!({ eventType: "UPDATE", new: { id: "old-row" } });
    expect(onOldSecond).not.toHaveBeenCalled();
    expect(onNew).not.toHaveBeenCalled();
    await flushRealtimeSetup();
    expect(getRealtimeDebugState().activeSubscriberCount).toBe(1);
  });

  it("does not set an old token when getSession finishes after session reset", async () => {
    let releaseOld!: (value: { data: { session: { access_token: string } } }) => void;
    mockGetSession.mockImplementationOnce(() => new Promise((resolve) => { releaseOld = resolve; }));
    subscribeTestChannel("buyer:auth-get-reset");
    await flushRealtimeSetup();
    clearRealtimeSessionState();
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "new-actor-token" } } });
    subscribeTestChannel("buyer:auth-get-reset");
    releaseOld({ data: { session: { access_token: "old-actor-token" } } });
    await flushRealtimeSetup();
    expect(mockSetAuth.mock.calls).toEqual([["new-actor-token"]]);
    expect(mockChannel).toHaveBeenCalledTimes(1);
  });

  it("orders a new actor's setAuth after an in-flight old setAuth completes", async () => {
    let releaseOld!: () => void;
    const appliedTokens: string[] = [];
    mockGetSession.mockResolvedValueOnce({ data: { session: { access_token: "old-inflight-token" } } });
    mockSetAuth.mockImplementationOnce(async (token: string) => {
      await new Promise<void>((resolve) => { releaseOld = resolve; });
      appliedTokens.push(token);
    }).mockImplementation(async (token: string) => { appliedTokens.push(token); });
    subscribeTestChannel("buyer:auth-set-reset");
    await flushRealtimeSetup();
    clearRealtimeSessionState();
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "new-current-token" } } });
    subscribeTestChannel("buyer:auth-set-reset");
    await flushRealtimeSetup();
    expect(mockSetAuth).toHaveBeenCalledTimes(1);
    expect(mockChannel).not.toHaveBeenCalled();
    releaseOld();
    await flushRealtimeSetup();
    expect(appliedTokens).toEqual(["old-inflight-token", "new-current-token"]);
    expect(mockChannel).toHaveBeenCalledTimes(1);
  });

  it("does not share a same-name channel or cached auth across distinct clients", async () => {
    subscribeTestChannel("buyer:distinct-client");
    await flushRealtimeSetup();
    const otherSetAuth = jest.fn().mockResolvedValue(undefined);
    const otherChannel = jest.fn((name: string) => buildChannel(name));
    const client = {
      auth: { getSession: mockGetSession }, realtime: { setAuth: otherSetAuth },
      channel: otherChannel, removeChannel: jest.fn(),
    } as unknown as NonNullable<Parameters<typeof subscribeChannel>[0]["client"]>;
    const onOther = jest.fn();
    subscribeChannel({ client, name: "buyer:distinct-client", scope: "buyer", route: "/buyer", bindings: [binding], onEvent: onOther });
    await flushRealtimeSetup();
    expect(otherSetAuth).toHaveBeenCalledWith("test-access-token");
    expect(otherChannel).toHaveBeenCalledTimes(1);
    const oldChannel = mockChannel.mock.results[0]!.value as MockRealtimeChannel;
    oldChannel.postgresHandlers[0]!({ eventType: "UPDATE", new: { id: "old-client-row" } });
    expect(onOther).not.toHaveBeenCalled();
  });


  it("a pending old getSession cannot block the new actor's channel", async () => {
    let releaseOld!: (value: { data: { session: { access_token: string } } }) => void;
    mockGetSession.mockImplementationOnce(() => new Promise((resolve) => { releaseOld = resolve; }));
    subscribeTestChannel("buyer:old-read-pending");
    await flushRealtimeSetup();
    clearRealtimeSessionState();
    mockGetSession.mockResolvedValue({ data: { session: { access_token: "new-live-token" } } });
    subscribeTestChannel("buyer:old-read-pending");
    await flushRealtimeSetup();
    try {
      expect(mockSetAuth.mock.calls).toEqual([["new-live-token"]]);
      expect(mockChannel).toHaveBeenCalledTimes(1);
    } finally {
      releaseOld({ data: { session: { access_token: "old-stale-token" } } });
      await flushRealtimeSetup();
    }
    expect(mockSetAuth.mock.calls).toEqual([["new-live-token"]]);
  });

  it("an unrelated client can authenticate while the first client's setAuth is pending", async () => {
    let releaseOld!: () => void;
    mockSetAuth.mockImplementationOnce(() => new Promise<void>((resolve) => { releaseOld = resolve; }));
    subscribeTestChannel("buyer:first-client-pending");
    await flushRealtimeSetup();
    const otherSetAuth = jest.fn().mockResolvedValue(undefined);
    const otherChannel = jest.fn((name: string) => buildChannel(name));
    const client = {
      auth: { getSession: mockGetSession }, realtime: { setAuth: otherSetAuth },
      channel: otherChannel, removeChannel: jest.fn(),
    } as unknown as NonNullable<Parameters<typeof subscribeChannel>[0]["client"]>;
    subscribeChannel({ client, name: "buyer:other-client-ready", scope: "buyer", route: "/buyer", bindings: [binding], onEvent: jest.fn() });
    await flushRealtimeSetup();
    try {
      expect(otherSetAuth).toHaveBeenCalledWith("test-access-token");
      expect(otherChannel).toHaveBeenCalledTimes(1);
    } finally {
      releaseOld();
      await flushRealtimeSetup();
    }
  });
});
