import {
  AsyncStorageEstimateRevisionDurableStore,
  type AsyncKeyValueStorage,
} from "../../src/lib/platform/estimateRevisionDurableStore.asyncStorage";
import type {
  DurableFailurePoint,
  RevisionBundle,
} from "../../src/lib/platform/estimateRevisionDurableStore.contract";
import { createEstimateRevisionDurableStore } from "../../src/lib/platform/estimateRevisionDurableStore.factory.native";

class AsyncStorageDouble implements AsyncKeyValueStorage {
  readonly values = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.values.delete(key);
  }

  async getAllKeys(): Promise<string[]> {
    return [...this.values.keys()];
  }
}

function bundle(version: "r1" | "r2"): RevisionBundle {
  return {
    draft: {
      id: "async-storage-estimate",
      consumerUserId: "async-storage-user",
      status: "draft",
      title: "Async storage fallback",
      problemText: "Async storage fallback",
      repairType: "road_construction",
      createdAt: "2026-07-28T00:00:00.000Z",
      updatedAt: version === "r1"
        ? "2026-07-28T00:00:00.000Z"
        : "2026-07-28T00:01:00.000Z",
    },
    items: [{ id: "row-1", quantity: version === "r1" ? 1 : 2, unitPrice: 125 }],
    estimateDraftRevisionState: {
      estimateDraftId: "async-storage-estimate",
      currentRevisionId: version,
      revisions: [{
        revisionId: version,
        boq: { rows: [{ rowId: "row-1" }] },
      }],
      diffs: [],
    },
    media: [],
    pdfs: [],
    projectExecutionDrafts: [],
    marketplaceLink: {
      requestDraftId: "async-storage-estimate",
      publishedRequestId: null,
      linkedAt: null,
    },
    events: [],
  } as unknown as RevisionBundle;
}

describe("native AsyncStorage durable fallback", () => {
  test("factory selects the crash-safe fallback when the installed binary lacks ExpoSQLite", () => {
    const storage = new AsyncStorageDouble();
    const store = createEstimateRevisionDurableStore({
      asyncStorage: storage,
    });

    expect(store).toBeInstanceOf(AsyncStorageEstimateRevisionDurableStore);
  });

  test("falls back when an advertised ExpoSQLite capability never becomes operational", async () => {
    const storage = new AsyncStorageDouble();
    const store = createEstimateRevisionDurableStore({
      sqliteModule: {
        openDatabaseAsync: () =>
          new Promise(() => {
            // Simulates an older binary that advertises ExpoSQLite but never
            // completes its native database open handshake.
          }),
      },
      sqliteHealthTimeoutMs: 20,
      asyncStorage: storage,
    });

    const startedAt = Date.now();
    await expect(store.listKeys()).resolves.toEqual([]);
    expect(Date.now() - startedAt).toBeLessThan(500);
    await expect(
      store.writeBundleAtomically(
        "async-storage-estimate",
        null,
        bundle("r1"),
      ),
    ).resolves.toMatchObject({ status: "WRITTEN" });
    await expect(store.readBundle("async-storage-estimate")).resolves.toMatchObject({
      estimateDraftRevisionState: { currentRevisionId: "r1" },
    });
  });

  test("never calls unsupported global key discovery on startup or commit", async () => {
    const storage = new AsyncStorageDouble();
    let globalDiscoveryCalls = 0;
    storage.getAllKeys = () => {
      globalDiscoveryCalls += 1;
      throw new Error("OLD_NATIVE_GET_ALL_KEYS_SYNCHRONOUSLY_BLOCKS_OR_THROWS");
    };
    const store = new AsyncStorageEstimateRevisionDurableStore(storage);

    await expect(store.listKeys()).resolves.toEqual([]);

    const written = await store.writeBundleAtomically(
      "async-storage-estimate",
      null,
      bundle("r1"),
    );
    expect(written).toMatchObject({ status: "WRITTEN" });
    await expect(store.readBundle("async-storage-estimate")).resolves.toMatchObject({
      estimateDraftRevisionState: { currentRevisionId: "r1" },
    });
    expect(globalDiscoveryCalls).toBe(0);

    const restartedStore = new AsyncStorageEstimateRevisionDurableStore(storage);
    await expect(restartedStore.listKeys()).resolves.toEqual([
      "async-storage-estimate",
    ]);
    await expect(
      restartedStore.recoverLastValid("async-storage-estimate"),
    ).resolves.toMatchObject({
      estimateDraftRevisionState: { currentRevisionId: "r1" },
    });
    expect(globalDiscoveryCalls).toBe(0);
  });

  test("keeps R1 visible when a crash happens before the R2 pointer commit", async () => {
    const storage = new AsyncStorageDouble();
    let failurePoint: DurableFailurePoint | null = null;
    const store = new AsyncStorageEstimateRevisionDurableStore(storage, {
      failureInjector: (point) => {
        if (point === failurePoint) throw new Error(`INJECTED_${point}`);
      },
    });

    const r1 = await store.writeBundleAtomically(
      "async-storage-estimate",
      null,
      bundle("r1"),
    );
    expect(r1).toMatchObject({ status: "WRITTEN" });
    if (r1.status === "FAILED") throw new Error(r1.error.message);

    failurePoint = "before_pointer_switch";
    expect(
      await store.writeBundleAtomically(
        "async-storage-estimate",
        r1.version,
        bundle("r2"),
      ),
    ).toMatchObject({ status: "FAILED", error: { code: "TRANSACTION_FAILED" } });
    expect(
      (await store.readBundle("async-storage-estimate"))
        ?.estimateDraftRevisionState?.currentRevisionId,
    ).toBe("r1");
    expect(await store.listKeys()).toEqual(["async-storage-estimate"]);
  });

  test("treats the pointer switch as the commit point and serializes competing writers", async () => {
    const storage = new AsyncStorageDouble();
    let failAfterPointer = false;
    const store = new AsyncStorageEstimateRevisionDurableStore(storage, {
      failureInjector: (point) => {
        if (failAfterPointer && point === "after_pointer_switch") {
          throw new Error("PROCESS_INTERRUPTED_AFTER_COMMIT");
        }
      },
    });
    const r1 = await store.writeBundleAtomically(
      "async-storage-estimate",
      null,
      bundle("r1"),
    );
    if (r1.status === "FAILED") throw new Error(r1.error.message);

    failAfterPointer = true;
    const committed = await store.writeBundleAtomically(
      "async-storage-estimate",
      r1.version,
      bundle("r2"),
    );
    expect(committed).toMatchObject({
      status: "WRITTEN",
      version: expect.stringContaining("r2:content:"),
    });
    expect(
      (await store.readBundle("async-storage-estimate"))
        ?.estimateDraftRevisionState?.currentRevisionId,
    ).toBe("r2");

    failAfterPointer = false;
    const concurrentStore = new AsyncStorageEstimateRevisionDurableStore(storage);
    const current = committed.status === "FAILED" ? null : committed.version;
    const [left, right] = await Promise.all([
      concurrentStore.writeBundleAtomically(
        "async-storage-estimate",
        current,
        bundle("r1"),
      ),
      concurrentStore.writeBundleAtomically(
        "async-storage-estimate",
        current,
        bundle("r1"),
      ),
    ]);
    const written = [left, right].filter((result) => result.status === "WRITTEN");
    const conflicted = [left, right].filter(
      (result) =>
        result.status === "FAILED" &&
        result.error.code === "CONFLICT",
    );
    expect(written).toHaveLength(1);
    expect(conflicted).toHaveLength(1);
  });
});
