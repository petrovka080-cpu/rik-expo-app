import { readFileSync } from "fs";
import { join } from "path";
import { createMemoryOfflineStorage } from "../../lib/offline/offlineStorage";
import {
  getPlatformOfflineTelemetryEvents,
  resetPlatformOfflineTelemetryEvents,
} from "../../lib/offline/platformOffline.observability";
import {
  getPlatformObservabilityEvents,
  resetPlatformObservabilityEvents,
} from "../../lib/observability/platformObservability";
import {
  OFFLINE_REPLAY_CIRCUIT_BREAKER_CONFIG,
  recordReplayFailure,
  resetOfflineReplayCoordinatorForTests,
} from "../../lib/offline/offlineReplayCoordinator";
import {
  clearWarehouseReceiveDraftStore,
  clearWarehouseReceiveDraftForIncoming,
  configureWarehouseReceiveDraftStore,
  getWarehouseReceiveDraft,
  setWarehouseReceiveDraftItems,
} from "./warehouse.receiveDraft.store";
import {
  clearWarehouseReceiveQueue,
  configureWarehouseReceiveQueue,
  enqueueWarehouseReceive,
  loadWarehouseReceiveQueue,
  markWarehouseReceiveQueueInflight,
  WAREHOUSE_RECEIVE_RETRY_POLICY,
} from "./warehouseReceiveQueue";
import {
  WAREHOUSE_RECEIVE_FLUSH_LOOP_CEILING,
  WAREHOUSE_RECEIVE_REPLAY_POLICY,
  flushWarehouseReceiveQueue,
} from "./warehouseReceiveWorker";
import { clearWarehouseReceiveLocalRecovery } from "./warehouse.terminalRecovery";

const seedReceiveDraft = async (incomingId = "incoming-1") => {
  await setWarehouseReceiveDraftItems(incomingId, [
    {
      itemId: "purchase-item-1",
      qty: 2,
      localUpdatedAt: 100,
    },
  ]);
  await enqueueWarehouseReceive(incomingId);
};

const waitUntil = async (
  predicate: () => boolean,
  message: string,
) => {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error(message);
};

const createDeferred = <T,>() => {
  let resolveValue!: (value: T) => void;
  let rejectValue!: (error: unknown) => void;
  const promise = new Promise<T>((resolve, reject) => {
    resolveValue = resolve;
    rejectValue = reject;
  });

  return {
    promise,
    resolve: resolveValue,
    reject: rejectValue,
  };
};

