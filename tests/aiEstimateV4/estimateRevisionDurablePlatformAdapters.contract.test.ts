import { IDBFactory } from "fake-indexeddb";
import { strFromU8, strToU8, zlibSync } from "fflate";

import {
  ESTIMATE_REVISION_DB_NAME,
  ESTIMATE_REVISION_IDB_STORE_NAME,
  IndexedDbEstimateRevisionDurableStore,
  migrateLegacyEstimateRevisionBundle,
  SQLiteEstimateRevisionDurableStore,
  type RevisionBundle,
  type SQLiteDatabaseLike,
} from "../../src/lib/platform/estimateRevisionDurableStore";
import { flushTransactionalConsumerRepairWrites, queueTransactionalConsumerRepairBundleWrite, sanitizeConsumerRepairTransactionalBundle, setConsumerRepairTransactionalStoreForTests } from "../../src/lib/platform/consumerRepairTransactionalDurableBridge";
import { CONSUMER_REPAIR_DURABLE_MAX_DECODED_BUNDLE_BYTES, decodeConsumerRepairBundleFromDurableStorage, encodeConsumerRepairBundleForDurableStorage } from "../../src/lib/platform/compactConsumerRepairDurableState";
import { createDurableEnvelope, estimateRevisionUtf8ByteLength, parseDurableEnvelopeBundle, readCommittedEstimateRevisionBundleVersion, serializeRevisionBundle, stableEstimateRevisionChecksum } from "../../src/lib/platform/estimateRevisionDurableStore.contract";
import { AsyncStorageEstimateRevisionDurableStore } from "../../src/lib/platform/estimateRevisionDurableStore.asyncStorage";

function bundle(version: "r1" | "r2"): RevisionBundle {
  return {
    draft: {
      id: "platform-adapter-estimate",
      consumerUserId: "platform-adapter-user",
      status: "draft",
      title: "Platform adapter",
      problemText: "Platform adapter",
      repairType: "road_construction",
      createdAt: "2026-07-24T00:00:00.000Z",
      updatedAt: version === "r1" ? "2026-07-24T00:00:00.000Z" : "2026-07-24T00:01:00.000Z",
    },
    items: [{ id: "row-1", quantity: version === "r1" ? 1 : 2, unitPrice: 125 }],
    estimateDraftRevisionState: {
      estimateDraftId: "platform-adapter-estimate",
      currentRevisionId: version,
      revisions: [{ revisionId: version, boq: { rows: [{ rowId: "row-1" }] } }],
      diffs: [],
    },
    media: [],
    pdfs: [],
    projectExecutionDrafts: [],
    marketplaceLink: {
      requestDraftId: "platform-adapter-estimate",
      publishedRequestId: null,
      linkedAt: null,
    },
    events: [],
  } as unknown as RevisionBundle;
}

type PointerRow = {
  current_version: string;
  previous_version: string | null;
};

class TransactionalSQLiteDouble implements SQLiteDatabaseLike {
  records = new Map<string, string>();
  pointers = new Map<string, PointerRow>();
  failNextMutation = false;

  async execAsync(): Promise<void> {
    // Schema creation is accepted by the contract double.
  }

  async withExclusiveTransactionAsync<T>(
    task: (transaction: SQLiteDatabaseLike) => Promise<T>,
  ): Promise<T> {
    const recordsBefore = new Map(this.records);
    const pointersBefore = new Map(this.pointers);
    try {
      return await task(this);
    } catch (error) {
      this.records = recordsBefore;
      this.pointers = pointersBefore;
      throw error;
    }
  }

  async getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null> {
    const key = String(params[0] ?? "");
    if (sql.includes("JOIN estimate_revision_records")) {
      const pointer = this.pointers.get(key);
      const envelope = pointer
        ? this.records.get(`${key}\u0000${pointer.current_version}`)
        : null;
      return envelope ? { envelope_json: envelope } as T : null;
    }
    if (sql.includes("FROM estimate_revision_pointers")) {
      return (this.pointers.get(key) ?? null) as T | null;
    }
    if (sql.includes("FROM estimate_revision_records")) {
      const version = String(params[1] ?? "");
      const envelope = this.records.get(`${key}\u0000${version}`);
      return envelope ? { envelope_json: envelope } as T : null;
    }
    return null;
  }

  async getAllAsync<T>(): Promise<T[]> {
    return [...this.pointers.keys()]
      .sort()
      .map((store_key) => ({ store_key }) as T);
  }

