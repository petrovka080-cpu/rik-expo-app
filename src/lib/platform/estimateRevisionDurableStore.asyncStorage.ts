import {
  ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES,
  createDurableEnvelope,
  durablePointerRecordKey,
  durableRevisionRecordKey,
  durableWriteFailure,
  durableWriteErrorCode,
  messageFromDurableError,
  parseDurableEnvelopeBundle,
  serializeRevisionBundle,
  type DurableEnvelope,
  type DurableFailureInjector,
  type DurableFailurePoint,
  type DurablePointer,
  type DurableWriteResult,
  type EstimateRevisionDurableStore,
  type RevisionBundle,
} from "./estimateRevisionDurableStore.contract";

export type AsyncKeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
};

const STORAGE_PREFIX = "rik.estimate_revision_durable.v1:";

function storageKey(recordKey: string): string {
  return `${STORAGE_PREFIX}${recordKey}`;
}

const LOGICAL_KEY_INDEX_STORAGE_KEY = storageKey("__logical_key_index__");
const REVISION_INDEX_STORAGE_KEY_PREFIX = storageKey("__revision_index__:");

type DurableLogicalKeyIndex = {
  schemaVersion: "estimate_revision_durable_logical_key_index_v1";
  keys: string[];
};

type DurableRevisionIndex = {
  schemaVersion: "estimate_revision_durable_revision_index_v1";
  versions: string[];
};

function revisionIndexStorageKey(key: string): string {
  return `${REVISION_INDEX_STORAGE_KEY_PREFIX}${encodeURIComponent(key)}`;
}

function parseRecord<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as T;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Crash-safe native fallback for binaries that predate ExpoSQLite.
 *
 * Revision envelopes are immutable and written/verified first. The single
 * pointer key is the commit point, so a crash before it leaves only an orphan,
 * while a crash after it exposes a fully persisted revision. Per-key queues
 * serialize compare-and-swap writers inside the React Native JS runtime.
 */
