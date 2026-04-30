export const DEFAULT_SUBMIT_JOB_CLAIM_LIMIT = 10;
export const MAX_SUBMIT_JOB_CLAIM_LIMIT = 50;
export const DEFAULT_QUEUE_WORKER_CONCURRENCY = 4;
export const MAX_QUEUE_WORKER_CONCURRENCY = 8;
export const DEFAULT_QUEUE_WORKER_COMPACTION_DELAY_MS = 500;
export const MIN_QUEUE_WORKER_COMPACTION_DELAY_MS = 100;
export const MAX_QUEUE_WORKER_COMPACTION_DELAY_MS = 5_000;
export const MIN_QUEUE_WORKER_IDLE_BACKOFF_MS = 250;

const finiteInteger = (value: unknown): number | null => {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) ? parsed : null;
};

const clampPositiveInteger = (
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number => {
  const parsed = finiteInteger(value);
  const parsedFallback = finiteInteger(fallback);
  const candidate =
    parsed != null && parsed > 0
      ? parsed
      : parsedFallback != null && parsedFallback > 0
        ? parsedFallback
        : min;

  return Math.max(min, Math.min(max, candidate));
};

export function resolveSubmitJobClaimLimit(
  limit: unknown,
  fallback = DEFAULT_SUBMIT_JOB_CLAIM_LIMIT,
): number {
  return clampPositiveInteger(limit, fallback, 1, MAX_SUBMIT_JOB_CLAIM_LIMIT);
}

export function resolveQueueWorkerConfiguredConcurrency(
  concurrency: unknown,
  fallback = DEFAULT_QUEUE_WORKER_CONCURRENCY,
): number {
  return clampPositiveInteger(concurrency, fallback, 1, MAX_QUEUE_WORKER_CONCURRENCY);
}

export function resolveQueueWorkerBatchConcurrency(
  concurrency: number,
  jobCount: number,
): number {
  const normalizedJobCount = Math.max(0, Math.floor(Number(jobCount)));
  if (normalizedJobCount <= 0) return 0;

  const normalizedConcurrency = resolveQueueWorkerConfiguredConcurrency(concurrency, 1);
  return Math.max(1, Math.min(normalizedConcurrency, normalizedJobCount));
}

export function resolveQueueWorkerCompactionDelayMs(
  compactionDelayMs: unknown,
  fallbackMs = DEFAULT_QUEUE_WORKER_COMPACTION_DELAY_MS,
): number {
  return clampPositiveInteger(
    compactionDelayMs,
    fallbackMs,
    MIN_QUEUE_WORKER_COMPACTION_DELAY_MS,
    MAX_QUEUE_WORKER_COMPACTION_DELAY_MS,
  );
}

export function resolveQueueWorkerIdleBackoffMs(
  pollIdleMs: number | null | undefined,
  fallbackMs = 1000,
): number {
  const parsed = finiteInteger(pollIdleMs);
  const parsedFallback = finiteInteger(fallbackMs);
  const candidate =
    parsed != null && parsed > 0
      ? parsed
      : parsedFallback != null && parsedFallback > 0
        ? parsedFallback
        : MIN_QUEUE_WORKER_IDLE_BACKOFF_MS;

  return Math.max(MIN_QUEUE_WORKER_IDLE_BACKOFF_MS, candidate);
}
