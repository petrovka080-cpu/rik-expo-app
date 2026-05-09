import {
  MIN_WORKER_LOOP_BACKOFF_MS,
  WorkerLoopAbortError,
  type WorkerLoopClock,
  runCancellableWorkerLoop,
} from "../../src/lib/async/mapWithConcurrencyLimit";

const createImmediateClock = () => {
  const sleeps: number[] = [];
  const clock: WorkerLoopClock = {
    sleep: async (ms, signal) => {
      sleeps.push(ms);
      if (signal?.aborted) throw new WorkerLoopAbortError("test loop");
    },
  };

  return { clock, sleeps };
};

describe("runCancellableWorkerLoop", () => {
  it("exits on abort without sleeping again", async () => {
    const controller = new AbortController();
    const { clock, sleeps } = createImmediateClock();
    let calls = 0;

    const result = await runCancellableWorkerLoop({
      label: "abort-test",
      backoffMs: 10,
      signal: controller.signal,
      clock,
      runIteration: async () => {
        calls += 1;
        controller.abort();
      },
    });

    expect(result).toEqual({
      label: "abort-test",
      iterations: 1,
      errors: 0,
      stopReason: "aborted",
    });
    expect(calls).toBe(1);
    expect(sleeps).toEqual([]);
  });

  it("respects maxIterations only through test mode", async () => {
    const { clock } = createImmediateClock();
    let calls = 0;

    const result = await runCancellableWorkerLoop({
      label: "bounded-test",
      backoffMs: 5,
      clock,
      testMode: { maxIterations: 3 },
      runIteration: async () => {
        calls += 1;
      },
    });

    expect(result.stopReason).toBe("max_iterations");
    expect(result.iterations).toBe(3);
    expect(calls).toBe(3);
  });

  it("backs off after a transient error before continuing", async () => {
    const { clock, sleeps } = createImmediateClock();
    const seenErrors: string[] = [];
    let calls = 0;

    const result = await runCancellableWorkerLoop({
      label: "transient-error-test",
      backoffMs: 5,
      errorBackoffMs: 25,
      clock,
      runIteration: async () => {
        calls += 1;
        if (calls === 1) throw new Error("temporary");
        return { stop: true };
      },
      onError: (error) => {
        seenErrors.push(error instanceof Error ? error.message : String(error));
        return "continue";
      },
    });

    expect(result).toEqual({
      label: "transient-error-test",
      iterations: 2,
      errors: 1,
      stopReason: "task_stop",
    });
    expect(seenErrors).toEqual(["temporary"]);
    expect(sleeps).toEqual([25]);
  });

  it("does not swallow fatal errors silently", async () => {
    const { clock } = createImmediateClock();
    const seenErrors: string[] = [];

    await expect(
      runCancellableWorkerLoop({
        label: "fatal-error-test",
        backoffMs: 5,
        clock,
        runIteration: async () => {
          throw new Error("fatal worker failure");
        },
        onError: (error) => {
          seenErrors.push(error instanceof Error ? error.message : String(error));
          return "throw";
        },
      }),
    ).rejects.toThrow("fatal worker failure");

    expect(seenErrors).toEqual(["fatal worker failure"]);
  });

  it("does not run a tight loop when work completes quickly", async () => {
    const { clock, sleeps } = createImmediateClock();
    let calls = 0;

    const result = await runCancellableWorkerLoop({
      label: "quick-task-test",
      backoffMs: 7,
      clock,
      testMode: { maxIterations: 3 },
      runIteration: async () => {
        calls += 1;
      },
    });

    expect(result.stopReason).toBe("max_iterations");
    expect(calls).toBe(3);
    expect(sleeps).toEqual([7, 7]);
    expect(sleeps.every((ms) => ms >= MIN_WORKER_LOOP_BACKOFF_MS)).toBe(true);
  });

  it("honors the stop condition before starting another iteration", async () => {
    const { clock, sleeps } = createImmediateClock();
    let calls = 0;

    const result = await runCancellableWorkerLoop({
      label: "stop-condition-test",
      backoffMs: 3,
      clock,
      runIteration: async () => {
        calls += 1;
      },
      shouldStop: ({ iterations }) => iterations >= 2,
    });

    expect(result).toEqual({
      label: "stop-condition-test",
      iterations: 2,
      errors: 0,
      stopReason: "stop_condition",
    });
    expect(calls).toBe(2);
    expect(sleeps).toEqual([3]);
  });
});
