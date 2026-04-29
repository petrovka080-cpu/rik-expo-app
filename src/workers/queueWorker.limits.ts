export function resolveQueueWorkerBatchConcurrency(
  concurrency: number,
  jobCount: number,
): number {
  const normalizedJobCount = Math.max(0, Math.floor(Number(jobCount)));
  if (normalizedJobCount <= 0) return 0;

  const normalizedConcurrency = Math.floor(Number(concurrency));
  if (!Number.isFinite(normalizedConcurrency) || normalizedConcurrency <= 0) {
    return 1;
  }

  return Math.max(1, Math.min(normalizedConcurrency, normalizedJobCount));
}

export const MIN_QUEUE_WORKER_IDLE_BACKOFF_MS = 250;

export function resolveQueueWorkerIdleBackoffMs(
  pollIdleMs: number | null | undefined,
  fallbackMs = 1000,
): number {
  const parsed = Math.floor(Number(pollIdleMs));
  const parsedFallback = Math.floor(Number(fallbackMs));
  const candidate =
    Number.isFinite(parsed) && parsed > 0
      ? parsed
      : Number.isFinite(parsedFallback) && parsedFallback > 0
        ? parsedFallback
        : MIN_QUEUE_WORKER_IDLE_BACKOFF_MS;

  return Math.max(MIN_QUEUE_WORKER_IDLE_BACKOFF_MS, candidate);
}
