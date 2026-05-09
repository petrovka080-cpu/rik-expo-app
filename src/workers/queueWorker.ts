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
import { logger } from "../lib/logger";
import {
  MIN_WORKER_LOOP_BACKOFF_MS,
  defaultWorkerLoopClock,
  mapWithConcurrencyLimit,
  runCancellableWorkerLoop,
  type WorkerLoopClock,
} from "../lib/async/mapWithConcurrencyLimit";
import { redactSensitiveText } from "../lib/security/redaction";
import { compactJobsByEntity, dispatchJob } from "./jobDispatcher";
import {
  resolveQueueWorkerCompactionDelayMs,
  resolveQueueWorkerBatchConcurrency,
  resolveQueueWorkerConfiguredConcurrency,
  resolveQueueWorkerIdleBackoffMs,
  resolveSubmitJobClaimLimit,
} from "./queueWorker.limits";
import { normalizeAppError } from "../lib/errors/appError";
import { recordPlatformObservability } from "../lib/observability/platformObservability";

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
  workerLoopClock?: WorkerLoopClock;
  sourceMeta?: {
    SUPABASE_HOST: string;
    SUPABASE_KEY_KIND: string;
  };
};

export type QueueWorkerHandle = {
  stop: () => void;
};

const queueErrorText = (error: unknown): string =>
  redactSensitiveText(
    error instanceof Error ? error.message : String(error ?? "unknown"),
  );

const redactedPresence = (value: unknown): "present_redacted" | "missing" =>
  String(value ?? "").trim() ? "present_redacted" : "missing";

const queueWorkerScope = (workerId: string) => ({
  workerIdScope: redactedPresence(workerId),
});

