import { fetchSubmitJobMetrics, JOB_QUEUE_ENABLED } from "./jobQueue";
import { fetchQueueLatencyMetrics, type QueueLatencyMetrics } from "./queueLatencyMetrics";
import type { SubmitJobMetrics } from "./jobQueue";
import { logger } from "../logger";
import { trackQueueBacklogMetric } from "../observability/queueBacklogMetrics";

export type QueueMetricsLoopHandle = { stop: () => void };

type QueueMetricsDeps = {
  fetchSubmitJobMetrics?: () => Promise<SubmitJobMetrics>;
  fetchQueueLatencyMetrics?: () => Promise<QueueLatencyMetrics>;
};

export function startQueueMetricsLoop(
  intervalMs = 60_000,
  deps: QueueMetricsDeps = {},
): QueueMetricsLoopHandle {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const fetchSubmitMetrics = deps.fetchSubmitJobMetrics ?? fetchSubmitJobMetrics;
  const fetchLatencyMetrics = deps.fetchQueueLatencyMetrics ?? fetchQueueLatencyMetrics;

  const tick = async () => {
    if (stopped || !JOB_QUEUE_ENABLED) return;
    try {
      const m = await fetchSubmitMetrics();
      const latency = await fetchLatencyMetrics();
      const oldestPendingMs = latency.oldestPendingAt
        ? Math.max(0, Date.now() - new Date(latency.oldestPendingAt).getTime())
        : 0;
      logger.info("queue.metrics", {
        pending: m.pending,
        processing: m.processing,
        failed: m.failed,
        oldestPendingMs,
        queueDepth: latency.queueDepth,
        queueWaitMs: latency.queueWaitMs,
      });
      trackQueueBacklogMetric({
        queue: "submit_jobs",
        event: "submit_jobs_backlog_metric",
        size: latency.queueDepth,
        oldestAgeMs: oldestPendingMs,
        processingCount: m.processing,
        failedCount: m.failed,
        retryScheduledCount: 0,
        coalescedCount: 0,
        extra: {
          pending: m.pending,
          queueWaitMs: latency.queueWaitMs,
          oldestPendingAt: latency.oldestPendingAt,
        },
      });
    } catch (e: any) {
      logger.warn("queue.metrics", "failed:", String(e?.message ?? e));
    } finally {
      if (!stopped) timer = setTimeout(tick, intervalMs);
    }
  };

  timer = setTimeout(tick, intervalMs);

  return {
    stop: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}
