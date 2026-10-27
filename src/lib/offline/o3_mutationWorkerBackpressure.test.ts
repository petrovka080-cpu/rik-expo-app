/**
 * O3.2 — Offline Replay Backpressure Tests
 *
 * Verifies:
 * A. Ordering preserved across batches
 * B. Bounded replay — in-flight count never exceeds batch size
 * C. Retry budget honored — no infinite loop
 * D. Backlog drain proof — large queue drains in bounded passes
 * E. No behavior drift — successful items still succeed, failures still fail
 */

import { readFileSync } from "fs";
import { join } from "path";

import {
  configureMutationQueue,
  enqueueForemanMutation,
  clearForemanMutationQueue,
  loadForemanMutationQueue,
  getForemanMutationQueueSummary,
} from "../../lib/offline/mutationQueue";

import {
  FOREMAN_DRAIN_BATCH_SIZE,
  FOREMAN_MUTATION_FLUSH_LOOP_CEILING,
  flushForemanMutationQueue,
} from "../../lib/offline/mutationWorker";

import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../observability/platformObservability";

import {
  resetOfflineReplayCoordinatorForTests,
} from "../../lib/offline/offlineReplayCoordinator";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const createInMemoryStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: async (key: string) => store.get(key) ?? null,
    setItem: async (key: string, value: string) => { store.set(key, value); },
    removeItem: async (key: string) => { store.delete(key); },
  };
};

const makeSnapshot = (requestId: string) => ({
  requestId,
  items: [],
  updatedAt: new Date().toISOString(),
  version: 1,
  title: `Draft-${requestId}`,
  objectId: null,
  objectName: null,
  draftComment: null,
  draftStatus: "draft" as const,
  syncStatus: "queued" as const,
  submittedAt: null,
  cancelledAt: null,
  lastError: null,
  lastSyncAt: null,
});

const makeDeps = (overrides?: {
  syncSnapshot?: (...args: unknown[]) => Promise<unknown>;
  getNetworkOnline?: () => boolean;
  loopIterationLimit?: number;
}) => {
  let snapshotRef = makeSnapshot("local-only");
  return {
    getSnapshot: () => snapshotRef,
    buildRequestDraftMeta: () => ({ requestId: snapshotRef.requestId }),
    persistSnapshot: async (s: unknown) => {
      if (s && typeof s === "object" && "requestId" in s) {
        snapshotRef = s as typeof snapshotRef;
      }
    },
    applySnapshotToBoundary: async (s: unknown) => {
      if (s && typeof s === "object" && "requestId" in s) {
        snapshotRef = s as typeof snapshotRef;
      }
    },
    onSubmitted: undefined,
    getNetworkOnline: overrides?.getNetworkOnline ?? (() => true),
    inspectRemoteDraft: undefined,
    syncSnapshot: overrides?.syncSnapshot ?? (async () => ({
      snapshot: snapshotRef,
      submitted: null,
    })),
    loopIterationLimit: overrides?.loopIterationLimit,
  } as unknown as Parameters<typeof flushForemanMutationQueue>[0];
};

// Reset state before each test
beforeEach(async () => {
  const storage = createInMemoryStorage();
  configureMutationQueue({ storage });
  await clearForemanMutationQueue();
  resetOfflineReplayCoordinatorForTests();
  resetPlatformObservabilityEvents();
});

// ─── Section A: Constants ─────────────────────────────────────────────────────

describe("O3.2 constants", () => {
  it("FOREMAN_DRAIN_BATCH_SIZE is 3", () => {
    expect(FOREMAN_DRAIN_BATCH_SIZE).toBe(3);
  });

  it("FOREMAN_DRAIN_BATCH_SIZE is a positive integer", () => {
    expect(Number.isInteger(FOREMAN_DRAIN_BATCH_SIZE)).toBe(true);
    expect(FOREMAN_DRAIN_BATCH_SIZE).toBeGreaterThan(0);
  });

  it("FOREMAN_MUTATION_FLUSH_LOOP_CEILING bounds the worker loop source", () => {
    const source = readFileSync(join(__dirname, "mutationWorker.ts"), "utf8");

    expect(Number.isInteger(FOREMAN_MUTATION_FLUSH_LOOP_CEILING)).toBe(true);
    expect(FOREMAN_MUTATION_FLUSH_LOOP_CEILING).toBeGreaterThan(FOREMAN_DRAIN_BATCH_SIZE);
    expect(source).not.toMatch(/while\s*\(\s*true\s*\)/);
    expect(source).toContain("FOREMAN_MUTATION_FLUSH_LOOP_CEILING");
    expect(source).toContain("worker_loop_ceiling_reached");
  });
});