const queueJobScope = (
  job?: Pick<SubmitJobRow, "id" | "job_type" | "retry_count"> | null,
) => ({
  jobIdScope: redactedPresence(job?.id),
  jobType: job?.job_type ?? null,
  retryCount: job?.retry_count ?? null,
});

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
  const errorMessage = redactSensitiveText(appError.message);
  recordPlatformObservability({
    screen: "buyer",
    surface: "offline_queue_worker",
    category: "reload",
    event: params.event,
    result: "error",
    sourceKind: "offline:submit_jobs",
    errorStage: params.phase ?? appError.context,
    errorClass: appError.code,
    errorMessage,
    extra: {
      workerIdScope: redactedPresence(params.workerId),
      phase: params.phase ?? null,
      jobIdScope: redactedPresence(params.job?.id),
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
  workerLoopClock: deps.workerLoopClock ?? defaultWorkerLoopClock,
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
            keptJobIdScope: redactedPresence(group.job.id),
            duplicateJobIdScope: redactedPresence(id),
          },
        });
        logger.warn("queue.worker", "compacted duplicate completion failed", {
          ...queueWorkerScope(workerId),
          keptJobIdScope: redactedPresence(group.job.id),
          duplicateJobIdScope: redactedPresence(id),
          errorMessage: queueErrorText(error),
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
      logger.warn("queue.worker", "completion persistence failed after dispatch", {
        ...queueWorkerScope(workerId),
        ...queueJobScope(job),
        jobProcessingMs: Date.now() - t0,
        errorMessage: queueErrorText(completionError),
      });
      throw completionError;
    }
    logger.info("queue.worker", "job done", {
      ...queueWorkerScope(workerId),
      ...queueJobScope(job),
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
      logger.warn("queue.worker", "job failed", {
        ...queueWorkerScope(workerId),
        ...queueJobScope(job),
        retryCount: failed.retryCount,
        status: failed.status,
        jobProcessingMs: Date.now() - t0,
        errorMessage: message,
      });
    } catch (failurePersistError: unknown) {
      recordQueueWorkerBoundaryFailure({
        event: "failure_persistence_failed",
        error: failurePersistError,
        workerId,
        job,
        extra: {
          processingErrorMessage: message,
          jobProcessingMs: Date.now() - t0,
        },
      });
      logger.error("queue.worker", "failure persistence failed", {
        ...queueWorkerScope(workerId),
        ...queueJobScope(job),
        jobProcessingMs: Date.now() - t0,
        processingErrorMessage: message,
        failurePersistErrorMessage: queueErrorText(failurePersistError),
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
    logger.info("queue.worker", "compacted duplicates processed", {
      ...queueWorkerScope(workerId),
      duplicateCount: compactedDuplicates.duplicateCount,
      failedCount: compactedDuplicates.failedCount,
    });
  }

  const queue = compacted.map((entry) => entry.job);
  const workerCount = resolveQueueWorkerBatchConcurrency(
    concurrency,
    queue.length,
  );
  if (workerCount <= 0) return;

  await mapWithConcurrencyLimit(
    queue,
    workerCount,
    async (current) => {
      await processOne(current, workerId, deps);
    },
    { label: "queueWorker.processBatch" },
  );
}

export function startQueueWorker(
  options: QueueWorkerOptions = {},
  depsInput: QueueWorkerDeps = {},
): QueueWorkerHandle {
  const deps = resolveQueueWorkerDeps(depsInput);

  logger.info("queue.worker", "init", {
    JOB_QUEUE_ENABLED,
    WORKER_BATCH_SIZE,
    WORKER_CONCURRENCY,
    COMPACTION_DELAY_MS,
    supabaseHostScope: redactedPresence(deps.sourceMeta.SUPABASE_HOST),
    SUPABASE_KEY_KIND: deps.sourceMeta.SUPABASE_KEY_KIND,
  });

  if (!JOB_QUEUE_ENABLED) {
    logger.info("queue.worker", "disabled", { reason: "JOB_QUEUE_ENABLED=false" });
    return { stop: () => undefined };
  }

  const workerId = options.workerId || defaultWorkerId();
  const batchSize = resolveSubmitJobClaimLimit(options.batchSize, WORKER_BATCH_SIZE);
  const concurrency = resolveQueueWorkerConfiguredConcurrency(
    options.concurrency,
    WORKER_CONCURRENCY,
  );
  const compactionDelayMs = resolveQueueWorkerCompactionDelayMs(
    COMPACTION_DELAY_MS,
    COMPACTION_DELAY_MS,
  );
  const pollIdleMs = resolveQueueWorkerIdleBackoffMs(options.pollIdleMs, 1000);

  let stopped = false;
  const loopAbortController = new AbortController();
  let recoveryTick = 0;
  const metrics = startQueueMetricsLoop(60_000, {
    fetchSubmitJobMetrics: deps.queueApi.fetchSubmitJobMetrics,
    fetchQueueLatencyMetrics: deps.fetchQueueLatencyMetrics,
  });

  void (async () => {
    logger.info("queue.worker", "started", {
      ...queueWorkerScope(workerId),
      batchSize,
      concurrency,
    });
    let loopPhase = "recover";
    await runCancellableWorkerLoop({
      label: "queue.worker",
      signal: loopAbortController.signal,
      clock: deps.workerLoopClock,
      backoffMs: MIN_WORKER_LOOP_BACKOFF_MS,
      errorBackoffMs: pollIdleMs,
      shouldStop: () => stopped,
      runIteration: async () => {
        loopPhase = "recover";
        recoveryTick += 1;
        if (recoveryTick % 10 === 0) {
          if (queueVerbose) {
            logger.info("queue.worker", "recover tick", {
              ...queueWorkerScope(workerId),
              recoveryTick,
            });
          }
          const recovered = await deps.queueApi.recoverStuckSubmitJobs();
          if (recovered > 0) {
            logger.warn("queue.worker", "recovered stuck jobs", {
              recovered,
              ...queueWorkerScope(workerId),
            });
          }
        }

        loopPhase = "claim";
        const claimed = await deps.queueApi.claimSubmitJobs(
          workerId,
          batchSize,
        );
        if (claimed.length > 0 || queueVerbose) {
          logger.info("queue.worker", "claim result", {
            ...queueWorkerScope(workerId),
            claimed: claimed.length,
          });
        }
        if (!claimed.length) {
          loopPhase = "idle_sleep";
          return { backoffMs: pollIdleMs };
        }

        loopPhase = "compaction_delay";
        if (queueVerbose) {
          logger.info("queue.worker", "compaction delay", {
            ...queueWorkerScope(workerId),
            compactionDelayMs,
          });
        }
        await deps.workerLoopClock.sleep(
          compactionDelayMs,
          loopAbortController.signal,
        );

        loopPhase = "process_batch";
        logger.info("queue.worker", "processing batch", {
          ...queueWorkerScope(workerId),
          claimed: claimed.length,
          concurrency,
        });
        await processBatch(claimed, workerId, concurrency, deps);
        return { backoffMs: MIN_WORKER_LOOP_BACKOFF_MS };
      },
      onError: (error) => {
        recordQueueWorkerBoundaryFailure({
          event: "worker_loop_failed",
          error,
          workerId,
          phase: loopPhase,
        });
        logger.warn("queue.worker", "loop error", {
          ...queueWorkerScope(workerId),
          phase: loopPhase,
          errorMessage: queueErrorText(error),
        });
        return "continue";
      },
    });
  })();

  return {
    stop: () => {
      if (stopped) return;
      stopped = true;
      loopAbortController.abort();
      metrics.stop();
      logger.info("queue.worker", "stopped", queueWorkerScope(workerId));
    },
  };
}
