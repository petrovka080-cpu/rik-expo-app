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
  stableEstimateRevisionChecksum,
  type DurableEnvelope,
  type DurableFailureInjector,
  type DurableFailurePoint,
  type DurablePointer,
  type DurableWriteResult,
  type EstimateRevisionDurableStore,
  type RevisionBundle,
} from "./estimateRevisionDurableStore.contract";
import { safeJsonParse } from "../format";
import { decodeEstimateRevisionAsyncStorageRecord, encodeEstimateRevisionAsyncStorageRecord } from "./estimateRevisionAsyncStorageRecordCodec";
import { estimateRevisionUtf8ByteLength } from "./estimateRevisionDurableSerialization";

export type AsyncKeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  multiGet?(
    keys: readonly string[],
  ): Promise<readonly (readonly [string, string | null])[]>;
  multiSet?(
    entries: readonly (readonly [string, string])[],
  ): Promise<void>;
  multiRemove?(keys: readonly string[]): Promise<void>;
};

const STORAGE_PREFIX = "rik.estimate_revision_durable.v1:";

function storageKey(recordKey: string): string {
  return `${STORAGE_PREFIX}${recordKey}`;
}

const LOGICAL_KEY_INDEX_STORAGE_KEY = storageKey("__logical_key_index__");
const REVISION_INDEX_STORAGE_KEY_PREFIX = storageKey("__revision_index__:");
const PHYSICAL_COMPACTION_CURSOR_KEY = storageKey("__physical_record_compaction_cursor__");
type PhysicalCompactionCursor = { key: string; version: string; recordIndex: number };
export const ASYNC_STORAGE_COMPACTION_MAX_INSPECTED_RECORDS = 256;
export const ASYNC_STORAGE_COMPACTION_MAX_REPLACEMENTS = 64;
export const ASYNC_STORAGE_COMPACTION_MAX_RAW_BYTES = 32 * 1024 * 1024;
const PHYSICAL_WRITE_RESERVE_BYTES = 128 * 1024;

/**
 * Android AsyncStorage reads SQLite values through a bounded CursorWindow.
 * Keep every native value comfortably below that boundary while retaining the
 * existing 16 MiB logical bundle capacity.
 */
export const ASYNC_STORAGE_DURABLE_CHUNK_MAX_CHARS = 256 * 1024;
const ASYNC_STORAGE_DURABLE_MAX_SERIALIZED_ENVELOPE_CHARS =
  ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES.asyncStorage * 2 +
  64 * 1024;

type AsyncStorageDurableChunkManifestV1 = {
  schemaVersion: "estimate_revision_durable_chunk_manifest_v1";
  key: string;
  version: string;
  chunkCount: number;
  serializedLength: number;
  serializedChecksum: string;
};

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

function chunkStorageKey(
  revisionKey: string,
  serializedChecksum: string,
  index: number,
): string {
  return `${revisionKey}:chunk:${serializedChecksum}:${index}`;
}

function parseChunkManifest(
  value: unknown,
  expectedKey: string,
  expectedVersion: string,
): AsyncStorageDurableChunkManifestV1 | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Partial<AsyncStorageDurableChunkManifestV1>;
  const maxChunks = Math.ceil(
    ASYNC_STORAGE_DURABLE_MAX_SERIALIZED_ENVELOPE_CHARS /
      ASYNC_STORAGE_DURABLE_CHUNK_MAX_CHARS,
  );
  if (
    candidate.schemaVersion !== "estimate_revision_durable_chunk_manifest_v1" ||
    candidate.key !== expectedKey ||
    candidate.version !== expectedVersion ||
    !Number.isSafeInteger(candidate.chunkCount) ||
    (candidate.chunkCount ?? 0) < 1 ||
    (candidate.chunkCount ?? 0) > maxChunks ||
    !Number.isSafeInteger(candidate.serializedLength) ||
    (candidate.serializedLength ?? 0) < 1 ||
    (candidate.serializedLength ?? 0) >
      ASYNC_STORAGE_DURABLE_MAX_SERIALIZED_ENVELOPE_CHARS ||
    typeof candidate.serializedChecksum !== "string" ||
    !/^[0-9a-f]{16}$/.test(candidate.serializedChecksum)
  ) return null;
  return candidate as AsyncStorageDurableChunkManifestV1;
}

