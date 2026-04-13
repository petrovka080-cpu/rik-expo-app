import { createMemoryOfflineStorage } from "../../lib/offline/offlineStorage";
import {
  getPlatformOfflineTelemetryEvents,
  resetPlatformOfflineTelemetryEvents,
} from "../../lib/offline/platformOffline.observability";
import { resetOfflineReplayCoordinatorForTests } from "../../lib/offline/offlineReplayCoordinator";
import {
  clearWarehouseReceiveDraftStore,
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
} from "./warehouseReceiveQueue";
import {
  WAREHOUSE_RECEIVE_REPLAY_POLICY,
  flushWarehouseReceiveQueue,
} from "./warehouseReceiveWorker";

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
    await clearWarehouseReceiveQueue();
    await clearWarehouseReceiveDraftStore();
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
});
