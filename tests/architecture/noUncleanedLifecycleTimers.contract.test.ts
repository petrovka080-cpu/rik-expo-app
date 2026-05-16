import {
  GREEN_SCALE_TIMER_REALTIME_LIFECYCLE_READY,
  verifyTimerRealtimeLifecycle,
} from "../../scripts/scale/verifyTimerRealtimeLifecycle";

describe("architecture: lifecycle timers must be cleaned or exactly bounded", () => {
  it("has no unclassified production timer findings in the lifecycle inventory", () => {
    const verification = verifyTimerRealtimeLifecycle(process.cwd(), {
      writeArtifacts: false,
    });

    expect(verification.final_status).toBe(GREEN_SCALE_TIMER_REALTIME_LIFECYCLE_READY);
    expect(verification.timerInventory.filter((entry) => entry.status === "finding")).toEqual([]);
    expect(verification.metrics.noBroadWhitelist).toBe(true);
  });

  it("proves delayed map updates are cleared on unmount", () => {
    const verification = verifyTimerRealtimeLifecycle(process.cwd(), {
      writeArtifacts: false,
    });

    expect(verification.metrics.mapDelayedUpdatesCleaned).toBe(true);
  });
});