function parseRecord<T>(value: string | null): T | null {
  if (!value) return null;
  const parsed = safeJsonParse<unknown>(value, null);
  return parsed.ok && parsed.value && typeof parsed.value === "object"
    ? parsed.value as T
    : null;
}

function isEncodedPhysicalRecord(value: unknown): boolean {
  return Boolean(value && typeof value === "object" && "schemaVersion" in value
    && typeof value.schemaVersion === "string"
    && value.schemaVersion.startsWith("estimate_revision_async_storage_record_zlib_"));
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
  private storageMutationQueue: Promise<void> = Promise.resolve();
  private physicalCompactionCursor: PhysicalCompactionCursor | null = null;
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

  private async mutateStorage<T>(task: () => Promise<T>, incomingBytes = 0, prepareBeforeWrite = true): Promise<T> {
    const previous = this.storageMutationQueue;
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    this.storageMutationQueue = previous.then(() => gate);
    await previous;
    try {
      // Existing binaries have no reliable native free-page API. Reclaim only
      // redundant representation bytes, bounded by the actual staged write.
      // This is preparation, not a claim that a native quota test has passed.
      if (prepareBeforeWrite && incomingBytes > 0) await this.compactRetainedPhysicalRecords(incomingBytes + PHYSICAL_WRITE_RESERVE_BYTES);
      try { return await task(); }
      catch (error) {
        if (!/(?:SQLITE_FULL|database or disk is full)/iu.test(messageFromDurableError(error))) throw error;
        // Reclaim representation overhead, never revisions. Every replacement
        // is a single native atomic write with an exact text round trip.
        if (!await this.compactRetainedPhysicalRecords(Math.max(incomingBytes, PHYSICAL_WRITE_RESERVE_BYTES))) throw error;
        return await task(); // One retry after a bounded change in capacity.
      }
    } finally { release(); }
  }

  private async compactRetainedPhysicalRecords(targetSavingsBytes: number): Promise<number> {
    let compacted = 0, inspected = 0, rawBytes = 0, savedBytes = 0;
    const saved = this.physicalCompactionCursor ?? parseRecord<PhysicalCompactionCursor>(await this.storage.getItem(PHYSICAL_COMPACTION_CURSOR_KEY));
    const cursor = saved && typeof saved.key === "string" && typeof saved.version === "string"
      && Number.isSafeInteger(saved.recordIndex) && saved.recordIndex >= 0 ? saved : null;
    const keys = await this.readLogicalKeyIndex(), start = Math.max(0, cursor ? keys.indexOf(cursor.key) : 0);
    const orderedKeys = [...keys.slice(start), ...keys.slice(0, start)];
    const segments = orderedKeys.map((key,index)=>({key,resume:index===0&&cursor?.key===key,prefix:false}));
    // The first key's unvisited prefix is visited only after every other key,
    // so a full circular pass can find RAW records before the saved position
    // without repeatedly wrapping inside a large first key.
    if(cursor&&cursor.key===orderedKeys[0]&&cursor.version)segments.push({key:cursor.key,resume:false,prefix:true});
    // One finite indexed pass. A compressed prefix must never hide later RAW
    // values after process death. Decode one record at a time. Bound inspection,
    // replacements and codec bytes separately; stop when enough bytes were
    // reclaimed for this write rather than after an arbitrary eight records.
    const finish = async (next: PhysicalCompactionCursor): Promise<number> => {
      this.physicalCompactionCursor = next;
      // Progress survives process death. This metadata never changes a draft's
      // pointer or envelope. Save progress even across an already compressed
      // prefix. Optional cursor metadata must not turn a full disk into a
      // failed otherwise valid write; in-memory progress remains usable.
      try { await this.storage.setItem(PHYSICAL_COMPACTION_CURSOR_KEY, JSON.stringify(next)); }
      catch (error) {
        if (!/(?:SQLITE_FULL|database or disk is full)/iu.test(messageFromDurableError(error))) throw error;
      }
      return compacted;
    };
    for (const segment of segments) {
      const {key}=segment;
      // Orphan logical keys are legal after death before the pointer switch.
      // Count attempted metadata/envelope reads, including missing records and
      // native read failures, so these keys cannot escape the finite budget.
      if (inspected >= ASYNC_STORAGE_COMPACTION_MAX_INSPECTED_RECORDS) return finish({ key, version: "", recordIndex: 0 });
      inspected++;
      const pointer = await this.readPointer(key);
      const versions = [pointer?.currentVersion, pointer?.previousVersion].filter((v): v is string => Boolean(v));
      const cursorVersionIndex = cursor?.key===key ? versions.indexOf(cursor.version) : -1;
      if(segment.prefix&&cursorVersionIndex<0)continue;
      const versionStart = segment.resume ? Math.max(0,cursorVersionIndex) : 0;
      const versionEnd = segment.prefix ? cursorVersionIndex+1 : versions.length;
      // Resume forward through the remaining versions/chunks of this key.
      // Wrapping inside the first key can consume every later pass on two
      // large compressed versions and permanently starve subsequent keys.
      for (const version of versions.slice(versionStart,versionEnd)) {
        if (!version) continue;
        if (inspected >= ASYNC_STORAGE_COMPACTION_MAX_INSPECTED_RECORDS) return finish({ key, version, recordIndex: 0 });
        const revisionKey = storageKey(durableRevisionRecordKey(key, version));
        let physical: string | null;
        inspected++;
        try { physical = await this.storage.getItem(revisionKey); } catch { continue; }
        if (!physical) continue;
        const physicalMetadata = parseRecord<unknown>(physical);
        // Our small manifests are never encoded. A wrapped envelope/chunk is
        // already compact: classify its header without expanding its history.
        if (isEncodedPhysicalRecord(physicalMetadata)) continue;
        const manifest = parseChunkManifest(physicalMetadata, key, version);
        const records = manifest
          ? Array.from({ length: manifest.chunkCount }, (_, i) => chunkStorageKey(revisionKey, manifest.serializedChecksum, i))
          : [revisionKey];
        const recordStart = segment.resume && cursor?.version === version ? cursor.recordIndex : 0;
        const startIndex = Math.min(recordStart, records.length);
        const endIndex = segment.prefix&&cursor?.version===version ? Math.min(cursor.recordIndex,records.length) : records.length;
        const indices = Array.from({ length: Math.max(0,endIndex - startIndex) }, (_, i) => i + startIndex);
        for (const recordIndex of indices) {
          if (compacted >= ASYNC_STORAGE_COMPACTION_MAX_REPLACEMENTS || rawBytes >= ASYNC_STORAGE_COMPACTION_MAX_RAW_BYTES
            || inspected >= ASYNC_STORAGE_COMPACTION_MAX_INSPECTED_RECORDS || savedBytes >= targetSavingsBytes) return finish({ key, version, recordIndex });
          const recordKey = records[recordIndex];
          const original = recordKey === revisionKey ? physical : await this.storage.getItem(recordKey);
          if (recordKey !== revisionKey) inspected++;
          if (!original || isEncodedPhysicalRecord(parseRecord<unknown>(original))) continue;
          const originalBytes = estimateRevisionUtf8ByteLength(original);
          if (inspected >= ASYNC_STORAGE_COMPACTION_MAX_INSPECTED_RECORDS) return finish({ key, version, recordIndex });
          if (rawBytes + originalBytes > ASYNC_STORAGE_COMPACTION_MAX_RAW_BYTES) return finish({ key, version, recordIndex });
          rawBytes += originalBytes;
          const encoded = encodeEstimateRevisionAsyncStorageRecord(original);
          if (encoded === original) continue;
          if (decodeEstimateRevisionAsyncStorageRecord(encoded) !== original) throw new Error("ASYNC_STORAGE_RECORD_COMPACTION_NOT_EXACT");
          await this.storage.setItem(recordKey, encoded);
          inspected++;
          const readBack = await this.storage.getItem(recordKey);
          if (!readBack || decodeEstimateRevisionAsyncStorageRecord(readBack) !== original) throw new Error("ASYNC_STORAGE_RECORD_COMPACTION_READ_BACK_FAILED");
          compacted++;
          savedBytes += originalBytes - estimateRevisionUtf8ByteLength(encoded);
          if (compacted >= ASYNC_STORAGE_COMPACTION_MAX_REPLACEMENTS || savedBytes >= targetSavingsBytes)
            return finish({ key, version, recordIndex: recordIndex + 1 });
        }
      }
    }
    return finish({ key: keys[0] ?? "", version: "", recordIndex: 0 });
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
      await this.mutateStorage(() => this.storage.setItem(
        LOGICAL_KEY_INDEX_STORAGE_KEY,
        JSON.stringify({
          schemaVersion: "estimate_revision_durable_logical_key_index_v1",
          keys: [...keys, key].sort(),
        } satisfies DurableLogicalKeyIndex),
      ));
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
    await this.mutateStorage(() => this.storage.setItem(
      revisionIndexStorageKey(key),
      JSON.stringify({
        schemaVersion: "estimate_revision_durable_revision_index_v1",
        versions: [...new Set(versions)],
      } satisfies DurableRevisionIndex),
    ));
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
    const revisionKey = storageKey(durableRevisionRecordKey(key, version));
    const physicalRecord = await this.storage.getItem(revisionKey);
    const record = parseRecord<DurableEnvelope | AsyncStorageDurableChunkManifestV1>(
      physicalRecord === null ? null : decodeEstimateRevisionAsyncStorageRecord(physicalRecord),
    );
    if (record?.schemaVersion === "estimate_revision_durable_envelope_v1") {
      return record as DurableEnvelope;
    }
    const manifest = parseChunkManifest(record, key, version);
    if (!manifest) return null;
    const chunkKeys = Array.from({ length: manifest.chunkCount }, (_, index) =>
      chunkStorageKey(revisionKey, manifest.serializedChecksum, index)
    );
    const batchedChunks = this.storage.multiGet
      ? new Map(await this.storage.multiGet(chunkKeys))
      : null;
    const chunks: string[] = [];
    for (const chunkKey of chunkKeys) {
      const physicalChunk = batchedChunks
        ? batchedChunks.get(chunkKey) ?? null
        : await this.storage.getItem(chunkKey);
      const chunk = physicalChunk === null ? null : decodeEstimateRevisionAsyncStorageRecord(physicalChunk);
      if (
        chunk === null ||
        chunk.length < 1 ||
        chunk.length > ASYNC_STORAGE_DURABLE_CHUNK_MAX_CHARS
      ) return null;
      chunks.push(chunk);
    }
    const serializedEnvelope = chunks.join("");
    if (
      serializedEnvelope.length !== manifest.serializedLength ||
      stableEstimateRevisionChecksum(serializedEnvelope) !==
        manifest.serializedChecksum
    ) return null;
    const envelope = parseRecord<DurableEnvelope>(serializedEnvelope);
    return envelope?.schemaVersion === "estimate_revision_durable_envelope_v1" &&
        envelope.key === key &&
        envelope.version === version
      ? envelope
      : null;
  }

  private async writeEnvelope(
    key: string,
    version: string,
    envelope: DurableEnvelope,
  ): Promise<void> {
    const revisionKey = storageKey(durableRevisionRecordKey(key, version));
    const serializedEnvelope = JSON.stringify(envelope);
    if (serializedEnvelope.length <= ASYNC_STORAGE_DURABLE_CHUNK_MAX_CHARS) {
      const encoded = encodeEstimateRevisionAsyncStorageRecord(serializedEnvelope);
      await this.mutateStorage(() => this.storage.setItem(revisionKey, encoded), estimateRevisionUtf8ByteLength(encoded));
      return;
    }
    const serializedChecksum = stableEstimateRevisionChecksum(serializedEnvelope);
    const chunks: string[] = [];
    let offset = 0;
    while (offset < serializedEnvelope.length) {
      let end = Math.min(
        offset + ASYNC_STORAGE_DURABLE_CHUNK_MAX_CHARS,
        serializedEnvelope.length,
      );
      const lastCodeUnit = serializedEnvelope.charCodeAt(end - 1);
      const nextCodeUnit = serializedEnvelope.charCodeAt(end);
      if (
        end < serializedEnvelope.length &&
        lastCodeUnit >= 0xd800 &&
        lastCodeUnit <= 0xdbff &&
        nextCodeUnit >= 0xdc00 &&
        nextCodeUnit <= 0xdfff
      ) {
        end -= 1;
      }
      chunks.push(serializedEnvelope.slice(offset, end));
      offset = end;
    }
    const chunkEntries = chunks.map((chunk, index) => [
      chunkStorageKey(revisionKey, serializedChecksum, index),
      encodeEstimateRevisionAsyncStorageRecord(chunk),
    ] as const);
    const stagedBytes = chunkEntries.reduce((total, [chunkKey, chunk]) =>
      total + estimateRevisionUtf8ByteLength(chunkKey) + estimateRevisionUtf8ByteLength(chunk), 0);
    // One preparation for the whole staged envelope also covers adapters that
    // write chunks individually. Do not rescan history before every chunk.
    await this.mutateStorage(async () => undefined, stagedBytes);
    if (this.storage.multiSet) {
      await this.mutateStorage(() => this.storage.multiSet!(chunkEntries), stagedBytes, false);
    } else {
      for (const [chunkKey, chunk] of chunkEntries) {
        await this.mutateStorage(() => this.storage.setItem(chunkKey, chunk), estimateRevisionUtf8ByteLength(chunk), false);
      }
    }
    // The compact manifest is the revision commit point. A process death while
    // staging chunks leaves them unreachable and cannot expose a partial row.
    await this.mutateStorage(() => this.storage.setItem(
      revisionKey,
      JSON.stringify({
        schemaVersion: "estimate_revision_durable_chunk_manifest_v1",
        key,
        version,
        chunkCount: chunks.length,
        serializedLength: serializedEnvelope.length,
        serializedChecksum,
      } satisfies AsyncStorageDurableChunkManifestV1),
    ));
  }

  private async removeEnvelopeRecord(
    key: string,
    version: string,
  ): Promise<void> {
    const revisionKey = storageKey(durableRevisionRecordKey(key, version));
    let chunkKeys: string[] = [];
    try {
      const physical = await this.storage.getItem(revisionKey);
      const record = parseRecord<unknown>(physical === null ? null : decodeEstimateRevisionAsyncStorageRecord(physical));
      const manifest = parseChunkManifest(record, key, version);
      if (manifest) {
        chunkKeys = Array.from({ length: manifest.chunkCount }, (_, index) =>
          chunkStorageKey(revisionKey, manifest.serializedChecksum, index)
        );
      }
    } catch {
      // A legacy oversized value may itself exceed Android's CursorWindow.
      // Removing its known base key is still safe and makes it unreachable.
    }
    const keysToRemove = [...chunkKeys, revisionKey];
    if (this.storage.multiRemove) {
      await this.mutateStorage(() => this.storage.multiRemove!(keysToRemove));
    } else {
      for (const storageRecordKey of keysToRemove) {
        await this.mutateStorage(() => this.storage.removeItem(storageRecordKey));
      }
    }
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
        // A pre-release oversized legacy AsyncStorage value can itself fail at
        // the native read boundary. A fresh content-addressed write can safely
        // replace it with a verified chunk manifest.
        const existing = await this.readEnvelope(key, serialized.version)
          .catch(() => null);
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
        // Reserve discoverability before allocating the large payload. An
        // index failure must not strand an otherwise complete unindexed
        // envelope. This inert entry is not a commit: only the pointer is.
        await this.stageRevisionIndex(key, serialized.version);
        const reusableStagedEnvelope = existing?.version === serialized.version
          && existing.previousVersion === currentVersion
          && existing.checksum === serialized.checksum
          && existing.serializedBundle === serialized.serializedBundle
          && parseDurableEnvelopeBundle(
            existing,
            key,
            ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES.asyncStorage,
          );
        // A retry of exactly the same complete staged content must not create
        // new chunk keys merely because committedAt changes. Corrupt, partial
        // or differently based envelopes are still written and verified anew.
        if (!reusableStagedEnvelope) {
          await this.writeEnvelope(key, serialized.version, envelope);
        }
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
        const committedPointer = JSON.stringify({
            schemaVersion: "estimate_revision_durable_pointer_v1",
            currentVersion: serialized.version,
            previousVersion: currentVersion,
          } satisfies DurablePointer);
        await this.mutateStorage(() => this.storage.setItem(storageKey(durablePointerRecordKey(key)), committedPointer));
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
        const recoveredPointer = JSON.stringify({
            schemaVersion: "estimate_revision_durable_pointer_v1",
            currentVersion: pointer.previousVersion,
            previousVersion: null,
          } satisfies DurablePointer);
        await this.mutateStorage(() => this.storage.setItem(storageKey(durablePointerRecordKey(key)), recoveredPointer));
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
    for (const version of versions.filter((candidate) => !retained.has(candidate))) {
      await this.removeEnvelopeRecord(key, version);
    }
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
