import {
  GREEN_SCALE_TIMER_REALTIME_LIFECYCLE_READY,
  verifyTimerRealtimeLifecycle,
} from "../../scripts/scale/verifyTimerRealtimeLifecycle";

describe("S_SCALE_03 timer and realtime lifecycle closeout", () => {
  it("keeps audited lifecycle timers cancellable or exactly bounded", () => {
    const verification = verifyTimerRealtimeLifecycle(process.cwd(), {
      writeArtifacts: false,
    });

    expect(verification.final_status).toBe(GREEN_SCALE_TIMER_REALTIME_LIFECYCLE_READY);
    expect(verification.metrics.remainingUncleanedLifecycleTimerFindings).toBe(0);
    expect(verification.metrics.cancellableDelayPrimitiveAdded).toBe(true);
    expect(verification.metrics.busyActionTimeoutCancellable).toBe(true);
    expect(verification.metrics.authSettleTimerCancellable).toBe(true);
    expect(verification.metrics.realtimeJoinBackoffCancellable).toBe(true);
    expect(verification.metrics.warehouseDeferredDetachBounded).toBe(true);
    expect(verification.findings).toEqual([]);
  });

  it("keeps realtime subscriptions behind cleanup-capable lifecycle boundaries", () => {
    const verification = verifyTimerRealtimeLifecycle(process.cwd(), {
      writeArtifacts: false,
    });

    expect(verification.metrics.realtimeRefCountingPresent).toBe(true);
    expect(verification.metrics.realtimeSessionClearDisposesPendingJoin).toBe(true);
    expect(verification.metrics.silentBroadcastSubscribeTimeoutBounded).toBe(true);
    expect(verification.metrics.directRealtimeCallsitesClassified).toBe(true);
    expect(verification.realtimeInventory.every((entry) => entry.status === "safe")).toBe(true);
  });
});
