import {
  getQueueBacklogSnapshot,
  resetQueueBacklogMetrics,
  trackQueueBacklogMetric,
} from "./queueBacklogMetrics";
import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "./platformObservability";
import { SENSITIVE_REDACTION_MARKER } from "../security/redaction";

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

  it("redacts queue drain metric extras before storing observability output", () => {
    trackQueueBacklogMetric({
      queue: "foreman_mutation",
      event: "foreman_mutation_backlog_after_flush",
      size: 1,
      oldestAgeMs: 4500,
      processingCount: 0,
      failedCount: 0,
      retryScheduledCount: 0,
      coalescedCount: 2,
      extra: {
        draftKey: "req-drain?token=drain-secret",
        user: "worker@example.test",
        company: "123 Main Street",
        body: "Bearer body-secret",
      },
    });

    const storedJson = JSON.stringify(getPlatformObservabilityEvents());

    expect(storedJson).toContain(SENSITIVE_REDACTION_MARKER);
    expect(storedJson).not.toContain("drain-secret");
    expect(storedJson).not.toContain("worker@example.test");
    expect(storedJson).not.toContain("123 Main Street");
    expect(storedJson).not.toContain("body-secret");
  });
});
