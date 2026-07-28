import type { ConsumerRepairDraftBundle } from "../consumerRequests/consumerRequestTypes";
import { safeJsonParse } from "../format";
import {
  compactConsumerRepairBundleForDurableStorage,
  decodeConsumerRepairBundleFromDurableStorage,
  encodeConsumerRepairBundleForDurableStorage,
} from "./compactConsumerRepairDurableState";

export type RevisionBundle = ConsumerRepairDraftBundle;

export type DurableWriteErrorCode =
  | "CONFLICT"
  | "SERIALIZATION_FAILED"
  | "PAYLOAD_TOO_LARGE"
  | "CHECKSUM_MISMATCH"
  | "STORAGE_UNAVAILABLE"
  | "TRANSACTION_FAILED"
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
export const ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES = {
  memory: 16 * 1024 * 1024,
  asyncStorage: 16 * 1024 * 1024,
  indexedDb: 24 * 1024 * 1024,
  sqlite: 32 * 1024 * 1024,
} as const;
export const MAX_ESTIMATE_REVISION_DURABLE_ENVELOPE_BYTES =
  ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES.memory;
export const MAX_ESTIMATE_REVISION_DURABLE_RECORD_BYTES =
  ESTIMATE_REVISION_DURABLE_ADAPTER_CAPACITY_BYTES.sqlite * 2 + 64 * 1024;
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

export function stableEstimateRevisionChecksum(value: string): string {
  let first = 2166136261;
  let second = 2246822519;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 16777619);
    second = Math.imul(second ^ code, 3266489917);
  }
  return `${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0).toString(16).padStart(8, "0")}`;
}

export function estimateRevisionUtf8ByteLength(value: string): number {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x80) {
      bytes += 1;
    } else if (code < 0x800) {
      bytes += 2;
    } else if (
      code >= 0xd800 &&
      code <= 0xdbff &&
      index + 1 < value.length
    ) {
      const low = value.charCodeAt(index + 1);
      if (low >= 0xdc00 && low <= 0xdfff) {
        bytes += 4;
        index += 1;
      } else {
        bytes += 3;
      }
    } else {
      bytes += 3;
    }
  }
  return bytes;
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
  return decoded?.draft?.id ? decoded : null;
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
