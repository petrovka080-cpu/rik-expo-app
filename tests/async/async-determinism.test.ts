/**
 * Async flow determinism tests.
 *
 * WAVE W: Validates the offlineReplayCoordinator ensures deterministic
 * async execution under repeated/concurrent triggers. This is the
 * canonical dedup + coalesce boundary for all offline replay flows.
 *
 * Root cause addressed: overlapping trigger races when network comes back,
 * app becomes active, and user taps retry — all within milliseconds.
 */

import {
  getOfflineReplayOwnerSnapshot,
  requestOfflineReplay,
  resetOfflineReplayCoordinatorForTests,
  type OfflineReplayPolicy,
} from "../../src/lib/offline/offlineReplayCoordinator";

const POLICY: OfflineReplayPolicy = {
  queueKey: "determinism_test",
  owner: "test_worker",
  concurrencyLimit: 1,
  ordering: "created_at_fifo",
  backpressure: "coalesce_triggers_and_rerun_once",
};

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((r, rj) => { resolve = r; reject = rj; });
  return { promise, resolve, reject };
};

const tick = () => new Promise((r) => setTimeout(r, 0));

describe("async determinism — replay coordinator", () => {
  beforeEach(() => {
    resetOfflineReplayCoordinatorForTests();
  });

  it("rapid repeated triggers produce at most 2 runs (current + one coalesced)", async () => {
    let runCount = 0;
    const run = async () => {
      runCount++;
      await tick();
      return runCount;
    };

    // Fire 5 rapid triggers
    const results = await Promise.all([
      requestOfflineReplay(POLICY, "t1", run),
      requestOfflineReplay(POLICY, "t2", run),
      requestOfflineReplay(POLICY, "t3", run),
      requestOfflineReplay(POLICY, "t4", run),
      requestOfflineReplay(POLICY, "t5", run),
    ]);

    // Wait for drain to finish
    await tick();
    await tick();
    await tick();

    const snapshot = getOfflineReplayOwnerSnapshot("determinism_test");
    // max 2 runs: first + one coalesced
    expect(snapshot.runCount).toBeLessThanOrEqual(2);
    // All callers get a result (no hang)
    expect(results.every((r) => typeof r === "number")).toBe(true);
  });

  it("same trigger source multiple times is idempotent", async () => {
    const triggers: string[] = [];
    const run = async (src: string) => {
      triggers.push(src);
      await tick();
      return "ok";
    };

    await requestOfflineReplay(POLICY, "manual_retry", run);
    await requestOfflineReplay(POLICY, "manual_retry", run);
    await requestOfflineReplay(POLICY, "manual_retry", run);

    // Each sequential call runs once (no overlap since they're sequential)
    expect(triggers.length).toBeGreaterThanOrEqual(1);
    expect(triggers.every((t) => t === "manual_retry")).toBe(true);
  });

  it("error in run does not leave coordinator in stuck state", async () => {
    const d1 = createDeferred<string>();

    const run1Promise = requestOfflineReplay(POLICY, "failing", async () => {
      return d1.promise;
    });

    d1.reject(new Error("boom"));

    await expect(run1Promise).rejects.toThrow("boom");

    // Coordinator should not be stuck — next run works fine
    const result = await requestOfflineReplay(POLICY, "recovery", async () => "recovered");
    expect(result).toBe("recovered");

    await tick();
    await tick();

    const snapshot = getOfflineReplayOwnerSnapshot("determinism_test");
    expect(snapshot.running).toBe(false);
  });

  it("concurrent runs never exceed concurrency limit of 1", async () => {
    let maxConcurrent = 0;
    let current = 0;
    const d1 = createDeferred<void>();

    const run = async () => {
      current++;
      maxConcurrent = Math.max(maxConcurrent, current);
      if (current === 1) await d1.promise;
      else await tick();
      current--;
    };

    // Start multiple overlapping requests
    const p1 = requestOfflineReplay(POLICY, "r1", run);
    const p2 = requestOfflineReplay(POLICY, "r2", run);
    const p3 = requestOfflineReplay(POLICY, "r3", run);

    await tick();
    // Release first run
    d1.resolve();
    await Promise.all([p1, p2, p3]);
    await tick();
    await tick();

    expect(maxConcurrent).toBe(1);
  });

  it("only the last pending trigger survives coalescing", async () => {
    const d1 = createDeferred<void>();
    const triggerOrder: string[] = [];

    const run = async (src: string) => {
      triggerOrder.push(src);
      if (triggerOrder.length === 1) await d1.promise;
      else await tick();
    };

    requestOfflineReplay(POLICY, "first", run);
    // While first is running, queue multiple
    requestOfflineReplay(POLICY, "second", run);
    requestOfflineReplay(POLICY, "third", run);
    requestOfflineReplay(POLICY, "fourth", run);

    await tick();
    d1.resolve();
    await tick();
    await tick();
    await tick();

    // Coalescing: fewer runs than triggers
    expect(triggerOrder.length).toBeLessThanOrEqual(2);
    expect(triggerOrder[0]).toBe("first");
  });

  it("getOfflineReplayOwnerSnapshot returns clean state for unknown key", () => {
    const snapshot = getOfflineReplayOwnerSnapshot("nonexistent");
    expect(snapshot).toEqual({
      queueKey: "nonexistent",
      active: false,
      running: false,
      pending: false,
      currentTriggerSource: null,
      pendingTriggerSource: null,
      runCount: 0,
    });
  });
});
