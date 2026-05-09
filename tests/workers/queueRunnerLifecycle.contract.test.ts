import { readFileSync } from "fs";
import { join } from "path";

const RUNNER_SOURCE = join(__dirname, "../../scripts/run-queue-worker.ts");

describe("queue worker runner lifecycle boundary", () => {
  it("does not use an unconditional production restart loop", () => {
    const source = readFileSync(RUNNER_SOURCE, "utf8");

    expect(source).not.toMatch(/while\s*\(\s*true\s*\)/);
    expect(source).not.toMatch(/for\s*\(\s*;\s*;\s*\)/);
    expect(source).not.toMatch(/while\s*\(\s*!stopped\s*\)/);
    expect(source).toContain("runCancellableWorkerLoop");
    expect(source).toContain("runnerAbortController.abort()");
  });

  it("bounds bootstrap restarts and keeps an explicit backoff", () => {
    const source = readFileSync(RUNNER_SOURCE, "utf8");

    expect(source).toContain("DEFAULT_QUEUE_RUNNER_MAX_BOOTSTRAP_RESTARTS");
    expect(source).toContain("QUEUE_RUNNER_MAX_BOOTSTRAP_RESTARTS");
    expect(source).toContain("bootstrapRestartCount > maxBootstrapRestarts");
    expect(source).toContain("process.exitCode = 1");
    expect(source).toContain("DEFAULT_QUEUE_RUNNER_BOOTSTRAP_RESTART_BACKOFF_MS");
    expect(source).toContain("errorBackoffMs: restartBackoffMs");
  });

  it("keeps explicit shutdown and error handling without silent catches", () => {
    const source = readFileSync(RUNNER_SOURCE, "utf8");

    expect(source).toContain('process.on("SIGINT"');
    expect(source).toContain('process.on("SIGTERM"');
    expect(source).toContain('console.warn("[queue.runner] stop failed"');
    expect(source).not.toMatch(/catch\s*\{\s*\}/);
  });
});
