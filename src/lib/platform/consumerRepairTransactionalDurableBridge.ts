import type { ConsumerRepairDraftBundle } from "../consumerRequests/consumerRequestTypes";
import { createEstimateRevisionDurableStore } from "./estimateRevisionDurableStore.factory";
import {
  estimateRevisionUtf8ByteLength,
  serializeRevisionBundle,
  type DurableWriteResult,
  type EstimateRevisionDurableStore,
} from "./estimateRevisionDurableStore.contract";
import {
  compactConsumerRepairBundleForDurableStorage,
  encodeConsumerRepairBundleForDurableStorage,
} from "./compactConsumerRepairDurableState";

export const CONSUMER_REPAIR_TRANSACTIONAL_POINTER_KEY_PREFIX =
  "rik.consumer_repair.transactional_revision_pointer.v1:";

export const CONSUMER_REPAIR_TRANSACTIONAL_ROW_THRESHOLD = 500;
// Keep the historical synchronous path for ordinary (<500-row) estimates.
// A crash-safe V3 update temporarily retains both the last valid snapshot and
// its successor. 2.4 million serialized characters per generation leaves
// margin for two generations, pointers, auth and other origin metadata below
// the common ~5 MiB Web Storage quota. Larger records use the transactional
// adapter before the synchronous localStorage commit is attempted.
// Measure the actual compact encoded record written by the synchronous adapter;
// the runtime bundle intentionally contains several richer in-memory projections.
// The row threshold still routes the 702-row maximum to transactional storage.
export const CONSUMER_REPAIR_TRANSACTIONAL_SERIALIZED_THRESHOLD = 2_400_000;
export const CONSUMER_REPAIR_TRANSACTIONAL_CANONICAL_LENGTH_METRIC =
  "JSON_UTF16_CODE_UNITS" as const;
export type ConsumerRepairDurableStorageRoutingPlan = {
  route: "LOCAL_STORAGE_V3" | "TRANSACTIONAL_DURABLE_STORE";
  reason:
    | "BELOW_ALL_TRANSACTIONAL_THRESHOLDS"
    | "ROW_THRESHOLD_GTE"
    | "CANONICAL_LENGTH_THRESHOLD_GTE"
    | "CANONICAL_SERIALIZATION_FAILED_CLOSED";
  canonicalLengthMetric: typeof CONSUMER_REPAIR_TRANSACTIONAL_CANONICAL_LENGTH_METRIC;
  canonicalLength: number | null;
  canonicalUtf8Bytes: number | null;
  serializedThreshold: typeof CONSUMER_REPAIR_TRANSACTIONAL_SERIALIZED_THRESHOLD;
  serializedThresholdOperator: "GTE";
  rowCount: number;
  rowThreshold: typeof CONSUMER_REPAIR_TRANSACTIONAL_ROW_THRESHOLD;
  rowThresholdOperator: "GTE";
};
const FORBIDDEN_DURABLE_KEYS = /^(?:base64|binary|bytes|blob|dataUrl|privateUrl|signedUrl|accessToken|refreshToken|secret)$/i;
const PRIVATE_URL = /^(?:data:|blob:)|:\/\/[^/?#]*@|[?&](?:token|signature|sig|x-amz-credential)=/i;

let storeOverride: EstimateRevisionDurableStore | null = null;
let runtimeStore: EstimateRevisionDurableStore | null = null;
type TransactionalConsumerRepairWriteInput = {
  bundle: ConsumerRepairDraftBundle;
  storage: Pick<Storage, "setItem"> | null;
  onCommitted?: (result: Extract<DurableWriteResult, { status: "WRITTEN" | "UNCHANGED" }>) => void;
  onFailed?: (result: Extract<DurableWriteResult, { status: "FAILED" }>) => void;
};
const writeQueues = new Map<string, Promise<DurableWriteResult>>();
const pendingWrites = new Map<string, TransactionalConsumerRepairWriteInput>();

export function hasPendingTransactionalConsumerRepairBundleWrite(
  requestDraftId: string,
): boolean {
  return writeQueues.has(requestDraftId) || pendingWrites.has(requestDraftId);
}

function activeStore(): EstimateRevisionDurableStore {
  if (storeOverride) return storeOverride;
  runtimeStore ??= createEstimateRevisionDurableStore();
  return runtimeStore;
}

function pointerKey(requestDraftId: string): string {
  return `${CONSUMER_REPAIR_TRANSACTIONAL_POINTER_KEY_PREFIX}${encodeURIComponent(requestDraftId)}`;
}

function sanitizeDurableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeDurableValue);
  if (!value || typeof value !== "object") return value;
  const sanitized: Record<string, unknown> = {};
  for (const [key, entryValue] of Object.entries(value)) {
    if (FORBIDDEN_DURABLE_KEYS.test(key)) continue;
    if (
      typeof entryValue === "string" &&
      PRIVATE_URL.test(entryValue) &&
      /(?:reference|url|uri)$/i.test(key)
    ) {
      sanitized[key] = key === "storageReference"
        ? "redacted://private-reference-removed"
        : null;
      continue;
    }
    sanitized[key] = sanitizeDurableValue(entryValue);
  }
  return sanitized;
}

