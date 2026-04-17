import { createMemoryOfflineStorage } from "../../lib/offline/offlineStorage";
import {
  configureWarehouseReceiveDraftStore,
  getWarehouseReceiveDraft,
  hydrateWarehouseReceiveDraftStore,
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
});
