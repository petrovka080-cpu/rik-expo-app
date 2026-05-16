import {
  clear,
  clearAllByOwner,
  getActiveCount,
  registerInterval,
  registerTimeout,
} from "../../src/lib/lifecycle/timerRegistry";
import {
  GREEN_SCALE_TIMER_LIFECYCLE_CLEANUP_READY,
  verifyTimerLifecycleCleanup,
} from "../../scripts/scale/verifyTimerLifecycleCleanup";

describe("S_SCALE_03 timer lifecycle cleanup", () => {
  afterEach(() => {
    clearAllByOwner("test:timer-owner");
    clearAllByOwner("test:timer-owner-b");
  });

  it("clears timeout, interval, double cleanup, and owner cleanup safely", async () => {
    const baseline = getActiveCount();
    const timeout = registerTimeout("test:timer-owner", () => undefined, 60_000);
    const interval = registerInterval("test:timer-owner", () => undefined, 60_000);
    const other = registerTimeout("test:timer-owner-b", () => undefined, 60_000);

    expect(getActiveCount()).toBe(baseline + 3);
    expect(clear(timeout)).toBe(true);
    expect(clear(timeout)).toBe(false);
    expect(clearAllByOwner("test:timer-owner")).toBe(1);
    expect(getActiveCount()).toBe(baseline + 1);
    other.dispose();
    interval.dispose();
    expect(getActiveCount()).toBe(baseline);
  });

  it("has no untracked production lifecycle timer findings", async () => {
    const verification = await verifyTimerLifecycleCleanup(process.cwd());

    expect(verification.final_status).toBe(GREEN_SCALE_TIMER_LIFECYCLE_CLEANUP_READY);
    expect(verification.remaining_uncleaned_timer_findings).toBe(0);
    expect(verification.timer_registry_added).toBe(true);
    expect(verification.active_timers_return_to_baseline).toBe(true);
    expect(verification.findings).toEqual([]);
  });
});
