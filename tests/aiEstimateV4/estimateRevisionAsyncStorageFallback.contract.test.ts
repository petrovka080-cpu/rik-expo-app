import {
  AsyncStorageEstimateRevisionDurableStore,
  type AsyncKeyValueStorage,
} from "../../src/lib/platform/estimateRevisionDurableStore.asyncStorage";
import type {
  DurableFailurePoint,
  RevisionBundle,
} from "../../src/lib/platform/estimateRevisionDurableStore.contract";
import { InMemoryEstimateRevisionDurableStore } from "../../src/lib/platform/estimateRevisionDurableStore.memory";
import {
  NATIVE_ESTIMATE_REVISION_BACKEND_ID,
  createEstimateRevisionDurableStore,
} from "../../src/lib/platform/estimateRevisionDurableStore.factory.native";

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

function bundle(
  version: "r1" | "r2",
  id = "async-storage-estimate",
): RevisionBundle {
  return {
    draft: {
      id,
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
      estimateDraftId: id,
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
      requestDraftId: id,
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

  test("read-through migrates a healthy legacy SQLite revision once and keeps AsyncStorage authoritative", async () => {
    const storage = new AsyncStorageDouble();
    const legacy = new InMemoryEstimateRevisionDurableStore();
    await legacy.writeBundleAtomically(
      "async-storage-estimate",
      null,
      bundle("r1"),
    );
    const migrating = createEstimateRevisionDurableStore({
      asyncStorage: storage,
      legacySQLiteStore: legacy,
      sqliteHealthTimeoutMs: 50,
    });

    await expect(migrating.listKeys()).resolves.toEqual([
      "async-storage-estimate",
    ]);
    await expect(
      migrating.recoverLastValid("async-storage-estimate"),
    ).resolves.toMatchObject({
      estimateDraftRevisionState: { currentRevisionId: "r1" },
    });
    const migratedStorageSize = storage.values.size;
    const backendMarker = [...storage.values.entries()].find(([key]) =>
      key.startsWith("rik.estimate_revision_durable.backend_marker.v1:")
    )?.[1];
    expect(JSON.parse(backendMarker ?? "{}")).toMatchObject({
      schemaVersion: "estimate_revision_native_backend_marker_v1",
      activeBackend: NATIVE_ESTIMATE_REVISION_BACKEND_ID,
      legacyBackend: "sqlite_v1",
      migrationState: "migrated_from_legacy",
    });

    const repeated = createEstimateRevisionDurableStore({
      asyncStorage: storage,
      legacySQLiteStore: legacy,
      sqliteHealthTimeoutMs: 50,
    });
    await expect(
      repeated.recoverLastValid("async-storage-estimate"),
    ).resolves.toMatchObject({
      estimateDraftRevisionState: { currentRevisionId: "r1" },
    });
    expect(storage.values.size).toBe(migratedStorageSize);

    const withoutSQLite = createEstimateRevisionDurableStore({
      asyncStorage: storage,
    });
    await expect(
      withoutSQLite.recoverLastValid("async-storage-estimate"),
    ).resolves.toMatchObject({
      estimateDraftRevisionState: { currentRevisionId: "r1" },
    });
  });

  test("does not create split-brain when SQLite later exposes a different revision", async () => {
    const storage = new AsyncStorageDouble();
    const primary = createEstimateRevisionDurableStore({
      asyncStorage: storage,
    });
    const primaryWrite = await primary.writeBundleAtomically(
      "async-storage-estimate",
      null,
      bundle("r2"),
    );
    expect(primaryWrite).toMatchObject({ status: "WRITTEN" });

    const legacy = new InMemoryEstimateRevisionDurableStore();
    await legacy.writeBundleAtomically(
      "async-storage-estimate",
      null,
      bundle("r1"),
    );
    const afterSQLiteAppears = createEstimateRevisionDurableStore({
      asyncStorage: storage,
      legacySQLiteStore: legacy,
      sqliteHealthTimeoutMs: 50,
    });

    await expect(
      afterSQLiteAppears.recoverLastValid("async-storage-estimate"),
    ).resolves.toMatchObject({
      estimateDraftRevisionState: { currentRevisionId: "r2" },
    });
    await expect(
      legacy.recoverLastValid("async-storage-estimate"),
    ).resolves.toMatchObject({
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

  test("honors the pointer commit point across every injected write stage", async () => {
    const beforeCommit: DurableFailurePoint[] = [
      "before_write",
      "after_revision_write",
      "before_pointer_switch",
    ];
    const afterCommit: DurableFailurePoint[] = [
      "after_pointer_switch",
      "before_read_back",
      "before_orphan_cleanup",
    ];
    for (const point of [...beforeCommit, ...afterCommit]) {
      const storage = new AsyncStorageDouble();
      let activePoint: DurableFailurePoint | null = null;
      const store = new AsyncStorageEstimateRevisionDurableStore(storage, {
        failureInjector: (candidate) => {
          if (candidate === activePoint) throw new Error(`INJECTED_${candidate}`);
        },
      });
      const first = await store.writeBundleAtomically(
        "async-storage-estimate",
        null,
        bundle("r1"),
      );
      if (first.status === "FAILED") throw new Error(first.error.message);
      const signedR1 = [...storage.values.entries()].find(([key]) =>
        key.includes("@revision:async-storage-estimate:") &&
        key.includes(encodeURIComponent(first.version))
      )?.[1];

      activePoint = point;
      const result = await store.writeBundleAtomically(
        "async-storage-estimate",
        first.version,
        bundle("r2"),
      );
      if (beforeCommit.includes(point)) {
        expect(result).toMatchObject({ status: "FAILED" });
        expect(
          (await store.readBundle("async-storage-estimate"))
            ?.estimateDraftRevisionState?.currentRevisionId,
        ).toBe("r1");
      } else {
        expect(result).toMatchObject({ status: "WRITTEN" });
        expect(
          (await store.readBundle("async-storage-estimate"))
            ?.estimateDraftRevisionState?.currentRevisionId,
        ).toBe("r2");
      }
      expect([...storage.values.entries()].find(([key]) =>
        key.includes("@revision:async-storage-estimate:") &&
        key.includes(encodeURIComponent(first.version))
      )?.[1]).toBe(signedR1);
    }
  });

  test("recovers corrupted JSON and rejects missing pointers or missing revisions", async () => {
    const storage = new AsyncStorageDouble();
    const store = new AsyncStorageEstimateRevisionDurableStore(storage);
    const first = await store.writeBundleAtomically(
      "async-storage-estimate",
      null,
      bundle("r1"),
    );
    if (first.status === "FAILED") throw new Error(first.error.message);
    const second = await store.writeBundleAtomically(
      "async-storage-estimate",
      first.version,
      bundle("r2"),
    );
    if (second.status === "FAILED") throw new Error(second.error.message);
    const pointerEntry = [...storage.values.entries()].find(([key]) =>
      key.includes("@pointer:async-storage-estimate")
    );
    if (!pointerEntry) throw new Error("pointer missing from test fixture");
    const currentRevisionEntry = [...storage.values.entries()].find(([key]) =>
      key.includes("@revision:async-storage-estimate:") &&
      key.includes(encodeURIComponent(second.version))
    );
    if (!currentRevisionEntry) throw new Error("revision missing from test fixture");

    storage.values.set(currentRevisionEntry[0], "{corrupt-json");
    await expect(
      store.recoverLastValid("async-storage-estimate"),
    ).resolves.toMatchObject({
      estimateDraftRevisionState: { currentRevisionId: "r1" },
    });

    storage.values.delete(pointerEntry[0]);
    await expect(store.readBundle("async-storage-estimate")).resolves.toBeNull();
    await expect(
      store.recoverLastValid("async-storage-estimate"),
    ).resolves.toBeNull();

    storage.values.set(pointerEntry[0], JSON.stringify({
      schemaVersion: "estimate_revision_durable_pointer_v1",
      currentVersion: "missing-revision",
      previousVersion: null,
    }));
    await expect(
      store.recoverLastValid("async-storage-estimate"),
    ).resolves.toBeNull();
  });

  test("isolates two drafts, survives cold restart, and retains the prior revision on quota failure", async () => {
    const storage = new AsyncStorageDouble();
    const store = new AsyncStorageEstimateRevisionDurableStore(storage);
    const first = await store.writeBundleAtomically(
      "async-storage-estimate",
      null,
      bundle("r1"),
    );
    if (first.status === "FAILED") throw new Error(first.error.message);
    await expect(
      store.writeBundleAtomically(
        "second-estimate",
        null,
        bundle("r1", "second-estimate"),
      ),
    ).resolves.toMatchObject({ status: "WRITTEN" });
    expect(await store.listKeys()).toEqual([
      "async-storage-estimate",
      "second-estimate",
    ]);

    const restarted = new AsyncStorageEstimateRevisionDurableStore(storage);
    await expect(
      restarted.recoverLastValid("second-estimate"),
    ).resolves.toMatchObject({ draft: { id: "second-estimate" } });

    const originalSetItem = storage.setItem.bind(storage);
    storage.setItem = async () => {
      throw new Error("ASYNC_STORAGE_QUOTA_EXCEEDED");
    };
    await expect(
      restarted.writeBundleAtomically(
        "async-storage-estimate",
        first.version,
        bundle("r2"),
      ),
    ).resolves.toMatchObject({
      status: "FAILED",
      error: { code: "TRANSACTION_FAILED" },
    });
    storage.setItem = originalSetItem;
    await expect(
      restarted.readBundle("async-storage-estimate"),
    ).resolves.toMatchObject({
      estimateDraftRevisionState: { currentRevisionId: "r1" },
    });
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
