/**
 * O4 — Offline Recovery Hardening Tests
 *
 * Proof set:
 * A. resume_after_offline   — pending items classified correctly, recovery not needed
 * B. inflight_stale_reset   — processing items detected, reset, queue returns to queued
 * C. corrupted_queue_safety — missing required fields → unknown classification, no crash
 * D. no_data_loss           — every item accounted for across all 5 classification buckets
 * E. order_preserved        — FIFO ordering intact after recovery + inflight reset
 * F. observability_events   — recovery_start + recovery_complete always emitted
 * G. load_failure_safe      — storage failure handled gracefully
 */

import {
  configureMutationQueue,
  enqueueForemanMutation,
  clearForemanMutationQueue,
  loadForemanMutationQueue,
  markForemanMutationInflight,
} from "../../lib/offline/mutationQueue";

import {
  runForemanQueueRecovery,
  classifyForemanQueueEntry,
  assertForemanQueueOrdering,
  type QueueEntryClassification,
} from "../../lib/offline/offlineQueueRecovery";

import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../../lib/observability/platformObservability";

import { resetOfflineReplayCoordinatorForTests } from "../../lib/offline/offlineReplayCoordinator";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const createInMemoryStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: async (key: string) => store.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: async (key: string) => {
      store.delete(key);
    },
  };
};

const createFailingStorage = () => ({
  getItem: async (_key: string): Promise<string | null> => {
    throw new Error("storage_unavailable");
  },
  setItem: async (_key: string, _value: string): Promise<void> => {
    throw new Error("storage_unavailable");
  },
  removeItem: async (_key: string): Promise<void> => {
    throw new Error("storage_unavailable");
  },
});

const enqueueItem = async (draftKey: string) =>
  enqueueForemanMutation({
    draftKey,
    mutationKind: "background_sync",
    triggerSource: "bootstrap_complete",
  });

beforeEach(async () => {
  const storage = createInMemoryStorage();
  configureMutationQueue({ storage });
  await clearForemanMutationQueue();
  resetPlatformObservabilityEvents();
  resetOfflineReplayCoordinatorForTests();
});

// ─── classifyForemanQueueEntry Tests ─────────────────────────────────────────

