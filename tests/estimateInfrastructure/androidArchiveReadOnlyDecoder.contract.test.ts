import { auditAndroidLogicalBundlesReadOnly } from "../../scripts/estimate/r4a13/androidArchiveReadOnlyDecoder";
import { AsyncStorageEstimateRevisionDurableStore, type AsyncKeyValueStorage } from "../../src/lib/platform/estimateRevisionDurableStore.asyncStorage";
import { durablePointerRecordKey, durableRevisionRecordKey, type RevisionBundle } from "../../src/lib/platform/estimateRevisionDurableStore.contract";

const prefix = "rik.estimate_revision_durable.v1:";
function fixture(id: string, revisionCount: number): RevisionBundle {
  return {
    draft: { id, consumerUserId: "synthetic-unit-fixture", status: "draft", title: "Audit test", problemText: "Audit test", repairType: "road_construction", createdAt: "2026-10-02T00:00:00Z", updatedAt: `2026-10-02T00:0${revisionCount}:00Z` },
    items: [], media: [], pdfs: [], projectExecutionDrafts: [], events: [],
    marketplaceLink: { requestDraftId: id, publishedRequestId: null, linkedAt: null },
    estimateDraftRevisionState: {
      estimateDraftId: id, currentRevisionId: `r${revisionCount}`,
      revisions: Array.from({ length: revisionCount }, (_, i) => ({ revisionId: `r${i + 1}`, boq: { rows: [] } })), diffs: [],
    },
  } as unknown as RevisionBundle;
}
async function seed() {
  const data = new Map<string, string>();
  const storage: AsyncKeyValueStorage = {
    getItem: async key => data.get(key) ?? null,
    multiGet: async keys => keys.map(key => [key, data.get(key) ?? null] as const),
    setItem: async (key, value) => { data.set(key, value); },
    removeItem: async key => { data.delete(key); },
  };
  const store = new AsyncStorageEstimateRevisionDurableStore(storage);
  const first = await store.writeBundleAtomically("bad-or-good", null, fixture("bad-or-good", 1));
  if (first.status === "FAILED") throw new Error("SEED_FAILED");
  await store.writeBundleAtomically("bad-or-good", first.version, fixture("bad-or-good", 2));
  await store.writeBundleAtomically("good-neighbor", null, fixture("good-neighbor", 1));
  return { storage, data, pointer: JSON.parse(data.get(`${prefix}${durablePointerRecordKey("bad-or-good")}`)!) };
}

describe("read-only decoder audit preserves actual heads and neighbors", () => {
  it("decodes heads and previous snapshots with the product parser, without pointer repair or cleanup", async () => {
    const { storage, data } = await seed();
    const before = [...data];
    const result = await auditAndroidLogicalBundlesReadOnly(storage);
    expect(result).toMatchObject({ logicalKeyCount: 2, validHeadCount: 2, invalidHeadCount: 0, validPreviousCount: 1, invalidDeclaredPreviousCount: 0, headDecodedRevisionCount: 3, mutationAttempts: 0, headShapeIssueCount: 0 });
    expect([...data]).toEqual(before);
    expect(JSON.stringify(result)).not.toContain("bad-or-good");
    expect(JSON.stringify(result)).not.toContain("synthetic-unit-fixture");
    expect(result.records.every(r => /^[a-f0-9]{64}$/u.test(r.keySha256))).toBe(true);
  });

  it("reports a corrupt head, reads its valid previous version in memory, and continues the valid neighbor", async () => {
    const { storage, data, pointer } = await seed();
    data.set(`${prefix}${durableRevisionRecordKey("bad-or-good", pointer.currentVersion)}`, "corrupt fixture");
    const before = [...data];
    const result = await auditAndroidLogicalBundlesReadOnly(storage);
    expect(result).toMatchObject({ logicalKeyCount: 2, validHeadCount: 1, invalidHeadCount: 1, validPreviousCount: 1, mutationAttempts: 0 });
    expect([...data]).toEqual(before);
  });

  it("does not discard a valid current head when its declared previous version is corrupt", async () => {
    const { storage, data, pointer } = await seed();
    data.set(`${prefix}${durableRevisionRecordKey("bad-or-good", pointer.previousVersion)}`, "corrupt old fixture");
    const before = [...data];
    const result = await auditAndroidLogicalBundlesReadOnly(storage);
    expect(result).toMatchObject({ validHeadCount: 2, invalidHeadCount: 0, validPreviousCount: 0, invalidDeclaredPreviousCount: 1, mutationAttempts: 0 });
    expect([...data]).toEqual(before);
  });

  it("reports an extra indexed version without deleting it or labeling it safe garbage", async () => {
    const { storage, data } = await seed();
    const key = `${prefix}__revision_index__:${encodeURIComponent("bad-or-good")}`;
    const index = JSON.parse(data.get(key)!);
    index.versions.push("unclassified-history-version");
    data.set(key, JSON.stringify(index));
    const before = [...data];
    const result = await auditAndroidLogicalBundlesReadOnly(storage);
    expect(result.records.map(r => r.indexedNonHeadVersions)).toContain(1);
    expect(result.mutationAttempts).toBe(0);
    expect([...data]).toEqual(before);
  });
});
