import { startQueueWorker } from "./queueWorker";
import { JOB_QUEUE_ENABLED } from "../lib/infra/jobQueue";

let workerStarted = false;

export function ensureQueueWorker() {
  console.info("[queue.bootstrap] ensure called", { JOB_QUEUE_ENABLED });

  if (!JOB_QUEUE_ENABLED) {
    console.info("[queue.bootstrap] queue disabled");
    return;
  }

  if (workerStarted) {
    console.info("[queue.bootstrap] already started");
    return;
  }

  workerStarted = true;
  console.info("[queue.bootstrap] starting queue worker");
  startQueueWorker();
}