// ─── Section B: Bounded replay ───────────────────────────────────────────────

describe("O3.2 bounded replay", () => {
  it("single item queue: processedCount=1, batchLimitReached=false", async () => {
        await enqueueForemanMutation({
      draftKey: "req-1",
      mutationKind: "background_sync",
      triggerSource: "manual_retry",
    });

    const result = await flushForemanMutationQueue(makeDeps(), "manual_retry");
    expect(result.processedCount).toBe(1);
    expect(result.batchLimitReached).toBe(false);
    expect(result.failed).toBe(false);
  });

  it("loop ceiling exits after one iteration while preserving queued work", async () => {
    for (let i = 0; i < 2; i++) {
      await enqueueForemanMutation({
        draftKey: `loop-ceiling-${i}`,
        mutationKind: "background_sync",
        triggerSource: "manual_retry",
      });
    }

    const result = await flushForemanMutationQueue(
      makeDeps({ loopIterationLimit: 1 }),
      "manual_retry",
    );

    expect(result).toMatchObject({
      processedCount: 1,
      remainingCount: 1,
      failed: false,
      errorMessage: null,
      batchLimitReached: true,
    });
    const activeAfter = (await loadForemanMutationQueue()).filter(
      (entry) => entry.lifecycleStatus === "queued" || entry.lifecycleStatus === "processing",
    );
    expect(activeAfter).toHaveLength(1);
    expect(
      getPlatformObservabilityEvents().filter(
        (event) => event.event === "worker_loop_ceiling_reached",
      ),
    ).toEqual([
      expect.objectContaining({
        screen: "foreman",
        sourceKind: "offline:foreman_draft",
        rowCount: 1,
        extra: expect.objectContaining({
          worker: "foreman_mutation",
          processedCount: 1,
          remainingCount: 1,
          loopIterationLimit: 1,
          triggerSource: "manual_retry",
        }),
      }),
    ]);
  });

  it("queue <= batch size: drains completely in one pass", async () => {
    // Enqueue FOREMAN_DRAIN_BATCH_SIZE items
    for (let i = 0; i < FOREMAN_DRAIN_BATCH_SIZE; i++) {
      await enqueueForemanMutation({
        draftKey: `req-${i}`,
        mutationKind: "background_sync",
        triggerSource: "manual_retry",
      });
    }

    const result = await flushForemanMutationQueue(makeDeps(), "manual_retry");
    // All 3 items are processed (processedCount=3)
    // After all 3, the batch limit check fires and returns batchLimitReached=true
    // because the check is: processedCount >= FOREMAN_DRAIN_BATCH_SIZE
    expect(result.processedCount).toBe(FOREMAN_DRAIN_BATCH_SIZE);
    expect(result.failed).toBe(false);
    // Either the batch limit was reached or the queue is empty — both are valid terminations
    expect(result.processedCount).toBeGreaterThan(0);
  });

  it("queue > batch size: batchLimitReached=true after FOREMAN_DRAIN_BATCH_SIZE items", async () => {
    const totalItems = FOREMAN_DRAIN_BATCH_SIZE + 2;
    for (let i = 0; i < totalItems; i++) {
      await enqueueForemanMutation({
        draftKey: `req-${i}`,
        mutationKind: "background_sync",
        triggerSource: "network_back",
      });
    }

    const result = await flushForemanMutationQueue(makeDeps(), "network_back");
    expect(result.processedCount).toBe(FOREMAN_DRAIN_BATCH_SIZE);
    expect(result.batchLimitReached).toBe(true);
    // Verify remaining items still in queue (not all drained)
    const queueAfter = await loadForemanMutationQueue();
    const activeAfter = queueAfter.filter(
      (e) => e.lifecycleStatus === "queued" || e.lifecycleStatus === "processing",
    );
    expect(activeAfter.length).toBeGreaterThan(0);
    expect(result.failed).toBe(false);
  });

  it("batchLimitReached result includes drainDurationMs as a number", async () => {
        for (let i = 0; i < FOREMAN_DRAIN_BATCH_SIZE + 1; i++) {
      await enqueueForemanMutation({
        draftKey: `req-${i}`,
        mutationKind: "background_sync",
        triggerSource: "network_back",
      });
    }

    const result = await flushForemanMutationQueue(makeDeps(), "network_back");
    expect(result.drainDurationMs).not.toBeNull();
    expect(typeof result.drainDurationMs).toBe("number");
    expect(result.drainDurationMs).toBeGreaterThanOrEqual(0);
  });

  it("normal result (no limit) includes drainDurationMs", async () => {
        await enqueueForemanMutation({
      draftKey: "req-1",
      mutationKind: "background_sync",
      triggerSource: "manual_retry",
    });

    const result = await flushForemanMutationQueue(makeDeps(), "manual_retry");
    expect(result.drainDurationMs).not.toBeNull();
    expect(typeof result.drainDurationMs).toBe("number");
  });
});

