import { MAX_ESTIMATE_REVISION_DURABLE_ENVELOPE_BYTES, stableEstimateRevisionChecksum, estimateRevisionUtf8ByteLength } from "./estimateRevisionDurableSerialization";
import type { ConsumerRepairDraftBundle } from "../consumerRequests/consumerRequestTypes";
import { safeJsonParse } from "../format";
import {
  compactConsumerRepairBundleForDurableStorage,
  decodeConsumerRepairBundleFromDurableStorage,
  encodeConsumerRepairBundleForDurableStorage,
} from "./compactConsumerRepairDurableState";

export { ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES, MAX_ESTIMATE_REVISION_DURABLE_ENVELOPE_BYTES, MAX_ESTIMATE_REVISION_DURABLE_RECORD_BYTES, stableEstimateRevisionChecksum, estimateRevisionUtf8ByteLength } from "./estimateRevisionDurableSerialization";

export type RevisionBundle = ConsumerRepairDraftBundle;

// A decoded bundle's CAS token belongs to the validated stored representation.
// Re-encoding with a newer codec must not invent a different predecessor token.
const committedBundleVersions = new WeakMap<RevisionBundle, { key: string; version: string }>();

export function readCommittedEstimateRevisionBundleVersion(bundle: RevisionBundle, key: string): string | null {
  const committed = committedBundleVersions.get(bundle);
  return committed?.key === key ? committed.version : null;
}

export type DurableWriteErrorCode =
  | "CONFLICT"
  | "SERIALIZATION_FAILED"
  | "PAYLOAD_TOO_LARGE"
  | "CHECKSUM_MISMATCH"
  | "STORAGE_UNAVAILABLE"
  | "TRANSACTION_FAILED"
  | "TRANSACTION_QUEUE_SATURATED"
  | "READ_BACK_FAILED"
  | "LEGACY_INVALID";

export type DurableWriteResult =
  | {
      status: "WRITTEN";
      version: string;
      previousVersion: string | null;
      checksum: string;
    }
  | {
      status: "UNCHANGED";
      version: string;
      previousVersion: string | null;
      checksum: string;
    }
  | {
      status: "FAILED";
      version: string | null;
      error: {
        code: DurableWriteErrorCode;
        message: string;
        currentVersion: string | null;
      };
    };

export interface EstimateRevisionDurableStore {
  readBundle(key: string): Promise<RevisionBundle | null>;
  writeBundleAtomically(
    key: string,
    expectedVersion: string | null,
    bundle: RevisionBundle,
  ): Promise<DurableWriteResult>;
  recoverLastValid(key: string): Promise<RevisionBundle | null>;
  deleteOrphans(key: string): Promise<void>;
  listKeys(): Promise<string[]>;
}

export type DurableEnvelope = {
  schemaVersion: "estimate_revision_durable_envelope_v1";
  key: string;
  version: string;
  previousVersion: string | null;
  checksum: string;
  serializedBundle: string;
  committedAt: string;
};

export type DurablePointer = {
  schemaVersion: "estimate_revision_durable_pointer_v1";
  currentVersion: string;
  previousVersion: string | null;
};

export type DurableFailurePoint =
  | "before_write"
  | "after_revision_write"
  | "before_pointer_switch"
  | "after_pointer_switch"
  | "before_read_back"
  | "before_orphan_cleanup";

export type DurableFailureInjector = (point: DurableFailurePoint) => void;

export const ESTIMATE_REVISION_DB_NAME = "rik-estimate-revision-durable-v1";
export const ESTIMATE_REVISION_IDB_STORE_NAME = "revision-records";

const POINTER_PREFIX = "@pointer:";
const REVISION_PREFIX = "@revision:";

export class DurablePayloadTooLargeError extends Error {
  readonly code = "PAYLOAD_TOO_LARGE" as const;

  constructor(
    readonly actualBytes: number,
    readonly capacityBytes: number,
  ) {
    super(
      `REVISION_BUNDLE_SERIALIZATION_TOO_LARGE: revision payload is ${actualBytes} bytes; ` +
      `adapter capacity is ${capacityBytes} bytes.`,
    );
    this.name = "DurablePayloadTooLargeError";
  }
}

export function durableWriteErrorCode(error: unknown): DurableWriteErrorCode {
  return error instanceof DurablePayloadTooLargeError
    ? "PAYLOAD_TOO_LARGE"
    : "SERIALIZATION_FAILED";
}

