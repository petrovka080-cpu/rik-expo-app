import {
  createMemoryOfflineStorage,
  type MemoryOfflineStorageAdapter,
} from "../../lib/offline/offlineStorage";
import {
  clearWarehouseReceiveQueue,
  configureWarehouseReceiveQueue,
  enqueueWarehouseReceive,
  loadWarehouseReceiveQueue,
  loadWarehouseReceiveQueueQuarantine,
  markWarehouseReceiveQueueFailed,
  markWarehouseReceiveQueueFailedNonRetryable,
  markWarehouseReceiveQueueInflight,
  peekNextWarehouseReceiveQueueEntry,
  removeWarehouseReceiveQueueEntry,
  WAREHOUSE_RECEIVE_RETRY_POLICY,
} from "./warehouseReceiveQueue";

type ObservedMemoryOfflineStorage = MemoryOfflineStorageAdapter & {
  maxActiveWrites: () => number;
};

const yieldToScheduler = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

const createObservedMemoryOfflineStorage = (): ObservedMemoryOfflineStorage => {
  const storage = createMemoryOfflineStorage();
  let activeWrites = 0;
  let maxActiveWrites = 0;

  const trackWrite = async (write: () => Promise<void>) => {
    activeWrites += 1;
    maxActiveWrites = Math.max(maxActiveWrites, activeWrites);
    try {
      await yieldToScheduler();
      await write();
    } finally {
      activeWrites -= 1;
    }
  };

  return {
    async getItem(key) {
      return await storage.getItem(key);
    },
    async setItem(key, value) {
      await trackWrite(async () => {
        await storage.setItem(key, value);
      });
    },
    async removeItem(key) {
      await trackWrite(async () => {
        await storage.removeItem(key);
      });
    },
    dump: storage.dump,
    maxActiveWrites: () => maxActiveWrites,
  };
};

