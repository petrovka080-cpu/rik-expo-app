import { createMemoryOfflineStorage, type MemoryOfflineStorageAdapter } from "./offlineStorage";
import {
  clearForemanMutationQueue,
  configureMutationQueue,
  enqueueForemanMutation,
  getForemanMutationQueueSummary,
  loadForemanMutationQueue,
  markForemanMutationInflight,
  markForemanMutationRetryScheduled,
  peekNextForemanMutation,
  removeForemanMutationById,
  resetInflightForemanMutations,
} from "./mutationQueue";
import {
  getOfflineMutationTelemetryEvents,
  resetOfflineMutationTelemetryEvents,
} from "./mutation.telemetry";

jest.mock("../observability/platformObservability", () => ({
  recordPlatformObservability: jest.fn(),
}));

const MUTATION_QUEUE_STORAGE_KEY = "offline_mutation_queue_v2";
const MUTATION_QUEUE_LEGACY_STORAGE_KEY = "offline_mutation_queue_v1";

type ObservedMemoryOfflineStorage = MemoryOfflineStorageAdapter & {
  maxActiveWrites: () => number;
};

const yieldToScheduler = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

const createObservedMemoryOfflineStorage = (
  seed?: Record<string, string>,
): ObservedMemoryOfflineStorage => {
  const storage = createMemoryOfflineStorage(seed);
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

const enqueueBackgroundSync = async (draftKey: string) =>
  await enqueueForemanMutation({
    draftKey,
    requestId: draftKey,
    snapshotUpdatedAt: `snap-${draftKey}`,
    mutationKind: "background_sync",
    triggerSource: "manual_retry",
  });

type SeedEntryParams = {
  id: string;
  draftKey: string;
  createdAt: number;
  updatedAt?: number;
  lifecycleStatus?: string;
  status?: string;
  mutationKind?: string;
  snapshotUpdatedAt?: string | null;
  submitRequested?: boolean;
  lastErrorKind?: string;
  nextRetryAt?: number | null;
  attemptCount?: number;
  retryCount?: number;
};

const createSeedEntry = (params: SeedEntryParams) => ({
  id: params.id,
  owner: "foreman",
  entityType: "foreman_draft",
  entityId: params.draftKey,
  scope: "foreman_draft",
  type: params.submitRequested ? "submit_draft" : "background_sync",
  dedupeKey: `seed:${params.draftKey}:${params.id}`,
  baseVersion: params.snapshotUpdatedAt ?? "snap-seed",
  serverVersionHint: null,
  coalescedCount: 0,
  payload: {
    draftKey: params.draftKey,
    requestId: params.draftKey,
    snapshotUpdatedAt: params.snapshotUpdatedAt ?? "snap-seed",
    mutationKind: params.mutationKind ?? "background_sync",
    localBeforeCount: 1,
    localAfterCount: 1,
    submitRequested: params.submitRequested === true,
    triggerSource: "manual_retry",
  },
  createdAt: params.createdAt,
  updatedAt: params.updatedAt ?? params.createdAt,
  attemptCount: params.attemptCount ?? 0,
  retryCount: params.retryCount ?? 0,
  status: params.status ?? "pending",
  lifecycleStatus: params.lifecycleStatus ?? "queued",
  lastAttemptAt: null,
  lastError: null,
  lastErrorCode: null,
  lastErrorKind: params.lastErrorKind ?? "none",
  nextRetryAt: params.nextRetryAt ?? null,
  maxAttempts: 5,
});

describe("mutationQueue contract", () => {
  beforeEach(async () => {
    configureMutationQueue({ storage: createMemoryOfflineStorage() });
    resetOfflineMutationTelemetryEvents();
    await clearForemanMutationQueue();
  });

  it("collapses exact duplicate mutations by dedupeKey and keeps the latest payload intent", async () => {
    await enqueueForemanMutation({
      draftKey: "req-queue-1",
      requestId: "req-queue-1",
      snapshotUpdatedAt: "snap-1",
      mutationKind: "qty_update",
      localBeforeCount: 1,
      localAfterCount: 2,
      triggerSource: "manual_retry",
    });

    await enqueueForemanMutation({
      draftKey: "req-queue-1",
      requestId: "req-queue-1",
      snapshotUpdatedAt: "snap-1",
      mutationKind: "qty_update",
      localBeforeCount: 2,
      localAfterCount: 3,
      triggerSource: "manual_retry",
    });

    const queue = await loadForemanMutationQueue();
    const summary = await getForemanMutationQueueSummary(["req-queue-1"]);

    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      lifecycleStatus: "queued",
      status: "pending",
      coalescedCount: 1,
      payload: {
        localBeforeCount: 2,
        localAfterCount: 3,
        mutationKind: "qty_update",
      },
    });
    expect(summary).toMatchObject({
      totalCount: 1,
      activeCount: 1,
      coalescedCount: 1,
    });
    expect(getOfflineMutationTelemetryEvents().map((event) => event.action)).toEqual([
      "enqueue",
      "dedupe_suppressed",
    ]);
  });

  it("coalesces compatible pending mutations into a single queued intent", async () => {
    await enqueueForemanMutation({
      draftKey: "req-queue-2",
      requestId: "req-queue-2",
      snapshotUpdatedAt: "snap-a",
      mutationKind: "catalog_add",
      localBeforeCount: 0,
      localAfterCount: 1,
      triggerSource: "manual_retry",
    });

    await enqueueForemanMutation({
      draftKey: "req-queue-2",
      requestId: "req-queue-2",
      snapshotUpdatedAt: "snap-b",
      mutationKind: "qty_update",
      localBeforeCount: 1,
      localAfterCount: 4,
      triggerSource: "manual_retry",
    });

    const queue = await loadForemanMutationQueue();

    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      type: "update_qty",
      lifecycleStatus: "queued",
      coalescedCount: 1,
      baseVersion: "snap-b",
      payload: {
        mutationKind: "qty_update",
        localBeforeCount: 1,
        localAfterCount: 4,
      },
    });
  });

  it("lets a terminal mutation absorb obsolete pending draft intent without losing the last valid action", async () => {
    await enqueueForemanMutation({
      draftKey: "req-queue-3",
      requestId: "req-queue-3",
      snapshotUpdatedAt: "snap-a",
      mutationKind: "catalog_add",
      localBeforeCount: 0,
      localAfterCount: 1,
      triggerSource: "manual_retry",
    });

    await enqueueForemanMutation({
      draftKey: "req-queue-3",
      requestId: "req-queue-3",
      snapshotUpdatedAt: "snap-b",
      mutationKind: "qty_update",
      localBeforeCount: 1,
      localAfterCount: 3,
      triggerSource: "manual_retry",
    });

    await enqueueForemanMutation({
      draftKey: "req-queue-3",
      requestId: "req-queue-3",
      snapshotUpdatedAt: "snap-c",
      mutationKind: "whole_cancel",
      localBeforeCount: 3,
      localAfterCount: 0,
      triggerSource: "manual_retry",
    });

    const queue = await loadForemanMutationQueue();

    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      type: "cancel_draft",
      lifecycleStatus: "queued",
      payload: {
        mutationKind: "whole_cancel",
      },
      coalescedCount: 2,
    });
  });

  it("restores stuck inflight mutations back to queued and emits recovery telemetry", async () => {
    await enqueueForemanMutation({
      draftKey: "req-queue-4",
      requestId: "req-queue-4",
      snapshotUpdatedAt: "snap-1",
      mutationKind: "background_sync",
      triggerSource: "manual_retry",
    });

    const [queuedEntry] = await loadForemanMutationQueue();
    await markForemanMutationInflight(queuedEntry.id);

    const restoredQueue = await resetInflightForemanMutations();
    const restoredEntry = restoredQueue.find((entry) => entry.id === queuedEntry.id);

    expect(restoredEntry).toMatchObject({
      status: "pending",
      lifecycleStatus: "queued",
      attemptCount: 1,
    });
    expect(getOfflineMutationTelemetryEvents().map((event) => event.action)).toContain("inflight_restored");
  });

  it("respects retry scheduling but lets network_back recover network-unreachable retries immediately", async () => {
    const storage = createMemoryOfflineStorage({
      [MUTATION_QUEUE_STORAGE_KEY]: JSON.stringify([
        createSeedEntry({
          id: "retry-future",
          draftKey: "req-queue-5",
          createdAt: 10,
          updatedAt: 20,
          lifecycleStatus: "retry_scheduled",
          status: "failed",
          lastErrorKind: "network_unreachable",
          nextRetryAt: 10_000,
        }),
      ]),
    });
    configureMutationQueue({ storage });

    const regularPeek = await peekNextForemanMutation({
      triggerSource: "unknown",
      now: 1_000,
    });
    const networkBackPeek = await peekNextForemanMutation({
      triggerSource: "network_back",
      now: 1_000,
    });

    expect(regularPeek).toBeNull();
    expect(networkBackPeek?.id).toBe("retry-future");
  });

  it("prunes terminal history to the newest 20 entries without corrupting active queue truth", async () => {
    const terminalEntries = Array.from({ length: 25 }, (_, index) =>
      createSeedEntry({
        id: `terminal-${index + 1}`,
        draftKey: `req-terminal-${index + 1}`,
        createdAt: index + 1,
        updatedAt: 1_000 + index,
        lifecycleStatus: "failed_non_retryable",
        status: "failed",
        mutationKind: "submit",
        submitRequested: true,
      }),
    );
    const activeEntry = createSeedEntry({
      id: "active-1",
      draftKey: "req-active-1",
      createdAt: 10_000,
      updatedAt: 10_000,
      lifecycleStatus: "queued",
      status: "pending",
    });
    const storage = createMemoryOfflineStorage({
      [MUTATION_QUEUE_STORAGE_KEY]: JSON.stringify([...terminalEntries, activeEntry]),
    });
    configureMutationQueue({ storage });

    await enqueueForemanMutation({
      draftKey: "req-active-2",
      requestId: "req-active-2",
      snapshotUpdatedAt: "snap-prune",
      mutationKind: "background_sync",
      triggerSource: "manual_retry",
    });

    const queue = await loadForemanMutationQueue();
    const terminalIds = queue
      .filter((entry) => entry.lifecycleStatus === "failed_non_retryable")
      .map((entry) => entry.id);

    expect(queue.some((entry) => entry.id === "active-1" && entry.lifecycleStatus === "queued")).toBe(true);
    expect(queue.some((entry) => entry.payload.draftKey === "req-active-2")).toBe(true);
    expect(terminalIds).toHaveLength(20);
    expect(terminalIds).toEqual([
      "terminal-6",
      "terminal-7",
      "terminal-8",
      "terminal-9",
      "terminal-10",
      "terminal-11",
      "terminal-12",
      "terminal-13",
      "terminal-14",
      "terminal-15",
      "terminal-16",
      "terminal-17",
      "terminal-18",
      "terminal-19",
      "terminal-20",
      "terminal-21",
      "terminal-22",
      "terminal-23",
      "terminal-24",
      "terminal-25",
    ]);
  });

  it("round-trips enqueue payload without corruption and keeps the queued entry pickable", async () => {
    await enqueueForemanMutation({
      draftKey: "req-queue-6",
      requestId: "req-queue-6",
      snapshotUpdatedAt: "snap-submit",
      mutationKind: "submit",
      localBeforeCount: 4,
      localAfterCount: 0,
      submitRequested: true,
      triggerSource: "submit",
    });

    const [entry] = await loadForemanMutationQueue();
    const peeked = await peekNextForemanMutation({
      triggerSource: "submit",
    });

    expect(entry).toMatchObject({
      type: "submit_draft",
      lifecycleStatus: "queued",
      status: "pending",
      baseVersion: "snap-submit",
      payload: {
        draftKey: "req-queue-6",
        requestId: "req-queue-6",
        snapshotUpdatedAt: "snap-submit",
        mutationKind: "submit",
        localBeforeCount: 4,
        localAfterCount: 0,
        submitRequested: true,
        triggerSource: "submit",
      },
    });
    expect(peeked?.id).toBe(entry.id);
  });

  it("marks inflight mutations without mutating payload intent", async () => {
    await enqueueForemanMutation({
      draftKey: "req-queue-7",
      requestId: "req-queue-7",
      snapshotUpdatedAt: "snap-qty",
      mutationKind: "qty_update",
      localBeforeCount: 2,
      localAfterCount: 5,
      triggerSource: "manual_retry",
    });

    const [queuedEntry] = await loadForemanMutationQueue();
    const inflight = await markForemanMutationInflight(queuedEntry.id);

    expect(inflight).toMatchObject({
      id: queuedEntry.id,
      status: "inflight",
      lifecycleStatus: "processing",
      attemptCount: 1,
      payload: {
        draftKey: "req-queue-7",
        mutationKind: "qty_update",
        localBeforeCount: 2,
        localAfterCount: 5,
      },
    });
    expect(inflight?.lastAttemptAt).toEqual(expect.any(Number));
  });

  it("reads legacy queue storage and normalizes compatibility status into lifecycle truth", async () => {
    const legacyEntry = {
      ...createSeedEntry({
        id: "legacy-retry",
        draftKey: "req-queue-legacy",
        createdAt: 1,
        status: "failed",
        lastErrorKind: "network_unreachable",
        nextRetryAt: 99_999,
        retryCount: 2,
      }),
      lifecycleStatus: undefined,
    };
    const storage = createMemoryOfflineStorage({
      [MUTATION_QUEUE_LEGACY_STORAGE_KEY]: JSON.stringify([legacyEntry]),
    });
    configureMutationQueue({ storage });

    const [loaded] = await loadForemanMutationQueue();
    await enqueueForemanMutation({
      draftKey: "req-queue-legacy-next",
      requestId: "req-queue-legacy-next",
      snapshotUpdatedAt: "snap-next",
      mutationKind: "background_sync",
      triggerSource: "manual_retry",
    });

    expect(loaded).toMatchObject({
      id: "legacy-retry",
      status: "failed",
      lifecycleStatus: "retry_scheduled",
      retryCount: 2,
      lastErrorKind: "network_unreachable",
      nextRetryAt: 99_999,
    });
    expect(storage.dump()).toEqual(
      expect.objectContaining({
        [MUTATION_QUEUE_STORAGE_KEY]: expect.any(String),
      }),
    );
    expect(storage.dump()[MUTATION_QUEUE_LEGACY_STORAGE_KEY]).toBeUndefined();
  });

  it("picks the earliest eligible queued item while skipping deferred retries", async () => {
    const storage = createMemoryOfflineStorage({
      [MUTATION_QUEUE_STORAGE_KEY]: JSON.stringify([
        createSeedEntry({
          id: "retry-deferred",
          draftKey: "req-queue-8",
          createdAt: 1,
          updatedAt: 5,
          lifecycleStatus: "retry_scheduled",
          status: "failed",
          lastErrorKind: "network_unreachable",
          nextRetryAt: 10_000,
        }),
        createSeedEntry({
          id: "queued-earliest",
          draftKey: "req-queue-8",
          createdAt: 2,
          updatedAt: 6,
          mutationKind: "catalog_add",
        }),
        createSeedEntry({
          id: "queued-later",
          draftKey: "req-queue-8",
          createdAt: 3,
          updatedAt: 7,
          mutationKind: "qty_update",
        }),
      ]),
    });
    configureMutationQueue({ storage });

    const queue = await loadForemanMutationQueue();
    const peeked = await peekNextForemanMutation({
      triggerSource: "unknown",
      now: 1_000,
    });

    expect(queue.map((entry) => entry.id)).toEqual([
      "retry-deferred",
      "queued-earliest",
      "queued-later",
    ]);
    expect(peeked?.id).toBe("queued-earliest");
  });

  it("serializes parallel enqueue writes without dropping queue entries", async () => {
    const storage = createObservedMemoryOfflineStorage();
    configureMutationQueue({ storage });

    await Promise.all([
      enqueueBackgroundSync("req-atomic-enqueue-1"),
      enqueueBackgroundSync("req-atomic-enqueue-2"),
      enqueueBackgroundSync("req-atomic-enqueue-3"),
    ]);

    const queue = await loadForemanMutationQueue();

    expect(queue.map((entry) => entry.payload.draftKey).sort()).toEqual([
      "req-atomic-enqueue-1",
      "req-atomic-enqueue-2",
      "req-atomic-enqueue-3",
    ]);
    expect(storage.maxActiveWrites()).toBe(1);
  });

  it("serializes enqueue plus inflight metadata so stale snapshots cannot overwrite either side", async () => {
    const storage = createObservedMemoryOfflineStorage();
    configureMutationQueue({ storage });
    await enqueueBackgroundSync("req-atomic-inflight");
    const [queuedEntry] = await loadForemanMutationQueue();

    await Promise.all([
      markForemanMutationInflight(queuedEntry.id),
      enqueueBackgroundSync("req-atomic-during-inflight"),
    ]);

    const queue = await loadForemanMutationQueue();

    expect(queue).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: queuedEntry.id,
          lifecycleStatus: "processing",
          status: "inflight",
        }),
        expect.objectContaining({
          payload: expect.objectContaining({
            draftKey: "req-atomic-during-inflight",
          }),
          lifecycleStatus: "queued",
        }),
      ]),
    );
    expect(storage.maxActiveWrites()).toBe(1);
  });

  it("serializes retry metadata and remove/complete writes without resurrecting stale queue entries", async () => {
    const storage = createObservedMemoryOfflineStorage();
    configureMutationQueue({ storage });
    await enqueueBackgroundSync("req-atomic-remove");
    const [queuedEntry] = await loadForemanMutationQueue();

    await Promise.all([
      markForemanMutationRetryScheduled({
        mutationId: queuedEntry.id,
        errorMessage: "offline",
        errorCode: "network",
        errorKind: "network_unreachable",
        nextRetryAt: Date.now() + 1_000,
      }),
      removeForemanMutationById(queuedEntry.id),
    ]);

    expect(await loadForemanMutationQueue()).toEqual([]);
    expect(storage.maxActiveWrites()).toBe(1);
  });

  it("releases the queue lock after a storage write error so subsequent operations succeed (N2)", async () => {
    let writeCallCount = 0;
    const storage = createObservedMemoryOfflineStorage();
    const originalSetItem = storage.setItem.bind(storage);

    // First write fails, subsequent writes succeed
    storage.setItem = async (key: string, value: string) => {
      writeCallCount++;
      if (writeCallCount === 1) throw new Error("storage write failed");
      await originalSetItem(key, value);
    };

    configureMutationQueue({ storage });

    // First enqueue will fail because setItem throws
    await expect(
      enqueueBackgroundSync("req-error-release-1"),
    ).rejects.toThrow("storage write failed");

    // Restore normal behavior
    storage.setItem = originalSetItem;

    // Subsequent enqueue must succeed (lock was released)
    await enqueueBackgroundSync("req-error-release-2");

    const queue = await loadForemanMutationQueue();
    expect(queue.some((e) => e.payload.draftKey === "req-error-release-2")).toBe(true);
  });

  it("rapid repeated enqueue + load cycle produces deterministic results (N2)", async () => {
    const storage = createObservedMemoryOfflineStorage();
    configureMutationQueue({ storage });

    // Fire 10 rapid enqueue + load pairs without awaiting between
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        (async () => {
          await enqueueBackgroundSync(`req-rapid-${i}`);
          const queue = await loadForemanMutationQueue();
          return queue.length;
        })(),
      ),
    );

    // Final queue should have exactly 10 entries (all coalesce to different draftKeys)
    const finalQueue = await loadForemanMutationQueue();
    expect(finalQueue).toHaveLength(10);

    // Each length must be between 1 and 10 (monotonically non-decreasing when serial)
    for (const len of results) {
      expect(len).toBeGreaterThanOrEqual(1);
      expect(len).toBeLessThanOrEqual(10);
    }
    expect(storage.maxActiveWrites()).toBe(1);
  });

  it("snapshot remains valid after reconfigure (simulated app reload) (N2)", async () => {
    const storage = createObservedMemoryOfflineStorage();
    configureMutationQueue({ storage });

    await enqueueBackgroundSync("req-reload-1");
    await enqueueBackgroundSync("req-reload-2");

    // Simulate app reload — reconfigure with same storage
    configureMutationQueue({ storage });

    const queue = await loadForemanMutationQueue();
    expect(queue.map((e) => e.payload.draftKey).sort()).toEqual([
      "req-reload-1",
      "req-reload-2",
    ]);
    // Can still enqueue after reload
    await enqueueBackgroundSync("req-reload-3");
    const afterReload = await loadForemanMutationQueue();
    expect(afterReload).toHaveLength(3);
  });
});
