import {
  GREEN_SCALE_REALTIME_MANAGER_ENFORCEMENT_READY,
  verifyRealtimeManagerEnforcement,
} from "../../scripts/scale/verifyRealtimeManagerEnforcement";

describe("S_SCALE_11 realtime manager enforcement", () => {
  it("keeps all realtime channels behind exact owners and cleanup boundaries", async () => {
    const verification = await verifyRealtimeManagerEnforcement(process.cwd());

    expect(verification.final_status).toBe(GREEN_SCALE_REALTIME_MANAGER_ENFORCEMENT_READY);
    expect(verification.direct_realtime_channels_remaining).toBe(0);
    expect(verification.unmanaged_subscriptions_remaining).toBe(0);
    expect(verification.all_subscriptions_have_owner).toBe(true);
    expect(verification.unsubscribe_all_by_owner_supported).toBe(true);
    expect(verification.double_cleanup_safe).toBe(true);
    expect(verification.active_channels_return_to_baseline).toBe(true);
    expect(verification.raw_channel_payloads_printed).toBe(false);
    expect(verification.secrets_printed).toBe(false);
    expect(verification.realtime_disabled_to_pass).toBe(false);
    expect(verification.fake_green_claimed).toBe(false);
    expect(verification.findings).toEqual([]);
  });
});
