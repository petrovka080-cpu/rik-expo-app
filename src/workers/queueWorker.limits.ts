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
