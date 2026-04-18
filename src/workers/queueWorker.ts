import {
  supabase,
  SUPABASE_HOST,
  SUPABASE_KEY_KIND,
} from "../lib/supabaseClient";
import {
  COMPACTION_DELAY_MS,
  JOB_QUEUE_ENABLED,
  WORKER_BATCH_SIZE,
  WORKER_CONCURRENCY,
  claimSubmitJobs,
  fetchSubmitJobMetrics,
  markSubmitJobCompleted,
  markSubmitJobFailed,
  recoverStuckSubmitJobs,
  type SubmitJobRow,
} from "../lib/infra/jobQueue";
import { startQueueMetricsLoop } from "../lib/infra/queueMetrics";
import { fetchQueueLatencyMetrics } from "../lib/infra/queueLatencyMetrics";
import { compactJobsByEntity, dispatchJob } from "./jobDispatcher";
import { resolveQueueWorkerBatchConcurrency } from "./queueWorker.limits";
import { normalizeAppError } from "../lib/errors/appError";
import { recordPlatformObservability } from "../lib/observability/platformObservability";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const runtimeOs = (): string => {
  if (typeof navigator === "undefined") return "node";
  const ua = String(navigator.userAgent || "").toLowerCase();
  if (ua.includes("android")) return "android";
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ios"))
    return "ios";
  return "web";
};

