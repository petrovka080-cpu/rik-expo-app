import { readFileSync } from "fs";
import { join } from "path";

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

type PendingSleep = {
  ms: number;
  signal: AbortSignal | null;
  resolve: () => void;
  reject: (error: unknown) => void;
};

const createControlledClock = () => {
  const sleeps: number[] = [];
  const pending: PendingSleep[] = [];

  const clock: WorkerLoopClock = {
    sleep: (ms, signal) =>
      new Promise<void>((resolve, reject) => {
        sleeps.push(ms);
        if (signal?.aborted) {
          reject(new WorkerLoopAbortError("controlled loop"));
          return;
        }

        const entry: PendingSleep = {
          ms,
          signal: signal ?? null,
          resolve: () => undefined,
          reject: () => undefined,
        };
        const removeEntry = () => {
          const index = pending.indexOf(entry);
          if (index >= 0) pending.splice(index, 1);
        };
        const onAbort = () => {
          removeEntry();
          signal?.removeEventListener("abort", onAbort);
          reject(new WorkerLoopAbortError("controlled loop"));
        };

        entry.resolve = () => {
          removeEntry();
          signal?.removeEventListener("abort", onAbort);
          resolve();
        };
        entry.reject = (error) => {
          removeEntry();
          signal?.removeEventListener("abort", onAbort);
          reject(error);
        };

        signal?.addEventListener("abort", onAbort, { once: true });
        pending.push(entry);
      }),
  };

  const resolveNext = () => {
    const next = pending[0];
    if (!next) throw new Error("no pending worker sleep");
    next.resolve();
  };

  return { clock, sleeps, pending, resolveNext };
};

const flushMicrotasks = async (turns = 3) => {
  for (let index = 0; index < turns; index += 1) {
    await Promise.resolve();
  }
};

describe("runCancellableWorkerLoop", () => {
  it("does not use unconditional loop forms in the runtime primitive", () => {
    const source = readFileSync(
      join(__dirname, "../../src/lib/async/mapWithConcurrencyLimit.ts"),
      "utf8",
    );

    expect(source).not.toMatch(/while\s*\(\s*true\s*\)/);
    expect(source).not.toMatch(/for\s*\(\s*;\s*;\s*\)/);
    expect(source).toContain("while (!isAbortStop(signal))");
  });

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

  it("requires a completed sleep between fast successful iterations", async () => {
    const { clock, sleeps, pending, resolveNext } = createControlledClock();
    let calls = 0;

    const resultPromise = runCancellableWorkerLoop({
      label: "fast-success-cpu-budget-test",
      backoffMs: 11,
      clock,
      testMode: { maxIterations: 3 },
      runIteration: async () => {
        calls += 1;
      },
    });

    await flushMicrotasks();
    expect(calls).toBe(1);
    expect(sleeps).toEqual([11]);
    expect(pending.map((sleep) => sleep.ms)).toEqual([11]);

    resolveNext();
    await flushMicrotasks();
    expect(calls).toBe(2);
    expect(sleeps).toEqual([11, 11]);
    expect(pending.map((sleep) => sleep.ms)).toEqual([11]);

    resolveNext();
    const result = await resultPromise;

    expect(result).toEqual({
      label: "fast-success-cpu-budget-test",
      iterations: 3,
      errors: 0,
      stopReason: "max_iterations",
    });
    expect(calls).toBe(3);
    expect(sleeps).toEqual([11, 11]);
    expect(pending).toEqual([]);
  });

  it("applies the error backoff for repeated recoverable failures", async () => {
    const { clock, sleeps, pending, resolveNext } = createControlledClock();
    const seenErrors: string[] = [];
    let calls = 0;

    const resultPromise = runCancellableWorkerLoop({
      label: "repeated-failure-backoff-test",
      backoffMs: 5,
      errorBackoffMs: 29,
      clock,
      runIteration: async () => {
        calls += 1;
        if (calls <= 2) throw new Error(`temporary-${calls}`);
        return { stop: true };
      },
      onError: (error) => {
        seenErrors.push(error instanceof Error ? error.message : String(error));
        return "continue";
      },
    });

    await flushMicrotasks();
    expect(calls).toBe(1);
    expect(seenErrors).toEqual(["temporary-1"]);
    expect(pending.map((sleep) => sleep.ms)).toEqual([29]);

    resolveNext();
    await flushMicrotasks();
    expect(calls).toBe(2);
    expect(seenErrors).toEqual(["temporary-1", "temporary-2"]);
    expect(pending.map((sleep) => sleep.ms)).toEqual([29]);

    resolveNext();
    const result = await resultPromise;

    expect(result).toEqual({
      label: "repeated-failure-backoff-test",
      iterations: 3,
      errors: 2,
      stopReason: "task_stop",
    });
    expect(sleeps).toEqual([29, 29]);
    expect(pending).toEqual([]);
  });

  it("exits cleanly when aborted during sleep", async () => {
    const controller = new AbortController();
    const { clock, sleeps, pending } = createControlledClock();
    let calls = 0;

    const resultPromise = runCancellableWorkerLoop({
      label: "abort-during-sleep-test",
      backoffMs: 13,
      signal: controller.signal,
      clock,
      runIteration: async () => {
        calls += 1;
      },
    });

    await flushMicrotasks();
    expect(calls).toBe(1);
    expect(sleeps).toEqual([13]);
    expect(pending.map((sleep) => sleep.signal?.aborted ?? false)).toEqual([false]);

    controller.abort();
    const result = await resultPromise;

    expect(result).toEqual({
      label: "abort-during-sleep-test",
      iterations: 1,
      errors: 0,
      stopReason: "aborted",
    });
    expect(pending).toEqual([]);
  });

  it("exits after the task boundary when aborted during an iteration", async () => {
    const controller = new AbortController();
    const { clock, sleeps } = createControlledClock();
    let calls = 0;
    let releaseTask: () => void = () => {
      throw new Error("task did not start");
    };

    const resultPromise = runCancellableWorkerLoop({
      label: "abort-during-task-test",
      backoffMs: 17,
      signal: controller.signal,
      clock,
      runIteration: async () => {
        calls += 1;
        await new Promise<void>((resolve) => {
          releaseTask = resolve;
        });
      },
    });

    await flushMicrotasks();
    controller.abort();
    await flushMicrotasks();
    await expect(Promise.race([
      resultPromise.then(() => "settled"),
      Promise.resolve("pending"),
    ])).resolves.toBe("pending");

    releaseTask();
    const result = await resultPromise;

    expect(result).toEqual({
      label: "abort-during-task-test",
      iterations: 1,
      errors: 0,
      stopReason: "aborted",
    });
    expect(calls).toBe(1);
    expect(sleeps).toEqual([]);
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
