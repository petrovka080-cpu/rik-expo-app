import {
  __resetConsumerRepairRequestStoreForTests,
  createConsumerRepairRequestDraft,
  type ConsumerRepairDraftBundle,
} from "../../src/lib/consumerRequests";
import {
  awaitTransactionalConsumerRepairBundleCommit,
  flushTransactionalConsumerRepairWrites,
  queueTransactionalConsumerRepairBundleWrite,
  setConsumerRepairTransactionalStoreForTests,
} from "../../src/lib/platform/consumerRepairTransactionalDurableBridge";
import type { EstimateRevisionDurableStore } from "../../src/lib/platform/estimateRevisionDurableStore";
import { logger } from "../../src/lib/logger";

describe("consumer repair transactional write coalescing", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    __resetConsumerRepairRequestStoreForTests();
    setConsumerRepairTransactionalStoreForTests(null);
  });

  it("keeps successful read-back and the actual storage failure when the diagnostic sink throws", async () => {
    __resetConsumerRepairRequestStoreForTests();
    const base = createConsumerRepairRequestDraft({ consumerUserId: "no-throw-diagnostics-user", problemText: "safe diagnostics", repairType: "durable_test" });
    let committed: ConsumerRepairDraftBundle | null = null;
    const durableStore: EstimateRevisionDurableStore = {
      readBundle: async () => committed,
      writeBundleAtomically: async (_key, previousVersion, bundle) => {
        committed = bundle;
        return { status: "WRITTEN", version: "committed", previousVersion, checksum: "checksum" };
      },
      recoverLastValid: async () => committed,
      deleteOrphans: async () => undefined,
      listKeys: async () => committed ? [base.draft.id] : [],
    };
    setConsumerRepairTransactionalStoreForTests(durableStore);
    const sink = jest.spyOn(logger, "releaseEvidence").mockImplementation(() => { throw new Error("diagnostic-sink-failure"); });
    const result = await queueTransactionalConsumerRepairBundleWrite({ bundle: base, storage: null });
    expect(result.status).toBe("WRITTEN");
    await expect(awaitTransactionalConsumerRepairBundleCommit({ requestDraftId: base.draft.id, expectedStatus: base.draft.status, expectedRevisionId: null })).resolves.toBeUndefined();
    expect(sink).toHaveBeenCalled();
    setConsumerRepairTransactionalStoreForTests({ ...durableStore, readBundle: async () => { throw new Error("owned-storage-failure"); } });
    const failed = await queueTransactionalConsumerRepairBundleWrite({ bundle: base, storage: null });
    expect(failed).toMatchObject({ status: "FAILED", error: { code: "TRANSACTION_FAILED", message: "owned-storage-failure" } });
  });

  it("confirms the target commit while another draft is pending and preserves explicit global draining", async () => {
    __resetConsumerRepairRequestStoreForTests();
    const target = createConsumerRepairRequestDraft({ consumerUserId: "target-commit-user", problemText: "target", repairType: "durable_test" });
    const other = { ...target, draft: { ...target.draft, id: "unrelated-pending-draft" } };
    const committed = new Map<string, ConsumerRepairDraftBundle>();
    let releaseOther!: () => void;
    const otherPending = new Promise<void>(resolve => { releaseOther = resolve; });
    const durableStore: EstimateRevisionDurableStore = {
      readBundle: async key => committed.get(key) ?? null,
      writeBundleAtomically: async (key, previousVersion, bundle) => {
        if (key === other.draft.id) await otherPending;
        committed.set(key, bundle);
        return { status: "WRITTEN", version: key, previousVersion, checksum: key };
      },
      recoverLastValid: async key => committed.get(key) ?? null,
      deleteOrphans: async () => undefined,
      listKeys: async () => [...committed.keys()],
    };
    setConsumerRepairTransactionalStoreForTests(durableStore);
    const pendingOther = queueTransactionalConsumerRepairBundleWrite({ bundle: other, storage: null });
    void queueTransactionalConsumerRepairBundleWrite({ bundle: target, storage: null });
    let targetConfirmed = false;
    const targetCommit = awaitTransactionalConsumerRepairBundleCommit({ requestDraftId: target.draft.id, expectedStatus: target.draft.status, expectedRevisionId: null })
      .then(() => { targetConfirmed = true; });
    // The target finishes on ordinary microtasks while the other promise remains unresolved.
    let allDrained = false;
    const globalDrain = flushTransactionalConsumerRepairWrites().then(() => { allDrained = true; });
    try {
      for (let turn = 0; turn < 20; turn += 1) await Promise.resolve();
      expect(targetConfirmed).toBe(true);
      expect(committed.has(other.draft.id)).toBe(false);
      expect(allDrained).toBe(false);
    } finally {
      releaseOther();
      await Promise.all([targetCommit, pendingOther, globalDrain]);
    }
    expect(allDrained).toBe(true);
    await expect(awaitTransactionalConsumerRepairBundleCommit({ requestDraftId: target.draft.id, expectedStatus: target.draft.status, expectedRevisionId: "uncommitted-revision" }))
      .rejects.toThrow("CONSUMER_REPAIR_TRANSACTIONAL_COMMIT_NOT_DURABLE");
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

  it("waits for an in-flight parent and the coalesced child before confirming the requested revision", async () => {
    __resetConsumerRepairRequestStoreForTests();
    const base = createConsumerRepairRequestDraft({ consumerUserId: "parent-child-commit-user", problemText: "parent child", repairType: "durable_test" });
    const parentId = "bc29add1-dee7-4a32-bd07-d9b4e4a5f86d";
    const childId = "2bfd6c59-c802-4911-9ad8-db21b41e64d7";
    const withRevision = (revisionId: string): ConsumerRepairDraftBundle => ({ ...base,
      estimateDraftRevisionState: { estimateDraftId: base.draft.id, currentRevisionId: revisionId, revisions: [], diffs: [] } });
    let committed: ConsumerRepairDraftBundle | null = null;
    let releaseParent!: () => void;
    const parentPending = new Promise<void>(resolve => { releaseParent = resolve; });
    let parentStarted!: () => void;
    const started = new Promise<void>(resolve => { parentStarted = resolve; });
    const written: string[] = [];
    const durableStore: EstimateRevisionDurableStore = {
      readBundle: async () => committed,
      writeBundleAtomically: async (_key, previousVersion, bundle) => {
        const revisionId = bundle.estimateDraftRevisionState!.currentRevisionId;
        if (revisionId === parentId) { parentStarted(); await parentPending; }
        committed = bundle; written.push(revisionId);
        return { status: "WRITTEN", version: revisionId, previousVersion, checksum: revisionId };
      },
      recoverLastValid: async () => committed,
      deleteOrphans: async () => undefined,
      listKeys: async () => committed ? [base.draft.id] : [],
    };
    setConsumerRepairTransactionalStoreForTests(durableStore);
    const parentWrite = queueTransactionalConsumerRepairBundleWrite({ bundle: withRevision(parentId), storage: null });
    await started;
    void queueTransactionalConsumerRepairBundleWrite({ bundle: withRevision(childId), storage: null });
    let childConfirmed = false;
    const childCommit = awaitTransactionalConsumerRepairBundleCommit({ requestDraftId: base.draft.id, expectedStatus: base.draft.status, expectedRevisionId: childId })
      .then(() => { childConfirmed = true; });
    await Promise.resolve();
    expect(childConfirmed).toBe(false);
    releaseParent();
    await Promise.all([parentWrite, childCommit]);
    expect(written).toEqual([parentId, childId]);
    expect(childConfirmed).toBe(true);
    await expect(awaitTransactionalConsumerRepairBundleCommit({ requestDraftId: base.draft.id, expectedStatus: base.draft.status, expectedRevisionId: parentId }))
      .rejects.toThrow("CONSUMER_REPAIR_TRANSACTIONAL_COMMIT_NOT_DURABLE");
  });
});
