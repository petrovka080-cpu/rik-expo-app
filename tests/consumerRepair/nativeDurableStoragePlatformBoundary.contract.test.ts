import { Platform } from "react-native";

import {
  __resetConsumerRepairRequestStoreForTests,
  __simulateConsumerRepairRequestStoreReloadForTests,
  initializeConsumerRepairTransactionalDurableStorage,
} from "../../src/lib/consumerRequests";
import {
  getConsumerRepairBundle,
  setConsumerRepairTransactionalDurableStoreForTests,
} from "../../src/lib/consumerRequests/consumerRequestRepository";
import {
  InMemoryEstimateRevisionDurableStore,
  type EstimateRevisionDurableStore,
  type RevisionBundle,
} from "../../src/lib/platform/estimateRevisionDurableStore";

function nativeBundle(id: string): RevisionBundle {
  return {
    draft: {
      id,
      consumerUserId: "consumer-demo-user",
      status: "draft",
      title: id,
      problemText: id,
      repairType: "road_construction",
      missingData: [],
      createdAt: "2026-07-28T00:00:00.000Z",
      updatedAt: "2026-07-28T00:00:00.000Z",
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
});
