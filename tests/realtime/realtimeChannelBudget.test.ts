/* eslint-disable import/first */
const mockRecordPlatformObservability = jest.fn();

jest.mock("../../src/lib/observability/platformObservability", () => ({
  recordPlatformObservability: (...args: unknown[]) => mockRecordPlatformObservability(...args),
}));

import {
  claimRealtimeChannel,
  getRealtimeBudgetSnapshot,
  resetRealtimeBudgetForTests,
} from "../../src/lib/realtime/realtime.channels";

const claim = (key: string, source = "test.source", maxChannelsForSource = 2) =>
  claimRealtimeChannel({
    key,
    source,
    screen: "buyer",
    surface: "test_realtime",
    route: "/buyer",
    maxChannelsForSource,
  });

describe("realtimeChannelBudget", () => {
  beforeEach(() => {
    resetRealtimeBudgetForTests();
    mockRecordPlatformObservability.mockReset();
  });

  afterEach(() => {
    resetRealtimeBudgetForTests();
  });

  it("claims the first channel and exposes a safe snapshot", () => {
    const first = claim("buyer:screen:realtime");

    expect(first.status).toBe("claimed");
    expect(getRealtimeBudgetSnapshot()).toEqual({
      activeCount: 1,
      activeKeys: ["buyer:screen:realtime"],
      activeSources: ["test.source"],
    });
  });

  it("detects duplicate keys without logging row payloads", () => {
    claim("buyer:screen:realtime");
    const duplicate = claim("buyer:screen:realtime");

    expect(duplicate.status).toBe("duplicate");
    expect(mockRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "realtime_channel_duplicate_detected",
        result: "skipped",
        sourceKind: "supabase:realtime",
        extra: expect.objectContaining({
          key: "buyer:screen:realtime",
          source: "test.source",
          owner: "realtime_channel_budget",
        }),
      }),
    );
    const logged = JSON.stringify(mockRecordPlatformObservability.mock.calls);
    expect(logged).not.toContain("payload");
    expect(logged).not.toContain("access_token");
    expect(logged).not.toContain("signedUrl");
  });

  it("releases keys idempotently", () => {
    const first = claim("buyer:screen:realtime");

    first.release();
    first.release();

    expect(getRealtimeBudgetSnapshot()).toEqual({
      activeCount: 0,
      activeKeys: [],
      activeSources: [],
    });
  });

  it("reports over-budget source status while still tracking the channel", () => {
    claim("channel-one", "buyer.subscriptions", 1);
    const second = claim("channel-two", "buyer.subscriptions", 1);

    expect(second.status).toBe("over_budget");
    expect(getRealtimeBudgetSnapshot().activeKeys).toEqual(["channel-one", "channel-two"]);
    expect(mockRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "realtime_channel_budget_warning",
        result: "error",
        extra: expect.objectContaining({
          source: "buyer.subscriptions",
          activeForSource: 2,
          maxChannelsForSource: 1,
        }),
      }),
    );
  });

  it("resetRealtimeBudgetForTests clears all active state", () => {
    claim("channel-one");
    claim("channel-two");

    resetRealtimeBudgetForTests();

    expect(getRealtimeBudgetSnapshot()).toEqual({
      activeCount: 0,
      activeKeys: [],
      activeSources: [],
    });
  });
});