describe("warehouse receive worker", () => {
  beforeEach(async () => {
    resetOfflineReplayCoordinatorForTests();
    configureWarehouseReceiveQueue({ storage: createMemoryOfflineStorage() });
    configureWarehouseReceiveDraftStore({ storage: createMemoryOfflineStorage() });
    resetPlatformOfflineTelemetryEvents();
    resetPlatformObservabilityEvents();
    await clearWarehouseReceiveQueue();
    await clearWarehouseReceiveDraftStore();
  });

  it("bounds the flush loop with a ceiling instead of while true", () => {
    const source = readFileSync(join(__dirname, "warehouseReceiveWorker.ts"), "utf8");

    expect(WAREHOUSE_RECEIVE_FLUSH_LOOP_CEILING).toBeGreaterThan(0);
    expect(source).not.toMatch(/while\s*\(\s*true\s*\)/);
    expect(source).toContain("WAREHOUSE_RECEIVE_FLUSH_LOOP_CEILING");
    expect(source).toContain("worker_loop_ceiling_reached");
  });

  it("declares a serial FIFO replay policy owned by the worker", () => {
    expect(WAREHOUSE_RECEIVE_REPLAY_POLICY).toMatchObject({
      queueKey: "warehouse_receive",
      owner: "warehouse_receive_worker",
      concurrencyLimit: 1,
      ordering: "created_at_fifo",
      backpressure: "coalesce_triggers_and_rerun_once",
    });
  });

  it("skips replay during global circuit cooldown without deleting or quarantining items", async () => {
    await seedReceiveDraft("incoming-circuit");
    const draftStatusBefore = getWarehouseReceiveDraft("incoming-circuit")?.status;
    const now = Date.now();
    for (
      let index = 0;
      index < OFFLINE_REPLAY_CIRCUIT_BREAKER_CONFIG.failureThreshold;
      index += 1
    ) {
      recordReplayFailure({
        worker: "mutation",
        kind: "server_error",
        status: 503,
        now: now + index,
      });
    }
    const applyReceive = jest.fn(async () => ({
      data: { ok: 1, fail: 0, left_after: 0 },
      error: null,
    }));

    const result = await flushWarehouseReceiveQueue(
      {
        getWarehousemanFio: () => "Warehouse Tester",
        applyReceive,
        getNetworkOnline: () => true,
      },
      "network_back",
    );

    expect(result).toMatchObject({
      processedCount: 0,
      remainingCount: 1,
      failed: false,
      errorMessage: null,
    });
    expect(applyReceive).not.toHaveBeenCalled();
    expect(await loadWarehouseReceiveQueue()).toEqual([
      expect.objectContaining({
        incomingId: "incoming-circuit",
      }),
    ]);
    expect(getWarehouseReceiveDraft("incoming-circuit")?.status).toBe(
      draftStatusBefore,
    );
  });

  it("exits before the ceiling when there is no receive work", async () => {
    const applyReceive = jest.fn(async () => ({
      data: { ok: 1, fail: 0, left_after: 0 },
      error: null,
    }));

    const result = await flushWarehouseReceiveQueue(
      {
        getWarehousemanFio: () => "Warehouse Tester",
        applyReceive,
        getNetworkOnline: () => true,
        loopIterationLimit: 1,
      },
      "manual_retry",
    );

    expect(result).toMatchObject({
      processedCount: 0,
      remainingCount: 0,
      failed: false,
      errorMessage: null,
    });
    expect(applyReceive).not.toHaveBeenCalled();
    expect(
      getPlatformObservabilityEvents().some(
        (event) => event.event === "worker_loop_ceiling_reached",
      ),
    ).toBe(false);
  });

  it("exits at the loop ceiling and leaves remaining receive work queued", async () => {
    await seedReceiveDraft("incoming-ceiling-1");
    await seedReceiveDraft("incoming-ceiling-2");
    const applyReceive = jest.fn(async () => ({
      data: { ok: 1, fail: 0, left_after: 0 },
      error: null,
    }));

    const result = await flushWarehouseReceiveQueue(
      {
        getWarehousemanFio: () => "Warehouse Tester",
        applyReceive,
        getNetworkOnline: () => true,
        loopIterationLimit: 1,
      },
      "manual_retry",
    );

    expect(result).toMatchObject({
      processedCount: 1,
      remainingCount: 1,
      failed: true,
      errorMessage: "warehouse_receive_loop_ceiling_reached",
    });
    expect(applyReceive).toHaveBeenCalledTimes(1);
    expect(await loadWarehouseReceiveQueue()).toEqual([
      expect.objectContaining({ incomingId: "incoming-ceiling-2" }),
    ]);
    expect(getPlatformObservabilityEvents()).toEqual([
      expect.objectContaining({
        screen: "warehouse",
        event: "worker_loop_ceiling_reached",
        sourceKind: "queue:warehouse_receive",
        rowCount: 1,
        extra: expect.objectContaining({
          worker: "warehouse_receive",
          processedCount: 1,
          remainingCount: 1,
          loopIterationLimit: 1,
          triggerSource: "manual_retry",
        }),
      }),
    ]);
  });

  it("does not duplicate receive apply while a flush is already in flight", async () => {
    await seedReceiveDraft();

    const deferred = createDeferred<{
      data: { ok: number; fail: number; left_after: number };
      error: null;
    }>();
    const applyReceive = jest.fn(() => deferred.promise);

    const first = flushWarehouseReceiveQueue(
      {
        getWarehousemanFio: () => "Warehouse Tester",
        applyReceive,
        getNetworkOnline: () => true,
      },
      "manual_retry",
    );
    const second = flushWarehouseReceiveQueue(
      {
        getWarehousemanFio: () => "Warehouse Tester",
        applyReceive,
        getNetworkOnline: () => true,
      },
      "manual_retry",
    );

    await waitUntil(
      () => applyReceive.mock.calls.length === 1,
      "receive apply did not start",
    );
    expect(applyReceive).toHaveBeenCalledTimes(1);
    const queueEntry = (await loadWarehouseReceiveQueue())[0];
    expect(applyReceive).toHaveBeenCalledWith(
      expect.objectContaining({
        clientMutationId: queueEntry?.id,
        incomingId: "incoming-1",
      }),
    );

    deferred.resolve({ data: { ok: 1, fail: 0, left_after: 0 }, error: null });
    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(applyReceive).toHaveBeenCalledTimes(1);
    expect(firstResult.failed).toBe(false);
    expect(secondResult.failed).toBe(false);
    expect(await loadWarehouseReceiveQueue()).toEqual([]);
    expect(getWarehouseReceiveDraft("incoming-1")?.status).toBe("synced");
  });

  it("records refresh failures after server success without requeueing the receive command", async () => {
    await seedReceiveDraft();

    const result = await flushWarehouseReceiveQueue(
      {
        getWarehousemanFio: () => "Warehouse Tester",
        applyReceive: async () => ({
          data: { ok: 1, fail: 0, left_after: 0 },
          error: null,
        }),
        refreshAfterSuccess: async () => {
          throw new Error("refresh failed");
        },
        getNetworkOnline: () => true,
      },
      "manual_retry",
    );

    expect(result.failed).toBe(false);
    expect(await loadWarehouseReceiveQueue()).toEqual([]);
    expect(getWarehouseReceiveDraft("incoming-1")?.status).toBe("synced");

    expect(getPlatformOfflineTelemetryEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          contourKey: "warehouse_receive",
          entityKey: "incoming-1",
          syncStatus: "synced",
          queueAction: "refresh_after_success_failed",
          failureClass: "ui_refresh_failure",
          errorMessage: "refresh failed",
        }),
      ]),
    );
  });

  it("keeps the same clientMutationId when an inflight receive is restored after restart", async () => {
    await seedReceiveDraft("incoming-restore");
    const queued = (await loadWarehouseReceiveQueue())[0];
    expect(queued).toBeTruthy();
    await markWarehouseReceiveQueueInflight(queued?.id ?? "");

    const applyReceive = jest.fn(async () => ({
      data: { ok: 1, fail: 0, left_after: 0 },
      error: null,
    }));

    const result = await flushWarehouseReceiveQueue(
      {
        getWarehousemanFio: () => "Warehouse Tester",
        applyReceive,
        getNetworkOnline: () => true,
      },
      "app_active",
    );

    expect(result.failed).toBe(false);
    expect(applyReceive).toHaveBeenCalledTimes(1);
    expect(applyReceive).toHaveBeenCalledWith(
      expect.objectContaining({
        incomingId: "incoming-restore",
        clientMutationId: queued?.id,
      }),
    );
  });

  it("cleanup removes receive draft and queue entry for terminal incoming", async () => {
    await seedReceiveDraft("incoming-terminal");

    const result = await clearWarehouseReceiveLocalRecovery("incoming-terminal");

    expect(result).toMatchObject({
      kind: "warehouse_receive",
      entityId: "incoming-terminal",
      cleared: true,
      clearedOwners: [
        "warehouse_receive_queue_v1",
        "warehouse_receive_draft_store_v1",
      ],
    });
    expect(getWarehouseReceiveDraft("incoming-terminal")).toBeNull();
    expect(await loadWarehouseReceiveQueue()).toEqual([]);
  });

  it("removing one receive draft leaves unrelated local recovery untouched", async () => {
    await seedReceiveDraft("incoming-terminal");
    await seedReceiveDraft("incoming-active");

    await clearWarehouseReceiveDraftForIncoming("incoming-terminal");

    expect(getWarehouseReceiveDraft("incoming-terminal")).toBeNull();
    expect(getWarehouseReceiveDraft("incoming-active")).toBeTruthy();
  });

  it("bootstrap flush clears terminal receive recovery instead of applying it", async () => {
    await seedReceiveDraft("incoming-terminal");
    const applyReceive = jest.fn(async () => ({
      data: { ok: 1, fail: 0, left_after: 0 },
      error: null,
    }));

    const result = await flushWarehouseReceiveQueue(
      {
        getWarehousemanFio: () => "Warehouse Tester",
        applyReceive,
        getNetworkOnline: () => true,
        inspectRemoteReceive: async () => ({
          kind: "warehouse_receive",
          entityId: "incoming-terminal",
          terminal: true,
          reason: "receive_completed_on_server",
        }),
      },
      "bootstrap_complete",
    );

    expect(result.failed).toBe(false);
    expect(applyReceive).not.toHaveBeenCalled();
    expect(getWarehouseReceiveDraft("incoming-terminal")).toBeNull();
    expect(await loadWarehouseReceiveQueue()).toEqual([]);
  });

  it("worker still processes active receive recovery when remote truth is not terminal", async () => {
    await seedReceiveDraft("incoming-active");
    const applyReceive = jest.fn(async () => ({
      data: { ok: 1, fail: 0, left_after: 0 },
      error: null,
    }));

    const result = await flushWarehouseReceiveQueue(
      {
        getWarehousemanFio: () => "Warehouse Tester",
        applyReceive,
        getNetworkOnline: () => true,
        inspectRemoteReceive: async () => ({
          kind: "warehouse_receive",
          entityId: "incoming-active",
          terminal: false,
          remainingCount: 2,
        }),
      },
      "network_back",
    );

    expect(result.failed).toBe(false);
    expect(applyReceive).toHaveBeenCalledTimes(1);
    expect(getWarehouseReceiveDraft("incoming-active")?.status).toBe("synced");
  });

  it("schedules retryable receive failures with nextRetryAt and skips replay until due", async () => {
    await seedReceiveDraft("incoming-retry-wait");
    const applyReceive = jest.fn(async () => {
      throw new Error("temporary service unavailable");
    });

    const firstResult = await flushWarehouseReceiveQueue(
      {
        getWarehousemanFio: () => "Warehouse Tester",
        applyReceive,
        getNetworkOnline: () => true,
      },
      "app_active",
    );

    const [queueEntry] = await loadWarehouseReceiveQueue();
    const draft = getWarehouseReceiveDraft("incoming-retry-wait");

    expect(firstResult.failed).toBe(true);
    expect(applyReceive).toHaveBeenCalledTimes(1);
    expect(queueEntry).toMatchObject({
      incomingId: "incoming-retry-wait",
      status: "retry_wait",
      retryCount: 1,
      lastError: "temporary service unavailable",
    });
    expect(queueEntry.nextRetryAt).toEqual(expect.any(Number));
    expect(draft).toMatchObject({
      status: "retry_wait",
      retryCount: 1,
      nextRetryAt: queueEntry.nextRetryAt,
    });

    const secondResult = await flushWarehouseReceiveQueue(
      {
        getWarehousemanFio: () => "Warehouse Tester",
        applyReceive,
        getNetworkOnline: () => true,
      },
      "app_active",
    );

    expect(secondResult.failed).toBe(false);
    expect(secondResult.remainingCount).toBe(1);
    expect(applyReceive).toHaveBeenCalledTimes(1);
  });

  it("exhausts receive retry budget into failed_non_retryable without dropping local recovery", async () => {
    await seedReceiveDraft("incoming-budget");
    const applyReceive = jest.fn(async () => {
      throw new Error("temporary service unavailable");
    });

    for (let attempt = 0; attempt < WAREHOUSE_RECEIVE_RETRY_POLICY.maxAttempts; attempt += 1) {
      await flushWarehouseReceiveQueue(
        {
          getWarehousemanFio: () => "Warehouse Tester",
          applyReceive,
          getNetworkOnline: () => true,
        },
        "manual_retry",
      );
    }

    const [queueEntry] = await loadWarehouseReceiveQueue();
    expect(queueEntry).toMatchObject({
      incomingId: "incoming-budget",
      status: "failed_non_retryable",
      retryCount: WAREHOUSE_RECEIVE_RETRY_POLICY.maxAttempts,
      nextRetryAt: null,
    });
    expect(getWarehouseReceiveDraft("incoming-budget")).toMatchObject({
      status: "failed_terminal",
      pendingCount: 1,
      lastError: "temporary service unavailable",
    });

    await flushWarehouseReceiveQueue(
      {
        getWarehousemanFio: () => "Warehouse Tester",
        applyReceive,
        getNetworkOnline: () => true,
      },
      "app_active",
    );

    expect(applyReceive).toHaveBeenCalledTimes(WAREHOUSE_RECEIVE_RETRY_POLICY.maxAttempts);
  });

  it("classifies stale receive apply failures as conflicted and stops blind replay", async () => {
    await seedReceiveDraft("incoming-conflict");
    const applyReceive = jest.fn(async () => ({
      data: null,
      error: { message: "stale receive conflict" },
    }));

    const result = await flushWarehouseReceiveQueue(
      {
        getWarehousemanFio: () => "Warehouse Tester",
        applyReceive,
        getNetworkOnline: () => true,
      },
      "manual_retry",
    );

    const [queueEntry] = await loadWarehouseReceiveQueue();
    expect(result.failed).toBe(true);
    expect(queueEntry).toMatchObject({
      incomingId: "incoming-conflict",
      status: "conflicted",
      lastError: "stale receive conflict",
      nextRetryAt: null,
    });
    expect(getWarehouseReceiveDraft("incoming-conflict")).toMatchObject({
      status: "failed_terminal",
      pendingCount: 1,
      lastError: "stale receive conflict",
    });
    expect(getPlatformOfflineTelemetryEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          contourKey: "warehouse_receive",
          entityKey: "incoming-conflict",
          queueAction: "sync_conflicted",
          failureClass: "conflicted",
        }),
      ]),
    );

    await flushWarehouseReceiveQueue(
      {
        getWarehousemanFio: () => "Warehouse Tester",
        applyReceive,
        getNetworkOnline: () => true,
      },
      "app_active",
    );
    expect(applyReceive).toHaveBeenCalledTimes(1);
  });

  it("marks missing warehouseman FIO as failed_non_retryable instead of retrying forever", async () => {
    await seedReceiveDraft("incoming-missing-fio");
    const applyReceive = jest.fn(async () => ({
      data: { ok: 1, fail: 0, left_after: 0 },
      error: null,
    }));

    const result = await flushWarehouseReceiveQueue(
      {
        getWarehousemanFio: () => "",
        applyReceive,
        getNetworkOnline: () => true,
      },
      "manual_retry",
    );

    const [queueEntry] = await loadWarehouseReceiveQueue();
    expect(result.failed).toBe(true);
    expect(applyReceive).not.toHaveBeenCalled();
    expect(queueEntry).toMatchObject({
      incomingId: "incoming-missing-fio",
      status: "failed_non_retryable",
      retryCount: 0,
      nextRetryAt: null,
    });
    expect(getWarehouseReceiveDraft("incoming-missing-fio")).toMatchObject({
      status: "failed_terminal",
      pendingCount: 1,
    });
  });

  it("preserves missing draft receive commands as failed_non_retryable local recovery", async () => {
    await enqueueWarehouseReceive("incoming-missing-draft");
    const applyReceive = jest.fn(async () => ({
      data: { ok: 1, fail: 0, left_after: 0 },
      error: null,
    }));

    const result = await flushWarehouseReceiveQueue(
      {
        getWarehousemanFio: () => "Warehouse Tester",
        applyReceive,
        getNetworkOnline: () => true,
      },
      "bootstrap_complete",
    );

    const [queueEntry] = await loadWarehouseReceiveQueue();
    expect(result.failed).toBe(true);
    expect(applyReceive).not.toHaveBeenCalled();
    expect(queueEntry).toMatchObject({
      incomingId: "incoming-missing-draft",
      status: "failed_non_retryable",
      lastError: "warehouse_receive_draft_missing_or_empty",
    });
    expect(getWarehouseReceiveDraft("incoming-missing-draft")).toMatchObject({
      status: "failed_terminal",
      pendingCount: 1,
      lastError: "warehouse_receive_draft_missing_or_empty",
    });
  });
});
