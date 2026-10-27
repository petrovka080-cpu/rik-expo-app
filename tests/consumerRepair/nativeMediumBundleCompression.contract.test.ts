import {
  CONSUMER_REPAIR_DURABLE_BUNDLE_COMPRESSION_MIN_BYTES,
  decodeConsumerRepairBundleFromDurableStorage,
  encodeConsumerRepairBundleForDurableStorage,
} from "../../src/lib/platform/compactConsumerRepairDurableState";
import { AsyncStorageEstimateRevisionDurableStore, type AsyncKeyValueStorage } from "../../src/lib/platform/estimateRevisionDurableStore.asyncStorage";
import { decodeEstimateRevisionAsyncStorageRecord } from "../../src/lib/platform/estimateRevisionAsyncStorageRecordCodec";
import {
  createDurableEnvelope, durablePointerRecordKey, durableRevisionRecordKey,
  readCommittedEstimateRevisionBundleVersion, serializeRevisionBundle, stableEstimateRevisionChecksum,
  type DurableFailurePoint, type RevisionBundle,
} from "../../src/lib/platform/estimateRevisionDurableStore.contract";

const prefix = "rik.estimate_revision_durable.v1:";
function input(revisionId: string, medium = true): RevisionBundle {
  return {
    draft: { id: "medium-quota-draft", consumerUserId: "actual-owner", status: "draft", title: "Смета",
      createdAt: "2026-10-11T00:00:00Z", updatedAt: "2026-10-11T00:01:00Z" },
    items: [{ id: "physical-row", requestDraftId: "medium-quota-draft", itemType: "material", titleRu: "Материал 1ГП",
      quantity: 35.5, unit: "m", unitPrice: 123.45, totalPrice: 4382.475, currency: "KGS", source: "user_added",
      editableByConsumer: true, quantityEditedByConsumer: true, priceEditedByConsumer: true,
      sourceParameters: { rowCode: "physical-row", canonicalBackendRevisionId: revisionId,
        canonicalBackendReleaseId: "exact-release", canonicalCostTreatment: "DIRECT_COST" } }],
    estimateDraftRevisionState: { estimateDraftId: "medium-quota-draft", currentRevisionId: revisionId,
      revisions: ["r0", "r1", ...(revisionId === "r2" ? ["r2"] : [])].map(id => ({ revisionId: id,
        checksum: "immutable-" + id, params: { length: 35.5, supplier: "Фактическая спецификация" },
        boq: { rows: [{ rowId: "physical-row", quantity: 35.5, unitPrice: 123.45,
          calculationTrace: medium ? "Подтверждённая исходная строка; материал и работа сохранены. ".repeat(6000) : "Источник" }] } })),
      diffs: [{ fromRevisionId: "r0", toRevisionId: "r1", changedRows: ["physical-row"] }] },
    events: [{ id: "manual-price", eventType: "manual_price_saved", userId: "actual-owner", payload: {} }],
    media: [{ id: "old-photo", uri: "test://saved-photo" }], pdfs: [{ id: "old-pdf", revisionId: "r0", pdfStatus: "archived" }],
    marketplaceLink: { requestDraftId: "medium-quota-draft", publishedRequestId: null, linkedAt: null },
    projectExecutionDrafts: [],
  } as unknown as RevisionBundle;
}

class QuotaStorage implements AsyncKeyValueStorage {
  values = new Map<string, string>();
  capacityBytes = Number.POSITIVE_INFINITY;
  writes = 0;
  writeAttempts: string[] = [];
  get bytes(): number { return [...this.values.values()].reduce((n, v) => n + Buffer.byteLength(v), 0); }
  async getItem(key: string) { return this.values.get(key) ?? null; }
  async setItem(key: string, value: string) {
    this.writes += 1;
    this.writeAttempts.push(key);
    const after = this.bytes - Buffer.byteLength(this.values.get(key) ?? "") + Buffer.byteLength(value);
    if (after > this.capacityBytes) throw new Error("database or disk is full");
    this.values.set(key, value);
  }
  async removeItem(key: string) { this.values.delete(key); }
}

