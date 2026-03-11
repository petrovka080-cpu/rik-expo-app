import { fetchSubmitJobMetrics, JOB_QUEUE_ENABLED } from "./jobQueue";
import { fetchQueueLatencyMetrics } from "./queueLatencyMetrics";

export type QueueMetricsLoopHandle = { stop: () => void };

export function startQueueMetricsLoop(intervalMs = 60_000): QueueMetricsLoopHandle {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const tick = async () => {
    if (stopped || !JOB_QUEUE_ENABLED) return;
    try {
      const m = await fetchSubmitJobMetrics();
      const latency = await fetchQueueLatencyMetrics();
      const oldestPendingMs = latency.oldestPendingAt
        ? Math.max(0, Date.now() - new Date(latency.oldestPendingAt).getTime())
        : 0;
      console.info("[queue.metrics]", {
        pending: m.pending,
        processing: m.processing,
        failed: m.failed,
        oldestPendingMs,
        queueDepth: latency.queueDepth,
        queueWaitMs: latency.queueWaitMs,
      });
    } catch (e: any) {
      console.warn("[queue.metrics] failed:", String(e?.message ?? e));
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
