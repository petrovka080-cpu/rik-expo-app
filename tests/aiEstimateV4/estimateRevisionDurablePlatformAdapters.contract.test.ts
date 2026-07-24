import { IDBFactory } from "fake-indexeddb";

import {
  ESTIMATE_REVISION_DB_NAME,
  ESTIMATE_REVISION_IDB_STORE_NAME,
  IndexedDbEstimateRevisionDurableStore,
  SQLiteEstimateRevisionDurableStore,
  type RevisionBundle,
  type SQLiteDatabaseLike,
} from "../../src/lib/platform/estimateRevisionDurableStore";
import { sanitizeConsumerRepairTransactionalBundle } from "../../src/lib/platform/consumerRepairTransactionalDurableBridge";

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
