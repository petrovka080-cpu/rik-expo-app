import {
  GREEN_SCALE_REALTIME_MANAGER_ENFORCEMENT_READY,
  verifyRealtimeManagerEnforcement,
} from "../../scripts/scale/verifyRealtimeManagerEnforcement";

describe("architecture: no unsafe direct realtime channels", () => {
  it("allows only central manager implementations or exact transport factories", async () => {
    const verification = await verifyRealtimeManagerEnforcement(process.cwd());

    expect(verification.final_status).toBe(GREEN_SCALE_REALTIME_MANAGER_ENFORCEMENT_READY);
    expect(verification.direct_realtime_channels_remaining).toBe(0);
    expect(verification.inventory.filter((entry) => entry.classification === "direct_channel_finding")).toEqual([]);
    expect(verification.inventory.filter((entry) => entry.broadExceptionUsed)).toEqual([]);
    expect(verification.inventory.filter((entry) => entry.rawPayloadPrinted)).toEqual([]);
  });
});
