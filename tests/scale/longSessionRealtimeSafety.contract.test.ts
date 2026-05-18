import {
  GREEN_SCALE_LONG_SESSION_REALTIME_SAFETY_READY,
  verifyLongSessionRealtimeSafety,
} from "../../scripts/scale/verifyLongSessionRealtimeSafety";

describe("S_SCALE_11 long session realtime safety", () => {
  it("proves duplicate mount, cleanup, logout, and reconnect safety", async () => {
    const verification = await verifyLongSessionRealtimeSafety(process.cwd());

    expect(verification.final_status).toBe(GREEN_SCALE_LONG_SESSION_REALTIME_SAFETY_READY);
    expect(verification.duplicate_subscribe_ref_counted).toBe(true);
    expect(verification.double_cleanup_safe).toBe(true);
    expect(verification.auth_logout_cleanup_safe).toBe(true);
    expect(verification.reconnect_no_duplicate_channels).toBe(true);
    expect(verification.active_channels_return_to_baseline).toBe(true);
    expect(verification.realtime_disabled_to_pass).toBe(false);
    expect(verification.fake_green_claimed).toBe(false);
    expect(verification.errors).toEqual([]);
  });
});
