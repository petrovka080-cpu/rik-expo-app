import { SUPABASE_HOST, SUPABASE_KEY_KIND, supabase } from "../lib/supabaseClient";
import {
  COMPACTION_DELAY_MS,
  JOB_QUEUE_ENABLED,
  WORKER_BATCH_SIZE,
  WORKER_CONCURRENCY,
  claimSubmitJobs,
  markSubmitJobCompleted,
  markSubmitJobFailed,
  recoverStuckSubmitJobs,
  type SubmitJobRow,
} from "../lib/infra/jobQueue";
import { startQueueMetricsLoop } from "../lib/infra/queueMetrics";
import { compactJobsByEntity, dispatchJob } from "./jobDispatcher";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const runtimeOs = (): string => {
  if (typeof navigator === "undefined") return "node";
  const ua = String(navigator.userAgent || "").toLowerCase();
  if (ua.includes("android")) return "android";
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ios")) return "ios";
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

export type QueueWorkerHandle = {
  stop: () => void;
};

async function processOne(job: SubmitJobRow, workerId: string) {
  const t0 = Date.now();
  try {
    await dispatchJob(job, { supabase });
    await markSubmitJobCompleted(job.id);
    console.info("[queue.worker] job done", {
      workerId,
      jobId: job.id,
      jobType: job.job_type,
      retryCount: job.retry_count,
      jobProcessingMs: Date.now() - t0,
    });
  } catch (e: any) {
    const failed = await markSubmitJobFailed(job.id, String(e?.message ?? e));
    console.warn("[queue.worker] job failed", {
      workerId,
      jobId: job.id,
      jobType: job.job_type,
      retryCount: failed.retryCount,
      status: failed.status,
      jobProcessingMs: Date.now() - t0,
      error: String(e?.message ?? e),
    });
  }
}

async function processBatch(jobs: SubmitJobRow[], workerId: string, concurrency: number) {
  const compacted = compactJobsByEntity(jobs);
  // Mark duplicate compacted jobs as completed to avoid repeated identical work.
  for (const group of compacted) {
    const dupIds = group.compactedJobIds.filter((id) => id !== group.job.id);
    for (const id of dupIds) {
      try {
        await markSubmitJobCompleted(id);
      } catch {}
    }
  }

  const queue = compacted.map((x) => x.job);
  let idx = 0;

  const workers = Array.from({ length: Math.max(1, concurrency) }).map(async () => {
    while (idx < queue.length) {
      const current = queue[idx++];
      if (!current) return;
      await processOne(current, workerId);
    }
  });

  await Promise.all(workers);
}

export function startQueueWorker(options: QueueWorkerOptions = {}): QueueWorkerHandle {
  console.info("[queue.worker] init", {
    JOB_QUEUE_ENABLED,
    WORKER_BATCH_SIZE,
    WORKER_CONCURRENCY,
    COMPACTION_DELAY_MS,
    SUPABASE_HOST,
    SUPABASE_KEY_KIND,
  });

  if (!JOB_QUEUE_ENABLED) {
    console.info("[queue.worker] disabled (JOB_QUEUE_ENABLED=false)");
    return { stop: () => undefined };
  }

  const workerId = options.workerId || defaultWorkerId();
  const batchSize = options.batchSize ?? WORKER_BATCH_SIZE;
  const concurrency = options.concurrency ?? WORKER_CONCURRENCY;
  const pollIdleMs = options.pollIdleMs ?? 1000;

  let stopped = false;
  let recoveryTick = 0;
  const metrics = startQueueMetricsLoop(60_000);

  void (async () => {
    console.info("[queue.worker] started", { workerId, batchSize, concurrency });
    console.info("[queue.worker] polling loop entered", { workerId });
    while (!stopped) {
      try {
        recoveryTick += 1;
        if (recoveryTick % 10 === 0) {
          console.info("[queue.worker] recover tick", { workerId, recoveryTick });
          const recovered = await recoverStuckSubmitJobs();
          if (recovered > 0) {
            console.warn("[queue.worker] recovered stuck jobs", { recovered, workerId });
          }
        }

        console.info("[queue.worker] claiming jobs", { workerId, batchSize });
        const claimed = await claimSubmitJobs(workerId, batchSize);
        console.info("[queue.worker] claim result", { workerId, claimed: claimed.length });
        if (!claimed.length) {
          console.info("[queue.worker] idle sleep", { workerId, pollIdleMs });
          await sleep(pollIdleMs);
          continue;
        }

        // Small debounce window to compact burst submits for same entity.
        console.info("[queue.worker] compaction delay", { workerId, COMPACTION_DELAY_MS });
        await sleep(COMPACTION_DELAY_MS);

        // Batch processing path.
        console.info("[queue.worker] processing batch", {
          workerId,
          claimed: claimed.length,
          concurrency,
        });
        await processBatch(claimed, workerId, concurrency);
      } catch (e: any) {
        console.warn("[queue.worker] loop error", { workerId, error: String(e?.message ?? e) });
        await sleep(pollIdleMs);
      }
    }
  })();

  return {
    stop: () => {
      stopped = true;
      metrics.stop();
      console.info("[queue.worker] stopped", { workerId });
    },
  };
}