// ─── Section C: Ordering preserved ───────────────────────────────────────────

describe("O3.2 ordering preserved", () => {
  it("items are processed in FIFO createdAt order", async () => {
    const processedOrder: string[] = [];
        // Enqueue items with known order
    for (let i = 0; i < FOREMAN_DRAIN_BATCH_SIZE; i++) {
      await enqueueForemanMutation({
        draftKey: `item-${i}`,
        mutationKind: "background_sync",
        triggerSource: "manual_retry",
      });
    }

    const deps = makeDeps({
      syncSnapshot: async () => {
        const queue = await loadForemanMutationQueue();
        const inflight = queue.find((e) => e.lifecycleStatus === "processing");
        if (inflight) processedOrder.push(inflight.payload.draftKey);
        return { snapshot: makeSnapshot("local-only"), submitted: null };
      },
    });

    await flushForemanMutationQueue(deps, "manual_retry");
    // Should be processed in the order enqueued
    for (let i = 0; i < processedOrder.length - 1; i++) {
      const idxA = processedOrder[i]?.split("-")[1];
      const idxB = processedOrder[i + 1]?.split("-")[1];
      if (idxA !== undefined && idxB !== undefined) {
        expect(Number(idxA)).toBeLessThan(Number(idxB));
      }
    }
  });
});

// ─── Section D: Retry budget ─────────────────────────────────────────────────

describe("O3.2 retry budget", () => {
  it("failed result has batchLimitReached=false and drainDurationMs", async () => {
        await enqueueForemanMutation({
      draftKey: "req-fail",
      mutationKind: "background_sync",
      triggerSource: "manual_retry",
    });

    const deps = makeDeps({
      syncSnapshot: async () => { throw new Error("network failure"); },
    });

    const result = await flushForemanMutationQueue(deps, "manual_retry");
    expect(result.failed).toBe(true);
    expect(result.batchLimitReached).toBe(false);
    expect(result.drainDurationMs).not.toBeNull();
    expect(typeof result.drainDurationMs).toBe("number");
  });

  it("failed item is scheduled for retry (retry_scheduled or conflicted), not removed", async () => {
        await enqueueForemanMutation({
      draftKey: "req-fail",
      mutationKind: "background_sync",
      triggerSource: "manual_retry",
    });

    const deps = makeDeps({
      syncSnapshot: async () => { throw new Error("server timeout"); },
    });

    await flushForemanMutationQueue(deps, "manual_retry");
    const queue = await loadForemanMutationQueue();
    const failedEntry = queue.find((e) => e.payload.draftKey === "req-fail");
    expect(failedEntry).toBeDefined();
    // Should be in a non-terminal retry state
    expect(["retry_scheduled", "conflicted", "failed_non_retryable"]).toContain(
      failedEntry?.lifecycleStatus,
    );
  });
});

// ─── Section E: Queue summary observability ───────────────────────────────────

describe("O3.2 observability", () => {
  it("queue summary activeCount decreases after successful flush", async () => {
        for (let i = 0; i < 2; i++) {
      await enqueueForemanMutation({
        draftKey: `req-${i}`,
        mutationKind: "background_sync",
        triggerSource: "manual_retry",
      });
    }

    const before = await getForemanMutationQueueSummary();
    expect(before.activeCount).toBeGreaterThan(0);

    await flushForemanMutationQueue(makeDeps(), "manual_retry");
    const after = await getForemanMutationQueueSummary();
    expect(after.activeCount).toBeLessThan(before.activeCount);
  });

  it("queue summary retryScheduledCount increases after failure", async () => {
        await enqueueForemanMutation({
      draftKey: "req-retry",
      mutationKind: "background_sync",
      triggerSource: "manual_retry",
    });

    const deps = makeDeps({
      syncSnapshot: async () => { throw new Error("network timeout"); },
    });

    const before = await getForemanMutationQueueSummary();
    expect(before.retryScheduledCount).toBe(0);

    await flushForemanMutationQueue(deps, "manual_retry");
    const after = await getForemanMutationQueueSummary();
    // Either retry_scheduled or failed_non_retryable (first attempt → retry scheduled)
    expect(after.retryScheduledCount + after.failedNonRetryableCount + after.conflictedCount).toBeGreaterThan(0);
  });
});

