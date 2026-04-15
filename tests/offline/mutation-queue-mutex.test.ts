/**
 * Mutation queue mutex discipline tests.
 *
 * ТЗ A2: Validates that the mutation queue's serialized persistence
 * (createSerializedQueuePersistence) correctly serializes concurrent
 * operations, prevents lost updates, recovers after errors, and
 * doesn't deadlock.
 *
 * The mutationQueue.ts already wraps ALL public methods through
 * queuePersistence.run() — this test suite proves the mutex contract.
 */

import { createSerializedQueuePersistence } from "../../src/lib/offline/queuePersistenceSerializer";

describe("mutation queue mutex — serialization", () => {
  it("operations execute in order", async () => {
    const mutex = createSerializedQueuePersistence();
    const order: number[] = [];

    const p1 = mutex.run(async () => {
      await delay(30);
      order.push(1);
      return 1;
    });
    const p2 = mutex.run(async () => {
      await delay(10);
      order.push(2);
      return 2;
    });
    const p3 = mutex.run(async () => {
      order.push(3);
      return 3;
    });

    const results = await Promise.all([p1, p2, p3]);
    expect(results).toEqual([1, 2, 3]);
    expect(order).toEqual([1, 2, 3]);
  });

  it("concurrent enqueue simulation preserves all entries", async () => {
    const mutex = createSerializedQueuePersistence();
    let queue: string[] = [];

    const enqueue = (item: string) =>
      mutex.run(async () => {
        const current = [...queue]; // read
        await delay(5); // simulated async gap
        current.push(item); // modify
        queue = current; // write
      });

    // 10 parallel enqueues
    await Promise.all(
      Array.from({ length: 10 }, (_, i) => enqueue(`item-${i}`)),
    );

    expect(queue).toHaveLength(10);
    for (let i = 0; i < 10; i++) {
      expect(queue).toContain(`item-${i}`);
    }
  });

  it("read-modify-write is atomic under concurrent access", async () => {
    const mutex = createSerializedQueuePersistence();
    let counter = 0;

    const increment = () =>
      mutex.run(async () => {
        const value = counter;
        await delay(2);
        counter = value + 1;
      });

    await Promise.all(Array.from({ length: 20 }, () => increment()));
    expect(counter).toBe(20);
  });
});

describe("mutation queue mutex — error recovery", () => {
  it("error in one operation doesn't block subsequent operations", async () => {
    const mutex = createSerializedQueuePersistence();
    const results: string[] = [];

    const p1 = mutex
      .run(async () => {
        results.push("before_error");
      })
      .catch(() => {});

    const p2 = mutex
      .run(async () => {
        throw new Error("deliberate failure");
      })
      .catch(() => {
        results.push("error_caught");
      });

    const p3 = mutex.run(async () => {
      results.push("after_error");
    });

    await Promise.all([p1, p2, p3]);
    expect(results).toEqual(["before_error", "error_caught", "after_error"]);
  });

  it("rejected promise doesn't cause deadlock", async () => {
    const mutex = createSerializedQueuePersistence();

    // First: rejection
    await expect(
      mutex.run(async () => {
        throw new Error("fail");
      }),
    ).rejects.toThrow("fail");

    // Second: should run normally, not deadlocked
    const result = await mutex.run(async () => "ok");
    expect(result).toBe("ok");
  });

  it("multiple consecutive errors all recover", async () => {
    const mutex = createSerializedQueuePersistence();

    for (let i = 0; i < 5; i++) {
      await expect(
        mutex.run(async () => {
          throw new Error(`error-${i}`);
        }),
      ).rejects.toThrow(`error-${i}`);
    }

    // After 5 errors, still works
    const result = await mutex.run(async () => "recovered");
    expect(result).toBe("recovered");
  });
});

describe("mutation queue mutex — reset", () => {
  it("reset is callable and doesn't break chain", async () => {
    const mutex = createSerializedQueuePersistence();
    await mutex.run(async () => "first");
    mutex.reset();
    const result = await mutex.run(async () => "after_reset");
    expect(result).toBe("after_reset");
  });

  it("reset during idle is safe", () => {
    const mutex = createSerializedQueuePersistence();
    expect(() => mutex.reset()).not.toThrow();
    expect(() => mutex.reset()).not.toThrow();
  });
});

describe("mutation queue mutex — lifecycle integration", () => {
  it("simulates markInflight → markRetry → markComplete sequence", async () => {
    const mutex = createSerializedQueuePersistence();
    const log: string[] = [];

    await mutex.run(async () => {
      log.push("markInflight");
    });
    await mutex.run(async () => {
      log.push("markRetry");
    });
    await mutex.run(async () => {
      log.push("markComplete");
    });

    expect(log).toEqual(["markInflight", "markRetry", "markComplete"]);
  });

  it("concurrent markInflight + markRetry don't overlap", async () => {
    const mutex = createSerializedQueuePersistence();
    let activeCount = 0;
    let maxActive = 0;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const operation = (name: string) =>
      mutex.run(async () => {
        activeCount++;
        maxActive = Math.max(maxActive, activeCount);
        await delay(5);
        activeCount--;
      });

    await Promise.all([
      operation("inflight1"),
      operation("retry1"),
      operation("complete1"),
      operation("inflight2"),
      operation("retry2"),
    ]);

    expect(maxActive).toBe(1); // only one operation at a time
  });
});

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