describe("classifyForemanQueueEntry", () => {
  it("classifies queued entry as pending", async () => {
    await enqueueItem("draft-1");
    const [entry] = await loadForemanMutationQueue();
    expect(entry).toBeDefined();
    const info = classifyForemanQueueEntry(entry!);
    expect(info.classification).toBe<QueueEntryClassification>("pending");
    expect(info.validationError).toBeNull();
  });

  it("classifies processing entry as in_flight_stale", async () => {
    await enqueueItem("draft-1");
    const [entry] = await loadForemanMutationQueue();
    expect(entry).toBeDefined();
    await markForemanMutationInflight(entry!.id);

    const [inflightEntry] = await loadForemanMutationQueue();
    expect(inflightEntry?.lifecycleStatus).toBe("processing");
    const info = classifyForemanQueueEntry(inflightEntry!);
    expect(info.classification).toBe<QueueEntryClassification>("in_flight_stale");
    expect(info.validationError).toBeNull();
  });

  it("classifies entry with missing draftKey as unknown", () => {
    const badEntry = {
      id: "mq-bad-1",
      lifecycleStatus: "queued" as const,
      payload: {
        draftKey: "",   // ← missing
        mutationKind: "background_sync" as const,
        triggerSource: "bootstrap_complete" as const,
        requestId: null,
        snapshotUpdatedAt: null,
        localBeforeCount: null,
        localAfterCount: null,
        submitRequested: false,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      attemptCount: 0,
      retryCount: 0,
    } as Parameters<typeof classifyForemanQueueEntry>[0];

    const info = classifyForemanQueueEntry(badEntry);
    expect(info.classification).toBe<QueueEntryClassification>("unknown");
    expect(info.validationError).toContain("missing_payload_field:draftKey");
  });

  it("classifies entry with invalid createdAt as unknown", () => {
    const badEntry = {
      id: "mq-bad-2",
      lifecycleStatus: "queued" as const,
      payload: {
        draftKey: "draft-x",
        mutationKind: "background_sync" as const,
        triggerSource: "bootstrap_complete" as const,
        requestId: null,
        snapshotUpdatedAt: null,
        localBeforeCount: null,
        localAfterCount: null,
        submitRequested: false,
      },
      createdAt: -1,   // ← invalid
      updatedAt: Date.now(),
      attemptCount: 0,
      retryCount: 0,
    } as Parameters<typeof classifyForemanQueueEntry>[0];

    const info = classifyForemanQueueEntry(badEntry);
    expect(info.classification).toBe<QueueEntryClassification>("unknown");
    expect(info.validationError).toBe("invalid_createdAt");
  });

  it("classifies entry with missing id as unknown", () => {
    const badEntry = {
      id: "",   // ← missing
      lifecycleStatus: "queued" as const,
      payload: {
        draftKey: "draft-x",
        mutationKind: "background_sync" as const,
        triggerSource: "bootstrap_complete" as const,
        requestId: null,
        snapshotUpdatedAt: null,
        localBeforeCount: null,
        localAfterCount: null,
        submitRequested: false,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      attemptCount: 0,
      retryCount: 0,
    } as Parameters<typeof classifyForemanQueueEntry>[0];

    const info = classifyForemanQueueEntry(badEntry);
    expect(info.classification).toBe<QueueEntryClassification>("unknown");
    expect(info.validationError).toBe("missing_id");
  });
});

// ─── A: Resume After Offline ─────────────────────────────────────────────────

describe("O4-A: resume_after_offline", () => {
  it("detects pending items correctly, recoveryNeeded=false", async () => {
    await enqueueItem("req-1");
    await enqueueItem("req-2");
    await enqueueItem("req-3");

    const result = await runForemanQueueRecovery({ triggerSource: "bootstrap_complete" });

    expect(result.totalItems).toBe(3);
    expect(result.pendingItems).toBe(3);
    expect(result.inflightResetCount).toBe(0);
    expect(result.unknownItems).toBe(0);
    expect(result.terminalItems).toBe(0);
    expect(result.recoveryNeeded).toBe(false);
    expect(result.validationErrors).toHaveLength(0);
  });

  it("returns correct triggerSource", async () => {
    const result = await runForemanQueueRecovery({ triggerSource: "bootstrap_complete" });
    expect(result.triggerSource).toBe("bootstrap_complete");
  });

  it("empty queue returns zero counts, recoveryNeeded=false", async () => {
    const result = await runForemanQueueRecovery({ triggerSource: "bootstrap_complete" });
    expect(result.totalItems).toBe(0);
    expect(result.pendingItems).toBe(0);
    expect(result.recoveryNeeded).toBe(false);
  });
});

// ─── B: Inflight Stale Reset ──────────────────────────────────────────────────

describe("O4-B: inflight_stale_reset", () => {
  it("detects in_flight_stale items and resets them, recoveryNeeded=true", async () => {
    await enqueueItem("req-inflight");
    const [entry] = await loadForemanMutationQueue();
    await markForemanMutationInflight(entry!.id);

    // Verify item is inflight before recovery
    const [inflightEntry] = await loadForemanMutationQueue();
    expect(inflightEntry?.lifecycleStatus).toBe("processing");

    const result = await runForemanQueueRecovery({ triggerSource: "bootstrap_complete" });

    expect(result.inflightResetCount).toBe(1);
    expect(result.recoveryNeeded).toBe(true);
    expect(result.resetEntries).toHaveLength(1);
    expect(result.resetEntries[0]?.id).toBe(entry!.id);
  });

  it("after recovery, inflight items are restored to queued", async () => {
    await enqueueItem("req-inflight-2");
    const [entry] = await loadForemanMutationQueue();
    await markForemanMutationInflight(entry!.id);

    await runForemanQueueRecovery({ triggerSource: "bootstrap_complete" });

    const queueAfter = await loadForemanMutationQueue();
    const restoredEntry = queueAfter.find((e) => e.id === entry!.id);
    expect(restoredEntry).toBeDefined();
    expect(restoredEntry?.lifecycleStatus).toBe("queued");
  });

  it("mixes pending and inflight — all classified and reset correctly", async () => {
    await enqueueItem("req-a");
    await enqueueItem("req-b");
    await enqueueItem("req-c");

    const queue = await loadForemanMutationQueue();
    // Mark second item as inflight
    await markForemanMutationInflight(queue[1]!.id);

    const result = await runForemanQueueRecovery({ triggerSource: "bootstrap_complete" });

    expect(result.totalItems).toBe(3);
    expect(result.pendingItems).toBe(2);
    expect(result.inflightResetCount).toBe(1);
    expect(result.recoveryNeeded).toBe(true);
  });
});

// ─── C: Corrupted Queue Safety ────────────────────────────────────────────────

describe("O4-C: corrupted_queue_safety", () => {
  it("classifyForemanQueueEntry never throws for any input", () => {
    const corrupted = [
      {},
      { id: null },
      { id: "x", lifecycleStatus: null, payload: null, createdAt: null },
      { id: "x", lifecycleStatus: "queued", payload: {} },
      { id: "x", lifecycleStatus: "queued", payload: { draftKey: "k", mutationKind: "background_sync", triggerSource: "bootstrap_complete" }, createdAt: NaN },
    ];

    for (const entry of corrupted) {
      expect(() =>
        classifyForemanQueueEntry(entry as Parameters<typeof classifyForemanQueueEntry>[0]),
      ).not.toThrow();
    }
  });

  it("runForemanQueueRecovery never throws even with empty queue", async () => {
    // runForemanQueueRecovery handles all errors internally — direct call is sufficient
    const result = await runForemanQueueRecovery({ triggerSource: "bootstrap_complete" });
    expect(result).toBeDefined();
  });
});

// ─── D: No Data Loss ─────────────────────────────────────────────────────────

describe("O4-D: no_data_loss", () => {
  it("sum of all classification buckets equals totalItems", async () => {
    await enqueueItem("req-1");
    await enqueueItem("req-2");
    await enqueueItem("req-3");

    const [entry] = await loadForemanMutationQueue();
    await markForemanMutationInflight(entry!.id);

    const result = await runForemanQueueRecovery({ triggerSource: "bootstrap_complete" });

    const classified =
      result.pendingItems +
      result.inflightResetCount +
      result.retryScheduledItems +
      result.terminalItems +
      result.unknownItems;

    expect(classified).toBe(result.totalItems);
  });

  it("recovery does not reduce queue size — items remain in storage", async () => {
    await enqueueItem("req-1");
    await enqueueItem("req-2");

    const before = await loadForemanMutationQueue();
    await runForemanQueueRecovery({ triggerSource: "bootstrap_complete" });
    const after = await loadForemanMutationQueue();

    expect(after.length).toBe(before.length);
  });

  it("inflight reset preserves item identity (same id, same payload)", async () => {
    await enqueueItem("req-preserved");
    const [entry] = await loadForemanMutationQueue();
    await markForemanMutationInflight(entry!.id);

    await runForemanQueueRecovery({ triggerSource: "bootstrap_complete" });

    const queueAfter = await loadForemanMutationQueue();
    const found = queueAfter.find((e) => e.id === entry!.id);
    expect(found).toBeDefined();
    expect(found?.payload.draftKey).toBe("req-preserved");
    expect(found?.payload.mutationKind).toBe("background_sync");
  });
});

// ─── E: Order Preserved ────────────────────────────────────────────────────────

describe("O4-E: order_preserved", () => {
  it("assertForemanQueueOrdering returns null for ordered queue", async () => {
    await enqueueItem("req-1");
    await enqueueItem("req-2");
    await enqueueItem("req-3");

    const queue = await loadForemanMutationQueue();
    const violation = assertForemanQueueOrdering(queue);
    expect(violation).toBeNull();
  });

  it("assertForemanQueueOrdering detects ordering violation", () => {
    const now = Date.now();
    const violation = assertForemanQueueOrdering([
      { id: "a", createdAt: now + 100 },
      { id: "b", createdAt: now },       // ← out of order
    ]);
    expect(violation).not.toBeNull();
    expect(violation).toContain("ordering_violation");
  });

  it("queue ordering preserved after inflight reset", async () => {
    for (const key of ["req-a", "req-b", "req-c"]) {
      await enqueueItem(key);
    }
    const queueBefore = await loadForemanMutationQueue();
    await markForemanMutationInflight(queueBefore[1]!.id);

    await runForemanQueueRecovery({ triggerSource: "bootstrap_complete" });

    const queueAfter = await loadForemanMutationQueue();
    const violation = assertForemanQueueOrdering(queueAfter);
    expect(violation).toBeNull();
  });
});

// ─── F: Observability Events ──────────────────────────────────────────────────

describe("O4-F: observability_events", () => {
  it("always emits queue_recovery_start", async () => {
    await runForemanQueueRecovery({ triggerSource: "bootstrap_complete" });
    const events = getPlatformObservabilityEvents();
    const start = events.find((e) => e.event === "queue_recovery_start");
    expect(start).toBeDefined();
    expect(start?.surface).toBe("offline_queue_recovery");
  });

  it("always emits queue_recovery_complete", async () => {
    await enqueueItem("req-1");
    await runForemanQueueRecovery({ triggerSource: "bootstrap_complete" });
    const events = getPlatformObservabilityEvents();
    const complete = events.find((e) => e.event === "queue_recovery_complete");
    expect(complete).toBeDefined();
    expect(complete?.surface).toBe("offline_queue_recovery");
    expect(typeof complete?.durationMs).toBe("number");
  });

  it("emits queue_inflight_reset per inflight item", async () => {
    await enqueueItem("req-inf");
    const [entry] = await loadForemanMutationQueue();
    await markForemanMutationInflight(entry!.id);

    await runForemanQueueRecovery({ triggerSource: "bootstrap_complete" });

    const events = getPlatformObservabilityEvents();
    const reset = events.filter((e) => e.event === "queue_inflight_reset");
    expect(reset).toHaveLength(1);
    expect(reset[0]?.extra?.mutationId).toBe(entry!.id);
  });

  it("recovery_complete contains totalItems count", async () => {
    await enqueueItem("req-1");
    await enqueueItem("req-2");

    await runForemanQueueRecovery({ triggerSource: "bootstrap_complete" });

    const events = getPlatformObservabilityEvents();
    const complete = events.find((e) => e.event === "queue_recovery_complete");
    expect(complete?.extra?.totalItems).toBe(2);
  });

  it("recovery_complete has result=skipped when recoveryNeeded=false", async () => {
    await enqueueItem("req-clean");

    await runForemanQueueRecovery({ triggerSource: "bootstrap_complete" });

    const events = getPlatformObservabilityEvents();
    const complete = events.find((e) => e.event === "queue_recovery_complete");
    expect(complete?.result).toBe("skipped");
  });

  it("recovery_complete has result=success when recoveryNeeded=true", async () => {
    await enqueueItem("req-inf-2");
    const [entry] = await loadForemanMutationQueue();
    await markForemanMutationInflight(entry!.id);

    await runForemanQueueRecovery({ triggerSource: "bootstrap_complete" });

    const events = getPlatformObservabilityEvents();
    const complete = events.find((e) => e.event === "queue_recovery_complete");
    expect(complete?.result).toBe("success");
  });
});

// ─── G: Storage Failure Safety ────────────────────────────────────────────────

describe("O4-G: load_failure_safe", () => {
  it("runForemanQueueRecovery handles storage failure gracefully", async () => {
    // Switch to failing storage after setup
    configureMutationQueue({ storage: createFailingStorage() });

    // runForemanQueueRecovery catches storage errors internally and never throws
    const result = await runForemanQueueRecovery({ triggerSource: "bootstrap_complete" });

    expect(result).toBeDefined();
    expect(result.totalItems).toBe(0);
    expect(result.recoveryNeeded).toBe(false);
    expect(result.validationErrors).toHaveLength(1);
  });

  it("storage failure emits queue_recovery_load_failed observability event", async () => {
    configureMutationQueue({ storage: createFailingStorage() });

    await runForemanQueueRecovery({ triggerSource: "bootstrap_complete" });

    const events = getPlatformObservabilityEvents();
    const loadFailed = events.find((e) => e.event === "queue_recovery_load_failed");
    expect(loadFailed).toBeDefined();
    expect(loadFailed?.result).toBe("error");
    expect(loadFailed?.errorMessage).toContain("storage_unavailable");
  });
});
