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

  it("isolates one failed native draft without hiding other recovered drafts", async () => {
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
      initializeConsumerRepairTransactionalDurableStorage(),
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

    const hydration = hydrateTransactionalConsumerRepairRequestStore();
    for (let turn = 0; turn < 6; turn += 1) await Promise.resolve();
    await jest.advanceTimersByTimeAsync(3_001);
    releaseRecovery();
    await hydration;

    expect(getConsumerRepairBundle(bundle.draft.id).draft.id).toBe(
      bundle.draft.id,
    );
  });

  it("hydrates native transactional history in bounded newest-first pages without deleting older revisions", async () => {
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

    await hydrateTransactionalConsumerRepairRequestStore();
    const firstPage = listConsumerRepairApprovedHistory("consumer-demo-user", { limit: 20 });
    const expectedNewestIds = [...bundles.keys()].reverse().slice(0, 20);

    expect(recoveryOrder).toEqual(expectedNewestIds);
    expect(firstPage.items.map((bundle) => bundle.draft.id)).toEqual(expectedNewestIds);
    expect(firstPage.totalApprovedCount).toBe(20);
    expect(hasUnhydratedTransactionalConsumerRepairBundles()).toBe(true);

    await expect(hydrateNextTransactionalConsumerRepairHistoryPage()).resolves.toBe(5);
    const refreshedFirstPage = listConsumerRepairApprovedHistory("consumer-demo-user", { limit: 20 });
    const secondPage = listConsumerRepairApprovedHistory("consumer-demo-user", {
      limit: 20,
      cursorCreatedAt: refreshedFirstPage.nextCursorCreatedAt,
    });
    expect(refreshedFirstPage.totalApprovedCount).toBe(25);
    expect(secondPage.items.map((bundle) => bundle.draft.id)).toEqual(
      [...bundles.keys()].slice(0, 5).reverse(),
    );
    expect(new Set(recoveryOrder)).toEqual(new Set(bundles.keys()));
    expect(hasUnhydratedTransactionalConsumerRepairBundles()).toBe(false);
  });
});
