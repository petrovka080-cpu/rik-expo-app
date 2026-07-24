import {
  ESTIMATE_REVISION_DB_NAME,
  ESTIMATE_REVISION_IDB_STORE_NAME,
  createDurableEnvelope,
  decodeDurablePointerKey,
  decodeDurableRecordVersion,
  durablePointerRecordKey,
  durableRevisionRecordKey,
  durableRevisionRecordPrefix,
  durableWriteFailure,
  messageFromDurableError,
  parseDurableEnvelopeBundle,
  serializeRevisionBundle,
  stableEstimateRevisionChecksum,
  type DurableEnvelope,
  type DurablePointer,
  type DurableWriteResult,
  type EstimateRevisionDurableStore,
  type RevisionBundle,
} from "./estimateRevisionDurableStore.contract";

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("INDEXED_DB_REQUEST_FAILED"));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("INDEXED_DB_TRANSACTION_ABORTED"));
    transaction.onerror = () => reject(transaction.error ?? new Error("INDEXED_DB_TRANSACTION_FAILED"));
  });
}

export class IndexedDbEstimateRevisionDurableStore implements EstimateRevisionDurableStore {
  private readonly databasePromise: Promise<IDBDatabase>;

  constructor(indexedDb: IDBFactory = globalThis.indexedDB) {
    this.databasePromise = new Promise((resolve, reject) => {
      const request = indexedDb.open(ESTIMATE_REVISION_DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(ESTIMATE_REVISION_IDB_STORE_NAME)) {
          request.result.createObjectStore(ESTIMATE_REVISION_IDB_STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("INDEXED_DB_OPEN_FAILED"));
    });
  }

  async readBundle(key: string): Promise<RevisionBundle | null> {
    const database = await this.databasePromise;
    const transaction = database.transaction(ESTIMATE_REVISION_IDB_STORE_NAME, "readonly");
    const objectStore = transaction.objectStore(ESTIMATE_REVISION_IDB_STORE_NAME);
    const pointer = await requestResult(
      objectStore.get(durablePointerRecordKey(key)),
    ) as DurablePointer | undefined;
    if (!pointer) {
      await transactionDone(transaction);
      return null;
    }
    const envelope = await requestResult(
      objectStore.get(durableRevisionRecordKey(key, pointer.currentVersion)),
    ) as DurableEnvelope | undefined;
    await transactionDone(transaction);
    return parseDurableEnvelopeBundle(envelope, key);
  }

  async writeBundleAtomically(
    key: string,
    expectedVersion: string | null,
    bundle: RevisionBundle,
  ): Promise<DurableWriteResult> {
    let serialized: ReturnType<typeof serializeRevisionBundle>;
    try {
      serialized = serializeRevisionBundle(bundle);
    } catch (error) {
      return durableWriteFailure("SERIALIZATION_FAILED", messageFromDurableError(error), null);
    }
    const database = await this.databasePromise;
    const transaction = database.transaction(ESTIMATE_REVISION_IDB_STORE_NAME, "readwrite");
    const objectStore = transaction.objectStore(ESTIMATE_REVISION_IDB_STORE_NAME);
    try {
      const pointer = await requestResult(
        objectStore.get(durablePointerRecordKey(key)),
      ) as DurablePointer | undefined;
      const currentVersion = pointer?.currentVersion ?? null;
      if (currentVersion !== expectedVersion) {
        transaction.abort();
        try {
          await transactionDone(transaction);
        } catch {
          // Abort is expected for a compare-and-swap conflict.
        }
        return durableWriteFailure("CONFLICT", "Durable revision compare-and-swap conflict.", currentVersion);
      }
      if (currentVersion === serialized.version) {
        const existing = await requestResult(
          objectStore.get(durableRevisionRecordKey(key, serialized.version)),
        ) as DurableEnvelope | undefined;
        if (existing?.checksum === serialized.checksum && parseDurableEnvelopeBundle(existing, key)) {
          transaction.abort();
          try {
            await transactionDone(transaction);
          } catch {
            // No mutation is required for an idempotent write.
          }
          return {
            status: "UNCHANGED",
            version: serialized.version,
            previousVersion: pointer?.previousVersion ?? null,
            checksum: serialized.checksum,
          };
        }
      }
      const stagedEnvelope = createDurableEnvelope({
        key,
        version: serialized.version,
        previousVersion: currentVersion,
        checksum: serialized.checksum,
        serializedBundle: serialized.serializedBundle,
      });
      await requestResult(objectStore.put(
        stagedEnvelope,
        durableRevisionRecordKey(key, serialized.version),
      ));
      const verifiedStage = await requestResult(
        objectStore.get(durableRevisionRecordKey(key, serialized.version)),
      ) as DurableEnvelope | undefined;
      if (
        verifiedStage?.checksum !== serialized.checksum ||
        !parseDurableEnvelopeBundle(verifiedStage, key)
      ) throw new Error("INDEXED_DB_STAGED_REVISION_CHECKSUM_MISMATCH");
      objectStore.put({
        schemaVersion: "estimate_revision_durable_pointer_v1",
        currentVersion: serialized.version,
        previousVersion: currentVersion,
      } satisfies DurablePointer, durablePointerRecordKey(key));
      await transactionDone(transaction);
      const readBack = await this.readBundle(key);
      if (
        !readBack ||
        stableEstimateRevisionChecksum(JSON.stringify(readBack)) !== serialized.checksum
      ) {
        return durableWriteFailure(
          "READ_BACK_FAILED",
          "Committed revision failed read-back verification.",
          currentVersion,
        );
      }
      await this.deleteOrphans(key);
      return {
        status: "WRITTEN",
        version: serialized.version,
        previousVersion: currentVersion,
        checksum: serialized.checksum,
      };
    } catch (error) {
      try {
        transaction.abort();
      } catch {
        // The transaction may already be terminal.
      }
      return durableWriteFailure("TRANSACTION_FAILED", messageFromDurableError(error), expectedVersion);
    }
  }

  async recoverLastValid(key: string): Promise<RevisionBundle | null> {
    const database = await this.databasePromise;
    const read = database.transaction(ESTIMATE_REVISION_IDB_STORE_NAME, "readonly");
    const objectStore = read.objectStore(ESTIMATE_REVISION_IDB_STORE_NAME);
    const pointer = await requestResult(
      objectStore.get(durablePointerRecordKey(key)),
    ) as DurablePointer | undefined;
    if (!pointer) {
      await transactionDone(read);
      return null;
    }
    const currentEnvelope = await requestResult(
      objectStore.get(durableRevisionRecordKey(key, pointer.currentVersion)),
    ) as DurableEnvelope | undefined;
    const previousEnvelope = pointer.previousVersion
      ? await requestResult(
        objectStore.get(durableRevisionRecordKey(key, pointer.previousVersion)),
      ) as DurableEnvelope | undefined
      : undefined;
    await transactionDone(read);
    const current = parseDurableEnvelopeBundle(currentEnvelope, key);
    if (current) return current;
    const previous = parseDurableEnvelopeBundle(previousEnvelope, key);
    if (!previous || !pointer.previousVersion) return null;
    const write = database.transaction(ESTIMATE_REVISION_IDB_STORE_NAME, "readwrite");
    write.objectStore(ESTIMATE_REVISION_IDB_STORE_NAME).put({
      schemaVersion: "estimate_revision_durable_pointer_v1",
      currentVersion: pointer.previousVersion,
      previousVersion: null,
    } satisfies DurablePointer, durablePointerRecordKey(key));
    await transactionDone(write);
    await this.deleteOrphans(key);
    return previous;
  }

  async deleteOrphans(key: string): Promise<void> {
    const database = await this.databasePromise;
    const transaction = database.transaction(ESTIMATE_REVISION_IDB_STORE_NAME, "readwrite");
    const objectStore = transaction.objectStore(ESTIMATE_REVISION_IDB_STORE_NAME);
    const pointer = await requestResult(
      objectStore.get(durablePointerRecordKey(key)),
    ) as DurablePointer | undefined;
    const retained = new Set(
      [pointer?.currentVersion, pointer?.previousVersion].filter((value): value is string => Boolean(value)),
    );
    const keys = await requestResult(objectStore.getAllKeys());
    const prefix = durableRevisionRecordPrefix(key);
    for (const rawKey of keys) {
      if (
        typeof rawKey === "string" &&
        rawKey.startsWith(prefix) &&
        !retained.has(decodeDurableRecordVersion(rawKey, prefix))
      ) objectStore.delete(rawKey);
    }
    await transactionDone(transaction);
  }

  async listKeys(): Promise<string[]> {
    const database = await this.databasePromise;
    const transaction = database.transaction(ESTIMATE_REVISION_IDB_STORE_NAME, "readonly");
    const keys = await requestResult(
      transaction.objectStore(ESTIMATE_REVISION_IDB_STORE_NAME).getAllKeys(),
    );
    await transactionDone(transaction);
    return keys
      .filter((key): key is string => typeof key === "string")
      .map(decodeDurablePointerKey)
      .filter((key): key is string => key != null)
      .sort();
  }
}