export class AsyncStorageEstimateRevisionDurableStore
implements EstimateRevisionDurableStore {
  private readonly queues = new Map<string, Promise<void>>();
  private logicalKeyIndexQueue: Promise<void> = Promise.resolve();
  private failureInjector: DurableFailureInjector | null;

  constructor(
    private readonly storage: AsyncKeyValueStorage,
    input: {
      failureInjector?: DurableFailureInjector | null;
    } = {},
  ) {
    this.failureInjector = input.failureInjector ?? null;
  }

  setFailureInjector(injector: DurableFailureInjector | null): void {
    this.failureInjector = injector;
  }

  private inject(point: DurableFailurePoint): void {
    this.failureInjector?.(point);
  }

  private async withKeyQueue<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(key) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = previous.then(() => gate);
    this.queues.set(key, tail);
    await previous;
    try {
      return await task();
    } finally {
      release();
      if (this.queues.get(key) === tail) this.queues.delete(key);
    }
  }

  private async withLogicalKeyIndexQueue<T>(task: () => Promise<T>): Promise<T> {
    const previous = this.logicalKeyIndexQueue;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.logicalKeyIndexQueue = previous.then(() => gate);
    await previous;
    try {
      return await task();
    } finally {
      release();
    }
  }

  private async readLogicalKeyIndex(): Promise<string[]> {
    const index = parseRecord<DurableLogicalKeyIndex>(
      await this.storage.getItem(LOGICAL_KEY_INDEX_STORAGE_KEY),
    );
    if (
      index?.schemaVersion !== "estimate_revision_durable_logical_key_index_v1" ||
      !Array.isArray(index.keys)
    ) {
      return [];
    }
    return [...new Set(index.keys.filter((key): key is string =>
      typeof key === "string" && key.length > 0
    ))].sort();
  }

  private async ensureLogicalKeyIndexed(key: string): Promise<void> {
    await this.withLogicalKeyIndexQueue(async () => {
      const keys = await this.readLogicalKeyIndex();
      if (keys.includes(key)) return;
      await this.storage.setItem(
        LOGICAL_KEY_INDEX_STORAGE_KEY,
        JSON.stringify({
          schemaVersion: "estimate_revision_durable_logical_key_index_v1",
          keys: [...keys, key].sort(),
        } satisfies DurableLogicalKeyIndex),
      );
    });
  }

  private async readRevisionIndex(key: string): Promise<string[]> {
    const index = parseRecord<DurableRevisionIndex>(
      await this.storage.getItem(revisionIndexStorageKey(key)),
    );
    if (
      index?.schemaVersion !== "estimate_revision_durable_revision_index_v1" ||
      !Array.isArray(index.versions)
    ) {
      return [];
    }
    return [...new Set(index.versions.filter((version): version is string =>
      typeof version === "string" && version.length > 0
    ))];
  }

  private async writeRevisionIndex(
    key: string,
    versions: readonly string[],
  ): Promise<void> {
    await this.storage.setItem(
      revisionIndexStorageKey(key),
      JSON.stringify({
        schemaVersion: "estimate_revision_durable_revision_index_v1",
        versions: [...new Set(versions)],
      } satisfies DurableRevisionIndex),
    );
  }

  private async stageRevisionIndex(key: string, version: string): Promise<void> {
    const versions = await this.readRevisionIndex(key);
    if (versions.includes(version)) return;
    await this.writeRevisionIndex(key, [...versions, version]);
  }

  private async readPointer(key: string): Promise<DurablePointer | null> {
    const pointer = parseRecord<DurablePointer>(
      await this.storage.getItem(storageKey(durablePointerRecordKey(key))),
    );
    return pointer?.schemaVersion === "estimate_revision_durable_pointer_v1"
      ? pointer
      : null;
  }

  private async readEnvelope(
    key: string,
    version: string,
  ): Promise<DurableEnvelope | null> {
    return parseRecord<DurableEnvelope>(
      await this.storage.getItem(
        storageKey(durableRevisionRecordKey(key, version)),
      ),
    );
  }

  async readBundle(key: string): Promise<RevisionBundle | null> {
    try {
      const pointer = await this.readPointer(key);
      if (!pointer) return null;
      return parseDurableEnvelopeBundle(
        await this.readEnvelope(key, pointer.currentVersion),
        key,
        ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES.asyncStorage,
      );
    } catch {
      return null;
    }
  }

  async writeBundleAtomically(
    key: string,
    expectedVersion: string | null,
    bundle: RevisionBundle,
  ): Promise<DurableWriteResult> {
    return this.withKeyQueue(key, async () => {
      let currentVersion: string | null = null;
      let serialized: ReturnType<typeof serializeRevisionBundle> | null = null;
      let pointerSwitched = false;
      try {
        this.inject("before_write");
        const pointer = await this.readPointer(key);
        currentVersion = pointer?.currentVersion ?? null;
        if (currentVersion !== expectedVersion) {
          return durableWriteFailure(
            "CONFLICT",
            "Durable revision compare-and-swap conflict.",
            currentVersion,
          );
        }

        serialized = serializeRevisionBundle(
          bundle,
          ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES.asyncStorage,
        );
        const revisionKey = storageKey(
          durableRevisionRecordKey(key, serialized.version),
        );
        const existing = await this.readEnvelope(key, serialized.version);
        if (
          currentVersion === serialized.version &&
          existing?.checksum === serialized.checksum &&
          parseDurableEnvelopeBundle(
            existing,
            key,
            ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES.asyncStorage,
          )
        ) {
          return {
            status: "UNCHANGED",
            version: serialized.version,
            previousVersion: pointer?.previousVersion ?? null,
            checksum: serialized.checksum,
          };
        }

        const envelope = createDurableEnvelope({
          key,
          version: serialized.version,
          previousVersion: currentVersion,
          checksum: serialized.checksum,
          serializedBundle: serialized.serializedBundle,
        });
        await this.storage.setItem(revisionKey, JSON.stringify(envelope));
        this.inject("after_revision_write");

        const verifiedEnvelope = await this.readEnvelope(key, serialized.version);
        if (
          verifiedEnvelope?.checksum !== serialized.checksum ||
          !parseDurableEnvelopeBundle(
            verifiedEnvelope,
            key,
            ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES.asyncStorage,
          )
        ) {
          throw new Error("ASYNC_STORAGE_STAGED_REVISION_CHECKSUM_MISMATCH");
        }

        // Both indexes are staged before the pointer commit. An interruption
        // here can expose only an inert index entry; a committed pointer can
        // therefore never become undiscoverable after process restart.
        await this.stageRevisionIndex(key, serialized.version);
        await this.ensureLogicalKeyIndexed(key);

        this.inject("before_pointer_switch");
        const pointerBeforeCommit = await this.readPointer(key);
        if ((pointerBeforeCommit?.currentVersion ?? null) !== currentVersion) {
          return durableWriteFailure(
            "CONFLICT",
            "Durable revision changed before pointer commit.",
            pointerBeforeCommit?.currentVersion ?? null,
          );
        }
        await this.storage.setItem(
          storageKey(durablePointerRecordKey(key)),
          JSON.stringify({
            schemaVersion: "estimate_revision_durable_pointer_v1",
            currentVersion: serialized.version,
            previousVersion: currentVersion,
          } satisfies DurablePointer),
        );
        pointerSwitched = true;
        this.inject("after_pointer_switch");
        this.inject("before_read_back");

        const readBack = await this.readBundle(key);
        if (
          !readBack ||
          serializeRevisionBundle(
            readBack,
            ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES.asyncStorage,
          ).checksum !== serialized.checksum
        ) {
          throw new Error("ASYNC_STORAGE_DURABLE_REVISION_READ_BACK_FAILED");
        }

        this.inject("before_orphan_cleanup");
        await this.deleteOrphansUnlocked(key);
        return {
          status: "WRITTEN",
          version: serialized.version,
          previousVersion: currentVersion,
          checksum: serialized.checksum,
        };
      } catch (error) {
        if (pointerSwitched && serialized) {
          const committed = await this.readBundle(key).catch(() => null);
          if (
            committed &&
            serializeRevisionBundle(
              committed,
              ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES.asyncStorage,
            ).checksum === serialized.checksum
          ) {
            return {
              status: "WRITTEN",
              version: serialized.version,
              previousVersion: currentVersion,
              checksum: serialized.checksum,
            };
          }
        }
        return durableWriteFailure(
          durableWriteErrorCode(error) === "PAYLOAD_TOO_LARGE"
            ? "PAYLOAD_TOO_LARGE"
            : "TRANSACTION_FAILED",
          messageFromDurableError(error),
          currentVersion,
        );
      }
    });
  }

  async recoverLastValid(key: string): Promise<RevisionBundle | null> {
    return this.withKeyQueue(key, async () => {
      try {
        const pointer = await this.readPointer(key);
        if (!pointer) return null;
        const current = parseDurableEnvelopeBundle(
          await this.readEnvelope(key, pointer.currentVersion),
          key,
          ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES.asyncStorage,
        );
        if (current) return current;
        if (!pointer.previousVersion) return null;
        const previous = parseDurableEnvelopeBundle(
          await this.readEnvelope(key, pointer.previousVersion),
          key,
          ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES.asyncStorage,
        );
        if (!previous) return null;
        await this.storage.setItem(
          storageKey(durablePointerRecordKey(key)),
          JSON.stringify({
            schemaVersion: "estimate_revision_durable_pointer_v1",
            currentVersion: pointer.previousVersion,
            previousVersion: null,
          } satisfies DurablePointer),
        );
        await this.deleteOrphansUnlocked(key);
        return previous;
      } catch {
        return null;
      }
    });
  }

  private async deleteOrphansUnlocked(key: string): Promise<void> {
    const pointer = await this.readPointer(key);
    const retained = new Set(
      [pointer?.currentVersion, pointer?.previousVersion]
        .filter((value): value is string => Boolean(value)),
    );
    const versions = await this.readRevisionIndex(key);
    await Promise.all(
      versions
        .filter((version) => !retained.has(version))
        .map((version) =>
          this.storage.removeItem(
            storageKey(durableRevisionRecordKey(key, version)),
          )
        ),
    );
    await this.writeRevisionIndex(key, [...retained]);
  }

  async deleteOrphans(key: string): Promise<void> {
    await this.withKeyQueue(key, () => this.deleteOrphansUnlocked(key));
  }

  async listKeys(): Promise<string[]> {
    try {
      return await this.readLogicalKeyIndex();
    } catch {
      return [];
    }
  }
}