  async runAsync(sql: string, ...params: unknown[]): Promise<unknown> {
    if (this.failNextMutation) {
      this.failNextMutation = false;
      throw new Error("SQLITE_INJECTED_MUTATION_FAILURE");
    }
    const key = String(params[0] ?? "");
    if (sql.includes("INSERT OR REPLACE INTO estimate_revision_records")) {
      this.records.set(`${key}\u0000${String(params[1])}`, String(params[2]));
    } else if (sql.includes("INSERT INTO estimate_revision_pointers")) {
      this.pointers.set(key, {
        current_version: String(params[1]),
        previous_version: params[2] == null ? null : String(params[2]),
      });
    } else if (sql.includes("UPDATE estimate_revision_pointers")) {
      this.pointers.set(String(params[1]), {
        current_version: String(params[0]),
        previous_version: null,
      });
    } else if (sql.includes("DELETE FROM estimate_revision_records")) {
      const retained = new Set(params.slice(1).map(String));
      for (const recordKey of this.records.keys()) {
        if (recordKey.startsWith(`${key}\u0000`)) {
          const version = recordKey.slice(key.length + 1);
          if (retained.size === 0 || !retained.has(version)) this.records.delete(recordKey);
        }
      }
    }
    return {};
  }
}

describe("transactional platform durable adapters", () => {
  afterEach(async () => {
    await flushTransactionalConsumerRepairWrites();
    setConsumerRepairTransactionalStoreForTests(null);
  });

  function largeCanonicalBundle(version: "r1" | "r2"): RevisionBundle {
    const base = bundle(version);
    const needs = Array.from({ length: 1933 }, (_, index) => ({
      rowId: `canonical-source-${index}`, quantity: index === 0 ? 72 : 0,
      calculationTrace: `source-${index}:Русское исходное уточнение 🧪;` + "TEST: original source fact remains unknown; ".repeat(245),
      sourceParameters: { missingParameterIds: [`actual_source_${index}`],
        canonicalPurchaseBalance: { consumptionShortage: "20", procurementReady: false },
        canonicalCostTreatment: "INFORMATIONAL_SCOPE", includedInEstimate: false },
    }));
    return { ...base, estimateDraftRevisionState: {
      ...base.estimateDraftRevisionState!,
      revisions: (version === "r1" ? ["r1"] : ["r1", "r2"]).map(id => ({
        revisionId: id, boq: { rows: needs }, params: { actual_source: "TEST" },
        missingInputs: needs.map(row => row.sourceParameters.missingParameterIds[0]),
      })),
      diffs: version === "r2" ? [{ fromRevisionId: "r1", toRevisionId: "r2", changedRows: ["canonical-source-0"] }] : [],
    } } as unknown as RevisionBundle;
  }

  test("upgrades a valid large RAW SQLite predecessor using its actual committed CAS token", async () => {
    const parent = largeCanonicalBundle("r1");
    const oldEncoded = encodeConsumerRepairBundleForDurableStorage(bundle("r1")) as Record<string, unknown>;
    oldEncoded.estimateDraftRevisionState = parent.estimateDraftRevisionState;
    const oldRaw = JSON.stringify(oldEncoded);
    expect(estimateRevisionUtf8ByteLength(oldRaw)).toBeGreaterThan(16 * 1024 * 1024);
    expect(estimateRevisionUtf8ByteLength(oldRaw)).toBeLessThan(32 * 1024 * 1024);
    const oldChecksum = stableEstimateRevisionChecksum(oldRaw);
    const oldVersion = `r1:content:${oldChecksum}`;
    const key = parent.draft.id;
    const database = new TransactionalSQLiteDouble();
    database.records.set(`${key}\u0000${oldVersion}`, JSON.stringify(createDurableEnvelope({ key, version: oldVersion, previousVersion: null, checksum: oldChecksum, serializedBundle: oldRaw })));
    database.pointers.set(key, { current_version: oldVersion, previous_version: null });
    const store = new SQLiteEstimateRevisionDurableStore(async () => database);
    const loaded = (await store.readBundle(key))!;
    expect(readCommittedEstimateRevisionBundleVersion(loaded, key)).toBe(oldVersion);
    expect(readCommittedEstimateRevisionBundleVersion(loaded, "other-key")).toBeNull();
    expect(readCommittedEstimateRevisionBundleVersion({ ...loaded }, key)).toBeNull();
    expect(serializeRevisionBundle(loaded).version).not.toBe(oldVersion);
    // The independent legacy migration path also compares with the actual RAW
    // predecessor, rather than the version invented by the current encoder.
    const migrationDatabase = new TransactionalSQLiteDouble();
    migrationDatabase.records = new Map(database.records);
    migrationDatabase.pointers = new Map(database.pointers);
    const migrationStore = new SQLiteEstimateRevisionDurableStore(async () => migrationDatabase);
    const legacyValues = new Map([["legacy-bundle", JSON.stringify(loaded)]]);
    expect(await migrateLegacyEstimateRevisionBundle({ key, legacyStorageKey: "legacy-bundle", pointerStorageKey: "legacy-pointer",
      storage: { getItem: slot => legacyValues.get(slot) ?? null, setItem: (slot, value) => { legacyValues.set(slot, value); },
        removeItem: slot => { legacyValues.delete(slot); } }, durableStore: migrationStore,
    })).toMatchObject({ status: "MIGRATED", version: serializeRevisionBundle(loaded).version });
    expect(legacyValues.has("legacy-bundle")).toBe(false);
    expect(migrationDatabase.records.size).toBe(2);
    expect(stableEstimateRevisionChecksum(JSON.stringify((await migrationStore.readBundle(key))!.estimateDraftRevisionState)))
      .toBe(stableEstimateRevisionChecksum(JSON.stringify(parent.estimateDraftRevisionState)));
    setConsumerRepairTransactionalStoreForTests(store);
    const child = largeCanonicalBundle("r2");
    const result = await queueTransactionalConsumerRepairBundleWrite({ bundle: child, storage: null });
    expect(result).toMatchObject({ status: "WRITTEN", previousVersion: oldVersion });
    const reopened = (await store.readBundle(key))!;
    expect(stableEstimateRevisionChecksum(JSON.stringify(reopened.estimateDraftRevisionState)))
      .toBe(stableEstimateRevisionChecksum(JSON.stringify(child.estimateDraftRevisionState)));
    expect(reopened.estimateDraftRevisionState!.revisions.map(revision => revision.revisionId)).toEqual(["r1", "r2"]);
    expect(database.records.size).toBe(2);
    expect(await store.writeBundleAtomically(key, oldVersion, child)).toMatchObject({ status: "FAILED", error: { code: "CONFLICT" } });
  });

  test("stores and reads the complete canonical history within the unchanged native 16 MiB capacity", async () => {
    const values = new Map<string, string>();
    const store = new AsyncStorageEstimateRevisionDurableStore({
      getItem: async key => values.get(key) ?? null,
      setItem: async (key, value) => { values.set(key, value); },
      removeItem: async key => { values.delete(key); },
    });
    const input = largeCanonicalBundle("r2");
    const serialized = serializeRevisionBundle(input);
    expect(estimateRevisionUtf8ByteLength(serialized.serializedBundle)).toBeLessThan(16 * 1024 * 1024);
    expect(JSON.parse(serialized.serializedBundle).schema).toBe("consumer_repair_bundle_zlib_v1");
    const result = await store.writeBundleAtomically(input.draft.id, null, input);
    expect(result.status).toBe("WRITTEN");
    const reopened = (await store.recoverLastValid(input.draft.id))!;
    expect(stableEstimateRevisionChecksum(JSON.stringify(reopened.estimateDraftRevisionState)))
      .toBe(stableEstimateRevisionChecksum(JSON.stringify(input.estimateDraftRevisionState)));
    expect(reopened.items[0]).toMatchObject(input.items[0]);
  });

  test("rejects corrupt, oversized, truncated and nested compressed bodies and invalid envelope identity", () => {
    const encoded = encodeConsumerRepairBundleForDurableStorage(largeCanonicalBundle("r1")) as Record<string, unknown>;
    expect(decodeConsumerRepairBundleFromDurableStorage({ ...bundle("r1"), schema: "consumer_repair_bundle_zlib_v2" })).toBeNull();
    for (const patch of [
      { rawByteLength: Number(encoded.rawByteLength) - 1 },
      { rawByteLength: Number(encoded.rawByteLength) + 1 },
      { rawByteLength: CONSUMER_REPAIR_DURABLE_MAX_DECODED_BUNDLE_BYTES + 1 },
      { compressedByteLength: Number(encoded.compressedByteLength) + 1 },
      { rawChecksum: "0".repeat(16) }, { requestDraftId: "other-key" },
      { payload: "!!!!" },
    ]) expect(decodeConsumerRepairBundleFromDurableStorage({ ...encoded, ...patch })).toBeNull();
    const nestedRaw = JSON.stringify(encoded);
    const nestedBytes = zlibSync(strToU8(nestedRaw), { level: 6 });
    expect(decodeConsumerRepairBundleFromDurableStorage({ ...encoded, rawByteLength: strToU8(nestedRaw).length,
      rawChecksum: stableEstimateRevisionChecksum(nestedRaw), compressedByteLength: nestedBytes.length,
      payload: Buffer.from(nestedBytes).toString("base64") })).toBeNull();
    const futureNestedRaw = JSON.stringify({ ...bundle("r1"), schema: "consumer_repair_bundle_zlib_v2" });
    const futureNestedBytes = zlibSync(strToU8(futureNestedRaw), { level: 6 });
    expect(decodeConsumerRepairBundleFromDurableStorage({ ...encoded, rawByteLength: strToU8(futureNestedRaw).length,
      rawChecksum: stableEstimateRevisionChecksum(futureNestedRaw), compressedByteLength: futureNestedBytes.length,
      payload: Buffer.from(futureNestedBytes).toString("base64") })).toBeNull();
    const serialized = serializeRevisionBundle(bundle("r1"));
    const envelope = createDurableEnvelope({ key: "platform-adapter-estimate", ...serialized, previousVersion: null });
    expect(parseDurableEnvelopeBundle({ ...envelope, version: "" }, "platform-adapter-estimate")).toBeNull();
    expect(parseDurableEnvelopeBundle({ ...envelope, key: "other-key" }, "other-key")).toBeNull();
  });

  test("preserves 2/3/4-byte characters across streamed UTF-8 boundaries and rejects malformed bytes", () => {
    const wrapper = (rawBytes: Uint8Array, decodedRaw: string) => {
      const compressed = zlibSync(rawBytes, { level: 6 });
      return { schema: "consumer_repair_bundle_zlib_v1", codec: "zlib+base64", requestDraftId: "platform-adapter-estimate",
        rawByteLength: rawBytes.length, compressedByteLength: compressed.length,
        rawChecksum: stableEstimateRevisionChecksum(decodedRaw), payload: Buffer.from(compressed).toString("base64") };
    };
    for (const character of ["я", "界", "🧪"]) {
      const prefixLength = strToU8(JSON.stringify({ ...bundle("r1"), unicodeEvidence: "" }).split('"unicodeEvidence":"')[0] + '"unicodeEvidence":"').length;
      const input = { ...bundle("r1"), unicodeEvidence: "x".repeat(16 * 1024 - 1 - prefixLength) + character + "конец" };
      const raw = JSON.stringify(input);
      expect(decodeConsumerRepairBundleFromDurableStorage(wrapper(strToU8(raw), raw)))
        .toMatchObject({ unicodeEvidence: input.unicodeEvidence });
    }
    const shell = JSON.stringify({ ...bundle("r1"), unicodeEvidence: "" });
    const emptyFieldOffset = shell.lastIndexOf('""') + 1;
    for (const invalid of [[0xc2, 0xff], [0xed, 0xa0, 0x80], [0xe2, 0x82]]) {
      const before = strToU8(shell.slice(0, emptyFieldOffset));
      const after = strToU8(shell.slice(emptyFieldOffset));
      const bytes = new Uint8Array(before.length + invalid.length + after.length);
      bytes.set(before); bytes.set(invalid, before.length); bytes.set(after, before.length + invalid.length);
      let decodedRaw = "";
      try { decodedRaw = strFromU8(bytes); } catch { /* An incomplete tail is invalid in both library paths. */ }
      expect(decodeConsumerRepairBundleFromDurableStorage(wrapper(bytes, decodedRaw))).toBeNull();
    }
  });

  test("persists attachment metadata without binaries, signed URLs, or secret fields", () => {
    const input = {
      ...bundle("r1"),
      estimateAttachments: [{
        id: "attachment-1",
        storageReference: "https://private.example/file?token=secret",
        thumbnailReference: "data:image/png;base64,AAAA",
        contentHash: "sha256:attachment",
        fileName: "specification.pdf",
      }],
      sourceSecrets: {
        accessToken: "secret-token",
        base64: "AAAA",
        retainedMetadata: "safe",
      },
      normativeSource: {
        normSourceReference: "https://minstroy.gov.kg/ru/kyzmat/443/show",
      },
    } as unknown as RevisionBundle;

    const sanitized = sanitizeConsumerRepairTransactionalBundle(input) as RevisionBundle & {
      sourceSecrets?: Record<string, unknown>;
    };
    expect(sanitized.estimateAttachments?.[0]).toMatchObject({
      id: "attachment-1",
      storageReference: "redacted://private-reference-removed",
      thumbnailReference: null,
      contentHash: "sha256:attachment",
      fileName: "specification.pdf",
    });
    expect(sanitized.sourceSecrets).toEqual({ retainedMetadata: "safe" });
    expect((sanitized as unknown as { normativeSource: { normSourceReference: string } })
      .normativeSource.normSourceReference).toBe(
      "https://minstroy.gov.kg/ru/kyzmat/443/show",
    );
    expect(JSON.stringify(sanitized)).not.toContain("secret-token");
    expect(JSON.stringify(sanitized)).not.toContain("base64,AAAA");
  });

  test("IndexedDB commits R1/R2 in real readwrite transactions and rejects stale writers", async () => {
    const indexedDb = new IDBFactory();
    const store = new IndexedDbEstimateRevisionDurableStore(indexedDb);

    const r1 = await store.writeBundleAtomically("platform-adapter-estimate", null, bundle("r1"));
    expect(r1).toMatchObject({ status: "WRITTEN", version: expect.stringContaining("r1:content:") });
    if (r1.status === "FAILED") throw new Error(r1.error.message);
    const r2 = await store.writeBundleAtomically("platform-adapter-estimate", r1.version, bundle("r2"));
    expect(r2).toMatchObject({
      status: "WRITTEN",
      version: expect.stringContaining("r2:content:"),
      previousVersion: r1.version,
    });
    if (r2.status === "FAILED") throw new Error(r2.error.message);
    expect(await store.writeBundleAtomically("platform-adapter-estimate", "r1", bundle("r2")))
      .toMatchObject({ status: "FAILED", error: { code: "CONFLICT", currentVersion: r2.version } });
    expect((await store.readBundle("platform-adapter-estimate"))
      ?.estimateDraftRevisionState?.currentRevisionId).toBe("r2");
    expect(await store.listKeys()).toEqual(["platform-adapter-estimate"]);

    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDb.open(ESTIMATE_REVISION_DB_NAME, 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const count = await new Promise<number>((resolve, reject) => {
      const request = database.transaction(
        ESTIMATE_REVISION_IDB_STORE_NAME,
        "readonly",
      ).objectStore(ESTIMATE_REVISION_IDB_STORE_NAME).count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    expect(count).toBe(3); // current pointer plus retained R1 and R2
    database.close();
  });

  test("SQLite commits under an exclusive transaction and rolls back a rejected R2", async () => {
    const database = new TransactionalSQLiteDouble();
    const store = new SQLiteEstimateRevisionDurableStore(async () => database);

    const r1 = await store.writeBundleAtomically("platform-adapter-estimate", null, bundle("r1"));
    expect(r1).toMatchObject({ status: "WRITTEN", version: expect.stringContaining("r1:content:") });
    if (r1.status === "FAILED") throw new Error(r1.error.message);
    database.failNextMutation = true;
    expect(await store.writeBundleAtomically("platform-adapter-estimate", r1.version, bundle("r2")))
      .toMatchObject({ status: "FAILED", error: { code: "TRANSACTION_FAILED" } });
    expect((await store.readBundle("platform-adapter-estimate"))
      ?.estimateDraftRevisionState?.currentRevisionId).toBe("r1");
    expect(database.records.size).toBe(1);

    const r2 = await store.writeBundleAtomically("platform-adapter-estimate", r1.version, bundle("r2"));
    expect(r2).toMatchObject({
      status: "WRITTEN",
      version: expect.stringContaining("r2:content:"),
      previousVersion: r1.version,
    });
    if (r2.status === "FAILED") throw new Error(r2.error.message);
    expect(database.records.size).toBe(2);
    expect(await store.listKeys()).toEqual(["platform-adapter-estimate"]);
    expect(await store.writeBundleAtomically("platform-adapter-estimate", r2.version, bundle("r2")))
      .toMatchObject({ status: "UNCHANGED", version: r2.version });
  });
});
