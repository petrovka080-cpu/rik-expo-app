import {
  GREEN_SCALE_TIMER_LIFECYCLE_CLEANUP_READY,
  verifyTimerLifecycleCleanup,
} from "../../scripts/scale/verifyTimerLifecycleCleanup";

describe("architecture: no untracked production timers", () => {
  it("requires every production timer to have cleanup or a registry owner", async () => {
    const verification = await verifyTimerLifecycleCleanup(process.cwd());

    expect(verification.final_status).toBe(GREEN_SCALE_TIMER_LIFECYCLE_CLEANUP_READY);
    expect(verification.remaining_uncleaned_timer_findings).toBe(0);
    expect(verification.no_broad_whitelist).toBe(true);
    expect(verification.inventory.filter((entry) => entry.status === "finding")).toEqual([]);
  });
});