describe("warehouseReceiveQueue atomic persistence", () => {
  beforeEach(async () => {
    configureWarehouseReceiveQueue({ storage: createMemoryOfflineStorage() });
    await clearWarehouseReceiveQueue();
  });

  it("serializes parallel enqueue writes without dropping incoming entries", async () => {
    const storage = createObservedMemoryOfflineStorage();
    configureWarehouseReceiveQueue({ storage });

    await Promise.all([
      enqueueWarehouseReceive("incoming-atomic-1"),
      enqueueWarehouseReceive("incoming-atomic-2"),
      enqueueWarehouseReceive("incoming-atomic-3"),
    ]);

    const queue = await loadWarehouseReceiveQueue();

    expect(queue.map((entry) => entry.incomingId).sort()).toEqual([
      "incoming-atomic-1",
      "incoming-atomic-2",
      "incoming-atomic-3",
    ]);
    expect(storage.maxActiveWrites()).toBe(1);
  });

  it("serializes enqueue plus inflight metadata without stale overwrite", async () => {
    const storage = createObservedMemoryOfflineStorage();
    configureWarehouseReceiveQueue({ storage });
    await enqueueWarehouseReceive("incoming-atomic-inflight");
    const [queuedEntry] = await loadWarehouseReceiveQueue();

    await Promise.all([
      markWarehouseReceiveQueueInflight(queuedEntry.id),
      enqueueWarehouseReceive("incoming-atomic-new"),
    ]);

    const queue = await loadWarehouseReceiveQueue();

    expect(queue).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: queuedEntry.id,
          status: "inflight",
        }),
        expect.objectContaining({
          incomingId: "incoming-atomic-new",
          status: "pending",
        }),
      ]),
    );
    expect(storage.maxActiveWrites()).toBe(1);
  });

  it("serializes failed metadata and remove writes without resurrecting removed entries", async () => {
    const storage = createObservedMemoryOfflineStorage();
    configureWarehouseReceiveQueue({ storage });
    await enqueueWarehouseReceive("incoming-atomic-remove");
    const [queuedEntry] = await loadWarehouseReceiveQueue();

    await Promise.all([
      markWarehouseReceiveQueueFailed(queuedEntry.id, "offline"),
      removeWarehouseReceiveQueueEntry(queuedEntry.id),
    ]);

    expect(await loadWarehouseReceiveQueue()).toEqual([]);
    expect(storage.maxActiveWrites()).toBe(1);
  });

  it("schedules retry_wait with nextRetryAt and does not replay before it is due", async () => {
    configureWarehouseReceiveQueue({ storage: createMemoryOfflineStorage() });
    await enqueueWarehouseReceive("incoming-retry-schedule");
    const [queuedEntry] = await loadWarehouseReceiveQueue();

    const failedEntry = await markWarehouseReceiveQueueFailed(queuedEntry.id, "temporary outage");
    expect(failedEntry).toMatchObject({
      id: queuedEntry.id,
      status: "retry_wait",
      retryCount: 1,
      lastError: "temporary outage",
    });
    expect(failedEntry?.nextRetryAt).toEqual(expect.any(Number));
    expect((failedEntry?.nextRetryAt ?? 0) - failedEntry!.updatedAt).toBe(
      WAREHOUSE_RECEIVE_RETRY_POLICY.baseDelayMs,
    );

    await expect(peekNextWarehouseReceiveQueueEntry()).resolves.toBeNull();
    await expect(
      peekNextWarehouseReceiveQueueEntry({ now: failedEntry!.nextRetryAt ?? 0 }),
    ).resolves.toMatchObject({ incomingId: "incoming-retry-schedule" });
    await expect(
      peekNextWarehouseReceiveQueueEntry({ triggerSource: "manual_retry" }),
    ).resolves.toMatchObject({ incomingId: "incoming-retry-schedule" });
  });

  it("exhausts retry budget into failed_non_retryable and stops automatic replay", async () => {
    configureWarehouseReceiveQueue({ storage: createMemoryOfflineStorage() });
    await enqueueWarehouseReceive("incoming-budget");
    const [queuedEntry] = await loadWarehouseReceiveQueue();

    let failedEntry: Awaited<ReturnType<typeof markWarehouseReceiveQueueFailed>> = null;
    for (let attempt = 0; attempt < WAREHOUSE_RECEIVE_RETRY_POLICY.maxAttempts; attempt += 1) {
      failedEntry = await markWarehouseReceiveQueueFailed(queuedEntry.id, "still failing");
    }

    expect(failedEntry).toMatchObject({
      status: "failed_non_retryable",
      retryCount: WAREHOUSE_RECEIVE_RETRY_POLICY.maxAttempts,
      nextRetryAt: null,
    });
    await expect(peekNextWarehouseReceiveQueueEntry({ triggerSource: "manual_retry" })).resolves.toBeNull();
  });

  it("manual enqueue revives failed_non_retryable receive entries without changing incoming semantics", async () => {
    configureWarehouseReceiveQueue({ storage: createMemoryOfflineStorage() });
    await enqueueWarehouseReceive("incoming-final-retry");
    const [queuedEntry] = await loadWarehouseReceiveQueue();
    await markWarehouseReceiveQueueFailedNonRetryable(queuedEntry.id, "warehouseman_fio_missing");

    const queue = await enqueueWarehouseReceive("incoming-final-retry");

    expect(queue).toEqual([
      expect.objectContaining({
        id: queuedEntry.id,
        incomingId: "incoming-final-retry",
        status: "pending",
        retryCount: 0,
        lastError: null,
        nextRetryAt: null,
      }),
    ]);
  });

  it("quarantines malformed queue payload rows instead of silently dropping them", async () => {
    const storage = createMemoryOfflineStorage({
      warehouse_receive_queue_v1: JSON.stringify([
        {
          id: "valid-entry",
          incomingId: "incoming-valid",
          status: "pending",
          createdAt: 1,
          retryCount: 0,
          coalescedCount: 0,
          updatedAt: 1,
        },
        {
          id: "missing-incoming",
          status: "pending",
          createdAt: 2,
        },
        "not-an-entry",
      ]),
    });
    configureWarehouseReceiveQueue({ storage });

    const queue = await loadWarehouseReceiveQueue();
    const quarantine = await loadWarehouseReceiveQueueQuarantine();

    expect(queue).toEqual([
      expect.objectContaining({
        id: "valid-entry",
        incomingId: "incoming-valid",
      }),
    ]);
    expect(quarantine).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason: "queue_entry_missing_incoming_id" }),
        expect.objectContaining({ reason: "queue_entry_not_object" }),
      ]),
    );
    expect(JSON.parse(storage.dump().warehouse_receive_queue_v1)).toHaveLength(1);
  });
});