const defaultWorkerId = () =>
  `${runtimeOs()}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;

type QueueWorkerOptions = {
  workerId?: string;
  batchSize?: number;
  concurrency?: number;
  pollIdleMs?: number;
};

type QueueWorkerDeps = {
  supabaseClient?: typeof supabase;
  queueApi?: {
    claimSubmitJobs: (
      workerId: string,
      limit?: number,
      jobType?: string,
    ) => Promise<SubmitJobRow[]>;
    recoverStuckSubmitJobs: () => Promise<number>;
    markSubmitJobCompleted: (jobId: string) => Promise<void>;
    markSubmitJobFailed: (
      jobId: string,
      message: string,
    ) => Promise<{ retryCount: number; status: string }>;
    fetchSubmitJobMetrics: () => Promise<{
      pending: number;
      processing: number;
      failed: number;
      oldest_pending: string | null;
    }>;
  };
  fetchQueueLatencyMetrics?: typeof fetchQueueLatencyMetrics;
  sourceMeta?: {
    SUPABASE_HOST: string;
    SUPABASE_KEY_KIND: string;
  };
};

export type QueueWorkerHandle = {
  stop: () => void;
};

const queueErrorText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error ?? "unknown");

const queueVerbose =
  ((typeof globalThis !== "undefined" &&
    (globalThis as { __DEV__?: unknown }).__DEV__ === true) ||
    process.env.NODE_ENV !== "production") &&
  String(process.env.EXPO_PUBLIC_QUEUE_VERBOSE ?? "")
    .trim()
    .toLowerCase() === "true";

function recordQueueWorkerBoundaryFailure(params: {
  event: string;
  error: unknown;
  workerId: string;
  phase?: string | null;
  job?: Pick<SubmitJobRow, "id" | "job_type" | "retry_count"> | null;
  extra?: Record<string, unknown>;
}) {
  const appError = normalizeAppError(
    params.error,
    `queue_worker:${params.event}`,
    "fatal",
  );
  recordPlatformObservability({
    screen: "buyer",
    surface: "offline_queue_worker",
    category: "reload",
    event: params.event,
    result: "error",
    sourceKind: "offline:submit_jobs",
    errorStage: params.phase ?? appError.context,
    errorClass: appError.code,
    errorMessage: appError.message,
    extra: {
      workerId: params.workerId,
      phase: params.phase ?? null,
      jobId: params.job?.id ?? null,
      jobType: params.job?.job_type ?? null,
      retryCount: params.job?.retry_count ?? null,
      appErrorCode: appError.code,
      appErrorContext: appError.context,
      appErrorSeverity: appError.severity,
      ...(params.extra ?? {}),
    },
  });
}

const defaultQueueApi = {
  claimSubmitJobs,
  recoverStuckSubmitJobs,
  markSubmitJobCompleted,
  markSubmitJobFailed,
  fetchSubmitJobMetrics,
};

const resolveQueueWorkerDeps = (deps: QueueWorkerDeps) => ({
  supabaseClient: deps.supabaseClient ?? supabase,
  queueApi: deps.queueApi ?? defaultQueueApi,
  fetchQueueLatencyMetrics:
    deps.fetchQueueLatencyMetrics ?? fetchQueueLatencyMetrics,
  sourceMeta: deps.sourceMeta ?? {
    SUPABASE_HOST,
    SUPABASE_KEY_KIND,
  },
});

async function markCompactedDuplicatesCompleted(
  groups: ReturnType<typeof compactJobsByEntity>,
  workerId: string,
  queueApi: ReturnType<typeof resolveQueueWorkerDeps>["queueApi"],
) {
  let duplicateCount = 0;
  let failedCount = 0;

  for (const group of groups) {
    const dupIds = group.compactedJobIds.filter((id) => id !== group.job.id);
    duplicateCount += dupIds.length;
    for (const id of dupIds) {
      try {
        await queueApi.markSubmitJobCompleted(id);
      } catch (error: unknown) {
        failedCount += 1;
        recordQueueWorkerBoundaryFailure({
          event: "compacted_duplicate_completion_failed",
          error,
          workerId,
          job: group.job,
          extra: {
            keptJobId: group.job.id,
            duplicateJobId: id,
          },
        });
        if (__DEV__) console.warn("[queue.worker] compacted duplicate completion failed", {
          workerId,
          keptJobId: group.job.id,
          duplicateJobId: id,
          error: queueErrorText(error),
        });
      }
    }
  }

  return { duplicateCount, failedCount };
}

async function processOne(
  job: SubmitJobRow,
  workerId: string,
  deps: ReturnType<typeof resolveQueueWorkerDeps>,
) {
  const t0 = Date.now();
  try {
    await dispatchJob(job, { supabase: deps.supabaseClient });
    try {
      await deps.queueApi.markSubmitJobCompleted(job.id);
    } catch (completionError: unknown) {
      recordQueueWorkerBoundaryFailure({
        event: "completion_persistence_failed_after_dispatch",
        error: completionError,
        workerId,
        job,
        extra: {
          jobProcessingMs: Date.now() - t0,
        },
      });
      if (__DEV__) console.warn(
        "[queue.worker] completion persistence failed after dispatch",
        {
          workerId,
          jobId: job.id,
          jobType: job.job_type,
          retryCount: job.retry_count,
          jobProcessingMs: Date.now() - t0,
          error: queueErrorText(completionError),
        },
      );
      throw completionError;
    }
    if (__DEV__) console.info("[queue.worker] job done", {
      workerId,
      jobId: job.id,
      jobType: job.job_type,
      retryCount: job.retry_count,
      jobProcessingMs: Date.now() - t0,
    });
  } catch (error: unknown) {
    const message = queueErrorText(error);
    try {
      const failed = await deps.queueApi.markSubmitJobFailed(job.id, message);
      recordQueueWorkerBoundaryFailure({
        event: "job_processing_failed",
        error,
        workerId,
        job,
        extra: {
          persistedRetryCount: failed.retryCount,
          persistedStatus: failed.status,
          jobProcessingMs: Date.now() - t0,
        },
      });
      if (__DEV__) console.warn("[queue.worker] job failed", {
        workerId,
        jobId: job.id,
        jobType: job.job_type,
        retryCount: failed.retryCount,
        status: failed.status,
        jobProcessingMs: Date.now() - t0,
        error: message,
      });
    } catch (failurePersistError: unknown) {
      recordQueueWorkerBoundaryFailure({
        event: "failure_persistence_failed",
        error: failurePersistError,
        workerId,
        job,
        extra: {
          processingError: message,
          jobProcessingMs: Date.now() - t0,
        },
      });
      if (__DEV__) console.error("[queue.worker] failure persistence failed", {
        workerId,
        jobId: job.id,
        jobType: job.job_type,
        retryCount: job.retry_count,
        jobProcessingMs: Date.now() - t0,
        processingError: message,
        failurePersistError: queueErrorText(failurePersistError),
      });
      throw failurePersistError;
    }
  }
}

async function processBatch(
  jobs: SubmitJobRow[],
  workerId: string,
  concurrency: number,
  deps: ReturnType<typeof resolveQueueWorkerDeps>,
) {
  const compacted = compactJobsByEntity(jobs);
  const compactedDuplicates = await markCompactedDuplicatesCompleted(
    compacted,
    workerId,
    deps.queueApi,
  );
  if (compactedDuplicates.duplicateCount > 0) {
    if (__DEV__) console.info("[queue.worker] compacted duplicates processed", {
      workerId,
      duplicateCount: compactedDuplicates.duplicateCount,
      failedCount: compactedDuplicates.failedCount,
    });
  }

  const queue = compacted.map((entry) => entry.job);
  let idx = 0;
  const workerCount = resolveQueueWorkerBatchConcurrency(
    concurrency,
    queue.length,
  );
  if (workerCount <= 0) return;

  const workers = Array.from({ length: workerCount }).map(
    async () => {
      while (idx < queue.length) {
        const current = queue[idx++];
        if (!current) return;
        await processOne(current, workerId, deps);
      }
    },
  );

  await Promise.all(workers);
}

export function startQueueWorker(
  options: QueueWorkerOptions = {},
  depsInput: QueueWorkerDeps = {},
): QueueWorkerHandle {
  const deps = resolveQueueWorkerDeps(depsInput);

  if (__DEV__) console.info("[queue.worker] init", {
    JOB_QUEUE_ENABLED,
    WORKER_BATCH_SIZE,
    WORKER_CONCURRENCY,
    COMPACTION_DELAY_MS,
    SUPABASE_HOST: deps.sourceMeta.SUPABASE_HOST,
    SUPABASE_KEY_KIND: deps.sourceMeta.SUPABASE_KEY_KIND,
  });

  if (!JOB_QUEUE_ENABLED) {
    if (__DEV__) console.info("[queue.worker] disabled (JOB_QUEUE_ENABLED=false)");
    return { stop: () => undefined };
  }

  const workerId = options.workerId || defaultWorkerId();
  const batchSize = options.batchSize ?? WORKER_BATCH_SIZE;
  const concurrency = options.concurrency ?? WORKER_CONCURRENCY;
  const pollIdleMs = options.pollIdleMs ?? 1000;

  let stopped = false;
  let recoveryTick = 0;
  const metrics = startQueueMetricsLoop(60_000, {
    fetchSubmitJobMetrics: deps.queueApi.fetchSubmitJobMetrics,
    fetchQueueLatencyMetrics: deps.fetchQueueLatencyMetrics,
  });

  void (async () => {
    if (__DEV__) console.info("[queue.worker] started", {
      workerId,
      batchSize,
      concurrency,
    });
    while (!stopped) {
      let loopPhase = "recover";
      try {
        recoveryTick += 1;
        if (recoveryTick % 10 === 0) {
          if (queueVerbose) {
            if (__DEV__) console.info("[queue.worker] recover tick", {
              workerId,
              recoveryTick,
            });
          }
          const recovered = await deps.queueApi.recoverStuckSubmitJobs();
          if (recovered > 0) {
            if (__DEV__) console.warn("[queue.worker] recovered stuck jobs", {
              recovered,
              workerId,
            });
          }
        }

        loopPhase = "claim";
        const claimed = await deps.queueApi.claimSubmitJobs(
          workerId,
          batchSize,
        );
        if (claimed.length > 0 || queueVerbose) {
          if (__DEV__) console.info("[queue.worker] claim result", {
            workerId,
            claimed: claimed.length,
          });
        }
        if (!claimed.length) {
          loopPhase = "idle_sleep";
          await sleep(pollIdleMs);
          continue;
        }

        loopPhase = "compaction_delay";
        if (queueVerbose) {
          if (__DEV__) console.info("[queue.worker] compaction delay", {
            workerId,
            COMPACTION_DELAY_MS,
          });
        }
        await sleep(COMPACTION_DELAY_MS);

        loopPhase = "process_batch";
        if (__DEV__) console.info("[queue.worker] processing batch", {
          workerId,
          claimed: claimed.length,
          concurrency,
        });
        await processBatch(claimed, workerId, concurrency, deps);
      } catch (error: unknown) {
        recordQueueWorkerBoundaryFailure({
          event: "worker_loop_failed",
          error,
          workerId,
          phase: loopPhase,
        });
        if (__DEV__) console.warn("[queue.worker] loop error", {
          workerId,
          phase: loopPhase,
          error: queueErrorText(error),
        });
        await sleep(pollIdleMs);
      }
    }
  })();

  return {
    stop: () => {
      stopped = true;
      metrics.stop();
      if (__DEV__) console.info("[queue.worker] stopped", { workerId });
    },
  };
}