export function messageFromDurableError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function serializeRevisionBundle(
  bundle: RevisionBundle,
  capacityBytes = MAX_ESTIMATE_REVISION_DURABLE_ENVELOPE_BYTES,
): {
  serializedBundle: string;
  checksum: string;
  version: string;
} {
  const compactedBundle = compactConsumerRepairBundleForDurableStorage(bundle);
  const serializedBundle = JSON.stringify(
    encodeConsumerRepairBundleForDurableStorage(compactedBundle),
  );
  if (!serializedBundle) throw new Error("REVISION_BUNDLE_SERIALIZATION_EMPTY");
  const actualBytes = estimateRevisionUtf8ByteLength(serializedBundle);
  if (actualBytes > capacityBytes) {
    throw new DurablePayloadTooLargeError(actualBytes, capacityBytes);
  }
  const checksum = stableEstimateRevisionChecksum(serializedBundle);
  const explicitVersion =
    bundle.estimateDraftRevisionState?.currentRevisionId ??
    bundle.estimateRevisionState?.current_revision_id ??
    null;
  return {
    serializedBundle,
    checksum,
    version: explicitVersion
      ? `${explicitVersion}:content:${checksum}`
      : `content:${checksum}`,
  };
}

export function parseDurableEnvelopeBundle(
  envelope: DurableEnvelope | unknown,
  expectedKey: string,
  capacityBytes = MAX_ESTIMATE_REVISION_DURABLE_ENVELOPE_BYTES,
): RevisionBundle | null {
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) {
    return null;
  }
  if (
    !("schemaVersion" in envelope) ||
    envelope.schemaVersion !== "estimate_revision_durable_envelope_v1" ||
    !("key" in envelope) ||
    envelope.key !== expectedKey ||
    !("version" in envelope) ||
    typeof envelope.version !== "string" ||
    !envelope.version.trim() ||
    !("serializedBundle" in envelope) ||
    typeof envelope.serializedBundle !== "string" ||
    !("checksum" in envelope) ||
    typeof envelope.checksum !== "string" ||
    estimateRevisionUtf8ByteLength(envelope.serializedBundle) >
      capacityBytes ||
    stableEstimateRevisionChecksum(envelope.serializedBundle) !==
      envelope.checksum
  ) return null;
  const parsed = safeJsonParse<unknown>(
    envelope.serializedBundle,
    null,
  );
  if (!parsed.ok) return null;
  const decoded = decodeConsumerRepairBundleFromDurableStorage(parsed.value);
  if (decoded?.draft?.id !== expectedKey) return null;
  committedBundleVersions.set(decoded, { key: expectedKey, version: envelope.version });
  return decoded;
}

export function durableRevisionRecordKey(key: string, version: string): string {
  return `${REVISION_PREFIX}${encodeURIComponent(key)}:${encodeURIComponent(version)}`;
}

export function durableRevisionRecordPrefix(key: string): string {
  return `${REVISION_PREFIX}${encodeURIComponent(key)}:`;
}

export function durablePointerRecordKey(key: string): string {
  return `${POINTER_PREFIX}${encodeURIComponent(key)}`;
}

export function decodeDurablePointerKey(recordKey: string): string | null {
  if (!recordKey.startsWith(POINTER_PREFIX)) return null;
  try {
    return decodeURIComponent(recordKey.slice(POINTER_PREFIX.length));
  } catch {
    return null;
  }
}

export function createDurableEnvelope(input: {
  key: string;
  version: string;
  previousVersion: string | null;
  checksum: string;
  serializedBundle: string;
}): DurableEnvelope {
  return {
    schemaVersion: "estimate_revision_durable_envelope_v1",
    ...input,
    committedAt: new Date().toISOString(),
  };
}

export function durableWriteFailure(
  code: DurableWriteErrorCode,
  message: string,
  currentVersion: string | null,
): DurableWriteResult {
  return {
    status: "FAILED",
    version: null,
    error: { code, message, currentVersion },
  };
}

export function decodeDurableRecordVersion(recordKey: string, prefix: string): string {
  const encodedVersion = recordKey.slice(prefix.length);
  try {
    return decodeURIComponent(encodedVersion);
  } catch {
    return encodedVersion;
  }
}
