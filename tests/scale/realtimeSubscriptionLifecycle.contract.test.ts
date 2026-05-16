import {
  getSnapshot,
  realtimeSubscriptionManager,
} from "../../src/lib/realtime/realtimeSubscriptionManager";
import {
  GREEN_SCALE_REALTIME_SUBSCRIPTION_LIFECYCLE_READY,
  verifyRealtimeSubscriptionLifecycle,
} from "../../scripts/scale/verifyRealtimeSubscriptionLifecycle";

describe("S_SCALE_03 realtime subscription lifecycle", () => {
  afterEach(() => {
    realtimeSubscriptionManager.unsubscribeAll();
  });

  it("ref-counts duplicate channels and cleans up idempotently by owner", async () => {
    let unsubscribeCalls = 0;
    const first = realtimeSubscriptionManager.subscribe(
      "test:director",
      () => ({
        unsubscribe: () => {
          unsubscribeCalls += 1;
        },
      }),
      { key: "test:shared-channel" },
    );
    const second = realtimeSubscriptionManager.subscribe(
      "test:warehouse",
      () => {
        throw new Error("duplicate channel should be ref-counted");
      },
      { key: "test:shared-channel" },
    );

    await Promise.resolve();
    expect(getSnapshot().activeChannelCount).toBe(1);
    expect(getSnapshot().activeSubscriberCount).toBe(2);
    first.dispose();
    first.dispose();
    expect(getSnapshot().activeChannelCount).toBe(1);
    expect(realtimeSubscriptionManager.unsubscribeAllByOwner("test:warehouse")).toBe(1);
    second.dispose();
    await Promise.resolve();
    expect(getSnapshot().activeChannelCount).toBe(0);
    expect(unsubscribeCalls).toBe(1);
  });

  it("has no unmanaged realtime subscription findings", async () => {
    const verification = await verifyRealtimeSubscriptionLifecycle(process.cwd());

    expect(verification.final_status).toBe(GREEN_SCALE_REALTIME_SUBSCRIPTION_LIFECYCLE_READY);
    expect(verification.unmanaged_realtime_subscriptions_remaining).toBe(0);
    expect(verification.realtime_subscription_manager_added).toBe(true);
    expect(verification.active_channels_return_to_baseline).toBe(true);
    expect(verification.findings).toEqual([]);
  });
});
