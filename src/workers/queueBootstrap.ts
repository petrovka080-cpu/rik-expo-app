import { startQueueWorker, type QueueWorkerHandle } from "./queueWorker";
import { JOB_QUEUE_ENABLED } from "../lib/infra/jobQueue";
import { logger } from "../lib/logger";

let workerHandle: QueueWorkerHandle | null = null;

export function ensureQueueWorker() {
  logger.info("queue.bootstrap", "ensure called", { JOB_QUEUE_ENABLED });

  if (!JOB_QUEUE_ENABLED) {
    logger.info("queue.bootstrap", "queue disabled");
    return;
  }

  if (workerHandle) {
    logger.info("queue.bootstrap", "already started");
    return;
  }

  logger.info("queue.bootstrap", "starting queue worker");
  workerHandle = startQueueWorker();
}

export function stopQueueWorker() {
  if (!workerHandle) {
    logger.info("queue.bootstrap", "stop skipped: not running");
    return;
  }

  logger.info("queue.bootstrap", "stopping queue worker");
  workerHandle.stop();
  workerHandle = null;
}
