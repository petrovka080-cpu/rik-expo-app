/**
 * N2: Dedicated Mutex — queuePersistenceSerializer tests.
 *
 * Verifies the promise-chain mutex properties required by the ТЗ:
 * 1. Concurrent operations serialize correctly
 * 2. Error during operation releases the lock
 * 3. Subsequent operation succeeds after failure
 * 4. Rapid repeated operations remain deterministic
 * 5. No deadlock after multiple sequential errors
 * 6. Operations interleave correctly (no corruption)
 */
import { createSerializedQueuePersistence } from "../../src/lib/offline/queuePersistenceSerializer";

describe("queuePersistenceSerializer — dedicated mutex (N2)", () => {
  it("serializes concurrent operations (no parallel execution)", async () => {
    const mutex = createSerializedQueuePersistence();
    const log: string[] = [];

    await Promise.all([
      mutex.run(async () => {
        log.push("a:start");
        await new Promise((r) => setTimeout(r, 10));
        log.push("a:end");
      }),
      mutex.run(async () => {
        log.push("b:start");
        await new Promise((r) => setTimeout(r, 5));
        log.push("b:end");
      }),
      mutex.run(async () => {
        log.push("c:start");
        log.push("c:end");
      }),
    ]);

    // Each operation must fully complete before the next starts
    expect(log).toEqual([
      "a:start", "a:end",
      "b:start", "b:end",
      "c:start", "c:end",
    ]);
  });

  it("releases the lock after an error (no deadlock)", async () => {
    const mutex = createSerializedQueuePersistence();
    const log: string[] = [];

    const failing = mutex.run(async () => {
      log.push("fail:start");
      throw new Error("deliberate failure");
    });

    await expect(failing).rejects.toThrow("deliberate failure");

    // The lock must be released — next operation should run
    await mutex.run(async () => {
      log.push("after:ok");
    });

    expect(log).toEqual(["fail:start", "after:ok"]);
  });

  it("subsequent operation succeeds after failure", async () => {
    const mutex = createSerializedQueuePersistence();
    const results: number[] = [];

    // First: fail
    await mutex.run(async () => {
      throw new Error("boom");
    }).catch(() => {});

    // Second: succeed
    const val = await mutex.run(async () => {
      results.push(42);
      return 42;
    });

    expect(val).toBe(42);
    expect(results).toEqual([42]);
  });

  it("rapid repeated operations remain deterministic", async () => {
    const mutex = createSerializedQueuePersistence();
    const counter = { value: 0 };

    // Fire 20 rapid increment operations
    const promises = Array.from({ length: 20 }, (_, i) =>
      mutex.run(async () => {
        const before = counter.value;
        await new Promise((r) => setTimeout(r, 0));
        counter.value = before + 1;
        return counter.value;
      }),
    );

    const results = await Promise.all(promises);

    // All 20 must complete, counter must be exactly 20
    expect(counter.value).toBe(20);
    // Results must be 1, 2, 3, ..., 20 (serial order)
    expect(results).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it("does not deadlock after multiple sequential errors", async () => {
    const mutex = createSerializedQueuePersistence();

    for (let i = 0; i < 5; i++) {
      await mutex.run(async () => {
        throw new Error(`error-${i}`);
      }).catch(() => {});
    }

    // After 5 sequential errors, the mutex must still work
    const result = await mutex.run(async () => "alive");
    expect(result).toBe("alive");
  });

  it("interleaved enqueue/dequeue simulation preserves data", async () => {
    const mutex = createSerializedQueuePersistence();
    const queue: string[] = [];

    await Promise.all([
      mutex.run(async () => {
        queue.push("item-1");
        await new Promise((r) => setTimeout(r, 5));
      }),
      mutex.run(async () => {
        queue.push("item-2");
      }),
      mutex.run(async () => {
        // dequeue
        const item = queue.shift();
        return item;
      }),
      mutex.run(async () => {
        queue.push("item-3");
      }),
    ]);

    // item-1 pushed, item-2 pushed, item-1 dequeued, item-3 pushed
    expect(queue).toEqual(["item-2", "item-3"]);
  });

  it("reset clears the chain and allows immediate execution", async () => {
    const mutex = createSerializedQueuePersistence();
    const log: string[] = [];

    // Start a long operation
    const longOp = mutex.run(async () => {
      log.push("long:start");
      await new Promise((r) => setTimeout(r, 50));
      log.push("long:end");
    });

    // Reset mid-flight
    mutex.reset();

    // New operation should not wait for the old one
    const fastOp = mutex.run(async () => {
      log.push("fast:done");
    });

    await Promise.allSettled([longOp, fastOp]);

    // Fast should complete; the order may vary but both should appear
    expect(log).toContain("fast:done");
    expect(log).toContain("long:start");
  });

  it("return values pass through correctly", async () => {
    const mutex = createSerializedQueuePersistence();

    const a = await mutex.run(async () => 1);
    const b = await mutex.run(async () => "hello");
    const c = await mutex.run(async () => ({ key: "value" }));

    expect(a).toBe(1);
    expect(b).toBe("hello");
    expect(c).toEqual({ key: "value" });
  });
});
