import {
  createMemoryOfflineStorage,
  type MemoryOfflineStorageAdapter,
} from "./offlineStorage";
import {
  clearContractorProgressQueue,
  configureContractorProgressQueue,
  enqueueContractorProgress,
  loadContractorProgressQueue,
  markContractorProgressQueueInflight,
  markContractorProgressQueueRetryScheduled,
  removeContractorProgressQueueEntry,
} from "./contractorProgressQueue";

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

describe("contractorProgressQueue atomic persistence", () => {
  beforeEach(async () => {
    configureContractorProgressQueue({ storage: createMemoryOfflineStorage() });
    await clearContractorProgressQueue();
  });

  it("serializes parallel enqueue writes without dropping progress entries", async () => {
    const storage = createObservedMemoryOfflineStorage();
    configureContractorProgressQueue({ storage });

    await Promise.all([
      enqueueContractorProgress("progress-atomic-1", { baseVersion: "base-1" }),
      enqueueContractorProgress("progress-atomic-2", { baseVersion: "base-2" }),
      enqueueContractorProgress("progress-atomic-3", { baseVersion: "base-3" }),
    ]);

    const queue = await loadContractorProgressQueue({ includeFinal: true });

    expect(queue.map((entry) => entry.progressId).sort()).toEqual([
      "progress-atomic-1",
      "progress-atomic-2",
      "progress-atomic-3",
    ]);
    expect(storage.maxActiveWrites()).toBe(1);
  });

  it("serializes enqueue plus inflight metadata without stale overwrite", async () => {
    const storage = createObservedMemoryOfflineStorage();
    configureContractorProgressQueue({ storage });
    await enqueueContractorProgress("progress-atomic-inflight", { baseVersion: "base-1" });
    const [queuedEntry] = await loadContractorProgressQueue({ includeFinal: true });

    await Promise.all([
      markContractorProgressQueueInflight(queuedEntry.id),
      enqueueContractorProgress("progress-atomic-new", { baseVersion: "base-2" }),
    ]);

    const queue = await loadContractorProgressQueue({ includeFinal: true });

    expect(queue).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: queuedEntry.id,
          lifecycleStatus: "processing",
          status: "inflight",
        }),
        expect.objectContaining({
          progressId: "progress-atomic-new",
          lifecycleStatus: "queued",
        }),
      ]),
    );
    expect(storage.maxActiveWrites()).toBe(1);
  });

  it("serializes retry metadata and remove writes without resurrecting removed entries", async () => {
    const storage = createObservedMemoryOfflineStorage();
    configureContractorProgressQueue({ storage });
    await enqueueContractorProgress("progress-atomic-remove", { baseVersion: "base-1" });
    const [queuedEntry] = await loadContractorProgressQueue({ includeFinal: true });

    await Promise.all([
      markContractorProgressQueueRetryScheduled({
        queueId: queuedEntry.id,
        errorMessage: "offline",
        errorCode: "network",
        errorKind: "network_unreachable",
        nextRetryAt: Date.now() + 1_000,
      }),
      removeContractorProgressQueueEntry(queuedEntry.id),
    ]);

    expect(await loadContractorProgressQueue({ includeFinal: true })).toEqual([]);
    expect(storage.maxActiveWrites()).toBe(1);
  });
});
