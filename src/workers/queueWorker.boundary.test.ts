import { readFileSync } from "fs";
import { join } from "path";

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
});
