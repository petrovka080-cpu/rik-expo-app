import { Platform } from "react-native";
import { logger } from "../../src/lib/logger";

import {
  __resetConsumerRepairRequestStoreForTests,
  __simulateConsumerRepairRequestStoreReloadForTests,
  initializeConsumerRepairTransactionalDurableStorage,
  listConsumerRepairApprovedHistory,
  type ConsumerRepairDraftBundle,
} from "../../src/lib/consumerRequests";
import {
  getConsumerRepairBundle,
  hasUnhydratedTransactionalConsumerRepairBundles,
  hydrateNextTransactionalConsumerRepairHistoryPage,
  hydrateTransactionalConsumerRepairRequestStore,
  setConsumerRepairTransactionalDurableStoreForTests,
  saveConsumerRepairBundle,
} from "../../src/lib/consumerRequests/consumerRequestRepository";
import {
  InMemoryEstimateRevisionDurableStore,
  type EstimateRevisionDurableStore,
  type RevisionBundle,
} from "../../src/lib/platform/estimateRevisionDurableStore";
import { flushTransactionalConsumerRepairWrites } from "../../src/lib/platform/consumerRepairTransactionalDurableBridge";

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
  beforeEach(() => { jest.spyOn(logger, "releaseEvidence").mockImplementation(() => undefined); });

  afterEach(() => {
    jest.restoreAllMocks();
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
    const phaseEvidence = jest.spyOn(logger, "releaseEvidence").mockImplementation(() => undefined);
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
    const phaseEvents = phaseEvidence.mock.calls.filter(([tag]) => tag === "RikEstimateHydration");
    expect(phaseEvents.map(([, phase]) => phase)).toEqual(["DURABLE_LEGACY_COMPATIBILITY", "DURABLE_QUEUE_WAIT", "DURABLE_INDEX",
      "DURABLE_BUNDLE_RECOVERY", "DURABLE_LOCAL_PROJECTION"]);
    for (const [, , event] of phaseEvents) {
      expect(Object.keys(event).sort()).toEqual(["durationMs", "elapsedMs", "phase", "status", "trace"]);
      expect(event).toMatchObject({ status: "completed", durationMs: expect.any(Number), elapsedMs: expect.any(Number) });
      expect(JSON.stringify(event)).not.toContain(exactDraftId);
      expect(JSON.stringify(event)).not.toContain("consumer-demo-user");
    }
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

  it("projects one recovered record before starting another and deduplicates queued one-record pages", async () => {
    Object.defineProperty(Platform, "OS", { configurable: true, get: () => "android" });
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: { product: "ReactNative" } });
    const durableStore = new InMemoryEstimateRevisionDurableStore();
    const first = nativeBundle("consumer_draft_m0000002_first", { approved: true });
    const second = nativeBundle("consumer_draft_m0000001_second", { approved: true });
    expect((await durableStore.writeBundleAtomically(first.draft.id, null, first)).status).toBe("WRITTEN");
    expect((await durableStore.writeBundleAtomically(second.draft.id, null, second)).status).toBe("WRITTEN");
    const originalRecover = durableStore.recoverLastValid.bind(durableStore);
    let releaseFirst!: (value: RevisionBundle) => void;
    let startedFirst!: () => void;
    const firstStarted = new Promise<void>(resolve => { startedFirst = resolve; });
    const recoveryOrder: string[] = [];
    jest.spyOn(durableStore, "recoverLastValid").mockImplementation(async key => {
      recoveryOrder.push(key);
      if (key === first.draft.id) {
        startedFirst();
        return new Promise<RevisionBundle>(resolve => { releaseFirst = resolve; });
      }
      expect(getConsumerRepairBundle(first.draft.id).draft.title).toBe(first.draft.title);
      return originalRecover(key);
    });
    setConsumerRepairTransactionalDurableStoreForTests(durableStore);
    __simulateConsumerRepairRequestStoreReloadForTests();
    const page = hydrateNextTransactionalConsumerRepairHistoryPage(2);
    const queued = hydrateNextTransactionalConsumerRepairHistoryPage(1);
    await firstStarted;
    expect(recoveryOrder).toEqual([first.draft.id]);
    releaseFirst(first);
    await expect(page).resolves.toBe(2);
    await expect(queued).resolves.toBe(0);
    expect(recoveryOrder).toEqual([first.draft.id, second.draft.id]);
    expect(hasUnhydratedTransactionalConsumerRepairBundles()).toBe(false);
  });

  it.each([false, true])("keeps a newer local save when older recovery resumes (write committed: %s)", async committed => {
    Object.defineProperty(Platform, "OS", { configurable: true, get: () => "android" });
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: { product: "ReactNative" } });
    const durableStore = new InMemoryEstimateRevisionDurableStore();
    const old = nativeBundle("consumer_draft_m0000003_racing");
    expect((await durableStore.writeBundleAtomically(old.draft.id, null, old)).status).toBe("WRITTEN");
    const originalRecover = durableStore.recoverLastValid.bind(durableStore);
    let releaseOld!: (value: RevisionBundle) => void;
    let started!: () => void;
    const recoveryStarted = new Promise<void>(resolve => { started = resolve; });
    jest.spyOn(durableStore, "recoverLastValid").mockImplementationOnce(() => {
      started();
      return new Promise<RevisionBundle>(resolve => { releaseOld = resolve; });
    });
    setConsumerRepairTransactionalDurableStoreForTests(durableStore);
    __simulateConsumerRepairRequestStoreReloadForTests();
    const hydration = hydrateNextTransactionalConsumerRepairHistoryPage(1);
    await recoveryStarted;
    saveConsumerRepairBundle({ ...old, draft: { ...old.draft, title: "new local title", dangerousDiyBlocked: false } } as ConsumerRepairDraftBundle);
    if (committed) await flushTransactionalConsumerRepairWrites();
    releaseOld(old);
    await hydration;
    expect(getConsumerRepairBundle(old.draft.id).draft.title).toBe("new local title");
    await flushTransactionalConsumerRepairWrites();
    expect((await originalRecover(old.draft.id))?.draft.title).toBe("new local title");
  });

  it("does not recover an older envelope over a local write already pending before history starts", async () => {
    Object.defineProperty(Platform, "OS", { configurable: true, get: () => "android" });
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: { product: "ReactNative" } });
    const durableStore = new InMemoryEstimateRevisionDurableStore();
    const old = nativeBundle("consumer_draft_m0000004_pending");
    expect((await durableStore.writeBundleAtomically(old.draft.id, null, old)).status).toBe("WRITTEN");
    setConsumerRepairTransactionalDurableStoreForTests(durableStore);
    __simulateConsumerRepairRequestStoreReloadForTests();
    await hydrateTransactionalConsumerRepairRequestStore();
    const originalWrite = durableStore.writeBundleAtomically.bind(durableStore);
    let releaseWrite!: () => void;
    const delayedWrite = new Promise<void>(resolve => { releaseWrite = resolve; });
    jest.spyOn(durableStore, "writeBundleAtomically").mockImplementation(async (key, value, version) => {
      await delayedWrite;
      return originalWrite(key, value, version);
    });
    const recover = jest.spyOn(durableStore, "recoverLastValid");
    saveConsumerRepairBundle({ ...old, draft: { ...old.draft, title: "pending local title", dangerousDiyBlocked: false } } as ConsumerRepairDraftBundle);
    await hydrateNextTransactionalConsumerRepairHistoryPage(1);
    expect(recover).not.toHaveBeenCalled();
    releaseWrite();
    await flushTransactionalConsumerRepairWrites();
    expect(getConsumerRepairBundle(old.draft.id).draft.title).toBe("pending local title");
    expect((await durableStore.recoverLastValid(old.draft.id))?.draft.title).toBe("pending local title");
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
