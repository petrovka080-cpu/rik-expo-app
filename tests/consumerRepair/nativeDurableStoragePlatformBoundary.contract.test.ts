import { Platform } from "react-native";

import {
  __resetConsumerRepairRequestStoreForTests,
  __simulateConsumerRepairRequestStoreReloadForTests,
  initializeConsumerRepairTransactionalDurableStorage,
  listConsumerRepairApprovedHistory,
} from "../../src/lib/consumerRequests";
import {
  getConsumerRepairBundle,
  hasUnhydratedTransactionalConsumerRepairBundles,
  hydrateNextTransactionalConsumerRepairHistoryPage,
  hydrateTransactionalConsumerRepairRequestStore,
  setConsumerRepairTransactionalDurableStoreForTests,
} from "../../src/lib/consumerRequests/consumerRequestRepository";
import {
  InMemoryEstimateRevisionDurableStore,
  type EstimateRevisionDurableStore,
  type RevisionBundle,
} from "../../src/lib/platform/estimateRevisionDurableStore";

function nativeBundle(
  id: string,
  input: { approved?: boolean; createdAt?: string } = {},
): RevisionBundle {
  const createdAt = input.createdAt ?? "2026-07-28T00:00:00.000Z";
  return {
    draft: {
      id,
      consumerUserId: "consumer-demo-user",
      status: input.approved ? "consumer_approved" : "draft",
      title: id,
      problemText: id,
      repairType: "road_construction",
      missingData: [],
      createdAt,
      updatedAt: createdAt,
      approvedAt: input.approved ? createdAt : undefined,
    },
    items: [],
    media: [],
    pdfs: [],
    projectExecutionDrafts: [],
    marketplaceLink: {
      id: `marketplace-${id}`,
      requestDraftId: id,
      status: "not_sent",
      createdAt: "2026-07-28T00:00:00.000Z",
    },
    events: [],
  };
}

