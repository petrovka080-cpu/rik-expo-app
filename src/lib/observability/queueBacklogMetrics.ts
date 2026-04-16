import {
  recordPlatformObservability,
  type PlatformObservabilityEvent,
} from "./platformObservability";

export type QueueBacklogMetricInput = {
  queue: string;
  size: number;
  oldestAgeMs?: number | null;
  processingCount?: number | null;
  failedCount?: number | null;
  retryScheduledCount?: number | null;
  coalescedCount?: number | null;
  event?: string;
  extra?: Record<string, unknown>;
};

export type QueueBacklogSnapshotEntry = {
  queue: string;
  size: number;
  oldestAgeMs: number;
  processingCount: number;
  failedCount: number;
  retryScheduledCount: number;
  coalescedCount: number;
  updatedAt: number;
};

type QueueBacklogStore = Map<string, QueueBacklogSnapshotEntry>;

type QueueBacklogGlobal = typeof globalThis & {
  __RIK_QUEUE_BACKLOG_METRICS__?: QueueBacklogStore;
};

const getStore = (): QueueBacklogStore => {
  const root = globalThis as QueueBacklogGlobal;
  if (!root.__RIK_QUEUE_BACKLOG_METRICS__) {
    root.__RIK_QUEUE_BACKLOG_METRICS__ = new Map();
  }
  return root.__RIK_QUEUE_BACKLOG_METRICS__;
};

const toMetricNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
};

export function trackQueueBacklogMetric(input: QueueBacklogMetricInput): PlatformObservabilityEvent {
  const queue = String(input.queue || "").trim() || "unknown_queue";
  const snapshot: QueueBacklogSnapshotEntry = {
    queue,
    size: toMetricNumber(input.size),
    oldestAgeMs: toMetricNumber(input.oldestAgeMs),
    processingCount: toMetricNumber(input.processingCount),
    failedCount: toMetricNumber(input.failedCount),
    retryScheduledCount: toMetricNumber(input.retryScheduledCount),
    coalescedCount: toMetricNumber(input.coalescedCount),
    updatedAt: Date.now(),
  };
  getStore().set(queue, snapshot);

  return recordPlatformObservability({
    screen: "global_busy",
    surface: "queue_backlog",
    category: "reload",
    event: input.event ?? "queue_backlog_metric",
    result: "success",
    rowCount: snapshot.size,
    sourceKind: `queue:${queue}`,
    extra: {
      queue,
      oldestAgeMs: snapshot.oldestAgeMs,
      processingCount: snapshot.processingCount,
      failedCount: snapshot.failedCount,
      retryScheduledCount: snapshot.retryScheduledCount,
      coalescedCount: snapshot.coalescedCount,
      ...input.extra,
    },
  });
}

export function getQueueBacklogSnapshot(): QueueBacklogSnapshotEntry[] {
  return [...getStore().values()].sort((left, right) => right.size - left.size || left.queue.localeCompare(right.queue));
}

export function resetQueueBacklogMetrics() {
  getStore().clear();
}