function seedLegacyRaw(storage: QuotaStorage) {
  const key = input("r1").draft.id;
  const versions: string[] = [];
  for (const id of ["r0", "r1"]) {
    const encoded = encodeConsumerRepairBundleForDurableStorage(input(id, false)) as Record<string, unknown>;
    encoded.estimateDraftRevisionState = input(id).estimateDraftRevisionState;
    const serializedBundle = JSON.stringify(encoded), checksum = stableEstimateRevisionChecksum(serializedBundle);
    const version = `${id}:content:${checksum}`;
    storage.values.set(prefix + durableRevisionRecordKey(key, version), JSON.stringify(createDurableEnvelope({
      key, version, previousVersion: versions[0] ?? null, checksum, serializedBundle,
    })));
    versions.push(version);
  }
  storage.values.set(prefix + durablePointerRecordKey(key), JSON.stringify({
    schemaVersion: "estimate_revision_durable_pointer_v1", currentVersion: versions[1], previousVersion: versions[0],
  }));
  storage.values.set(prefix + "__revision_index__:" + encodeURIComponent(key), JSON.stringify({
    schemaVersion: "estimate_revision_durable_revision_index_v1", versions,
  }));
  storage.values.set(prefix + "__logical_key_index__", JSON.stringify({
    schemaVersion: "estimate_revision_durable_logical_key_index_v1", keys: [key],
  }));
  return { key, currentVersion: versions[1], previousVersion: versions[0] };
}

