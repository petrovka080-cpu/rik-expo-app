import { readFileSync } from "fs";
import { join } from "path";

import {
  MAX_QUEUE_WORKER_COMPACTION_DELAY_MS,
  MAX_QUEUE_WORKER_CONCURRENCY,
  MAX_SUBMIT_JOB_CLAIM_LIMIT,
  MIN_QUEUE_WORKER_COMPACTION_DELAY_MS,
  MIN_QUEUE_WORKER_IDLE_BACKOFF_MS,
  resolveQueueWorkerBatchConcurrency,
  resolveQueueWorkerCompactionDelayMs,
  resolveQueueWorkerConfiguredConcurrency,
  resolveQueueWorkerIdleBackoffMs,
  resolveSubmitJobClaimLimit,
} from "./queueWorker.limits";

describe("queueWorker critical boundaries", () => {
  it("records typed observability for worker catch points before continuing", () => {
    const source = readFileSync(join(__dirname, "queueWorker.ts"), "utf8");

    expect(source).toContain("normalizeAppError");
    expect(source).toContain("recordQueueWorkerBoundaryFailure");
    expect(source).toContain("completion_persistence_failed_after_dispatch");
    expect(source).toContain("job_processing_failed");
    expect(source).toContain("failure_persistence_failed");
    expect(source).toContain("worker_loop_failed");
    expect(source).toContain("offline_queue_worker");
  });

  it("caps batch worker allocation to the compacted job count", () => {
    expect(resolveQueueWorkerBatchConcurrency(8, 3)).toBe(3);
    expect(resolveQueueWorkerBatchConcurrency(2, 3)).toBe(2);
    expect(resolveQueueWorkerBatchConcurrency(0, 3)).toBe(1);
    expect(resolveQueueWorkerBatchConcurrency(Number.NaN, 3)).toBe(1);
    expect(resolveQueueWorkerBatchConcurrency(4, 0)).toBe(0);
    expect(resolveQueueWorkerBatchConcurrency(500, 500)).toBe(MAX_QUEUE_WORKER_CONCURRENCY);
  });

  it("caps queue runtime budgets before claim or worker execution", () => {
    expect(resolveSubmitJobClaimLimit(5)).toBe(5);
    expect(resolveSubmitJobClaimLimit(5_000)).toBe(MAX_SUBMIT_JOB_CLAIM_LIMIT);
    expect(resolveSubmitJobClaimLimit(0)).toBe(10);

    expect(resolveQueueWorkerConfiguredConcurrency(2)).toBe(2);
    expect(resolveQueueWorkerConfiguredConcurrency(500)).toBe(MAX_QUEUE_WORKER_CONCURRENCY);
    expect(resolveQueueWorkerConfiguredConcurrency(Number.NaN)).toBe(4);

    expect(resolveQueueWorkerCompactionDelayMs(250)).toBe(250);
    expect(resolveQueueWorkerCompactionDelayMs(10)).toBe(MIN_QUEUE_WORKER_COMPACTION_DELAY_MS);
    expect(resolveQueueWorkerCompactionDelayMs(50_000)).toBe(MAX_QUEUE_WORKER_COMPACTION_DELAY_MS);
  });

  it("keeps idle and error-loop sleeps above the minimum backoff", () => {
    expect(resolveQueueWorkerIdleBackoffMs(0)).toBe(1000);
    expect(resolveQueueWorkerIdleBackoffMs(10)).toBe(MIN_QUEUE_WORKER_IDLE_BACKOFF_MS);
    expect(resolveQueueWorkerIdleBackoffMs(500)).toBe(500);
    expect(resolveQueueWorkerIdleBackoffMs(Number.NaN, 25)).toBe(
      MIN_QUEUE_WORKER_IDLE_BACKOFF_MS,
    );
  });
});
