jest.mock("../observability/platformObservability", () => ({
  recordPlatformObservability: jest.fn(),
}));

import { createMemoryOfflineStorage } from "./offlineStorage";
import {
  clearForemanMutationQueue,
  configureMutationQueue,
  enqueueForemanMutation,
  getForemanMutationQueueSummary,
  loadForemanMutationQueue,
  markForemanMutationInflight,
  peekNextForemanMutation,
  resetInflightForemanMutations,
} from "./mutationQueue";
import {
  getOfflineMutationTelemetryEvents,
  resetOfflineMutationTelemetryEvents,
} from "./mutation.telemetry";

const MUTATION_QUEUE_STORAGE_KEY = "offline_mutation_queue_v2";

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
});
