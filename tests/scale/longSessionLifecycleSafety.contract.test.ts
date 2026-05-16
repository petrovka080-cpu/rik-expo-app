import {
  GREEN_SCALE_TIMER_REALTIME_LIFECYCLE_READY,
  verifyLongSessionLifecycleSafety,
} from "../../scripts/scale/verifyLongSessionLifecycleSafety";

describe("S_SCALE_03 long-session lifecycle safety", () => {
  it("returns timers and realtime channels to baseline after repeated navigation simulation", async () => {
    const verification = await verifyLongSessionLifecycleSafety(process.cwd(), {
      writeArtifacts: false,
    });

    expect(verification.final_status).toBe(GREEN_SCALE_TIMER_REALTIME_LIFECYCLE_READY);
    expect(verification.long_session_simulation_pass).toBe(true);
    expect(verification.active_timers_return_to_baseline).toBe(true);
    expect(verification.active_channels_return_to_baseline).toBe(true);
    expect(verification.new_hooks_added).toBe(false);
    expect(verification.realtime_disabled_to_pass).toBe(false);
    expect(verification.business_logic_changed).toBe(false);
  });
});