describe("medium canonical histories within the existing native quota", () => {
  it("uses the existing codec below16MiB with full history, manual prices, rights, media and PDF parity", () => {
    const bundle = input("r2"), rawBytes = Buffer.byteLength(JSON.stringify(bundle));
    expect(rawBytes).toBeGreaterThan(CONSUMER_REPAIR_DURABLE_BUNDLE_COMPRESSION_MIN_BYTES);
    expect(rawBytes).toBeLessThan(16 * 1024 * 1024);
    const encoded = encodeConsumerRepairBundleForDurableStorage(bundle) as Record<string, unknown>;
    expect(encoded.schema).toBe("consumer_repair_bundle_zlib_v1");
    expect(Buffer.byteLength(JSON.stringify(encoded))).toBeLessThan(rawBytes / 10);
    const decoded = decodeConsumerRepairBundleFromDurableStorage(encoded)!;
    expect(decoded).toMatchObject(bundle);
    expect(decodeConsumerRepairBundleFromDurableStorage(encodeConsumerRepairBundleForDurableStorage(decoded))).toEqual(decoded);
  });

  it("leaves small and incompressible bodies in the compatible raw representation", () => {
    expect((encodeConsumerRepairBundleForDurableStorage(input("r1", false)) as Record<string, unknown>).schema).toBeUndefined();
    let state = 11939;
    const text = Array.from({ length: 330000 }, () => {
      state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
      return String.fromCharCode(32 + (state >>> 0) % 95);
    }).join("");
    const bundle = { ...input("r1", false), events: [{ id: "entropy", reason: text }] } as unknown as RevisionBundle;
    const encoded = encodeConsumerRepairBundleForDurableStorage(bundle) as Record<string, unknown>;
    expect(encoded.schema).toBeUndefined();
    const decoded = decodeConsumerRepairBundleFromDurableStorage(encoded)!;
    expect(decoded).toMatchObject(bundle);
    expect(decodeConsumerRepairBundleFromDurableStorage(encodeConsumerRepairBundleForDurableStorage(decoded))).toEqual(decoded);
  });

  it("commits a compressed child with byte-exact logical legacy envelopes within the native quota", async () => {
    const storage = new QuotaStorage(), seeded = seedLegacyRaw(storage), store = new AsyncStorageEstimateRevisionDurableStore(storage);
    const parent = (await store.readBundle(seeded.key))!;
    expect(readCommittedEstimateRevisionBundleVersion(parent, seeded.key)).toBe(seeded.currentVersion);
    expect(serializeRevisionBundle(parent).version).not.toBe(seeded.currentVersion);
    const child = input("r2"), compressedBytes = Buffer.byteLength(serializeRevisionBundle(child).serializedBundle);
    storage.capacityBytes = storage.bytes + compressedBytes * 2 + 8192;
    expect(storage.capacityBytes - storage.bytes).toBeLessThan(Buffer.byteLength(JSON.stringify(child)));
    const before = storage.values.get(prefix + durableRevisionRecordKey(seeded.key, seeded.currentVersion));
    const result = await store.writeBundleAtomically(seeded.key, seeded.currentVersion, child);
    expect(result).toMatchObject({ status: "WRITTEN", previousVersion: seeded.currentVersion });
    const physicalAfter = storage.values.get(prefix + durableRevisionRecordKey(seeded.key, seeded.currentVersion));
    expect(typeof before).toBe("string");
    expect(typeof physicalAfter).toBe("string");
    // The existing physical-record codec may compress the representation. The
    // complete decoded envelope, including its snapshot, checksum, timestamp
    // and CAS version, must remain byte-exact.
    const logicalAfter = decodeEstimateRevisionAsyncStorageRecord(physicalAfter!);
    expect(logicalAfter === before).toBe(true);
    expect(JSON.parse(logicalAfter).version).toBe(seeded.currentVersion);
    expect(JSON.parse(logicalAfter).checksum).toBe(JSON.parse(before!).checksum);
    expect(JSON.parse(logicalAfter).serializedBundle === JSON.parse(before!).serializedBundle).toBe(true);
    const reopened = (await new AsyncStorageEstimateRevisionDurableStore(storage).recoverLastValid(seeded.key))!;
    expect(reopened.estimateDraftRevisionState).toEqual(child.estimateDraftRevisionState);
    expect(reopened.items[0]).toMatchObject({ quantity: 35.5, unitPrice: 123.45, quantityEditedByConsumer: true, priceEditedByConsumer: true });
    for (const field of ["events", "pdfs", "media", "draft"] as const) expect(reopened[field]).toEqual(child[field]);
    const writes = storage.writes;
    expect(await store.writeBundleAtomically(seeded.key, seeded.currentVersion, child)).toMatchObject({ status: "FAILED", error: { code: "CONFLICT" } });
    expect(storage.writes).toBe(writes);
    expect(await store.listKeys()).toEqual([seeded.key]);
  });

  it("keeps a permanent quota refusal as failure with the exact previous commit and no automatic retry", async () => {
    const storage = new QuotaStorage(), seeded = seedLegacyRaw(storage), store = new AsyncStorageEstimateRevisionDurableStore(storage);
    const originalRecords = new Map(storage.values);
    // Refuse every physical write, including a smaller compressed replacement.
    // A quota equal to the old RAW size is recoverable by the existing codec.
    storage.capacityBytes = 0;
    expect(await store.writeBundleAtomically(seeded.key, seeded.currentVersion, input("r2"))).toMatchObject({ status: "FAILED", error: { code: "TRANSACTION_FAILED" } });
    // One failed index write and one failed reclaim attempt; the original
    // write is never retried when no representation space was reclaimed.
    expect(storage.writeAttempts).toEqual([
      prefix + "__revision_index__:" + encodeURIComponent(seeded.key),
      prefix + durableRevisionRecordKey(seeded.key, seeded.currentVersion),
    ]);
    expect(storage.writes).toBe(2);
    expect(storage.values.size).toBe(originalRecords.size);
    expect([...originalRecords].every(([key, value]) => storage.values.get(key) === value)).toBe(true);
    expect(readCommittedEstimateRevisionBundleVersion((await store.recoverLastValid(seeded.key))!, seeded.key)).toBe(seeded.currentVersion);
  });

  it.each(["after_revision_write", "before_pointer_switch", "after_pointer_switch", "before_read_back", "before_orphan_cleanup"] as DurableFailurePoint[])(
    "retains exact native recovery across interruption at %s", async point => {
      const storage = new QuotaStorage(), seeded = seedLegacyRaw(storage);
      const store = new AsyncStorageEstimateRevisionDurableStore(storage, { failureInjector: at => {
        if (at === point) throw new Error("process interrupted");
      } });
      const result = await store.writeBundleAtomically(seeded.key, seeded.currentVersion, input("r2"));
      const switched = ["after_pointer_switch", "before_read_back", "before_orphan_cleanup"].includes(point);
      expect(result.status).toBe(switched ? "WRITTEN" : "FAILED");
      const reopened = (await new AsyncStorageEstimateRevisionDurableStore(storage).recoverLastValid(seeded.key))!;
      expect(reopened.estimateDraftRevisionState!.currentRevisionId).toBe(switched ? "r2" : "r1");
      expect(reopened.estimateDraftRevisionState!.revisions.map(r => r.revisionId)).toEqual(switched ? ["r0", "r1", "r2"] : ["r0", "r1"]);
    },
  );
});
