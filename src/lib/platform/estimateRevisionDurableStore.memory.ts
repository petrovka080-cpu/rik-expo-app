import {
  ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES,
  createDurableEnvelope,
  decodeDurablePointerKey,
  decodeDurableRecordVersion,
  durablePointerRecordKey,
  durableRevisionRecordKey,
  durableRevisionRecordPrefix,
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

export class InMemoryEstimateRevisionDurableStore implements EstimateRevisionDurableStore {
  private readonly pointers = new Map<string, DurablePointer>();
  private readonly revisions = new Map<string, DurableEnvelope>();
  private failureInjector: DurableFailureInjector | null;

  constructor(input: { failureInjector?: DurableFailureInjector | null } = {}) {
    this.failureInjector = input.failureInjector ?? null;
  }

  setFailureInjector(injector: DurableFailureInjector | null): void {
    this.failureInjector = injector;
  }

  private inject(point: DurableFailurePoint): void {
    this.failureInjector?.(point);
  }

  async readBundle(key: string): Promise<RevisionBundle | null> {
    const pointer = this.pointers.get(durablePointerRecordKey(key));
    if (!pointer) return null;
    return parseDurableEnvelopeBundle(
      this.revisions.get(durableRevisionRecordKey(key, pointer.currentVersion)),
      key,
      ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES.memory,
    );
  }

  async writeBundleAtomically(
    key: string,
    expectedVersion: string | null,
    bundle: RevisionBundle,
  ): Promise<DurableWriteResult> {
    const previousPointers = new Map(this.pointers);
    const previousRevisions = new Map(this.revisions);
    const pointerKey = durablePointerRecordKey(key);
    const currentVersion = this.pointers.get(pointerKey)?.currentVersion ?? null;
    try {
      this.inject("before_write");
      if (currentVersion !== expectedVersion) {
        return durableWriteFailure("CONFLICT", "Durable revision compare-and-swap conflict.", currentVersion);
      }
      const serialized = serializeRevisionBundle(
        bundle,
        ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES.memory,
      );
      const existing = this.revisions.get(durableRevisionRecordKey(key, serialized.version));
      if (
        currentVersion === serialized.version &&
        existing?.checksum === serialized.checksum &&
        parseDurableEnvelopeBundle(
          existing,
          key,
          ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES.memory,
        )
      ) {
        return {
          status: "UNCHANGED",
          version: serialized.version,
          previousVersion: this.pointers.get(pointerKey)?.previousVersion ?? null,
          checksum: serialized.checksum,
        };
      }
      this.revisions.set(
        durableRevisionRecordKey(key, serialized.version),
        createDurableEnvelope({
          key,
          version: serialized.version,
          previousVersion: currentVersion,
          checksum: serialized.checksum,
          serializedBundle: serialized.serializedBundle,
        }),
      );
      this.inject("after_revision_write");
      this.inject("before_pointer_switch");
      this.pointers.set(pointerKey, {
        schemaVersion: "estimate_revision_durable_pointer_v1",
        currentVersion: serialized.version,
        previousVersion: currentVersion,
      });
      this.inject("after_pointer_switch");
      this.inject("before_read_back");
      const readBack = await this.readBundle(key);
      if (
        !readBack ||
        serializeRevisionBundle(
          readBack,
          ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES.memory,
        ).checksum !== serialized.checksum
      ) throw new Error("DURABLE_REVISION_READ_BACK_FAILED");
      this.inject("before_orphan_cleanup");
      await this.deleteOrphans(key);
      return {
        status: "WRITTEN",
        version: serialized.version,
        previousVersion: currentVersion,
        checksum: serialized.checksum,
      };
    } catch (error) {
      this.pointers.clear();
      previousPointers.forEach((value, entryKey) => this.pointers.set(entryKey, value));
      this.revisions.clear();
      previousRevisions.forEach((value, entryKey) => this.revisions.set(entryKey, value));
      return durableWriteFailure(
        durableWriteErrorCode(error) === "PAYLOAD_TOO_LARGE"
          ? "PAYLOAD_TOO_LARGE"
          : "TRANSACTION_FAILED",
        messageFromDurableError(error),
        currentVersion,
      );
    }
  }

  async recoverLastValid(key: string): Promise<RevisionBundle | null> {
    const pointerKey = durablePointerRecordKey(key);
    const pointer = this.pointers.get(pointerKey);
    if (!pointer) return null;
    const current = parseDurableEnvelopeBundle(
      this.revisions.get(durableRevisionRecordKey(key, pointer.currentVersion)),
      key,
      ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES.memory,
    );
    if (current) return current;
    if (!pointer.previousVersion) return null;
    const previous = parseDurableEnvelopeBundle(
      this.revisions.get(durableRevisionRecordKey(key, pointer.previousVersion)),
      key,
      ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES.memory,
    );
    if (!previous) return null;
    this.pointers.set(pointerKey, {
      schemaVersion: "estimate_revision_durable_pointer_v1",
      currentVersion: pointer.previousVersion,
      previousVersion: null,
    });
    await this.deleteOrphans(key);
    return previous;
  }

  async deleteOrphans(key: string): Promise<void> {
    const pointer = this.pointers.get(durablePointerRecordKey(key));
    const retained = new Set(
      [pointer?.currentVersion, pointer?.previousVersion].filter((value): value is string => Boolean(value)),
    );
    const prefix = durableRevisionRecordPrefix(key);
    for (const recordKey of this.revisions.keys()) {
      if (
        recordKey.startsWith(prefix) &&
        !retained.has(decodeDurableRecordVersion(recordKey, prefix))
      ) this.revisions.delete(recordKey);
    }
  }

  async listKeys(): Promise<string[]> {
    return [...this.pointers.keys()]
      .map(decodeDurablePointerKey)
      .filter((key): key is string => key != null)
      .sort();
  }

  revisionCount(key: string): number {
    const prefix = durableRevisionRecordPrefix(key);
    return [...this.revisions.keys()].filter((recordKey) => recordKey.startsWith(prefix)).length;
  }

  corruptCurrentForTests(key: string): void {
    const currentVersion = this.pointers.get(durablePointerRecordKey(key))?.currentVersion;
    if (!currentVersion) return;
    const recordKey = durableRevisionRecordKey(key, currentVersion);
    const envelope = this.revisions.get(recordKey);
    if (envelope) {
      this.revisions.set(recordKey, {
        ...envelope,
        serializedBundle: `${envelope.serializedBundle}corrupt`,
      });
    }
  }

  addOrphanForTests(key: string, version = "orphan:test"): void {
    const pointer = this.pointers.get(durablePointerRecordKey(key));
    const current = pointer
      ? this.revisions.get(durableRevisionRecordKey(key, pointer.currentVersion))
      : null;
    if (!current) return;
    this.revisions.set(durableRevisionRecordKey(key, version), {
      ...current,
      version,
      previousVersion: null,
    });
  }
}