describe("consumer repair native durable storage platform boundary", () => {
  const originalPlatformOs = Platform.OS;
  const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator",
  );

  afterEach(() => {
    jest.useRealTimers();
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => originalPlatformOs,
    });
    if (originalNavigatorDescriptor) {
      Object.defineProperty(
        globalThis,
        "navigator",
        originalNavigatorDescriptor,
      );
    } else {
      Reflect.deleteProperty(globalThis, "navigator");
    }
    delete (globalThis as { localStorage?: Storage }).localStorage;
    __resetConsumerRepairRequestStoreForTests();
  });

  it("never touches a web-storage global while hydrating on Android", async () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => "android",
    });
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { product: "ReactNative" },
    });
    let webStorageAccesses = 0;
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get: () => {
        webStorageAccesses += 1;
        throw new Error("NATIVE_RUNTIME_MUST_NOT_READ_WEB_STORAGE");
      },
    });
    setConsumerRepairTransactionalDurableStoreForTests(
      new InMemoryEstimateRevisionDurableStore(),
    );
    __simulateConsumerRepairRequestStoreReloadForTests();

    await expect(
      initializeConsumerRepairTransactionalDurableStorage(),
    ).resolves.toBeUndefined();
    expect(webStorageAccesses).toBe(0);
  });

  it("preserves complete transactional initialization for the browser store", async () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => "web",
    });
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { product: "Gecko" },
    });
    const values = new Map<string, string>();
    const webStorage: Storage = {
      get length() { return values.size; },
      clear: () => values.clear(),
      getItem: (key) => values.get(key) ?? null,
      key: (index) => [...values.keys()][index] ?? null,
      removeItem: (key) => { values.delete(key); },
      setItem: (key, value) => { values.set(key, value); },
    };
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: webStorage,
    });
    const bundles = new Map([
      ["web-draft-a", nativeBundle("web-draft-a")],
      ["web-draft-b", nativeBundle("web-draft-b")],
    ]);
    const recoveryOrder: string[] = [];
    setConsumerRepairTransactionalDurableStoreForTests({
      listKeys: async () => [...bundles.keys()],
      readBundle: async () => null,
      recoverLastValid: async (key) => {
        recoveryOrder.push(key);
        return bundles.get(key) ?? null;
      },
      writeBundleAtomically: async () => ({
        status: "FAILED",
        version: null,
        error: { code: "STORAGE_UNAVAILABLE", message: "not used", currentVersion: null },
      }),
      deleteOrphans: async () => undefined,
    });
    __simulateConsumerRepairRequestStoreReloadForTests();

    await hydrateTransactionalConsumerRepairRequestStore();

    expect(new Set(recoveryOrder)).toEqual(new Set(bundles.keys()));
    expect(hasUnhydratedTransactionalConsumerRepairBundles()).toBe(false);
  });

  it("isolates one failed exact native draft without hiding another exact draft", async () => {
    const goodBundle = nativeBundle("native-good-draft");
    const store: EstimateRevisionDurableStore = {
      listKeys: async () => ["native-stuck-draft", "native-good-draft"],
      readBundle: async () => null,
      recoverLastValid: async (key) => {
        if (key !== "native-stuck-draft") return goodBundle;
        throw new Error("CORRUPT_NATIVE_DRAFT");
      },
      writeBundleAtomically: async () => ({
        status: "FAILED",
        version: null,
        error: {
          code: "STORAGE_UNAVAILABLE",
          message: "not used",
          currentVersion: null,
        },
      }),
      deleteOrphans: async () => undefined,
    };
    setConsumerRepairTransactionalDurableStoreForTests(store);
    __simulateConsumerRepairRequestStoreReloadForTests();

    await expect(
      hydrateTransactionalConsumerRepairRequestStore("native-stuck-draft"),
    ).resolves.toBeUndefined();
    await expect(
      hydrateTransactionalConsumerRepairRequestStore("native-good-draft"),
    ).resolves.toBeUndefined();
    expect(getConsumerRepairBundle("native-good-draft").draft.id).toBe(
      "native-good-draft",
    );
  });

  it("keeps awaiting a slow native recovery after the bounded UI notice expires", async () => {
    jest.useFakeTimers();
    const bundle = nativeBundle("native-slow-draft", { approved: true });
    let releaseRecovery = (): void => undefined;
    const slowRecovery = new Promise<RevisionBundle | null>((resolve) => {
      releaseRecovery = () => resolve(bundle);
    });
    const durableStore: EstimateRevisionDurableStore = {
      listKeys: async () => [bundle.draft.id],
      readBundle: async () => null,
      recoverLastValid: async () => slowRecovery,
      writeBundleAtomically: async () => ({
        status: "FAILED",
        version: null,
        error: {
          code: "STORAGE_UNAVAILABLE",
          message: "not used",
          currentVersion: null,
        },
      }),
      deleteOrphans: async () => undefined,
    };
    setConsumerRepairTransactionalDurableStoreForTests(durableStore);
    __simulateConsumerRepairRequestStoreReloadForTests();

    const hydration = hydrateTransactionalConsumerRepairRequestStore(
      bundle.draft.id,
    );
    for (let turn = 0; turn < 6; turn += 1) await Promise.resolve();
    await jest.advanceTimersByTimeAsync(3_001);
    releaseRecovery();
    await hydration;

    expect(getConsumerRepairBundle(bundle.draft.id).draft.id).toBe(
      bundle.draft.id,
    );
  });

  it("opens one native draft without reading the archive, then hydrates history in bounded newest-first pages", async () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => "android",
    });
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { product: "ReactNative" },
    });
    __resetConsumerRepairRequestStoreForTests();

    const baseTime = Date.UTC(2026, 7, 8, 12, 0, 0);
    const bundles = new Map<string, RevisionBundle>();
    for (let index = 0; index < 25; index += 1) {
      const timestamp = baseTime + index * 1_000;
      const id = `consumer_draft_${timestamp.toString(36)}_native${index}`;
      bundles.set(id, nativeBundle(id, {
        approved: true,
        createdAt: new Date(timestamp).toISOString(),
      }));
    }
    const recoveryOrder: string[] = [];
    const durableStore: EstimateRevisionDurableStore = {
      listKeys: async () => [...bundles.keys()].reverse(),
      readBundle: async (key) => bundles.get(key) ?? null,
      recoverLastValid: async (key) => {
        recoveryOrder.push(key);
        return bundles.get(key) ?? null;
      },
      writeBundleAtomically: async () => ({
        status: "FAILED",
        version: null,
        error: {
          code: "STORAGE_UNAVAILABLE",
          message: "not used",
          currentVersion: null,
        },
      }),
      deleteOrphans: async () => undefined,
    };
    setConsumerRepairTransactionalDurableStoreForTests(durableStore);
    __simulateConsumerRepairRequestStoreReloadForTests();

    const exactDraftId = [...bundles.keys()][8]!;
    await hydrateTransactionalConsumerRepairRequestStore(exactDraftId);
    const exactOnly = listConsumerRepairApprovedHistory("consumer-demo-user", { limit: 20 });

    expect(recoveryOrder).toEqual([exactDraftId]);
    expect(exactOnly.items.map((bundle) => bundle.draft.id)).toEqual([exactDraftId]);
    expect(exactOnly.totalApprovedCount).toBe(1);
    expect(hasUnhydratedTransactionalConsumerRepairBundles()).toBe(true);

    await expect(hydrateNextTransactionalConsumerRepairHistoryPage()).resolves.toBe(5);
    expect(recoveryOrder).toHaveLength(6);
    expect(new Set(recoveryOrder).size).toBe(6);

    while (hasUnhydratedTransactionalConsumerRepairBundles()) {
      await hydrateNextTransactionalConsumerRepairHistoryPage();
    }
    const refreshedFirstPage = listConsumerRepairApprovedHistory("consumer-demo-user", { limit: 20 });
    const secondPage = listConsumerRepairApprovedHistory("consumer-demo-user", {
      limit: 20,
      cursorCreatedAt: refreshedFirstPage.nextCursorCreatedAt,
    });
    expect(refreshedFirstPage.totalApprovedCount).toBe(25);
    expect(secondPage.items).toHaveLength(5);
    expect(new Set(recoveryOrder)).toEqual(new Set(bundles.keys()));
    expect(hasUnhydratedTransactionalConsumerRepairBundles()).toBe(false);
  });

  it("keeps the observed 437-record / 94 MiB archive off the exact-open critical path", async () => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => "android",
    });
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { product: "ReactNative" },
    });
    __resetConsumerRepairRequestStoreForTests();

    const ids = Array.from(
      { length: 16 },
      (_, index) => `consumer_draft_observed_${String(index).padStart(2, "0")}`,
    );
    const syntheticRecordCount = 437;
    const syntheticSerializedChars = 94_365_613;
    const baseRecordChars = Math.floor(syntheticSerializedChars / syntheticRecordCount);
    const scaleRecords = Array.from({ length: syntheticRecordCount }, (_, index) => ({
      key: `safe-synthetic-chunk-${String(index).padStart(3, "0")}`,
      logicalDraftId: ids[index % ids.length]!,
      serializedChars: baseRecordChars + (index < syntheticSerializedChars % syntheticRecordCount ? 1 : 0),
    }));
    const exactDraftId = ids[11]!;
    const corruptDraftId = ids[3]!;
    const recoveryOrder: string[] = [];
    const durableStore: EstimateRevisionDurableStore = {
      listKeys: async () => ids,
      readBundle: async () => null,
      recoverLastValid: async (key) => {
        recoveryOrder.push(key);
        if (key === corruptDraftId) throw new Error("SAFE_SYNTHETIC_CORRUPT_RECORD");
        // Draft/not_sent is intentionally unsynchronised user state.
        return nativeBundle(key);
      },
      writeBundleAtomically: async () => ({
        status: "FAILED",
        version: null,
        error: {
          code: "STORAGE_UNAVAILABLE",
          message: "not used",
          currentVersion: null,
        },
      }),
      deleteOrphans: async () => undefined,
    };
    setConsumerRepairTransactionalDurableStoreForTests(durableStore);
    __simulateConsumerRepairRequestStoreReloadForTests();

    expect(scaleRecords).toHaveLength(437);
    expect(scaleRecords.reduce((sum, record) => sum + record.serializedChars, 0)).toBe(94_365_613);
    expect(new Set(scaleRecords.map((record) => record.key)).size).toBe(437);
    expect(new Set(scaleRecords.map((record) => record.logicalDraftId))).toEqual(new Set(ids));
    await hydrateTransactionalConsumerRepairRequestStore(exactDraftId);

    expect(recoveryOrder).toEqual([exactDraftId]);
    expect(getConsumerRepairBundle(exactDraftId)).toMatchObject({
      draft: { id: exactDraftId, status: "draft" },
      marketplaceLink: { status: "not_sent" },
    });
    expect(hasUnhydratedTransactionalConsumerRepairBundles()).toBe(true);

    while (hasUnhydratedTransactionalConsumerRepairBundles()) {
      await hydrateNextTransactionalConsumerRepairHistoryPage();
    }
    expect(() => getConsumerRepairBundle(corruptDraftId)).toThrow("Consumer repair request draft not found");
    expect(getConsumerRepairBundle(ids[4]!).draft.id).toBe(ids[4]);
  });
});
