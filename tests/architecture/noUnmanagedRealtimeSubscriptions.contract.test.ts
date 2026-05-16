import {
  GREEN_SCALE_REALTIME_SUBSCRIPTION_LIFECYCLE_READY,
  verifyRealtimeSubscriptionLifecycle,
} from "../../scripts/scale/verifyRealtimeSubscriptionLifecycle";

describe("architecture: no unmanaged realtime subscriptions", () => {
  it("requires realtime callsites to be behind owner cleanup or transport boundaries", async () => {
    const verification = await verifyRealtimeSubscriptionLifecycle(process.cwd());

    expect(verification.final_status).toBe(GREEN_SCALE_REALTIME_SUBSCRIPTION_LIFECYCLE_READY);
    expect(verification.unmanaged_realtime_subscriptions_remaining).toBe(0);
    expect(verification.realtime_subscription_manager_added).toBe(true);
    expect(verification.realtime_disabled_to_pass).toBe(false);
    expect(verification.raw_channel_payloads_printed).toBe(false);
  });
});
