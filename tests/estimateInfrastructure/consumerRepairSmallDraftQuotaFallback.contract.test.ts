import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
} from "../../src/lib/consumerRequests";
import {
  awaitConsumerRepairBundleDurableCommit,
  getConsumerRepairBundle,
  hydrateTransactionalConsumerRepairRequestStore,
  saveConsumerRepairBundle,
  setConsumerRepairTransactionalDurableStoreForTests,
  simulateConsumerRepairRequestStoreReloadForTests,
} from "../../src/lib/consumerRequests/consumerRequestRepository";
import { InMemoryEstimateRevisionDurableStore } from "../../src/lib/platform/estimateRevisionDurableStore.memory";
import {
  flushTransactionalConsumerRepairWrites,
  isLargeConsumerRepairRevisionBundle,
} from "../../src/lib/platform/consumerRepairTransactionalDurableBridge";

describe("small request durable commit when the origin's localStorage is full", () => {
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  let rejectWrites = false;
  const values = new Map<string, string>();
  const storage: Storage = {
    get length() { return values.size; },
    clear: () => values.clear(),
    key: index => [...values.keys()][index] ?? null,
    getItem: key => values.get(key) ?? null,
    removeItem: key => { values.delete(key); },
    setItem: (key, value) => {
      if (rejectWrites) throw new Error("QuotaExceededError");
      values.set(key, value);
    },
  };

  beforeEach(() => {
    rejectWrites = false;
    values.clear();
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
    __resetConsumerRepairRequestStoreForTests();
  });
  afterEach(async () => {
    await flushTransactionalConsumerRepairWrites();
    rejectWrites = false;
    __resetConsumerRepairRequestStoreForTests();
    if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
    else delete (globalThis as { localStorage?: Storage }).localStorage;
  });

  it("commits the small child with the existing atomic store and recovers it without the optional Web Storage pointer", async () => {
    const base = createConsumerRepairRequestDraft({ consumerUserId: "quota-owner", problemText: "ДЕМО 75 м²", repairType: "durable_test" });
    const durableStore = new InMemoryEstimateRevisionDurableStore();
    setConsumerRepairTransactionalDurableStoreForTests(durableStore);
    const child = {
      ...base,
      draft: { ...base.draft, status: "cancelled" as const, title: "saved child" },
    };
    expect(isLargeConsumerRepairRevisionBundle(child)).toBe(false);
    rejectWrites = true;
    const saved = saveConsumerRepairBundle(child);
    await expect(awaitConsumerRepairBundleDurableCommit({ requestDraftId: base.draft.id, expectedStatus: saved.draft.status, expectedRevisionId: null })).resolves.toBeUndefined();
    expect((await durableStore.recoverLastValid(base.draft.id))?.draft.title).toBe("saved child");
    expect(values.has("rik.consumer_repair.transactional_revision_pointer.v1:" + base.draft.id)).toBe(false);

    // A later smaller save still belongs to that same durable owner even if
    // localStorage becomes available. Cold hydration must not restore its parent.
    rejectWrites = false;
    const next = saveConsumerRepairBundle({ ...saved, draft: { ...saved.draft, status: "draft", title: "updated child" } });
    await awaitConsumerRepairBundleDurableCommit({ requestDraftId: next.draft.id, expectedStatus: next.draft.status, expectedRevisionId: null });
    simulateConsumerRepairRequestStoreReloadForTests();
    await hydrateTransactionalConsumerRepairRequestStore(base.draft.id);
    expect(getConsumerRepairBundle(base.draft.id).draft.title).toBe("updated child");
    expect(getConsumerRepairBundle(base.draft.id).draft.status).toBe("draft");
  });

  it("reports a failed atomic write and preserves the previously committed local parent", async () => {
    const base = createConsumerRepairRequestDraft({ consumerUserId: "quota-owner", problemText: "ДЕМО parent", repairType: "durable_test" });
    const durableStore = new InMemoryEstimateRevisionDurableStore({ failureInjector: () => { throw new Error("atomic-store-unavailable"); } });
    setConsumerRepairTransactionalDurableStoreForTests(durableStore);
    rejectWrites = true;
    saveConsumerRepairBundle({ ...base, draft: { ...base.draft, status: "cancelled" } });
    await expect(awaitConsumerRepairBundleDurableCommit({ requestDraftId: base.draft.id, expectedStatus: "cancelled", expectedRevisionId: null })).rejects.toThrow();
    expect(await durableStore.recoverLastValid(base.draft.id)).toBeNull();
    simulateConsumerRepairRequestStoreReloadForTests();
    await hydrateTransactionalConsumerRepairRequestStore(base.draft.id);
    expect(getConsumerRepairBundle(base.draft.id).draft.problemText).toBe(base.draft.problemText);
    expect(getConsumerRepairBundle(base.draft.id).estimateDraftRevisionState?.currentRevisionId ?? null).toBeNull();
  });
});
