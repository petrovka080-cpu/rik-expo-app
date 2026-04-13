import {
  createMemoryOfflineStorage,
  type MemoryOfflineStorageAdapter,
} from "../../lib/offline/offlineStorage";
import {
  clearWarehouseReceiveQueue,
  configureWarehouseReceiveQueue,
  enqueueWarehouseReceive,
  loadWarehouseReceiveQueue,
  markWarehouseReceiveQueueFailed,
  markWarehouseReceiveQueueInflight,
  removeWarehouseReceiveQueueEntry,
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
});
