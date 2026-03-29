import { startQueueWorker, type QueueWorkerHandle } from "./queueWorker";
import { JOB_QUEUE_ENABLED } from "../lib/infra/jobQueue";

let workerHandle: QueueWorkerHandle | null = null;

export function ensureQueueWorker() {
  console.info("[queue.bootstrap] ensure called", { JOB_QUEUE_ENABLED });

  if (!JOB_QUEUE_ENABLED) {
    console.info("[queue.bootstrap] queue disabled");
    return;
  }

  if (workerHandle) {
    console.info("[queue.bootstrap] already started");
    return;
  }

  console.info("[queue.bootstrap] starting queue worker");
  workerHandle = startQueueWorker();
}

export function stopQueueWorker() {
  if (!workerHandle) {
    console.info("[queue.bootstrap] stop skipped: not running");
    return;
  }

  console.info("[queue.bootstrap] stopping queue worker");
  workerHandle.stop();
  workerHandle = null;
}
