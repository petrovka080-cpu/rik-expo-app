import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
  type ConsumerRepairDraftBundle,
} from "../../src/lib/consumerRequests";
import {
  flushTransactionalConsumerRepairWrites,
  queueTransactionalConsumerRepairBundleWrite,
  setConsumerRepairTransactionalStoreForTests,
} from "../../src/lib/platform/consumerRepairTransactionalDurableBridge";
import type { EstimateRevisionDurableStore } from "../../src/lib/platform/estimateRevisionDurableStore";

describe("consumer repair transactional write coalescing", () => {
  afterEach(() => {
    __resetConsumerRepairRequestStoreForTests();
    setConsumerRepairTransactionalStoreForTests(null);
  });

  it("writes only the latest not-yet-started state for one request", async () => {
    __resetConsumerRepairRequestStoreForTests();
    const base = createConsumerRepairRequestDraft({
      consumerUserId: "transactional-coalescing-user",
      problemText: "durable coalescing fixture",
      repairType: "durable_test",
    });
    const writes: ConsumerRepairDraftBundle[] = [];
    let committed: ConsumerRepairDraftBundle | null = null;
    const durableStore: EstimateRevisionDurableStore = {
      readBundle: async () => committed,
      writeBundleAtomically: async (_key, expectedVersion, bundle) => {
        writes.push(bundle);
        committed = bundle;
        return {
          status: "WRITTEN",
          version: `version-${writes.length}`,
          previousVersion: expectedVersion,
          checksum: `checksum-${writes.length}`,
        };
      },
      recoverLastValid: async () => committed,
      deleteOrphans: async () => undefined,
      listKeys: async () => committed ? [committed.draft.id] : [],
    };
    setConsumerRepairTransactionalStoreForTests(durableStore);

    const versions = ["draft", "pdf", "approved"].map((title, index) => ({
      ...base,
      draft: {
        ...base.draft,
        title,
        updatedAt: `2026-09-05T00:00:0${index}.000Z`,
      },
    }));
    const queued = versions.map((bundle) =>
      queueTransactionalConsumerRepairBundleWrite({ bundle, storage: null })
    );

    expect(queued[1]).toBe(queued[0]);
    expect(queued[2]).toBe(queued[0]);
    await flushTransactionalConsumerRepairWrites();
    const recovered = await durableStore.recoverLastValid(base.draft.id);

    expect(writes).toHaveLength(1);
    expect(writes[0]?.draft.title).toBe("approved");
    expect(recovered?.draft.title).toBe("approved");
  });
});