export function sanitizeConsumerRepairTransactionalBundle(
  bundle: ConsumerRepairDraftBundle,
): ConsumerRepairDraftBundle {
  return sanitizeDurableValue(bundle) as ConsumerRepairDraftBundle;
}

export function buildConsumerRepairDurableStorageRoutingPlan(
  bundle: ConsumerRepairDraftBundle,
): ConsumerRepairDurableStorageRoutingPlan {
  const currentRevision = bundle.estimateDraftRevisionState?.revisions.find((revision) =>
    revision.revisionId === bundle.estimateDraftRevisionState?.currentRevisionId
  );
  const rowCount = currentRevision?.boq.rows.length ?? bundle.items.length;
  const base: Pick<
    ConsumerRepairDurableStorageRoutingPlan,
    | "canonicalLengthMetric"
    | "serializedThreshold"
    | "serializedThresholdOperator"
    | "rowCount"
    | "rowThreshold"
    | "rowThresholdOperator"
  > = {
    canonicalLengthMetric: CONSUMER_REPAIR_TRANSACTIONAL_CANONICAL_LENGTH_METRIC,
    serializedThreshold: CONSUMER_REPAIR_TRANSACTIONAL_SERIALIZED_THRESHOLD,
    serializedThresholdOperator: "GTE" as const,
    rowCount,
    rowThreshold: CONSUMER_REPAIR_TRANSACTIONAL_ROW_THRESHOLD,
    rowThresholdOperator: "GTE" as const,
  };
  try {
    const durableRecord = encodeConsumerRepairBundleForDurableStorage(
      compactConsumerRepairBundleForDurableStorage(bundle),
    );
    const canonicalSerializedRecord = JSON.stringify(durableRecord);
    const canonicalLength = canonicalSerializedRecord.length;
    const canonicalUtf8Bytes = estimateRevisionUtf8ByteLength(canonicalSerializedRecord);
    if (rowCount >= CONSUMER_REPAIR_TRANSACTIONAL_ROW_THRESHOLD) {
      return {
        ...base,
        route: "TRANSACTIONAL_DURABLE_STORE",
        reason: "ROW_THRESHOLD_GTE",
        canonicalLength,
        canonicalUtf8Bytes,
      };
    }
    if (canonicalLength >= CONSUMER_REPAIR_TRANSACTIONAL_SERIALIZED_THRESHOLD) {
      return {
        ...base,
        route: "TRANSACTIONAL_DURABLE_STORE",
        reason: "CANONICAL_LENGTH_THRESHOLD_GTE",
        canonicalLength,
        canonicalUtf8Bytes,
      };
    }
    return {
      ...base,
      route: "LOCAL_STORAGE_V3",
      reason: "BELOW_ALL_TRANSACTIONAL_THRESHOLDS",
      canonicalLength,
      canonicalUtf8Bytes,
    };
  } catch {
    return {
      ...base,
      route: "TRANSACTIONAL_DURABLE_STORE",
      reason: "CANONICAL_SERIALIZATION_FAILED_CLOSED",
      canonicalLength: null,
      canonicalUtf8Bytes: null,
    };
  }
}

export function isLargeConsumerRepairRevisionBundle(
  bundle: ConsumerRepairDraftBundle,
): boolean {
  return buildConsumerRepairDurableStorageRoutingPlan(bundle).route ===
    "TRANSACTIONAL_DURABLE_STORE";
}

export function listTransactionalConsumerRepairBundleIds(storage: Storage): string[] {
  const ids: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key?.startsWith(CONSUMER_REPAIR_TRANSACTIONAL_POINTER_KEY_PREFIX)) continue;
    try {
      ids.push(decodeURIComponent(key.slice(CONSUMER_REPAIR_TRANSACTIONAL_POINTER_KEY_PREFIX.length)));
    } catch {
      // Malformed metadata is ignored; the durable payload is not deleted.
    }
  }
  return ids;
}

