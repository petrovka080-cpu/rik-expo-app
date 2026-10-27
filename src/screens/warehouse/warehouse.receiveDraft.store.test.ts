import { createMemoryOfflineStorage } from "../../lib/offline/offlineStorage";
import {
  configureWarehouseReceiveDraftStore,
  getWarehouseReceiveDraft,
  hydrateWarehouseReceiveDraftStore,
  markWarehouseReceiveDraftFailedTerminal,
  markWarehouseReceiveDraftRetryWait,
  markWarehouseReceiveDraftSynced,
  setWarehouseReceiveDraftItems,
  useWarehouseReceiveDraftStore,
} from "./warehouse.receiveDraft.store";

const STORAGE_KEY = "warehouse_receive_draft_store_v1";

describe("warehouse receive draft storage discipline", () => {
  beforeEach(() => {
    useWarehouseReceiveDraftStore.setState({
      hydrated: false,
      drafts: {},
    });
  });

  it("hydrates only meaningful drafts and rewrites stale empty records out of storage", async () => {
    const storage = createMemoryOfflineStorage({
      [STORAGE_KEY]: JSON.stringify({
        version: 1,
        drafts: {
          staleSynced: {
            incomingId: "staleSynced",
            items: [],
            status: "synced",
            pendingCount: 0,
            updatedAt: 10,
          },
          activeDirty: {
            incomingId: "activeDirty",
            items: [{ itemId: "purchase-item-1", qty: 3, localUpdatedAt: 20 }],
            status: "dirty_local",
            pendingCount: 0,
            updatedAt: 20,
          },
        },
      }),
    });
    configureWarehouseReceiveDraftStore({ storage });

    const state = await hydrateWarehouseReceiveDraftStore();
    const raw = storage.dump()[STORAGE_KEY];

    expect(state.drafts.staleSynced).toBeUndefined();
    expect(state.drafts.activeDirty?.items).toHaveLength(1);
    expect(raw).toContain("activeDirty");
    expect(raw).not.toContain("staleSynced");
  });

  it("does not publish another store state when empty hydration is already current", async () => {
    const storage = createMemoryOfflineStorage();
    configureWarehouseReceiveDraftStore({ storage });
    const states: unknown[] = [];
    const unsubscribe = useWarehouseReceiveDraftStore.subscribe((state) => {
      states.push(state);
    });

    try {
      const first = await hydrateWarehouseReceiveDraftStore();
      const storeAfterFirst = useWarehouseReceiveDraftStore.getState();
      const second = await hydrateWarehouseReceiveDraftStore();

      expect(first.hydrated).toBe(true);
      expect(second).toBe(storeAfterFirst);
      expect(states).toHaveLength(1);
    } finally {
      unsubscribe();
    }
  });

  it("hydrates an empty safe state when receive draft storage JSON is corrupted", async () => {
    const storage = createMemoryOfflineStorage({
      [STORAGE_KEY]: "{broken",
    });
    configureWarehouseReceiveDraftStore({ storage });

    const state = await hydrateWarehouseReceiveDraftStore();

    expect(state).toMatchObject({
      hydrated: true,
      drafts: {},
    });
    expect(storage.dump()[STORAGE_KEY]).toBe("{broken");
  });

  it("does not publish another store state when persisted draft hydration is already current", async () => {
    const storage = createMemoryOfflineStorage({
      [STORAGE_KEY]: JSON.stringify({
        version: 1,
        drafts: {
          activeDirty: {
            incomingId: "activeDirty",
            items: [{ itemId: "purchase-item-1", qty: 3, localUpdatedAt: 20 }],
            status: "dirty_local",
            lastSyncAt: null,
            retryCount: 0,
            pendingCount: 0,
            lastError: null,
            updatedAt: 20,
          },
        },
      }),
    });
    configureWarehouseReceiveDraftStore({ storage });
    const states: unknown[] = [];
    const unsubscribe = useWarehouseReceiveDraftStore.subscribe((state) => {
      states.push(state);
    });

    try {
      const first = await hydrateWarehouseReceiveDraftStore();
      const storeAfterFirst = useWarehouseReceiveDraftStore.getState();
      const second = await hydrateWarehouseReceiveDraftStore();

      expect(first.drafts.activeDirty?.items).toHaveLength(1);
      expect(second).toBe(storeAfterFirst);
      expect(states).toHaveLength(1);
    } finally {
      unsubscribe();
    }
  });

  it("keeps the current synced state in memory but removes empty synced draft payload from persistence", async () => {
    const storage = createMemoryOfflineStorage();
    configureWarehouseReceiveDraftStore({ storage });

    await setWarehouseReceiveDraftItems("incoming-1", [
      { itemId: "purchase-item-1", qty: 2, localUpdatedAt: 100 },
    ]);
    await markWarehouseReceiveDraftSynced("incoming-1");

    expect(getWarehouseReceiveDraft("incoming-1")?.status).toBe("synced");
    expect(storage.dump()[STORAGE_KEY]).toBeUndefined();
  });

  it("persists retry_wait nextRetryAt for receive queue backoff", async () => {
    const storage = createMemoryOfflineStorage();
    configureWarehouseReceiveDraftStore({ storage });

    await setWarehouseReceiveDraftItems("incoming-retry", [
      { itemId: "purchase-item-1", qty: 2, localUpdatedAt: 100 },
    ]);
    await markWarehouseReceiveDraftRetryWait("incoming-retry", "temporary outage", 1, {
      nextRetryAt: 123_456,
    });

    expect(getWarehouseReceiveDraft("incoming-retry")).toMatchObject({
      status: "retry_wait",
      retryCount: 1,
      pendingCount: 1,
      lastError: "temporary outage",
      nextRetryAt: 123_456,
    });
    expect(storage.dump()[STORAGE_KEY]).toContain("\"nextRetryAt\":123456");
  });

  it("persists empty failed_terminal drafts so local receive recovery is not dropped", async () => {
    const storage = createMemoryOfflineStorage();
    configureWarehouseReceiveDraftStore({ storage });

    await markWarehouseReceiveDraftFailedTerminal(
      "incoming-empty-final",
      "warehouse_receive_draft_missing_or_empty",
      1,
    );

    expect(getWarehouseReceiveDraft("incoming-empty-final")).toMatchObject({
      status: "failed_terminal",
      pendingCount: 1,
      lastError: "warehouse_receive_draft_missing_or_empty",
      nextRetryAt: null,
    });
    expect(storage.dump()[STORAGE_KEY]).toContain("incoming-empty-final");
  });
});
