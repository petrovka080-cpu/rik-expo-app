import {
  getQueueBacklogSnapshot,
  resetQueueBacklogMetrics,
  trackQueueBacklogMetric,
} from "./queueBacklogMetrics";
import { resetPlatformObservabilityEvents } from "./platformObservability";

describe("queueBacklogMetrics", () => {
  beforeEach(() => {
    resetQueueBacklogMetrics();
    resetPlatformObservabilityEvents();
  });

  it("keeps the latest queue size and oldest age snapshot", () => {
    trackQueueBacklogMetric({
      queue: "foreman_mutation",
      size: 12,
      oldestAgeMs: 4500,
      processingCount: 1,
      failedCount: 2,
      retryScheduledCount: 3,
      coalescedCount: 4,
    });

    expect(getQueueBacklogSnapshot()).toEqual([
      expect.objectContaining({
        queue: "foreman_mutation",
        size: 12,
        oldestAgeMs: 4500,
        processingCount: 1,
        failedCount: 2,
        retryScheduledCount: 3,
        coalescedCount: 4,
      }),
    ]);
  });
});