export async function listTransactionalConsumerRepairDurableBundleIds(): Promise<string[]> {
  return activeStore().listKeys();
}

export async function readTransactionalConsumerRepairBundle(
  requestDraftId: string,
): Promise<ConsumerRepairDraftBundle | null> {
  return activeStore().recoverLastValid(requestDraftId);
}

async function commitTransactionalConsumerRepairBundleWrite(
  input: TransactionalConsumerRepairWriteInput,
): Promise<DurableWriteResult> {
  const key = input.bundle.draft.id;
  try {
    const store = activeStore();
    const current = await store.readBundle(key);
    const expectedVersion = current
      ? serializeRevisionBundle(current).version
      : null;
    // Native request bundles contain several compatibility projections of the
    // same immutable estimate. Persist only the canonical compact projection;
    // writing the in-memory shape directly exhausts AsyncStorage across the
    // no-data-wipe Android matrix even though each logical revision is valid.
    const durableBundle = sanitizeConsumerRepairTransactionalBundle(
      compactConsumerRepairBundleForDurableStorage(input.bundle),
    );
    const result = await store.writeBundleAtomically(key, expectedVersion, durableBundle);
    if (result.status === "FAILED") {
      input.onFailed?.(result);
      return result;
    }
    input.storage?.setItem(pointerKey(key), JSON.stringify({
      schemaVersion: "consumer_repair_transactional_pointer_v1",
      migrationState: "complete",
      currentVersion: result.version,
      recoveryVersion: result.previousVersion,
      checksum: result.checksum,
    }));
    input.onCommitted?.(result);
    return result;
  } catch (error: unknown) {
    const result: Extract<DurableWriteResult, { status: "FAILED" }> = {
      status: "FAILED",
      version: null,
      error: {
        code: "TRANSACTION_FAILED",
        message: error instanceof Error ? error.message : String(error),
        currentVersion: null,
      },
    };
    input.onFailed?.(result);
    return result;
  }
}

async function drainTransactionalConsumerRepairBundleWrites(
  key: string,
): Promise<DurableWriteResult> {
  let result: DurableWriteResult = {
    status: "UNCHANGED",
    version: "",
    previousVersion: null,
    checksum: "",
  };
  while (true) {
    const pending = pendingWrites.get(key);
    if (!pending) return result;
    pendingWrites.delete(key);
    result = await commitTransactionalConsumerRepairBundleWrite(pending);
  }
}

export function queueTransactionalConsumerRepairBundleWrite(
  input: TransactionalConsumerRepairWriteInput,
): Promise<DurableWriteResult> {
  const key = input.bundle.draft.id;
  // UI actions can synchronously save draft, media, PDF and approval before
  // the first durable microtask starts. Only the latest not-yet-started state
  // needs a write; an already running atomic commit is never cancelled.
  pendingWrites.set(key, input);
  const queued = writeQueues.get(key);
  if (queued) return queued;
  const next = Promise.resolve().then(() =>
    drainTransactionalConsumerRepairBundleWrites(key)
  );
  writeQueues.set(key, next);
  void next.finally(() => {
    if (writeQueues.get(key) === next) writeQueues.delete(key);
  });
  return next;
}

export async function flushTransactionalConsumerRepairWrites(): Promise<void> {
  while (writeQueues.size > 0) {
    await Promise.all([...writeQueues.values()]);
  }
}

export async function awaitTransactionalConsumerRepairBundleCommit(input: {
  requestDraftId: string;
  expectedStatus: ConsumerRepairDraftBundle["draft"]["status"];
  expectedRevisionId: string | null;
}): Promise<void> {
  await flushTransactionalConsumerRepairWrites();
  const committed = await activeStore().recoverLastValid(input.requestDraftId);
  const committedRevisionId = committed?.estimateDraftRevisionState?.currentRevisionId ?? null;
  if (
    !committed
    || committed.draft.status !== input.expectedStatus
    || committedRevisionId !== input.expectedRevisionId
  ) {
    throw new Error("CONSUMER_REPAIR_TRANSACTIONAL_COMMIT_NOT_DURABLE");
  }
}

export function setConsumerRepairTransactionalStoreForTests(
  store: EstimateRevisionDurableStore | null,
): void {
  storeOverride = store;
  runtimeStore = null;
  writeQueues.clear();
  pendingWrites.clear();
}
