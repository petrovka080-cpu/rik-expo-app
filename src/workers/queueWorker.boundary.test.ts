import { readFileSync } from "fs";
import { join } from "path";

import type { WorkerLoopClock } from "../lib/async/mapWithConcurrencyLimit";
import type { SubmitJobRow } from "../lib/infra/jobQueue";
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
import type { QueueWorkerHandle } from "./queueWorker";

const mockMetricsStop = jest.fn();
const mockProcessWarehouseNameMapRefreshJob = jest.fn<
  Promise<void>,
  [SubmitJobRow, { supabase: unknown }]
>();

jest.mock("../lib/infra/queueMetrics", () => ({
  startQueueMetricsLoop: () => ({
    stop: mockMetricsStop,
  }),
}));

jest.mock("./processWarehouseNameMapRefreshJob", () => ({
  processWarehouseNameMapRefreshJob: (
    job: SubmitJobRow,
    deps: { supabase: unknown },
  ) => mockProcessWarehouseNameMapRefreshJob(job, deps),
}));

const originalJobQueueEnabled = process.env.EXPO_PUBLIC_JOB_QUEUE_ENABLED;

const makeSubmitJob = (overrides: Partial<SubmitJobRow> = {}): SubmitJobRow => ({
  id: "job-1",
  client_request_id: null,
  job_type: "warehouse_refresh_name_map_ui",
  entity_type: "warehouse",
  entity_id: "entity-1",
  entity_key: "warehouse_refresh_name_map_ui",
  payload: {},
  status: "processing",
  retry_count: 0,
  error: null,
  created_by: null,
  created_at: "2026-05-09T00:00:00.000Z",
  started_at: null,
  worker_id: null,
  next_retry_at: null,
  locked_until: null,
  processed_at: null,
  ...overrides,
});

const createQueueApi = (overrides: {
  claimSubmitJobs?: jest.Mock<Promise<SubmitJobRow[]>, [string, number?]>;
  markSubmitJobCompleted?: jest.Mock<Promise<void>, [string]>;
  markSubmitJobFailed?: jest.Mock<
    Promise<{ retryCount: number; status: string }>,
    [string, string]
  >;
  recoverStuckSubmitJobs?: jest.Mock<Promise<number>, []>;
} = {}) => ({
  claimSubmitJobs:
    overrides.claimSubmitJobs ?? jest.fn(async () => [] as SubmitJobRow[]),
  recoverStuckSubmitJobs:
    overrides.recoverStuckSubmitJobs ?? jest.fn(async () => 0),
  markSubmitJobCompleted:
    overrides.markSubmitJobCompleted ?? jest.fn(async () => undefined),
  markSubmitJobFailed:
    overrides.markSubmitJobFailed ??
    jest.fn(async () => ({ retryCount: 1, status: "failed" })),
  fetchSubmitJobMetrics: jest.fn(async () => ({
    pending: 0,
    processing: 0,
    failed: 0,
    oldest_pending: null,
  })),
});

const flushAsyncTurns = async (turns = 8) => {
  for (let index = 0; index < turns; index += 1) {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
};

const waitForCondition = async (
  label: string,
  predicate: () => boolean,
) => {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (predicate()) return;
    await flushAsyncTurns();
  }
  throw new Error(`Timed out waiting for ${label}`);
};

const importQueueWorker = () => {
  jest.resetModules();
  process.env.EXPO_PUBLIC_JOB_QUEUE_ENABLED = "true";
  mockMetricsStop.mockReset();
  mockProcessWarehouseNameMapRefreshJob.mockReset();
  mockProcessWarehouseNameMapRefreshJob.mockResolvedValue(undefined);
  return require("./queueWorker") as typeof import("./queueWorker");
};

describe("queueWorker critical boundaries", () => {
  afterAll(() => {
    if (originalJobQueueEnabled == null) {
      delete process.env.EXPO_PUBLIC_JOB_QUEUE_ENABLED;
    } else {
      process.env.EXPO_PUBLIC_JOB_QUEUE_ENABLED = originalJobQueueEnabled;
    }
  });

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

  it("keeps the production worker loop on the cancellable primitive", () => {
    const source = readFileSync(join(__dirname, "queueWorker.ts"), "utf8");

    expect(source).toContain("runCancellableWorkerLoop");
    expect(source).toContain("new AbortController()");
    expect(source).toContain("loopAbortController.abort()");
    expect(source).toContain("errorBackoffMs: pollIdleMs");
    expect(source).toContain("return { backoffMs: pollIdleMs }");
    expect(source).not.toMatch(/while\s*\(\s*true\s*\)/);
    expect(source).not.toMatch(/while\s*\(\s*!stopped\s*\)/);
    expect(source).not.toMatch(/for\s*\(\s*;\s*;\s*\)/);
  });

  it("starts the worker, idles with the same polling interval, and stops on abort", async () => {
    const { startQueueWorker } = await importQueueWorker();
    let handle: QueueWorkerHandle | null = null;
    const sleeps: number[] = [];
    const workerLoopClock: WorkerLoopClock = {
      sleep: async (ms, signal) => {
        sleeps.push(ms);
        handle?.stop();
        if (signal?.aborted) throw new Error("queue worker aborted");
      },
    };
    const queueApi = createQueueApi();

    handle = startQueueWorker(
      { workerId: "worker-idle-test", pollIdleMs: 337 },
      { queueApi, workerLoopClock },
    );

    await waitForCondition("idle sleep", () => sleeps.includes(337));
    const claimCountAfterStop = queueApi.claimSubmitJobs.mock.calls.length;
    await flushAsyncTurns(20);

    expect(queueApi.claimSubmitJobs).toHaveBeenCalledWith(
      "worker-idle-test",
      expect.any(Number),
    );
    expect(sleeps).toEqual([337]);
    expect(queueApi.claimSubmitJobs).toHaveBeenCalledTimes(claimCountAfterStop);
    expect(mockMetricsStop).toHaveBeenCalledTimes(1);
  });

  it("processes one claimed unit and calls cleanup through the existing handle", async () => {
    const { startQueueWorker } = await importQueueWorker();
    let handle: QueueWorkerHandle | null = null;
    const sleeps: number[] = [];
    const workerLoopClock: WorkerLoopClock = {
      sleep: async (ms, signal) => {
        sleeps.push(ms);
        if (signal?.aborted) throw new Error("queue worker aborted");
      },
    };
    const job = makeSubmitJob();
    const queueApi = createQueueApi({
      claimSubmitJobs: jest.fn<Promise<SubmitJobRow[]>, [string, number?]>(
        async () => [job],
      ),
      markSubmitJobCompleted: jest.fn<Promise<void>, [string]>(async () => {
        handle?.stop();
      }),
    });

    handle = startQueueWorker(
      {
        workerId: "worker-process-test",
        batchSize: 1,
        concurrency: 1,
        pollIdleMs: 41,
      },
      { queueApi, workerLoopClock },
    );

    await waitForCondition("job completion", () =>
      queueApi.markSubmitJobCompleted.mock.calls.length === 1,
    );

    expect(mockProcessWarehouseNameMapRefreshJob).toHaveBeenCalledTimes(1);
    expect(queueApi.markSubmitJobCompleted).toHaveBeenCalledWith(job.id);
    expect(queueApi.markSubmitJobFailed).not.toHaveBeenCalled();
    expect(sleeps.length).toBeGreaterThanOrEqual(1);
    expect(mockMetricsStop).toHaveBeenCalledTimes(1);
  });

  it("backs off after a transient claim error without spinning", async () => {
    const { startQueueWorker } = await importQueueWorker();
    let handle: QueueWorkerHandle | null = null;
    const sleeps: number[] = [];
    const workerLoopClock: WorkerLoopClock = {
      sleep: async (ms, signal) => {
        sleeps.push(ms);
        handle?.stop();
        if (signal?.aborted) throw new Error("queue worker aborted");
      },
    };
    const queueApi = createQueueApi({
      claimSubmitJobs: jest.fn<Promise<SubmitJobRow[]>, [string, number?]>(
        async () => {
          throw new Error("temporary claim failure");
        },
      ),
    });

    handle = startQueueWorker(
      { workerId: "worker-error-test", pollIdleMs: 343 },
      { queueApi, workerLoopClock },
    );

    await waitForCondition("error backoff", () => sleeps.includes(343));
    await flushAsyncTurns(20);

    expect(sleeps).toEqual([343]);
    expect(queueApi.claimSubmitJobs).toHaveBeenCalledTimes(1);
    expect(mockMetricsStop).toHaveBeenCalledTimes(1);
  });

  it("caps batch worker allocation to the compacted job count", () => {
    expect(resolveQueueWorkerBatchConcurrency(8, 3)).toBe(3);
    expect(resolveQueueWorkerBatchConcurrency(2, 3)).toBe(2);
    expect(resolveQueueWorkerBatchConcurrency(0, 3)).toBe(1);
    expect(resolveQueueWorkerBatchConcurrency(Number.NaN, 3)).toBe(1);
    expect(resolveQueueWorkerBatchConcurrency(4, 0)).toBe(0);
    expect(resolveQueueWorkerBatchConcurrency(500, 500)).toBe(
      MAX_QUEUE_WORKER_CONCURRENCY,
    );
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
